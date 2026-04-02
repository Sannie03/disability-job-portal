"""
ASL_AI - Flask + SocketIO API
SVM model for letter recognition (99.42% accuracy).
Frontend sends hand landmarks (detected by MediaPipe JS), server predicts using SVM.

Run:
    cd ASL_AI
    python api/server.py
"""

import time
import numpy as np
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, join_room, emit

from engine.letter_recognizer import LetterRecognizer
from engine.stabilizer import LetterStabilizer
from engine.text_buffer import TextBuffer
from engine.translator import Translator

app = Flask(__name__)
CORS(app, origins="*")
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="eventlet",
    max_http_buffer_size=10 * 1024 * 1024,
)

CONFIDENCE_THRESHOLD = 0.805
STABILITY_FRAMES = 10
COOLDOWN_FRAMES = 8
MAJORITY_RATIO = 0.8

print("=" * 60)
print("ASL_AI - Flask + SocketIO Server")
print("=" * 60)
print("\nLoading SVM model...")

letter_recognizer = LetterRecognizer(model_dir="models/letter")
print(f"  SVM: {letter_recognizer.num_classes} classes (99.42% accuracy)")
print("Model loaded!\n")

# Interview Rooms
rooms = {}


def get_room(room_id):
    if room_id not in rooms:
        rooms[room_id] = {
            "hr_sid": None,
            "candidate_sid": None,
            "is_active": True,
            "current_question": "",
            "question_number": 0,
            "qa_pairs": [],
            "stabilizer": LetterStabilizer(STABILITY_FRAMES, COOLDOWN_FRAMES, MAJORITY_RATIO),
            "text_buffer": TextBuffer(),
            "translator": Translator(),
            "answer_vi": "",
            "last_time": 0,
            "last_committed": None,
        }
    return rooms[room_id]


def cleanup_room(room_id):
    if room_id in rooms:
        del rooms[room_id]
        print(f"  Room '{room_id}' cleaned up")


def predict_from_landmarks(landmarks):
    """Predict letter from 63 landmark values using SVM."""
    features = np.array(landmarks).reshape(1, -1)
    features_scaled = letter_recognizer.scaler.transform(features)
    prediction = letter_recognizer.svm.predict(features_scaled)[0]
    probabilities = letter_recognizer.svm.predict_proba(features_scaled)[0]
    confidence = float(probabilities[prediction])
    letter = letter_recognizer.label_encoder.inverse_transform([prediction])[0]
    return letter, confidence


# REST Endpoints

@app.route("/health")
def health():
    return jsonify({
        "status": "ok",
        "model": f"SVM ({letter_recognizer.num_classes} classes)",
        "active_rooms": len(rooms),
    })


@app.route("/recognize/landmark", methods=["POST"])
def recognize_landmark():
    data = request.get_json()
    if not data or "landmarks" not in data:
        return jsonify({"error": "No landmarks"}), 400

    landmarks = data["landmarks"]
    if len(landmarks) != 63:
        return jsonify({"error": f"Expected 63 values, got {len(landmarks)}"}), 400

    try:
        letter, confidence = predict_from_landmarks(landmarks)
        return jsonify({"prediction": letter, "confidence": confidence})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# SocketIO: Interview Room

@socketio.on("join_room")
def on_join(data):
    room_id = data.get("room_id", "")
    role = data.get("role", "")
    if not room_id or not role:
        return

    room = get_room(room_id)
    join_room(room_id)

    if role.lower() == "employer":
        room["hr_sid"] = request.sid
        print(f"  HR joined room '{room_id}'")
    else:
        room["candidate_sid"] = request.sid
        print(f"  Candidate joined room '{room_id}'")

    emit("room_status", {
        "hr": room["hr_sid"] is not None,
        "candidate": room["candidate_sid"] is not None,
    }, room=room_id)

    if room["current_question"]:
        emit("new_question", {"text": room["current_question"], "number": room["question_number"]})
    text = room["text_buffer"].get_text()
    if text:
        emit("answer_update", {"text": text, "translated": room["answer_vi"]})


@socketio.on("disconnect")
def on_disconnect():
    sid = request.sid
    for room_id, room in list(rooms.items()):
        if room["hr_sid"] == sid:
            room["hr_sid"] = None
            emit("room_status", {"hr": False, "candidate": room["candidate_sid"] is not None}, room=room_id)
        elif room["candidate_sid"] == sid:
            room["candidate_sid"] = None
            emit("room_status", {"hr": room["hr_sid"] is not None, "candidate": False}, room=room_id)
        if room["hr_sid"] is None and room["candidate_sid"] is None:
            cleanup_room(room_id)


@socketio.on("send_question")
def on_question(data):
    room_id = data.get("room_id", "")
    text = data.get("text", "").strip()
    room = get_room(room_id)
    if not text or not room["is_active"]:
        return

    if room["current_question"]:
        room["qa_pairs"].append({
            "question": room["current_question"],
            "answer": room["text_buffer"].get_text(),
            "answer_vi": room["answer_vi"],
        })

    room["question_number"] += 1
    room["current_question"] = text
    room["text_buffer"].clear()
    room["answer_vi"] = ""
    room["stabilizer"].reset()

    emit("new_question", {"text": text, "number": room["question_number"]}, room=room_id)
    emit("answer_update", {"text": "", "translated": ""}, room=room_id)
    print(f"  [Room '{room_id}'] Q{room['question_number']}: {text}")


@socketio.on("send_landmarks")
def on_landmarks(data):
    """Receive 63 hand landmarks from frontend (detected by MediaPipe JS)."""
    room_id = data.get("room_id", "")
    landmarks = data.get("landmarks", [])
    hand_detected = data.get("hand_detected", False)
    room = get_room(room_id)

    if not room["is_active"]:
        return

    now = time.time()
    if now - room["last_time"] < 0.08:
        return
    room["last_time"] = now

    letter = None
    confidence = 0.0

    if hand_detected and len(landmarks) == 63:
        try:
            letter, confidence = predict_from_landmarks(landmarks)

            if letter == "nothing":
                committed = None
                room["last_committed"] = None
            elif letter in ("space", "del") and confidence >= 0.6:
                room["stabilizer"].cooldown_counter = COOLDOWN_FRAMES
                committed = letter
            elif room["stabilizer"].cooldown_counter > 0:
                room["stabilizer"].cooldown_counter -= 1
                committed = None
            elif confidence >= CONFIDENCE_THRESHOLD:
                if letter == room["last_committed"]:
                    committed = None
                else:
                    room["stabilizer"].cooldown_counter = COOLDOWN_FRAMES
                    committed = letter
            else:
                committed = None

            if committed:
                room["last_committed"] = committed
                room["text_buffer"].add_letter(committed)
                text = room["text_buffer"].get_text()
                # Emit text ngay, không chờ translate
                emit("answer_update", {
                    "text": text,
                    "translated": room["answer_vi"],
                }, room=room_id)
                # Translate sau khi đã emit text
                if committed == "space":
                    raw = text.strip()
                    if raw:
                        room["answer_vi"] = room["translator"].translate(raw)
                        emit("answer_update", {
                            "text": text,
                            "translated": room["answer_vi"],
                        }, room=room_id)

        except Exception as e:
            print(f"  [Error] {e}")
    else:
        room["last_committed"] = None

    emit("recognition_result", {
        "letter": letter,
        "confidence": confidence,
        "hand_detected": hand_detected,
    }, room=room_id)


# Keep send_frame for backward compatibility (nhưng không dùng MediaPipe nữa)
@socketio.on("send_frame")
def on_frame(data):
    room_id = data.get("room_id", "")
    emit("recognition_result", {
        "letter": None,
        "confidence": 0,
        "hand_detected": False,
    }, room=room_id)


@socketio.on("clear_answer")
def on_clear(data):
    room_id = data.get("room_id", "")
    room = get_room(room_id)
    room["text_buffer"].clear()
    room["answer_vi"] = ""
    room["stabilizer"].reset()
    emit("answer_update", {"text": "", "translated": ""}, room=room_id)


@socketio.on("add_space")
def on_space(data):
    room_id = data.get("room_id", "")
    room = get_room(room_id)
    room["text_buffer"].add_space()
    emit("answer_update", {
        "text": room["text_buffer"].get_text(),
        "translated": room["answer_vi"],
    }, room=room_id)


@socketio.on("backspace")
def on_backspace(data):
    room_id = data.get("room_id", "")
    room = get_room(room_id)
    room["text_buffer"].backspace()
    raw = room["text_buffer"].get_text().strip()
    room["answer_vi"] = room["translator"].translate(raw) if raw else ""
    emit("answer_update", {
        "text": room["text_buffer"].get_text(),
        "translated": room["answer_vi"],
    }, room=room_id)


@socketio.on("submit_answer")
def on_submit(data):
    room_id = data.get("room_id", "")
    room = get_room(room_id)
    if room["current_question"]:
        room["qa_pairs"].append({
            "question": room["current_question"],
            "answer": room["text_buffer"].get_text(),
            "answer_vi": room["answer_vi"],
        })
        room["text_buffer"].clear()
        room["answer_vi"] = ""
        room["stabilizer"].reset()
        emit("answer_submitted", {"qa_pairs": room["qa_pairs"]}, room=room_id)


@socketio.on("end_interview")
def on_end(data):
    room_id = data.get("room_id", "")
    room = get_room(room_id)

    if room["current_question"] and room["text_buffer"].get_text().strip():
        room["qa_pairs"].append({
            "question": room["current_question"],
            "answer": room["text_buffer"].get_text(),
            "answer_vi": room["answer_vi"],
        })

    room["is_active"] = False
    emit("interview_ended", {"transcript": room["qa_pairs"]}, room=room_id)
    print(f"  [Room '{room_id}'] Ended. {len(room['qa_pairs'])} Q&A.")
    cleanup_room(room_id)


if __name__ == "__main__":
    print("\nServer starting on port 5001...")
    print("  REST:     http://localhost:5001/health")
    print("  SocketIO: ws://localhost:5001")
    print()
    socketio.run(app, host="0.0.0.0", port=5001, debug=False)
