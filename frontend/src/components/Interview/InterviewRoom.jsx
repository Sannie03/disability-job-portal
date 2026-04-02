import { useContext, useEffect, useRef, useState, useCallback } from "react";
import { Context } from "../../main";
import { useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import api from "../../utils/api";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import "./InterviewRoom.css";

const ASL_SERVER = "http://localhost:5001";

const InterviewRoom = () => {
  const { applicationId } = useParams();
  const { user, isAuthorized } = useContext(Context);
  const navigate = useNavigate();

  const [connected, setConnected] = useState(false);
  const [roomStatus, setRoomStatus] = useState({ hr: false, candidate: false });
  const [question, setQuestion] = useState("");
  const [questionInput, setQuestionInput] = useState("");
  const [questionNumber, setQuestionNumber] = useState(0);
  const [answerText, setAnswerText] = useState("");
  const [answerVi, setAnswerVi] = useState("");
  const [recognition, setRecognition] = useState({ letter: null, confidence: 0, hand_detected: false });
  const [qaPairs, setQaPairs] = useState([]);
  const [ended, setEnded] = useState(false);
  const [webcamActive, setWebcamActive] = useState(false);

  const socketRef = useRef(null);
  const videoRef = useRef(null);
  const cameraRef = useRef(null);
  const handsRef = useRef(null);

  const isHR = user?.role === "Employer";
  const isCandidate = user?.role === "Job Seeker";

  // Connect to ASL SocketIO server
  useEffect(() => {
    if (!isAuthorized) {
      navigate("/login");
      return;
    }

    const socket = io(ASL_SERVER, {
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join_room", {
        room_id: applicationId,
        role: user.role,
      });
    });

    socket.on("disconnect", () => setConnected(false));
    socket.on("room_status", (data) => setRoomStatus(data));

    socket.on("new_question", (data) => {
      setQuestion(data.text);
      setQuestionNumber(data.number);
      setAnswerText("");
      setAnswerVi("");
    });

    socket.on("answer_update", (data) => {
      setAnswerText(data.text);
      setAnswerVi(data.translated);
    });

    socket.on("recognition_result", (data) => {
      setRecognition(data);
    });

    socket.on("answer_submitted", (data) => {
      setQaPairs(data.qa_pairs);
      setAnswerText("");
      setAnswerVi("");
      toast.success("Đã gửi câu trả lời!");
    });

    socket.on("interview_ended", (data) => {
      setQaPairs(data.transcript);
      setEnded(true);
      stopWebcam();
      toast.success("Phỏng vấn đã kết thúc!");

      if (isHR && data.transcript.length > 0) {
        api.put(`/application/save-transcript/${applicationId}`, {
          transcript: data.transcript,
        }).catch(() => {});
      }
    });

    return () => {
      stopWebcam();
      socket.disconnect();
    };
  }, []);

  // MediaPipe Hands callback - gửi landmarks lên server
  const onHandResults = useCallback((results) => {
    if (!socketRef.current?.connected) return;

    const hand_detected = results.multiHandLandmarks && results.multiHandLandmarks.length > 0;
    let landmarks = [];

    if (hand_detected) {
      const hand = results.multiHandLandmarks[0];
      for (const point of hand) {
        // Lật x để khớp với cv2.flip(frame, 1) mà model đã train
        landmarks.push(1 - point.x, point.y, point.z);
      }
    }

    socketRef.current.emit("send_landmarks", {
      room_id: applicationId,
      landmarks,
      hand_detected,
    });
  }, [applicationId]);

  // Start webcam + MediaPipe Hands (candidate only)
  const startWebcam = async () => {
    try {
      const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });
      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5,
      });
      hands.onResults(onHandResults);
      handsRef.current = hands;
      setWebcamActive(true);
    } catch (err) {
      toast.error("Không thể khởi tạo MediaPipe: " + err.message);
    }
  };

  // Attach camera sau khi video element render
  useEffect(() => {
    if (!webcamActive || !videoRef.current || !handsRef.current) return;

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        if (handsRef.current && videoRef.current) {
          await handsRef.current.send({ image: videoRef.current });
        }
      },
      width: 640,
      height: 480,
    });
    camera.start();
    cameraRef.current = camera;

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
    };
  }, [webcamActive]);

  const stopWebcam = () => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    if (handsRef.current) {
      handsRef.current.close();
      handsRef.current = null;
    }
    setWebcamActive(false);
  };

  const handleSendQuestion = (e) => {
    e.preventDefault();
    if (!questionInput.trim()) return;
    socketRef.current?.emit("send_question", {
      room_id: applicationId,
      text: questionInput.trim(),
    });
    setQuestionInput("");
  };

  const handleClear = () => {
    socketRef.current?.emit("clear_answer", { room_id: applicationId });
  };


  const handleSubmitAnswer = () => {
    if (!question) {
      toast.error("Chưa có câu hỏi từ HR!");
      return;
    }
    if (!answerText.trim()) {
      toast.error("Chưa có câu trả lời!");
      return;
    }
    socketRef.current?.emit("submit_answer", { room_id: applicationId });
  };

  const handleEndInterview = () => {
    if (window.confirm("Bạn có chắc muốn kết thúc phỏng vấn?")) {
      socketRef.current?.emit("end_interview", { room_id: applicationId });
    }
  };


  const getConfidenceColor = (conf) => {
    if (conf > 0.8) return "high";
    if (conf > 0.6) return "medium";
    return "low";
  };

  if (ended) {
    return (
      <section className="interview-room">
        <div className="container">
          <div className="ended-panel">
            <h1>Phỏng vấn đã kết thúc</h1>
            <div className="transcript-final">
              <h2>Bản ghi phỏng vấn ({qaPairs.length} câu hỏi)</h2>
              {qaPairs.map((qa, i) => (
                <div key={i} className="qa-item">
                  <p className="qa-question">Q{i + 1}: {qa.question}</p>
                  <p className="qa-answer">A: {qa.answer}</p>
                  {qa.answer_vi && <p className="qa-vi">VI: {qa.answer_vi}</p>}
                </div>
              ))}
            </div>
            <button className="btn-back" onClick={() => navigate("/interviews")}>
              Quay lại lịch phỏng vấn
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="interview-room">
      <div className="container">
        {/* Header */}
        <header className="room-header">
          <div className="header-left">
            <h1>Phỏng vấn Video ASL</h1>
            <span className="room-id">Room: {applicationId.slice(-6)}</span>
          </div>
          <div className="room-status">
            <span className={`status-chip ${connected ? "online" : "offline"}`}>
              {connected ? "Đã kết nối" : "Đang kết nối..."}
            </span>
            <span className={`status-chip ${roomStatus.hr ? "online" : "waiting"}`}>
              HR {roomStatus.hr ? "Online" : "Offline"}
            </span>
            <span className={`status-chip ${roomStatus.candidate ? "online" : "waiting"}`}>
              Ứng viên {roomStatus.candidate ? "Online" : "Offline"}
            </span>
          </div>
          {isHR && (
            <button className="btn-end" onClick={handleEndInterview}>
              Kết thúc phỏng vấn
            </button>
          )}
        </header>

        {/* Connection warning */}
        {connected && isHR && !roomStatus.candidate && (
          <div className="connection-notice">
            Đang chờ ứng viên kết nối vào phòng...
          </div>
        )}
        {connected && isCandidate && !roomStatus.hr && (
          <div className="connection-notice">
            Đang chờ HR kết nối vào phòng...
          </div>
        )}

        <div className="room-layout">
          {/* ─── Left: Webcam + Recognition ─── */}
          <div className="webcam-panel">
            {isCandidate && (
              <>
                {!webcamActive ? (
                  <div className="webcam-placeholder">
                    <button className="btn-start-cam" onClick={startWebcam}>
                      Bật Webcam
                    </button>
                    <p>Bật webcam để bắt đầu nhận dạng ngôn ngữ ký hiệu</p>
                  </div>
                ) : (
                  <>
                    <div className="video-wrapper">
                      <video ref={videoRef} autoPlay playsInline muted className="webcam-video" />
                      <div className={`recognition-badge ${recognition.hand_detected ? getConfidenceColor(recognition.confidence) : "no-hand"}`}>
                        {recognition.hand_detected ? (
                          <>
                            <span className="badge-letter">{recognition.letter}</span>
                            <span className="badge-conf">{(recognition.confidence * 100).toFixed(0)}%</span>
                          </>
                        ) : (
                          <span className="badge-no-hand">Không thấy tay</span>
                        )}
                      </div>
                    </div>

                    {/* Live answer preview */}
                    <div className="live-answer-bar">
                      <span className="live-label">Đang gõ:</span>
                      <span className="live-text">{answerText || "..."}</span>
                    </div>

                    <div className="candidate-controls">
                      <button onClick={handleClear} title="Xóa toàn bộ">Xóa hết</button>
                      <button
                        className="btn-submit-answer"
                        onClick={handleSubmitAnswer}
                        disabled={!question || !answerText.trim()}
                        title={!question ? "Chờ HR gửi câu hỏi" : "Gửi câu trả lời"}
                      >
                        Gửi trả lời
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

            {isHR && (
              <div className="hr-webcam-view">
                <div className="hr-recognition-panel">
                  <h3>Nhận dạng ASL</h3>
                  {!roomStatus.candidate ? (
                    <p className="waiting-text">Đang chờ ứng viên kết nối...</p>
                  ) : !recognition.hand_detected ? (
                    <div className="hr-no-hand">
                      <span className="hr-no-hand-icon">&#9995;</span>
                      <p>Ứng viên chưa đưa tay ra</p>
                    </div>
                  ) : (
                    <div className="hr-live-recognition">
                      <div className={`hr-detected-letter ${getConfidenceColor(recognition.confidence)}`}>
                        {recognition.letter}
                      </div>
                      <div className="hr-confidence-bar">
                        <div
                          className={`hr-confidence-fill ${getConfidenceColor(recognition.confidence)}`}
                          style={{ width: `${recognition.confidence * 100}%` }}
                        />
                      </div>
                      <span className="hr-confidence-text">
                        {(recognition.confidence * 100).toFixed(0)}% chính xác
                      </span>
                    </div>
                  )}
                </div>

                {/* HR: Live answer display */}
                <div className="hr-live-answer">
                  <span className="live-label">Ứng viên đang gõ:</span>
                  <p className="hr-answer-text">{answerText || "(Đang chờ...)"}</p>
                  {answerVi && <p className="hr-answer-vi">Tiếng Việt: {answerVi}</p>}
                </div>
              </div>
            )}
          </div>

          {/* ─── Right: Q&A Panel ─── */}
          <div className="qa-panel">
            {/* HR: Question input - đặt lên đầu */}
            {isHR && (
              <form className="question-form" onSubmit={handleSendQuestion}>
                <div className="form-header">Gửi câu hỏi cho ứng viên</div>
                <div className="form-row">
                  <input
                    type="text"
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    placeholder="Nhập câu hỏi "
                    autoFocus
                  />
                  <button type="submit" disabled={!questionInput.trim()}>
                    Gửi
                  </button>
                </div>
              </form>
            )}

            {/* Current Q&A */}
            <div className="current-qa">
              <div className="question-display">
                <label>Câu hỏi {questionNumber > 0 ? `#${questionNumber}` : ""}:</label>
                <p className={`question-text ${!question ? "empty" : ""}`}>
                  {question || "(Chờ HR gửi câu hỏi...)"}
                </p>
              </div>

              <div className="answer-display">
                <label>Câu trả lời:</label>
                <p className={`answer-text ${!answerText ? "empty" : ""}`}>
                  {answerText || "(Đang chờ ứng viên...)"}
                </p>
                {answerVi && <p className="answer-vi">Tiếng Việt: {answerVi}</p>}
              </div>
            </div>

            {/* Transcript */}
            {qaPairs.length > 0 && (
              <div className="transcript">
                <h3>Bản ghi ({qaPairs.length} câu)</h3>
                {qaPairs.map((qa, i) => (
                  <div key={i} className="qa-item">
                    <p className="qa-question">Q{i + 1}: {qa.question}</p>
                    <p className="qa-answer">A: {qa.answer}</p>
                    {qa.answer_vi && <p className="qa-vi">VI: {qa.answer_vi}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default InterviewRoom;
