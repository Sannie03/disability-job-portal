"""Real Flask/Socket.IO handlers and committed SVM; translation is isolated from the network."""
import os
import sys
import time
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ["ASL_TOKEN_SECRET"] = "test-asl-secret-00000000000000000000000000000"
os.environ["FRONTEND_URL"] = "https://52hzconnect.site"

import jwt
from api import server

ROOM = "333333333333333333333333"
OTHER_ROOM = "444444444444444444444444"


def ticket(role="Job Seeker", room=ROOM, **overrides):
    now = int(time.time())
    claims = {
        "sub": "111111111111111111111111" if role == "Employer" else "222222222222222222222222",
        "room_id": room, "role": role, "iat": now, "exp": now + 300,
        "aud": "asl-interview", "iss": "careerconnect-api", **overrides,
    }
    return jwt.encode(claims, server.TOKEN_SECRET, algorithm="HS256")


class InterviewSecurityTests(unittest.TestCase):
    def setUp(self):
        server.rooms.clear()
        server.connections.clear()
        self.clients = []
        self.translation = patch.object(server.Translator, "translate", return_value="Bản dịch thử")
        self.translation.start()

    def tearDown(self):
        for client in self.clients:
            if client.is_connected():
                client.disconnect()
        self.translation.stop()

    def connect(self, role="Job Seeker", room=ROOM, token=None, join=True, **join_payload):
        client = server.socketio.test_client(server.app, auth={"token": token or ticket(role, room)})
        self.clients.append(client)
        if client.is_connected() and join:
            client.emit("join_room", {"room_id": room, **join_payload})
        return client

    def answer(self, client, room=ROOM, letter="A"):
        server.rooms[room]["last_time"] = 0
        server.rooms[room]["cooldown"] = 0
        with patch.object(server, "predict_from_landmarks", return_value=(letter, 0.99)):
            client.emit("send_landmarks", {"room_id": room, "landmarks": [0.1] * 63, "hand_detected": True})

    def test_missing_forged_expired_wrong_audience_or_admin_tickets_rejected(self):
        client = server.socketio.test_client(server.app)
        self.assertFalse(client.is_connected())
        forged = jwt.encode({"role": "Employer"}, "untrusted-secret-000000000000000000000000000", algorithm="HS256")
        for token in [forged, ticket(exp=int(time.time()) - 1), ticket(aud="login"), ticket("Admin"), ticket(room="bad")]:
            with self.subTest(token=token[:20]):
                client = self.connect(token=token)
                self.assertFalse(client.is_connected())
        self.assertEqual(server.rooms, {})

    def test_client_supplied_role_cannot_promote_candidate_to_hr(self):
        client = self.connect()
        # Rejoin with a forged role: membership still follows the signed ticket.
        client.emit("join_room", {"room_id": ROOM, "role": "Employer"})
        self.assertFalse(server.rooms[ROOM]["hr_sids"])
        self.assertTrue(server.rooms[ROOM]["candidate_sids"])
        client.emit("send_question", {"room_id": ROOM, "text": "forged question"})
        client.emit("end_interview", {"room_id": ROOM})
        self.assertEqual(server.rooms[ROOM]["current_question"], "")
        self.assertTrue(server.rooms[ROOM]["is_active"])

    def test_hr_cannot_edit_or_submit_candidate_answer(self):
        hr = self.connect("Employer")
        candidate = self.connect()
        hr.emit("send_question", {"room_id": ROOM, "text": "Question?"})
        self.answer(candidate)
        for event in ["clear_answer", "backspace", "add_space", "submit_answer", "send_frame"]:
            hr.emit(event, {"room_id": ROOM})
        self.assertEqual(server.rooms[ROOM]["text_buffer"].get_text(), "A")
        self.assertEqual(server.rooms[ROOM]["qa_pairs"], [])

    def test_other_room_cannot_be_joined_read_or_mutated(self):
        owner = self.connect("Employer")
        outsider = self.connect("Employer", OTHER_ROOM)
        outsider.emit("join_room", {"room_id": ROOM})
        outsider.emit("send_question", {"room_id": ROOM, "text": "attack"})
        outsider.emit("end_interview", {"room_id": ROOM})
        owner.emit("send_question", {"room_id": ROOM, "text": "Private question"})
        events = outsider.get_received()
        self.assertNotIn("Private question", str(events))
        self.assertEqual(server.rooms[ROOM]["current_question"], "Private question")
        self.assertTrue(server.rooms[ROOM]["is_active"])

    def test_unjoined_connection_cannot_create_or_mutate_rooms(self):
        hr = self.connect("Employer", join=False)
        hr.emit("send_question", {"room_id": ROOM, "text": "question"})
        hr.emit("end_interview", {"room_id": ROOM})
        self.assertEqual(server.rooms, {})

    def test_expiration_is_checked_again_after_connection(self):
        candidate = self.connect()
        identity = next(iter(server.connections.values()))
        identity["token"] = ticket(exp=int(time.time()) - 1)
        candidate.emit("clear_answer", {"room_id": ROOM})
        self.assertFalse(candidate.is_connected())

    def test_submit_closes_question_and_prevents_duplicate_transcript_entries(self):
        hr = self.connect("Employer")
        candidate = self.connect()
        hr.emit("send_question", {"room_id": ROOM, "text": "Question one?"})
        self.answer(candidate)
        candidate.emit("submit_answer", {"room_id": ROOM})
        candidate.emit("submit_answer", {"room_id": ROOM})
        hr.emit("send_question", {"room_id": ROOM, "text": "Question two?"})
        self.answer(candidate, letter="B")
        hr.emit("end_interview", {"room_id": ROOM})
        pairs = server.rooms[ROOM]["qa_pairs"]
        self.assertEqual([(qa["question"], qa["answer"]) for qa in pairs], [("Question one?", "A"), ("Question two?", "B")])
        self.assertTrue(all(qa["answer_vi"] for qa in pairs))
        self.assertFalse(server.rooms[ROOM]["is_active"])
        hr.emit("send_question", {"room_id": ROOM, "text": "Cannot reopen"})
        self.assertEqual(len(server.rooms[ROOM]["qa_pairs"]), 2)

    def test_reconnect_restores_transcript_and_multiple_tabs_keep_presence(self):
        hr = self.connect("Employer")
        hr_second_tab = self.connect("Employer")
        candidate = self.connect()
        hr.emit("send_question", {"text": "Question?"})
        self.answer(candidate)
        candidate.emit("submit_answer", {})
        hr.disconnect()
        self.assertTrue(server.room_status(server.rooms[ROOM])["hr"])
        hr_second_tab.disconnect()
        candidate.disconnect()
        resumed = self.connect("Employer")
        events = resumed.get_received()
        transcript = next(event["args"][0]["qa_pairs"] for event in events if event["name"] == "transcript_update")
        self.assertEqual(transcript[0]["answer"], "A")

    def test_clear_resets_last_letter_and_allows_same_letter_again(self):
        hr = self.connect("Employer")
        candidate = self.connect()
        hr.emit("send_question", {"text": "Question?"})
        self.answer(candidate)
        candidate.emit("clear_answer", {})
        self.answer(candidate)
        self.assertEqual(server.rooms[ROOM]["text_buffer"].get_text(), "A")

    def test_health_cors_and_authenticated_rest_prediction_with_real_model(self):
        http = server.app.test_client()
        allowed = http.get("/health", headers={"Origin": "https://52hzconnect.site"})
        self.assertEqual(allowed.status_code, 200)
        self.assertEqual(allowed.headers["Access-Control-Allow-Origin"], "https://52hzconnect.site")
        denied = http.get("/health", headers={"Origin": "https://untrusted.example"})
        self.assertNotIn("Access-Control-Allow-Origin", denied.headers)
        self.assertEqual(http.post("/recognize/landmark", json={"landmarks": [0.1] * 63}).status_code, 401)
        headers = {"Authorization": f"Bearer {ticket()}"}
        for values in [[0.1] * 62, ["bad"] * 63, [float("nan")] * 63, [True] * 63]:
            response = http.post("/recognize/landmark", json={"landmarks": values}, headers=headers)
            self.assertEqual(response.status_code, 400)
        response = http.post("/recognize/landmark", json={"landmarks": [0.1] * 63}, headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertIn(response.json["prediction"], server.letter_recognizer.label_encoder.classes_)
        self.assertGreaterEqual(response.json["confidence"], 0)
        self.assertLessEqual(response.json["confidence"], 1)


if __name__ == "__main__":
    unittest.main()
