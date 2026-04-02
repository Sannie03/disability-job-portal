class LetterStabilizer:
    """Commit letters using majority voting for noise-resistant recognition."""

    def __init__(self, stability_frames=10, cooldown_frames=7, majority_ratio=0.7):
        self.stability_frames = stability_frames
        self.cooldown_frames = cooldown_frames
        self.majority_ratio = majority_ratio
        self.history = []
        self.cooldown_counter = 0

    def update(self, letter, confidence):
        """Add a prediction. Returns committed letter or None."""
        if self.cooldown_counter > 0:
            self.cooldown_counter -= 1
            return None

        self.history.append((letter, confidence))
        if len(self.history) > self.stability_frames:
            self.history = self.history[-self.stability_frames:]

        if len(self.history) < self.stability_frames:
            return None

        # Count votes weighted by confidence
        votes = {}
        for l, c in self.history:
            votes[l] = votes.get(l, 0) + c

        best_letter = max(votes, key=votes.get)
        count = sum(1 for l, _ in self.history if l == best_letter)

        if count >= self.stability_frames * self.majority_ratio:
            self.cooldown_counter = self.cooldown_frames
            self.history.clear()
            return best_letter

        return None

    def reset(self):
        self.history.clear()
        self.cooldown_counter = 0
