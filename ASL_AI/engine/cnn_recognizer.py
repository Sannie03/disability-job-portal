import numpy as np
from pathlib import Path

import os
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"


class CNNRecognizer:
    """MobileNetV2-based ASL letter recognition from webcam frames."""

    # 29 Class names sorted alphabetically (same order as flow_from_directory)
    CLASS_NAMES = [
        "A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
        "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T",
        "U", "V", "W", "X", "Y", "Z", "del", "nothing", "space",
    ]

    def __init__(self, model_path="models/letter/mobilenet_model.h5"):
        from tensorflow.keras.models import load_model

        self.model = load_model(str(Path(model_path).resolve()))
        self.img_size = 224
        self.num_classes = len(self.CLASS_NAMES)

    def predict_from_frame(self, frame, hand_landmarks=None):
        """Dua vao frame webcam va hand_landmarks, 
        tra ve du doan chu cai va do tin cay.
        """
        import cv2

        if hand_landmarks is not None:
            frame = self._crop_hand(frame, hand_landmarks)

        img = cv2.resize(frame, (self.img_size, self.img_size))
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img = img.astype(np.float32) / 255.0
        img = np.expand_dims(img, axis=0)

        probs = self.model.predict(img, verbose=0)[0]
        idx = int(np.argmax(probs))
        confidence = float(probs[idx])
        letter = self.CLASS_NAMES[idx]

        return letter, confidence

    @staticmethod
    def _crop_hand(frame, hand_landmarks, padding=40):
        """Cắt vùng quanh các điểm landmark bàn tay với khoảng cách bù."""
        h, w = frame.shape[:2]
        xs = [lm.x * w for lm in hand_landmarks.landmark]
        ys = [lm.y * h for lm in hand_landmarks.landmark]

        x_min = max(0, int(min(xs)) - padding)
        x_max = min(w, int(max(xs)) + padding)
        y_min = max(0, int(min(ys)) - padding)
        y_max = min(h, int(max(ys)) + padding)

        cropped = frame[y_min:y_max, x_min:x_max]
        if cropped.size == 0:
            return frame
        return cropped
