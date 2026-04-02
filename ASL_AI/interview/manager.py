"""Interview session manager - tracks Q&A pairs and generates transcript."""

import json
from datetime import datetime
from pathlib import Path


class InterviewManager:
    """Manage an interview session: questions, answers, and transcript."""

    def __init__(self):
        self.qa_pairs = []          # List of {"question": str, "answer": str, "answer_vi": str}
        self.current_question = ""
        self.current_answer = ""
        self.current_answer_vi = ""
        self.started_at = None
        self.is_active = False

    def start(self):
        self.qa_pairs.clear()
        self.current_question = ""
        self.current_answer = ""
        self.current_answer_vi = ""
        self.started_at = datetime.now()
        self.is_active = True

    def set_question(self, question):
        """HR sets a new question."""
        # Save previous Q&A if exists
        if self.current_question and self.current_answer:
            self._save_current()
        self.current_question = question.strip()
        self.current_answer = ""
        self.current_answer_vi = ""

    def update_answer(self, text, text_vi=""):
        """Update current answer from recognition engine."""
        self.current_answer = text
        self.current_answer_vi = text_vi

    def submit_answer(self):
        """Submit current answer and prepare for next question."""
        if self.current_question:
            self._save_current()
            self.current_question = ""
            self.current_answer = ""
            self.current_answer_vi = ""

    def _save_current(self):
        self.qa_pairs.append({
            "question": self.current_question,
            "answer": self.current_answer.strip(),
            "answer_vi": self.current_answer_vi.strip(),
        })

    def get_question_number(self):
        return len(self.qa_pairs) + (1 if self.current_question else 0)

    def end(self):
        """End the interview and save any remaining Q&A."""
        if self.current_question and self.current_answer:
            self._save_current()
        self.is_active = False

    def get_transcript_text(self):
        """Generate a readable transcript."""
        lines = []
        lines.append("=" * 50)
        lines.append("INTERVIEW TRANSCRIPT")
        if self.started_at:
            lines.append(f"Date: {self.started_at.strftime('%Y-%m-%d %H:%M')}")
        lines.append("=" * 50)

        for i, qa in enumerate(self.qa_pairs, 1):
            lines.append(f"\nQ{i}: {qa['question']}")
            lines.append(f"A{i}: {qa['answer']}")
            if qa['answer_vi']:
                lines.append(f"    (VI: {qa['answer_vi']})")

        # Include current unanswered question
        if self.current_question and self.current_answer:
            i = len(self.qa_pairs) + 1
            lines.append(f"\nQ{i}: {self.current_question}")
            lines.append(f"A{i}: {self.current_answer}")
            if self.current_answer_vi:
                lines.append(f"    (VI: {self.current_answer_vi})")

        lines.append("\n" + "=" * 50)
        return "\n".join(lines)

    def save_transcript(self, directory="transcripts"):
        """Save transcript to file. Returns file path."""
        Path(directory).mkdir(exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filepath = Path(directory) / f"interview_{timestamp}.txt"

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(self.get_transcript_text())

        # Also save JSON
        json_path = Path(directory) / f"interview_{timestamp}.json"
        data = {
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "ended_at": datetime.now().isoformat(),
            "qa_pairs": self.qa_pairs,
        }
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        return str(filepath)
