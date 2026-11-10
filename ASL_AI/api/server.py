"""Authenticated SVM interview API. Production: gunicorn -c gunicorn.conf.py api.server:app."""
import functools
import os
import sys
import threading
import time
from pathlib import Path

import jwt
import numpy as np
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, disconnect, emit, join_room

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
load_dotenv(ROOT / ".env")

from api.auth import verify_ticket
from engine.letter_recognizer import LetterRecognizer
from engine.text_buffer import TextBuffer
from engine.translator import Translator

TOKEN_SECRET = os.environ.get("ASL_TOKEN_SECRET", "")
if len(TOKEN_SECRET.encode()) < 32:
    raise RuntimeError("Set ASL_TOKEN_SECRET to the same secret (at least 32 bytes) as the backend")

origins = os.environ.get("FRONTEND_URL", ",".join([
    "http://localhost:5173", "http://127.0.0.1:5173",
    "http://localhost:4173", "http://127.0.0.1:4173",
    "https://52hzconnect.site", "https://www.52hzconnect.site",
]))
ALLOWED_ORIGINS = [origin.strip() for origin in origins.split(",") if origin.strip()]
if not ALLOWED_ORIGINS or "*" in ALLOWED_ORIGINS:
    raise RuntimeError("FRONTEND_URL must list specific allowed origins")

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 64 * 1024
CORS(app, origins=ALLOWED_ORIGINS)
socketio = SocketIO(
    app, cors_allowed_origins=ALLOWED_ORIGINS, async_mode="threading",
    max_http_buffer_size=64 * 1024,
)

CONFIDENCE_THRESHOLD = 0.805
COOLDOWN_FRAMES = 8
ROOM_TTL = 30 * 60
letter_recognizer = LetterRecognizer(model_dir=ROOT / "models" / "letter")
prediction_lock = threading.Lock()
state_lock = threading.RLock()
rooms = {}
connections = {}


def get_room(room_id):
    """Only authenticated join handlers may create a room."""
    with state_lock:
        now = time.time()
        for key, room in list(rooms.items()):
            if not room["hr_sids"] and not room["candidate_sids"] and now - room["last_active"] > ROOM_TTL:
                del rooms[key]
        if room_id not in rooms:
            rooms[room_id] = {
                "hr_sids": set(), "candidate_sids": set(), "lock": threading.RLock(),
                "is_active": True, "current_question": "", "question_number": 0,
                "qa_pairs": [], "text_buffer": TextBuffer(), "translator": Translator(),
                "answer_vi": "", "last_time": 0, "last_committed": None,
                "cooldown": 0, "last_active": now,
            }
        return rooms[room_id]


def room_status(room):
    return {"hr": bool(room["hr_sids"]), "candidate": bool(room["candidate_sids"])}


def reset_answer(room):
    room["text_buffer"].clear()
    room["answer_vi"] = ""
    room["last_committed"] = None
    room["cooldown"] = 0


def save_answer(room):
    if room["current_question"] and room["text_buffer"].get_text().strip():
        text = room["text_buffer"].get_text().strip()
        translated = room["translator"].translate(text)
        room["qa_pairs"].append({
            "question": room["current_question"], "answer": text,
            "answer_vi": translated or room["answer_vi"],
        })
        return True
    return False


def valid_landmarks(values):
    return (isinstance(values, list) and len(values) == 63 and
            all(type(value) in (int, float) and np.isfinite(value) for value in values))


def predict_from_landmarks(landmarks):
    with prediction_lock:
        features = np.array(landmarks).reshape(1, -1)
        scaled = letter_recognizer.scaler.transform(features)
        prediction = letter_recognizer.svm.predict(scaled)[0]
        probabilities = letter_recognizer.svm.predict_proba(scaled)[0]
        confidence = float(probabilities[prediction])
        letter = letter_recognizer.label_encoder.inverse_transform([prediction])[0]
        return str(letter), confidence


def room_event(role=None):
    """Check ticket, membership, room scope and role on every event."""
    def decorate(handler):
        @functools.wraps(handler)
        def wrapped(data=None):
            data = data if isinstance(data, dict) else {}
            with state_lock:
                identity = connections.get(request.sid)
            try:
                claims = verify_ticket(identity["token"] if identity else None, TOKEN_SECRET)
            except jwt.InvalidTokenError:
                emit("room_error", {"message": "Phiên phỏng vấn đã hết hạn. Vui lòng vào lại phòng."})
                disconnect()
                return
            room_id = claims["room_id"]
            if data.get("room_id", room_id) != room_id or (role and claims["role"] != role):
                emit("room_error", {"message": "Bạn không có quyền thực hiện thao tác này."})
                return
            with state_lock:
                room = rooms.get(room_id)
            if not room:
                return
            with room["lock"]:
                members = room["hr_sids"] if claims["role"] == "Employer" else room["candidate_sids"]
                if request.sid not in members or not room["is_active"]:
                    return
                room["last_active"] = time.time()
                return handler(data, room_id, room)
        return wrapped
    return decorate


@app.get("/health")
def health():
    return jsonify({"status": "ok", "model": f"SVM ({letter_recognizer.num_classes} classes)"})


@app.post("/recognize/landmark")
def recognize_landmark():
    try:
        verify_ticket(request.headers.get("Authorization", "").removeprefix("Bearer "), TOKEN_SECRET)
    except jwt.InvalidTokenError:
        return jsonify({"error": "Unauthorized"}), 401
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or not valid_landmarks(data.get("landmarks")):
        return jsonify({"error": "Expected 63 finite numeric landmark values"}), 400
    letter, confidence = predict_from_landmarks(data["landmarks"])
    return jsonify({"prediction": letter, "confidence": confidence})


@socketio.on("connect")
def on_connect(auth=None):
    try:
        token = auth.get("token") if isinstance(auth, dict) else None
        claims = verify_ticket(token, TOKEN_SECRET)
    except jwt.InvalidTokenError:
        return False
    with state_lock:
        connections[request.sid] = {**claims, "token": token}


@socketio.on("join_room")
def on_join(data=None):
    with state_lock:
        identity = connections.get(request.sid)
    try:
        claims = verify_ticket(identity["token"] if identity else None, TOKEN_SECRET)
    except jwt.InvalidTokenError:
        disconnect()
        return
    data = data if isinstance(data, dict) else {}
    room_id = claims["room_id"]
    if data.get("room_id", room_id) != room_id:
        emit("room_error", {"message": "Mã phòng không hợp lệ."})
        return
    room = get_room(room_id)
    with room["lock"]:
        join_room(room_id)
        key = "hr_sids" if claims["role"] == "Employer" else "candidate_sids"
        room[key].add(request.sid)
        room["last_active"] = time.time()
        if not room["is_active"]:
            emit("interview_ended", {"transcript": room["qa_pairs"]})
            return
        emit("room_status", room_status(room), to=room_id)
        emit("new_question", {"text": room["current_question"], "number": room["question_number"]})
        emit("answer_update", {"text": room["text_buffer"].get_text(), "translated": room["answer_vi"]})
        emit("transcript_update", {"qa_pairs": room["qa_pairs"]})


@socketio.on("disconnect")
def on_disconnect(reason=None):
    with state_lock:
        identity = connections.pop(request.sid, None)
        room = rooms.get(identity["room_id"]) if identity else None
    if room:
        with room["lock"]:
            room["hr_sids"].discard(request.sid)
            room["candidate_sids"].discard(request.sid)
            room["last_active"] = time.time()
            emit("room_status", room_status(room), to=identity["room_id"])


@socketio.on("send_question")
@room_event("Employer")
def on_question(data, room_id, room):
    text = data.get("text")
    if not isinstance(text, str) or not text.strip() or len(text) > 2000:
        return
    if room["question_number"] >= 100:
        emit("room_error", {"message": "Đã đạt giới hạn 100 câu hỏi. Vui lòng kết thúc phỏng vấn."})
        return
    if save_answer(room):
        emit("transcript_update", {"qa_pairs": room["qa_pairs"]}, to=room_id)
    reset_answer(room)
    room["current_question"] = text.strip()
    room["question_number"] += 1
    emit("new_question", {"text": text.strip(), "number": room["question_number"]}, to=room_id)
    emit("answer_update", {"text": "", "translated": ""}, to=room_id)


@socketio.on("send_landmarks")
@room_event("Job Seeker")
def on_landmarks(data, room_id, room):
    now = time.time()
    if now - room["last_time"] < 0.08:
        return
    room["last_time"] = now
    landmarks = data.get("landmarks")
    detected = data.get("hand_detected") is True and valid_landmarks(landmarks)
    letter, confidence, committed = None, 0.0, None
    if detected:
        letter, confidence = predict_from_landmarks(landmarks)
        if letter == "nothing":
            room["last_committed"] = None
        elif room["cooldown"] > 0:
            room["cooldown"] -= 1
        elif confidence >= (0.6 if letter in ("space", "del") else CONFIDENCE_THRESHOLD):
            if letter in ("space", "del") or letter != room["last_committed"]:
                committed = letter
                room["cooldown"] = COOLDOWN_FRAMES
        if committed and room["current_question"]:
            room["last_committed"] = committed
            if len(room["text_buffer"].get_text()) < 5000 or committed == "del":
                room["text_buffer"].add_letter(committed)
            if committed in ("space", "del"):
                room["answer_vi"] = room["translator"].translate(room["text_buffer"].get_text().strip())
            emit("answer_update", {"text": room["text_buffer"].get_text(), "translated": room["answer_vi"]}, to=room_id)
    else:
        room["last_committed"] = None
    emit("recognition_result", {"letter": letter, "confidence": confidence, "hand_detected": detected}, to=room_id)


@socketio.on("send_frame")
@room_event("Job Seeker")
def on_frame(data, room_id, room):
    emit("recognition_result", {"letter": None, "confidence": 0, "hand_detected": False}, to=room_id)


@socketio.on("clear_answer")
@room_event("Job Seeker")
def on_clear(data, room_id, room):
    reset_answer(room)
    emit("answer_update", {"text": "", "translated": ""}, to=room_id)


@socketio.on("add_space")
@room_event("Job Seeker")
def on_space(data, room_id, room):
    if room["current_question"] and len(room["text_buffer"].get_text()) < 5000:
        room["text_buffer"].add_space()
    emit("answer_update", {"text": room["text_buffer"].get_text(), "translated": room["answer_vi"]}, to=room_id)


@socketio.on("backspace")
@room_event("Job Seeker")
def on_backspace(data, room_id, room):
    room["text_buffer"].backspace()
    room["last_committed"] = None
    room["answer_vi"] = room["translator"].translate(room["text_buffer"].get_text().strip())
    emit("answer_update", {"text": room["text_buffer"].get_text(), "translated": room["answer_vi"]}, to=room_id)


@socketio.on("submit_answer")
@room_event("Job Seeker")
def on_submit(data, room_id, room):
    if save_answer(room):
        room["current_question"] = ""
        reset_answer(room)
        emit("answer_submitted", {"qa_pairs": room["qa_pairs"]}, to=room_id)


@socketio.on("end_interview")
@room_event("Employer")
def on_end(data, room_id, room):
    save_answer(room)
    room["current_question"] = ""
    reset_answer(room)
    room["is_active"] = False
    emit("interview_ended", {"transcript": room["qa_pairs"]}, to=room_id)


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "5001")),
                 debug=False, allow_unsafe_werkzeug=os.environ.get("NODE_ENV") != "production")
