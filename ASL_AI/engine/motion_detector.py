import numpy as np


class MotionDetector:
    """Detect hand movement to distinguish static (letter) vs dynamic (word) gestures."""

    def __init__(self, window=5, threshold=0.015):
        self.window = window
        self.threshold = threshold
        self.prev_landmarks = []

    def update(self, landmarks_flat):
        """Return (motion_level, is_moving)."""
        self.prev_landmarks.append(landmarks_flat)
        if len(self.prev_landmarks) > self.window:
            self.prev_landmarks.pop(0)

        if len(self.prev_landmarks) < 2:
            return 0.0, False

        total_motion = 0.0
        for i in range(1, len(self.prev_landmarks)):
            diff = np.array(self.prev_landmarks[i]) - np.array(self.prev_landmarks[i - 1])
            total_motion += np.mean(np.abs(diff))
        avg_motion = total_motion / (len(self.prev_landmarks) - 1)

        return avg_motion, avg_motion > self.threshold

    def reset(self):
        self.prev_landmarks.clear()
