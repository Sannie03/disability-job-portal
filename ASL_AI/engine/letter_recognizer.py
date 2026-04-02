import pickle
import numpy as np
from pathlib import Path


class LetterRecognizer:
    """thư viện nhận diện chữ cái ASL từ hand landmarks của MediaPipe bằng SVM đã train sẵn."""

    def __init__(self, model_dir="models/letter"):
        model_dir = Path(model_dir)
        with open(model_dir / "svm_model.pkl", "rb") as f:
            self.svm = pickle.load(f)
        with open(model_dir / "scaler.pkl", "rb") as f: 
            "chuẩn hóa dữ liệu đầu vào giống lúc train"
            self.scaler = pickle.load(f)
        with open(model_dir / "label_encoder.pkl", "rb") as f:
            "để giải mã nhãn số về chữ cái tương ứng"
            self.label_encoder = pickle.load(f)

        self.num_classes = len(self.label_encoder.classes_)

    @staticmethod
    def extract_landmarks(hand_landmarks):
        """Convert MediaPipe hand landmarks to 63-dim feature vector (21 points x 3 coords)."""
        coords = []
        for point in hand_landmarks.landmark:
            coords.extend([point.x, point.y, point.z])
            "mang 63 giá trị là mảng 2 chiều 1x63 để đưa vào model SVM dự đoán"
        return np.array(coords).reshape(1, -1) 
    

    @staticmethod
    def extract_landmarks_flat(hand_landmarks):
        """Return flat list of 63 values (for word sequence buffer)."""
        coords = []
        for point in hand_landmarks.landmark:
            coords.extend([point.x, point.y, point.z])
        return coords

    def predict(self, hand_landmarks):
        """Predict letter from MediaPipe hand landmarks.

        Returns (letter, confidence).
        """
        features = self.extract_landmarks(hand_landmarks)
        features_scaled = self.scaler.transform(features)

        prediction = self.svm.predict(features_scaled)[0]
        probabilities = self.svm.predict_proba(features_scaled)[0]
        confidence = probabilities[prediction]
        letter = self.label_encoder.inverse_transform([prediction])[0]

        return letter, float(confidence)
