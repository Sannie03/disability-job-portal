"""
ASL_AI - Interview Support Demo
Two-window system:
  - HR Window (tkinter): Type questions in Vietnamese, see answers + transcript
  - Candidate Window (OpenCV): Webcam + sign language recognition + see questions

Controls:
  HR Window:
    Type question in input box → ENTER to send
    Click "End Interview" to end & save transcript

  Candidate Window:
    C - Clear current answer
    Backspace - Delete last character
    M - Switch recognition mode (AUTO/LETTER/WORD)
    SPACE - Add space
"""

import cv2
import numpy as np
import mediapipe as mp
import time
import threading
import queue
import tkinter as tk
from tkinter import font as tkfont
from engine import (
    LetterRecognizer,
    WordI3DRecognizer,
    MotionDetector,
    LetterStabilizer,
    TextBuffer,
    Translator,
)
from engine.text_renderer import put_text
from interview import InterviewManager

# ─── Configuration ────────────────────────────────────────────────────────────
STABILITY_FRAMES = 10
COOLDOWN_FRAMES = 7
CONFIDENCE_THRESHOLD = 0.5
MAJORITY_RATIO = 0.7
MOTION_THRESHOLD = 0.015
MOTION_WINDOW = 5
WORD_BLOCK_SVM = 40

I3D_MIN_FRAMES = 32
I3D_MAX_FRAMES = 64
I3D_CONFIDENCE = 0.3

CANDIDATE_WINDOW = "Candidate - Sign Language"


# ─── HR Window (tkinter) ─────────────────────────────────────────────────────

class HRWindow:
    """Tkinter-based HR panel with Vietnamese text input support."""

    def __init__(self, question_queue, end_event):
        self.question_queue = question_queue
        self.end_event = end_event

        self.root = tk.Tk()
        self.root.title("HR - Interview Panel")
        self.root.geometry("520x650+50+100")
        self.root.configure(bg="#2D2823")
        self.root.protocol("WM_DELETE_WINDOW", self._on_end)

        default_font = tkfont.Font(family="Arial", size=12)
        title_font = tkfont.Font(family="Arial", size=16, weight="bold")
        small_font = tkfont.Font(family="Arial", size=10)
        q_font = tkfont.Font(family="Arial", size=13)

        # ── Title bar ──
        title_frame = tk.Frame(self.root, bg="#504030", pady=8)
        title_frame.pack(fill=tk.X)

        tk.Label(title_frame, text="HR - Interview Panel", font=title_font,
                 fg="white", bg="#504030").pack(side=tk.LEFT, padx=15)

        self.q_num_label = tk.Label(title_frame, text="Q: 0", font=default_font,
                                    fg="#00FFC8", bg="#504030")
        self.q_num_label.pack(side=tk.RIGHT, padx=15)

        btn = tk.Button(title_frame, text="End Interview", font=small_font,
                        bg="#B40000", fg="white", activebackground="#FF0000",
                        command=self._on_end, padx=10, pady=2)
        btn.pack(side=tk.RIGHT, padx=5)

        # ── Input area ──
        input_frame = tk.Frame(self.root, bg="#3C3732", padx=10, pady=8)
        input_frame.pack(fill=tk.X, padx=10, pady=(10, 5))

        tk.Label(input_frame, text="Nhập câu hỏi (ENTER để gửi):",
                 font=small_font, fg="#B4B4B4", bg="#3C3732").pack(anchor=tk.W)

        self.entry = tk.Entry(input_frame, font=q_font, bg="#1E1E1E", fg="white",
                              insertbackground="white", relief=tk.FLAT)
        self.entry.pack(fill=tk.X, pady=(4, 0), ipady=6)
        self.entry.bind("<Return>", self._on_enter)
        self.entry.focus_set()

        # ── Current question ──
        self.current_q_frame = tk.Frame(self.root, bg="#466446", padx=10, pady=6)
        self.current_q_label = tk.Label(self.current_q_frame, text="",
                                        font=q_font, fg="white", bg="#466446",
                                        wraplength=480, justify=tk.LEFT, anchor=tk.W)
        self.current_q_label.pack(fill=tk.X)

        # ── Current answer ──
        answer_frame = tk.LabelFrame(self.root, text="Candidate's answer",
                                     font=small_font, fg="#B4B4B4", bg="#323246",
                                     padx=10, pady=6)
        answer_frame.pack(fill=tk.X, padx=10, pady=5)

        self.answer_label = tk.Label(answer_frame, text="(waiting...)",
                                     font=q_font, fg="white", bg="#323246",
                                     wraplength=480, justify=tk.LEFT, anchor=tk.W)
        self.answer_label.pack(fill=tk.X)

        self.answer_vi_label = tk.Label(answer_frame, text="",
                                        font=q_font, fg="#00FFC8", bg="#323246",
                                        wraplength=480, justify=tk.LEFT, anchor=tk.W)
        self.answer_vi_label.pack(fill=tk.X)

        # ── Transcript ──
        tk.Frame(self.root, bg="#646464", height=1).pack(fill=tk.X, padx=10, pady=(10, 0))
        tk.Label(self.root, text="Transcript:", font=small_font,
                 fg="#969696", bg="#2D2823").pack(anchor=tk.W, padx=15, pady=(5, 0))

        self.transcript_text = tk.Text(self.root, font=small_font, bg="#2D2823",
                                       fg="#B4B4B4", relief=tk.FLAT, wrap=tk.WORD,
                                       state=tk.DISABLED, height=15)
        self.transcript_text.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        self.transcript_text.tag_configure("question", foreground="#64B464")
        self.transcript_text.tag_configure("answer", foreground="#B4B4FF")
        self.transcript_text.tag_configure("vi", foreground="#00C8A0")

        # ── Bottom hint ──
        hint_frame = tk.Frame(self.root, bg="#3C3732", pady=4)
        hint_frame.pack(fill=tk.X, side=tk.BOTTOM)
        tk.Label(hint_frame, text="ENTER: Gửi câu hỏi  |  Đóng cửa sổ: Kết thúc phỏng vấn",
                 font=small_font, fg="#B4B4B4", bg="#3C3732").pack()

    def _on_enter(self, event=None):
        text = self.entry.get().strip()
        if text:
            self.question_queue.put(("question", text))
            self.entry.delete(0, tk.END)

    def _on_end(self):
        self.question_queue.put(("end", None))
        self.end_event.set()

    def update_question(self, q_text, q_num):
        self.current_q_frame.pack(fill=tk.X, padx=10, pady=5)
        self.current_q_label.config(text=f"Q{q_num}: {q_text}")
        self.q_num_label.config(text=f"Q: {q_num}")

    def update_answer(self, answer, answer_vi=""):
        self.answer_label.config(text=answer if answer else "(waiting...)")
        self.answer_vi_label.config(text=f"VI: {answer_vi}" if answer_vi else "")

    def add_transcript(self, qa_pairs):
        self.transcript_text.config(state=tk.NORMAL)
        self.transcript_text.delete("1.0", tk.END)
        for i, qa in enumerate(qa_pairs, 1):
            self.transcript_text.insert(tk.END, f"Q{i}: {qa['question']}\n", "question")
            self.transcript_text.insert(tk.END, f"A{i}: {qa['answer']}\n", "answer")
            if qa.get('answer_vi'):
                self.transcript_text.insert(tk.END, f"     VI: {qa['answer_vi']}\n", "vi")
            self.transcript_text.insert(tk.END, "\n")
        self.transcript_text.see(tk.END)
        self.transcript_text.config(state=tk.DISABLED)

    def run(self):
        self.root.mainloop()

    def destroy(self):
        try:
            self.root.quit()
            self.root.destroy()
        except Exception:
            pass


# ─── Candidate Window (OpenCV) ───────────────────────────────────────────────

def draw_candidate_ui(frame, question, letter, confidence, answer_text, fps,
                      translated="", mode="AUTO", motion=0.0,
                      i3d_status="", i3d_frames=0):
    """Draw the candidate view: question + webcam + recognition + answer."""
    h, w = frame.shape[:2]

    # ── Question bar (top) ──
    q_bar_h = 60
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (w, q_bar_h), (70, 100, 70), -1)
    cv2.addWeighted(overlay, 0.85, frame, 0.15, 0, frame)

    if question:
        put_text(frame, "Q:", (10, 5), font_size=16, color=(200, 200, 200))
        max_chars = (w - 50) // 9
        q_line1 = question[:max_chars]
        put_text(frame, q_line1, (35, 5), font_size=18, color=(255, 255, 255))
        if len(question) > max_chars:
            q_line2 = question[max_chars:max_chars * 2]
            put_text(frame, q_line2, (15, 30), font_size=18, color=(255, 255, 255))
    else:
        put_text(frame, "Waiting for HR's question...", (15, 18), font_size=20, color=(180, 180, 180))

    # ── Recognition info bar ──
    info_y = q_bar_h
    overlay2 = frame.copy()
    cv2.rectangle(overlay2, (0, info_y), (w, info_y + 35), (40, 40, 40), -1)
    cv2.addWeighted(overlay2, 0.7, frame, 0.3, 0, frame)

    if letter and letter != "nothing":
        color = (0, 255, 0) if confidence > 0.8 else (0, 255, 255) if confidence > 0.6 else (0, 0, 255)
        cv2.putText(frame, f"{letter} {confidence * 100:.0f}%", (10, info_y + 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
    else:
        cv2.putText(frame, "No hand", (10, info_y + 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (128, 128, 128), 1)

    mode_colors = {"AUTO": (200, 200, 0), "LETTER": (0, 200, 0), "WORD": (0, 200, 255)}
    cv2.putText(frame, f"[{mode}]", (w - 200, info_y + 25),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, mode_colors.get(mode, (200, 200, 200)), 1)
    cv2.putText(frame, f"FPS:{fps:.0f}", (w - 90, info_y + 25),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

    if i3d_status:
        cv2.putText(frame, f"I3D:{i3d_frames}f", (w - 310, info_y + 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 200, 255), 1)
        if "RECORDING" in i3d_status:
            cv2.circle(frame, (w - 325, info_y + 20), 5, (0, 0, 255), -1)

    # ── Answer bar (bottom) ──
    bar_height = 105 if translated else 65
    overlay3 = frame.copy()
    cv2.rectangle(overlay3, (0, h - bar_height), (w, h), (40, 40, 40), -1)
    cv2.addWeighted(overlay3, 0.75, frame, 0.25, 0, frame)

    put_text(frame, "Your answer:", (10, h - bar_height + 3), font_size=13, color=(150, 150, 150))

    display = answer_text + "|"
    max_chars = (w - 20) // 10
    if len(display) > max_chars:
        display = "..." + display[-(max_chars - 3):]
    put_text(frame, display, (10, h - bar_height + 22), font_size=20, color=(255, 255, 255), bold=True)

    if translated:
        put_text(frame, f"VI: {translated}", (10, h - bar_height + 55), font_size=18, color=(0, 255, 200))

    # Controls hint
    put_text(frame, "C:Clear  Bksp:Del  M:Mode  SPACE:Space",
             (10, h - bar_height - 18), font_size=12, color=(140, 140, 140))

    return frame


# ─── OpenCV Loop (runs in thread) ────────────────────────────────────────────

def opencv_loop(question_queue, end_event, hr_update_queue):
    print("=" * 60)
    print("ASL_AI - Interview Support Demo")
    print("=" * 60)

    # Load models
    print("\nLoading models...")
    letter_rec = LetterRecognizer(model_dir="models/letter")
    print(f"  Letter (SVM): {letter_rec.num_classes} classes")

    print("  Loading I3D model...")
    word_rec = WordI3DRecognizer(
        model_path="models/word_i3d/asl100.pt",
        class_list_path="models/word_i3d/wlasl_class_list.txt",
        i3d_module_path="i3d",
        num_classes=100,
    )
    print(f"  Word (I3D): {word_rec.num_classes} classes")
    print("All models loaded!\n")

    # Initialize
    stabilizer = LetterStabilizer(STABILITY_FRAMES, COOLDOWN_FRAMES, MAJORITY_RATIO)
    motion_detector = MotionDetector(MOTION_WINDOW, MOTION_THRESHOLD)
    text_buffer = TextBuffer()
    translator = Translator()
    interview = InterviewManager()
    interview.start()

    translated_text = ""

    # MediaPipe
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

    # State
    user_mode = "AUTO"
    svm_blocked = 0
    i3d_frame_buffer = []
    i3d_recording = False
    moving_frame_count = 0
    no_hand_counter = 0

    # Open webcam
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("ERROR: Cannot open webcam!")
        end_event.set()
        return

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    cv2.namedWindow(CANDIDATE_WINDOW, cv2.WINDOW_NORMAL)
    cv2.resizeWindow(CANDIDATE_WINDOW, 640, 480)
    cv2.moveWindow(CANDIDATE_WINDOW, 580, 100)

    print("Interview started!")
    print("  HR Window: Type questions in Vietnamese, press ENTER to send")
    print("  Candidate Window: Show hand signs to camera\n")

    prev_time = time.time()
    fps = 0
    current_letter = None
    current_confidence = 0.0

    while not end_event.is_set():
        ret, frame = cap.read()
        if not ret:
            break

        # ── Check for new questions from HR ──
        try:
            while not question_queue.empty():
                cmd, data = question_queue.get_nowait()
                if cmd == "question":
                    if interview.current_question:
                        interview.submit_answer()
                        text_buffer.clear()
                        translated_text = ""
                        stabilizer.reset()
                        # Update transcript in HR
                        hr_update_queue.put(("transcript", list(interview.qa_pairs)))
                    interview.set_question(data)
                    q_num = interview.get_question_number()
                    hr_update_queue.put(("question", (data, q_num)))
                    print(f"  HR asked: \"{data}\"")
                elif cmd == "end":
                    end_event.set()
        except Exception:
            pass

        if end_event.is_set():
            break

        frame = cv2.flip(frame, 1)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        rgb.flags.writeable = False
        results = hands.process(rgb)
        rgb.flags.writeable = True

        motion_level = 0.0
        is_moving = False
        i3d_status = ""

        if results.multi_hand_landmarks:
            hand_lm = results.multi_hand_landmarks[0]
            no_hand_counter = 0

            mp_drawing.draw_landmarks(
                frame, hand_lm, mp_hands.HAND_CONNECTIONS,
                mp_drawing_styles.get_default_hand_landmarks_style(),
                mp_drawing_styles.get_default_hand_connections_style(),
            )

            lm_flat = letter_rec.extract_landmarks_flat(hand_lm)
            motion_level, is_moving = motion_detector.update(lm_flat)

            if svm_blocked > 0:
                svm_blocked -= 1

            if user_mode == "AUTO":
                effective_mode = "WORD" if (is_moving or svm_blocked > 0) else "LETTER"
            else:
                effective_mode = user_mode

            # ── LETTER ──
            if effective_mode == "LETTER" and svm_blocked == 0:
                letter, confidence = letter_rec.predict(hand_lm)
                current_letter = letter
                current_confidence = confidence

                if confidence >= CONFIDENCE_THRESHOLD:
                    committed = stabilizer.update(letter, confidence)
                    if committed:
                        text_buffer.add_letter(committed)
                        raw = text_buffer.get_text().strip()
                        if raw:
                            translated_text = translator.translate(raw)
                        interview.update_answer(text_buffer.get_text(), translated_text)
                        hr_update_queue.put(("answer", (text_buffer.get_text(), translated_text)))
                        print(f"  + LETTER '{committed}' => \"{text_buffer.get_text()}\"")

                if not is_moving:
                    moving_frame_count = 0
                    if i3d_recording and len(i3d_frame_buffer) >= I3D_MIN_FRAMES:
                        word, conf, top5 = word_rec.predict(i3d_frame_buffer)
                        if word and conf >= I3D_CONFIDENCE:
                            text_buffer.add_word(word)
                            svm_blocked = WORD_BLOCK_SVM
                            stabilizer.reset()
                            raw = text_buffer.get_text().strip()
                            if raw:
                                translated_text = translator.translate(raw)
                            interview.update_answer(text_buffer.get_text(), translated_text)
                            hr_update_queue.put(("answer", (text_buffer.get_text(), translated_text)))
                            print(f"  + WORD '{word}' ({conf:.0%})")
                    i3d_recording = False
                    i3d_frame_buffer.clear()

            # ── WORD ──
            if effective_mode == "WORD" or is_moving:
                stabilizer.reset()
                moving_frame_count += 1

                if moving_frame_count >= 3:
                    i3d_recording = True

                if i3d_recording:
                    i3d_frame_buffer.append(frame.copy())
                    if len(i3d_frame_buffer) > I3D_MAX_FRAMES:
                        i3d_frame_buffer.pop(0)
                    i3d_status = "RECORDING"

                if user_mode == "WORD":
                    letter, confidence = letter_rec.predict(hand_lm)
                    current_letter = letter
                    current_confidence = confidence
        else:
            current_letter = None
            current_confidence = 0.0
            no_hand_counter += 1

            if no_hand_counter > 10:
                if i3d_recording and len(i3d_frame_buffer) >= I3D_MIN_FRAMES:
                    word, conf, top5 = word_rec.predict(i3d_frame_buffer)
                    if word and conf >= I3D_CONFIDENCE:
                        text_buffer.add_word(word)
                        svm_blocked = WORD_BLOCK_SVM
                        raw = text_buffer.get_text().strip()
                        if raw:
                            translated_text = translator.translate(raw)
                        interview.update_answer(text_buffer.get_text(), translated_text)
                        hr_update_queue.put(("answer", (text_buffer.get_text(), translated_text)))
                        print(f"  + WORD '{word}' ({conf:.0%})")

                stabilizer.reset()
                motion_detector.reset()
                i3d_recording = False
                i3d_frame_buffer.clear()
                moving_frame_count = 0

        # FPS
        now = time.time()
        fps = 1.0 / (now - prev_time) if (now - prev_time) > 0 else 0
        prev_time = now

        # Display mode
        if results.multi_hand_landmarks:
            display_mode = ("WORD" if (is_moving or svm_blocked > 0) else "LETTER") if user_mode == "AUTO" else user_mode
        else:
            display_mode = user_mode

        # ── Draw Candidate Window ──
        candidate_frame = draw_candidate_ui(
            frame, interview.current_question,
            current_letter, current_confidence,
            text_buffer.get_text(), fps, translated_text,
            display_mode, motion_level, i3d_status, len(i3d_frame_buffer),
        )
        cv2.imshow(CANDIDATE_WINDOW, candidate_frame)

        # ── Keyboard handling (candidate window) ──
        key = cv2.waitKey(1) & 0xFF

        if key == 27:  # ESC
            end_event.set()
            break

        elif key == 8:  # Backspace
            text_buffer.backspace()
            raw = text_buffer.get_text().strip()
            translated_text = translator.translate(raw) if raw else ""
            interview.update_answer(text_buffer.get_text(), translated_text)
            hr_update_queue.put(("answer", (text_buffer.get_text(), translated_text)))

        elif key == ord(' '):
            if i3d_recording and len(i3d_frame_buffer) >= I3D_MIN_FRAMES:
                word, conf, top5 = word_rec.predict(i3d_frame_buffer)
                if word and conf >= I3D_CONFIDENCE:
                    text_buffer.add_word(word)
                    svm_blocked = WORD_BLOCK_SVM
                    stabilizer.reset()
                    raw = text_buffer.get_text().strip()
                    if raw:
                        translated_text = translator.translate(raw)
                    interview.update_answer(text_buffer.get_text(), translated_text)
                    hr_update_queue.put(("answer", (text_buffer.get_text(), translated_text)))
                    print(f"  + WORD '{word}' ({conf:.0%})")
                i3d_frame_buffer.clear()
                i3d_recording = False
                moving_frame_count = 0
            else:
                text_buffer.add_space()
                interview.update_answer(text_buffer.get_text(), translated_text)
                hr_update_queue.put(("answer", (text_buffer.get_text(), translated_text)))

        elif key == ord('c') or key == ord('C'):
            text_buffer.clear()
            translated_text = ""
            stabilizer.reset()
            i3d_frame_buffer.clear()
            i3d_recording = False
            moving_frame_count = 0
            interview.update_answer("", "")
            hr_update_queue.put(("answer", ("", "")))

        elif key == ord('m') or key == ord('M'):
            modes = ["AUTO", "LETTER", "WORD"]
            idx = modes.index(user_mode)
            user_mode = modes[(idx + 1) % len(modes)]
            print(f"  [Mode: {user_mode}]")
            stabilizer.reset()
            i3d_frame_buffer.clear()
            i3d_recording = False
            moving_frame_count = 0

    # End interview
    interview.end()
    filepath = interview.save_transcript()
    print(f"\n{'=' * 50}")
    print("Interview ended!")
    print(interview.get_transcript_text())
    print(f"\nTranscript saved to: {filepath}")
    print(f"{'=' * 50}")

    cap.release()
    cv2.destroyAllWindows()
    hands.close()
    end_event.set()


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    question_queue = queue.Queue()
    hr_update_queue = queue.Queue()
    end_event = threading.Event()

    # Create HR window (tkinter)
    hr_win = HRWindow(question_queue, end_event)

    # Start OpenCV loop in a thread
    cv_thread = threading.Thread(
        target=opencv_loop,
        args=(question_queue, end_event, hr_update_queue),
        daemon=True,
    )
    cv_thread.start()

    # Process HR updates from OpenCV thread
    def poll_updates():
        if end_event.is_set():
            hr_win.destroy()
            return
        try:
            while not hr_update_queue.empty():
                cmd, data = hr_update_queue.get_nowait()
                if cmd == "question":
                    q_text, q_num = data
                    hr_win.update_question(q_text, q_num)
                elif cmd == "answer":
                    answer, answer_vi = data
                    hr_win.update_answer(answer, answer_vi)
                elif cmd == "transcript":
                    hr_win.add_transcript(data)
        except Exception:
            pass
        hr_win.root.after(50, poll_updates)

    hr_win.root.after(50, poll_updates)

    # Run tkinter mainloop (main thread)
    hr_win.run()

    # Cleanup
    end_event.set()
    cv_thread.join(timeout=3)


if __name__ == "__main__":
    main()
