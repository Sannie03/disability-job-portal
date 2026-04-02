import pickle
import numpy as np
from pathlib import Path


class MLPRecognizer:
    """MLP-based ASL letter recognition using MediaPipe hand landmarks."""

    def __init__(self, model_dir="models/letter"):
        model_dir = Path(model_dir)
        with open(model_dir / "mlp_model.pkl", "rb") as f:
            self.mlp = pickle.load(f)
        with open(model_dir / "scaler.pkl", "rb") as f:
            self.scaler = pickle.load(f)
        with open(model_dir / "label_encoder.pkl", "rb") as f:
            self.label_encoder = pickle.load(f)

        self.num_classes = len(self.label_encoder.classes_)

    @staticmethod
    def extract_landmarks(hand_landmarks):
        """Convert MediaPipe hand landmarks to 63-dim feature vector."""
        coords = []
        for point in hand_landmarks.landmark:
            coords.extend([point.x, point.y, point.z])
        return np.array(coords).reshape(1, -1)

    def predict(self, hand_landmarks):
        """Predict letter from MediaPipe hand landmarks.

        Returns (letter, confidence).
        """
        features = self.extract_landmarks(hand_landmarks)
        features_scaled = self.scaler.transform(features)

        prediction = self.mlp.predict(features_scaled)[0]
        probabilities = self.mlp.predict_proba(features_scaled)[0]
        confidence = probabilities[prediction]
        letter = self.label_encoder.inverse_transform([prediction])[0]

        return letter, float(confidence)
