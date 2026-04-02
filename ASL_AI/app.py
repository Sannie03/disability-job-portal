"""
ASL_AI - Unified Sign Language Recognition Desktop App
Combines letter recognition (SVM) + word recognition (I3D) + Vietnamese translation

Controls:
    Q         - Quit
    C         - Clear text
    Backspace - Delete last character
    SPACE     - Add space / Trigger word recognition in WORD mode
    M         - Switch mode: AUTO → LETTER → WORD → AUTO
"""

import cv2
import numpy as np
import mediapipe as mp
import time
from engine import (
    LetterRecognizer,
    WordI3DRecognizer,
    MotionDetector,
    LetterStabilizer,
    TextBuffer,
    Translator,
)
from engine.text_renderer import put_text

# ─── Configuration ────────────────────────────────────────────────────────────
STABILITY_FRAMES = 10
COOLDOWN_FRAMES = 7
CONFIDENCE_THRESHOLD = 0.5
MAJORITY_RATIO = 0.7
MOTION_THRESHOLD = 0.015
MOTION_WINDOW = 5
WORD_BLOCK_SVM = 40

# I3D word recognition
I3D_MIN_FRAMES = 32         # Minimum frames to attempt I3D recognition
I3D_MAX_FRAMES = 64         # Maximum frame buffer for I3D
I3D_CONFIDENCE = 0.3        # Minimum confidence for I3D word prediction
I3D_MOTION_TRIGGER = 20     # Consecutive moving frames to trigger I3D recording

WINDOW_NAME = "ASL_AI - Sign Language Recognition"


# ─── UI Drawing ───────────────────────────────────────────────────────────────

def draw_ui(frame, letter, confidence, text, fps, translated="",
            mode="AUTO", motion=0.0, i3d_status="", i3d_frames=0):
    h, w = frame.shape[:2]

    # Top bar
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (w, 90), (40, 40, 40), -1)
    cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)

    # Current prediction
    if letter and letter != "nothing":
        color = (0, 255, 0) if confidence > 0.8 else (0, 255, 255) if confidence > 0.6 else (0, 0, 255)
        cv2.putText(frame, letter, (20, 65), cv2.FONT_HERSHEY_SIMPLEX, 2.0, color, 3)
        cv2.putText(frame, f"{confidence * 100:.0f}%", (90, 65), cv2.FONT_HERSHEY_SIMPLEX, 1.0, color, 2)
    else:
        cv2.putText(frame, "No hand", (20, 65), cv2.FONT_HERSHEY_SIMPLEX, 1.5, (128, 128, 128), 2)

    # FPS
    cv2.putText(frame, f"FPS: {fps:.0f}", (w - 150, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 1)

    # Mode indicator
    mode_colors = {"AUTO": (200, 200, 0), "LETTER": (0, 200, 0), "WORD": (0, 200, 255)}
    mode_color = mode_colors.get(mode, (200, 200, 200))
    cv2.putText(frame, f"[{mode}] motion:{motion:.3f}", (w - 320, 55),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, mode_color, 1)

    # I3D recording status
    if i3d_status:
        cv2.putText(frame, f"I3D: {i3d_status} ({i3d_frames}f)", (w - 320, 80),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 200, 255), 1)
        if "RECORDING" in i3d_status:
            cv2.circle(frame, (w - 335, 75), 6, (0, 0, 255), -1)

    # Bottom bar
    bar_height = 120 if translated else 80
    overlay2 = frame.copy()
    cv2.rectangle(overlay2, (0, h - bar_height), (w, h), (40, 40, 40), -1)
    cv2.addWeighted(overlay2, 0.7, frame, 0.3, 0, frame)

    # English text
    display_text = text + "|"
    cv2.putText(frame, display_text, (20, h - bar_height + 35),
                cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)

    # Vietnamese translation (PIL for Unicode support)
    if translated:
        put_text(frame, f"VI: {translated}", (20, h - bar_height + 55), font_size=22, color=(0, 255, 200))

    # Controls hint
    controls = "Q:Quit  C:Clear  Bksp:Delete  M:Mode  SPACE:Space/Recognize"
    cv2.putText(frame, controls, (10, h - bar_height - 10),
                cv2.FONT_HERSHEY_SIMPLEX, 0.4, (180, 180, 180), 1)

    return frame


# ─── Main App ─────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("ASL_AI - Unified Sign Language Recognition")
    print("=" * 60)

    # Load models
    print("\nLoading models...")
    letter_rec = LetterRecognizer(model_dir="models/letter")
    print(f"  Letter (SVM): {letter_rec.num_classes} classes")

    print("  Loading I3D model (this may take a moment)...")
    word_rec = WordI3DRecognizer(
        model_path="models/word_i3d/asl100.pt",
        class_list_path="models/word_i3d/wlasl_class_list.txt",
        i3d_module_path="i3d",
        num_classes=100,
    )
    print(f"  Word (I3D): {word_rec.num_classes} classes")
    print("All models loaded!\n")

    # Initialize components
    stabilizer = LetterStabilizer(STABILITY_FRAMES, COOLDOWN_FRAMES, MAJORITY_RATIO)
    motion_detector = MotionDetector(MOTION_WINDOW, MOTION_THRESHOLD)
    text_buffer = TextBuffer()
    translator = Translator()
    translated_text = ""

    # MediaPipe hands
    mp_hands = mp.solutions.hands
    mp_drawing = mp.solutions.drawing_utils
    mp_drawing_styles = mp.solutions.drawing_styles

    hands = mp_hands.Hands(
        static_image_mode=False,
        max_num_hands=1,
        model_complexity=1,
        min_detection_confidence=0.7,
        min_tracking_confidence=0.5,
    )

    # State variables
    user_mode = "AUTO"          # User-selected mode: AUTO, LETTER, WORD
    svm_blocked = 0             # Frames to block SVM after word recognition
    i3d_frame_buffer = []       # Buffer for I3D frames
    i3d_recording = False       # Whether we're currently recording for I3D
    moving_frame_count = 0      # Consecutive frames with motion
    no_hand_counter = 0

    # Open webcam
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("ERROR: Cannot open webcam!")
        return

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    print("Webcam opened. Press Q to quit, M to change mode.\n")

    prev_time = time.time()
    fps = 0
    current_letter = None
    current_confidence = 0.0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame = cv2.flip(frame, 1)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        rgb.flags.writeable = False
        results = hands.process(rgb)
        rgb.flags.writeable = True

        # Determine effective mode
        motion_level = 0.0
        is_moving = False
        i3d_status = ""

        if results.multi_hand_landmarks:
            hand_lm = results.multi_hand_landmarks[0]
            no_hand_counter = 0

            # Draw hand landmarks
            mp_drawing.draw_landmarks(
                frame, hand_lm, mp_hands.HAND_CONNECTIONS,
                mp_drawing_styles.get_default_hand_landmarks_style(),
                mp_drawing_styles.get_default_hand_connections_style(),
            )

            # Extract landmarks
            lm_flat = letter_rec.extract_landmarks_flat(hand_lm)
            motion_level, is_moving = motion_detector.update(lm_flat)

            if svm_blocked > 0:
                svm_blocked -= 1

            # Determine current effective mode
            if user_mode == "AUTO":
                effective_mode = "WORD" if (is_moving or svm_blocked > 0) else "LETTER"
            else:
                effective_mode = user_mode

            # ── LETTER MODE: SVM recognition ──
            if effective_mode == "LETTER" and svm_blocked == 0:
                letter, confidence = letter_rec.predict(hand_lm)
                current_letter = letter
                current_confidence = confidence

                if confidence >= CONFIDENCE_THRESHOLD:
                    committed = stabilizer.update(letter, confidence)
                    if committed:
                        text_buffer.add_letter(committed)
                        print(f"  + LETTER '{committed}' => \"{text_buffer.get_text()}\"")
                        raw = text_buffer.get_text().strip()
                        if raw:
                            translated_text = translator.translate(raw)

                # Reset I3D buffer when in letter mode
                if not is_moving:
                    moving_frame_count = 0
                    if i3d_recording and len(i3d_frame_buffer) >= I3D_MIN_FRAMES:
                        # Motion stopped with enough frames — recognize
                        print(f"  I3D recognizing ({len(i3d_frame_buffer)} frames)...")
                        word, conf, top5 = word_rec.predict(i3d_frame_buffer)
                        if word and conf >= I3D_CONFIDENCE:
                            text_buffer.add_word(word)
                            svm_blocked = WORD_BLOCK_SVM
                            stabilizer.reset()
                            print(f"  + WORD '{word}' ({conf:.0%}) => \"{text_buffer.get_text()}\"")
                            if top5:
                                for i, (w, p) in enumerate(top5, 1):
                                    print(f"    {i}. {w:20s} {p:.1%}")
                            raw = text_buffer.get_text().strip()
                            if raw:
                                translated_text = translator.translate(raw)
                        else:
                            print(f"  I3D: no confident prediction (best: {word} {conf:.1%})")
                    i3d_recording = False
                    i3d_frame_buffer.clear()

            # ── WORD MODE: Buffer frames for I3D ──
            if effective_mode == "WORD" or is_moving:
                stabilizer.reset()
                moving_frame_count += 1

                # Start/continue recording frames for I3D
                if moving_frame_count >= 3:  # At least 3 frames of motion
                    i3d_recording = True

                if i3d_recording:
                    i3d_frame_buffer.append(frame.copy())
                    if len(i3d_frame_buffer) > I3D_MAX_FRAMES:
                        i3d_frame_buffer.pop(0)
                    i3d_status = f"RECORDING"

                # In manual WORD mode, also show SVM prediction for reference
                if user_mode == "WORD":
                    letter, confidence = letter_rec.predict(hand_lm)
                    current_letter = letter
                    current_confidence = confidence

        else:
            # No hand detected
            current_letter = None
            current_confidence = 0.0
            no_hand_counter += 1

            if no_hand_counter > 10:
                # Hand disappeared — if we were recording, try to recognize
                if i3d_recording and len(i3d_frame_buffer) >= I3D_MIN_FRAMES:
                    print(f"  I3D recognizing ({len(i3d_frame_buffer)} frames)...")
                    word, conf, top5 = word_rec.predict(i3d_frame_buffer)
                    if word and conf >= I3D_CONFIDENCE:
                        text_buffer.add_word(word)
                        svm_blocked = WORD_BLOCK_SVM
                        print(f"  + WORD '{word}' ({conf:.0%}) => \"{text_buffer.get_text()}\"")
                        if top5:
                            for i, (w, p) in enumerate(top5, 1):
                                print(f"    {i}. {w:20s} {p:.1%}")
                        raw = text_buffer.get_text().strip()
                        if raw:
                            translated_text = translator.translate(raw)

                stabilizer.reset()
                motion_detector.reset()
                i3d_recording = False
                i3d_frame_buffer.clear()
                moving_frame_count = 0

        # Calculate FPS
        now = time.time()
        fps = 1.0 / (now - prev_time) if (now - prev_time) > 0 else 0
        prev_time = now

        # Determine display mode
        if results.multi_hand_landmarks:
            if user_mode == "AUTO":
                display_mode = "WORD" if (is_moving or svm_blocked > 0) else "LETTER"
            else:
                display_mode = user_mode
        else:
            display_mode = user_mode

        # Draw UI
        frame = draw_ui(
            frame, current_letter, current_confidence, text_buffer.get_text(),
            fps, translated_text, display_mode, motion_level,
            i3d_status, len(i3d_frame_buffer)
        )
        cv2.imshow(WINDOW_NAME, frame)

        # Handle keyboard
        key = cv2.waitKey(1) & 0xFF

        if key == ord('q') or key == ord('Q'):
            break

        elif key == ord('c') or key == ord('C'):
            text_buffer.clear()
            translated_text = ""
            stabilizer.reset()
            i3d_frame_buffer.clear()
            i3d_recording = False
            moving_frame_count = 0
            print("  [Cleared]")

        elif key == 8:  # Backspace
            text_buffer.backspace()
            raw = text_buffer.get_text().strip()
            translated_text = translator.translate(raw) if raw else ""

        elif key == ord(' '):  # Space
            if i3d_recording and len(i3d_frame_buffer) >= I3D_MIN_FRAMES:
                # Manual trigger for I3D recognition
                print(f"  I3D manual recognize ({len(i3d_frame_buffer)} frames)...")
                word, conf, top5 = word_rec.predict(i3d_frame_buffer)
                if word and conf >= I3D_CONFIDENCE:
                    text_buffer.add_word(word)
                    svm_blocked = WORD_BLOCK_SVM
                    stabilizer.reset()
                    print(f"  + WORD '{word}' ({conf:.0%}) => \"{text_buffer.get_text()}\"")
                    raw = text_buffer.get_text().strip()
                    if raw:
                        translated_text = translator.translate(raw)
                i3d_frame_buffer.clear()
                i3d_recording = False
                moving_frame_count = 0
            else:
                text_buffer.add_space()

        elif key == ord('m') or key == ord('M'):
            modes = ["AUTO", "LETTER", "WORD"]
            idx = modes.index(user_mode)
            user_mode = modes[(idx + 1) % len(modes)]
            print(f"  [Mode: {user_mode}]")
            stabilizer.reset()
            i3d_frame_buffer.clear()
            i3d_recording = False
            moving_frame_count = 0

    cap.release()
    cv2.destroyAllWindows()
    hands.close()
    print(f"\nFinal text: {text_buffer.get_text()}")


if __name__ == "__main__":
    main()
