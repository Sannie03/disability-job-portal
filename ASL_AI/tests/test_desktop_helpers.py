import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from engine.optional_word_recognizer import load_word_recognizer
from interview.manager import InterviewManager


class DesktopHelpersTests(unittest.TestCase):
    def test_missing_i3d_assets_fall_back_without_import_error(self):
        self.assertIsNone(load_word_recognizer())

    def test_ending_interview_does_not_duplicate_last_answer_in_text_transcript(self):
        interview = InterviewManager()
        interview.start()
        interview.set_question("Question?")
        interview.update_answer("Answer", "Câu trả lời")
        interview.end()
        self.assertEqual(len(interview.qa_pairs), 1)
        self.assertEqual(interview.get_transcript_text().count("Q1: Question?"), 1)
        self.assertNotIn("Q2:", interview.get_transcript_text())
