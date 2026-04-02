import { useContext, useEffect, useState } from "react";
import { Context } from "../../main";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import toast from "react-hot-toast";
import {
  FiChevronLeft,
  FiChevronRight,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiMail,
  FiPhone,
  FiMapPin,
  FiVideo,
  FiChevronRight as FiArrow,
  FiSave,
  FiFileText,
  FiEdit3,
  FiX,
} from "react-icons/fi";
import "./InterviewDashboard.css";

const DAY_HEADERS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const InterviewDashboard = () => {
  const { user, isAuthorized } = useContext(Context);
  const navigate = useNavigate();

  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState(null);
  const [dailyInterviews, setDailyInterviews] = useState([]);

  const [notesMap, setNotesMap] = useState({});
  const [savingNotes, setSavingNotes] = useState({});
  const [openNotes, setOpenNotes] = useState({});

  // Reschedule state
  const [rescheduleId, setRescheduleId] = useState(null);
  const [rescheduleForm, setRescheduleForm] = useState({
    interviewDate: "",
    interviewTime: "",
    interviewMode: "Online",
    interviewLocation: "",
  });
  const [rescheduling, setRescheduling] = useState(false);

  useEffect(() => {
    if (!isAuthorized) {
      navigate("/login");
      return;
    }
    if (user?.role !== "Employer") {
      navigate("/");
      return;
    }
  }, [isAuthorized, user]);

  useEffect(() => {
    if (isAuthorized && user?.role === "Employer") {
      fetchMonthInterviews();
    }
  }, [currentMonth, currentYear, isAuthorized, user]);

  const fetchMonthInterviews = async () => {
    setLoading(true);
    try {
      const mm = String(currentMonth + 1).padStart(2, "0");
      const startDate = `${currentYear}-${mm}-01`;
      const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
      const endDate = `${currentYear}-${mm}-${String(lastDay).padStart(2, "0")}`;

      const { data } = await api.get("/application/employer/interviews/calendar", {
        params: { startDate, endDate },
      });

      const fetched = data.interviews || [];
      setInterviews(fetched);

      const initialNotes = {};
      fetched.forEach((iv) => {
        initialNotes[iv._id] = iv.interviewNotes || "";
      });
      setNotesMap(initialNotes);

      if (selectedDate) {
        const filtered = fetched
          .filter((iv) => iv.interviewSchedule?.date === selectedDate)
          .sort((a, b) =>
            (a.interviewSchedule?.time || "").localeCompare(b.interviewSchedule?.time || "")
          );
        setDailyInterviews(filtered);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tải lịch phỏng vấn");
    } finally {
      setLoading(false);
    }
  };

  // ===== Navigation =====
  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDate(null);
    setDailyInterviews([]);
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDate(null);
    setDailyInterviews([]);
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
    handleDayClick(toDateStr(now.getFullYear(), now.getMonth() + 1, now.getDate()));
  };

  const handleDayClick = (dateString) => {
    setSelectedDate(dateString);
    const filtered = interviews
      .filter((iv) => iv.interviewSchedule?.date === dateString)
      .sort((a, b) =>
        (a.interviewSchedule?.time || "").localeCompare(b.interviewSchedule?.time || "")
      );
    setDailyInterviews(filtered);
    setOpenNotes({});
  };

  // ===== Notes =====
  const handleSaveNotes = async (applicationId) => {
    setSavingNotes((prev) => ({ ...prev, [applicationId]: true }));
    try {
      await api.put(`/application/interview-notes/${applicationId}`, {
        notes: notesMap[applicationId] || "",
      });
      toast.success("Đã lưu ghi chú!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể lưu ghi chú");
    } finally {
      setSavingNotes((prev) => ({ ...prev, [applicationId]: false }));
    }
  };

  const toggleNotes = (id) => {
    setOpenNotes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // ===== Reschedule =====
  const openReschedule = (interview) => {
    setRescheduleId(interview._id);
    setRescheduleForm({
      interviewDate: interview.interviewSchedule?.date || "",
      interviewTime: interview.interviewSchedule?.time || "",
      interviewMode: interview.interviewSchedule?.mode || "Online",
      interviewLocation: interview.interviewSchedule?.location || "",
    });
  };

  const closeReschedule = () => {
    setRescheduleId(null);
    setRescheduleForm({ interviewDate: "", interviewTime: "", interviewMode: "Online", interviewLocation: "" });
  };

  const handleReschedule = async (e) => {
    e.preventDefault();
    if (!rescheduleForm.interviewDate || !rescheduleForm.interviewTime) {
      toast.error("Vui lòng nhập ngày và giờ phỏng vấn.");
      return;
    }
    setRescheduling(true);
    try {
      await api.put(`/application/reschedule/${rescheduleId}`, rescheduleForm);
      toast.success("Đã cập nhật lịch phỏng vấn!");
      closeReschedule();
      await fetchMonthInterviews();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể cập nhật lịch phỏng vấn");
    } finally {
      setRescheduling(false);
    }
  };

  // ===== Helpers =====
  const toDateStr = (y, m, d) =>
    `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const todayStr = (() => {
    const n = new Date();
    return toDateStr(n.getFullYear(), n.getMonth() + 1, n.getDate());
  })();

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const getModeText = (mode) => {
    const map = { Online: "Online", ASL: "ASL Video", Offline: "Trực tiếp", Hybrid: "Kết hợp" };
    return map[mode] || mode;
  };

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0];
    return parts[0][0] + parts[parts.length - 1][0];
  };

  const getDotClass = (interview) => {
    if (interview.interviewResponse === "confirmed") return "dot-confirmed";
    if (interview.interviewResponse === "declined") return "dot-declined";
    return "dot-pending";
  };

  const getStatusBadge = (interview) => {
    if (interview.interviewResponse === "confirmed") {
      return (
        <span className="status-badge confirmed">
          <span className="badge-dot" />
          Đã xác nhận
        </span>
      );
    }
    if (interview.interviewResponse === "declined") {
      return (
        <span className="status-badge declined">
          <span className="badge-dot" />
          Đã từ chối
        </span>
      );
    }
    return (
      <span className="status-badge pending">
        <span className="badge-dot" />
        Chờ xác nhận
      </span>
    );
  };

  // ===== Calendar Rendering =====
  const renderCalendar = () => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const interviewDates = new Set();
    const interviewCountMap = {};
    interviews.forEach((iv) => {
      const d = iv.interviewSchedule?.date;
      if (d) {
        interviewDates.add(d);
        interviewCountMap[d] = (interviewCountMap[d] || 0) + 1;
      }
    });

    const cells = [];
    for (let i = 0; i < adjustedFirstDay; i++) {
      cells.push(<div key={`empty-${i}`} className="calendar-cell empty" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = toDateStr(currentYear, currentMonth + 1, day);
      const hasInterview = interviewDates.has(dateStr);
      const count = interviewCountMap[dateStr] || 0;
      const isSelected = dateStr === selectedDate;
      const isToday = dateStr === todayStr;

      cells.push(
        <button
          key={dateStr}
          className={`calendar-cell day${hasInterview ? " has-interview" : ""}${isSelected ? " selected" : ""}${isToday ? " today" : ""}`}
          onClick={() => handleDayClick(dateStr)}
          aria-label={`${day} tháng ${currentMonth + 1}${hasInterview ? `, ${count} cuộc phỏng vấn` : ""}`}
          aria-pressed={isSelected}
        >
          <span className="day-number">{day}</span>
          {hasInterview && (
            <span className="interview-dot" aria-hidden="true">{count}</span>
          )}
        </button>
      );
    }
    return cells;
  };

  // ===== Stats =====
  const totalInterviews = interviews.length;
  const confirmedCount = interviews.filter((iv) => iv.interviewResponse === "confirmed").length;
  const pendingCount = interviews.filter((iv) => !iv.interviewResponse).length;
  const declinedCount = interviews.filter((iv) => iv.interviewResponse === "declined").length;

  // ===== Loading =====
  if (loading && interviews.length === 0) {
    return (
      <section className="interview-dashboard-page">
        <div className="container">
          <div className="loading" role="status" aria-live="polite">
            <div className="loading-spinner" />
            Đang tải bảng lịch...
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="interview-dashboard-page" aria-label="Bảng điều khiển phỏng vấn">
      <div className="container">
        {/* Header */}
        <header className="page-header">
          <h1>Bảng lịch phỏng vấn</h1>
        </header>

        {/* Stats Row */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon total"><FiCalendar /></div>
            <div className="stat-info">
              <span className="stat-number">{totalInterviews}</span>
              <span className="stat-label">Tổng phỏng vấn</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon confirmed"><FiCheckCircle /></div>
            <div className="stat-info">
              <span className="stat-number">{confirmedCount}</span>
              <span className="stat-label">Đã xác nhận</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon pending-icon"><FiClock /></div>
            <div className="stat-info">
              <span className="stat-number">{pendingCount}</span>
              <span className="stat-label">Chờ xác nhận</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon declined-icon"><FiXCircle /></div>
            <div className="stat-info">
              <span className="stat-number">{declinedCount}</span>
              <span className="stat-label">Đã từ chối</span>
            </div>
          </div>
        </div>

        {/* Body: Calendar + Daily */}
        <div className="dashboard-body">
          {/* Calendar */}
          <div className="calendar-container">
            <div className="calendar-header">
              <div className="calendar-nav">
                <button className="calendar-nav-btn" onClick={goToPrevMonth} aria-label="Tháng trước">
                  <FiChevronLeft />
                </button>
                <h2>Tháng {currentMonth + 1}, {currentYear}</h2>
                <button className="calendar-nav-btn" onClick={goToNextMonth} aria-label="Tháng sau">
                  <FiChevronRight />
                </button>
              </div>
              <button className="btn-today" onClick={goToToday}>Hôm nay</button>
            </div>

            <div className="calendar-grid" role="grid" aria-label="Lịch tháng">
              {DAY_HEADERS.map((d) => (
                <div key={d} className="calendar-day-header" role="columnheader">{d}</div>
              ))}
              {renderCalendar()}
            </div>
          </div>

          {/* Daily Schedule */}
          {selectedDate ? (
            <section className="daily-schedule" aria-label={`Lịch ngày ${formatDate(selectedDate)}`}>
              <div className="daily-schedule-header">
                <h2>{formatDate(selectedDate)}</h2>
                <span className="interview-count-badge">
                  {dailyInterviews.length} cuộc phỏng vấn
                </span>
              </div>

              {dailyInterviews.length === 0 ? (
                <p className="no-daily-interviews">
                  <span className="empty-icon" aria-hidden="true">
                    <FiCalendar />
                  </span>
                  Không có phỏng vấn trong ngày này.
                </p>
              ) : (
                <div className="timeline-list" role="list">
                  {dailyInterviews.map((interview) => (
                    <div
                      key={interview._id}
                      className="timeline-item"
                      role="listitem"
                      aria-label={`Phỏng vấn ${interview.name} lúc ${interview.interviewSchedule?.time}`}
                    >
                      {/* Timeline Dot Column */}
                      <div className="timeline-dot-col">
                        <span className="timeline-time">
                          {interview.interviewSchedule?.time || "--:--"}
                        </span>
                        <div className={`timeline-dot ${getDotClass(interview)}`} />
                      </div>

                      {/* Card */}
                      <div className="timeline-card">
                        <div className="card-top-row">
                          <div className="candidate-avatar" aria-hidden="true">
                            {getInitials(interview.name)}
                          </div>
                          <div className="candidate-info">
                            <h3 className="candidate-name">{interview.name}</h3>
                            <p className="candidate-job">
                              <FiFileText className="job-icon" aria-hidden="true" />
                              {interview.jobId?.title || "Vị trí ứng tuyển"}
                            </p>

                            <div className="detail-tags">
                              <span className="detail-tag">
                                <FiMail className="tag-icon" aria-hidden="true" />
                                <a href={`mailto:${interview.email}`}>{interview.email}</a>
                              </span>
                              <span className="detail-tag">
                                <FiPhone className="tag-icon" aria-hidden="true" />
                                <a href={`tel:${interview.phone}`}>{interview.phone}</a>
                              </span>
                              <span className="detail-tag mode-tag">
                                <FiVideo className="tag-icon" aria-hidden="true" />
                                {getModeText(interview.interviewSchedule?.mode)}
                              </span>
                              {interview.interviewSchedule?.location && (
                                <span className="detail-tag">
                                  <FiMapPin className="tag-icon" aria-hidden="true" />
                                  {interview.interviewSchedule.mode === "Online" ? (
                                    <a
                                      href={interview.interviewSchedule.location}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      Link phỏng vấn
                                    </a>
                                  ) : (
                                    interview.interviewSchedule.location
                                  )}
                                </span>
                              )}
                              {interview.disabilityType &&
                                interview.disabilityType !== "Không có" && (
                                  <span className="detail-tag disability-tag">
                                    {interview.disabilityType}
                                  </span>
                                )}
                            </div>
                          </div>

                          <div className="card-status">
                            {getStatusBadge(interview)}
                            <button
                              className="btn-reschedule"
                              onClick={() => openReschedule(interview)}
                              disabled={interview.interviewResponse === "confirmed"}
                              aria-label={
                                interview.interviewResponse === "confirmed"
                                  ? "Không thể sửa lịch — ứng viên đã xác nhận"
                                  : `Sửa lịch phỏng vấn ${interview.name}`
                              }
                              title={
                                interview.interviewResponse === "confirmed"
                                  ? "Ứng viên đã xác nhận, không thể sửa lịch"
                                  : "Sửa lịch phỏng vấn"
                              }
                            >
                              <FiEdit3 /> Sửa lịch
                            </button>
                          </div>
                        </div>

                        {/* Notes */}
                        <div className="card-notes">
                          <button
                            className="notes-toggle"
                            onClick={() => toggleNotes(interview._id)}
                            aria-expanded={!!openNotes[interview._id]}
                            aria-label={`Ghi chú cho ${interview.name}`}
                          >
                            <FiArrow
                              className={`toggle-icon${openNotes[interview._id] ? " open" : ""}`}
                              aria-hidden="true"
                            />
                            Ghi chú phỏng vấn
                            {notesMap[interview._id] && (
                              <span className="notes-saved-hint">
                                <FiCheckCircle /> đã có
                              </span>
                            )}
                          </button>

                          {openNotes[interview._id] && (
                            <div className="notes-body">
                              <textarea
                                value={notesMap[interview._id] || ""}
                                onChange={(e) =>
                                  setNotesMap((prev) => ({
                                    ...prev,
                                    [interview._id]: e.target.value,
                                  }))
                                }
                                placeholder="Nhập đánh giá, nhận xét sau phỏng vấn..."
                                maxLength={5000}
                                rows={3}
                                aria-label={`Nhập ghi chú cho ${interview.name}`}
                              />
                              <div className="notes-footer">
                                <span className="char-count">
                                  {(notesMap[interview._id] || "").length}/5000
                                </span>
                                <button
                                  className="btn-save-notes"
                                  onClick={() => handleSaveNotes(interview._id)}
                                  disabled={savingNotes[interview._id]}
                                  aria-label={`Lưu ghi chú cho ${interview.name}`}
                                >
                                  <FiSave aria-hidden="true" />
                                  {savingNotes[interview._id] ? "Đang lưu..." : "Lưu"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <div className="daily-placeholder">
              <span className="placeholder-icon" aria-hidden="true">
                <FiCalendar />
              </span>
              <p>Chọn một ngày trên lịch để xem lịch phỏng vấn</p>
            </div>
          )}
        </div>

        {/* Reschedule Modal */}
        {rescheduleId && (
          <div className="reschedule-overlay" onClick={closeReschedule}>
            <div
              className="reschedule-modal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="Sửa lịch phỏng vấn"
            >
              <div className="modal-header">
                <h3>
                  <FiEdit3 aria-hidden="true" />
                  Sửa lịch phỏng vấn
                </h3>
                <button className="modal-close" onClick={closeReschedule} aria-label="Đóng">
                  <FiX />
                </button>
              </div>

              <form onSubmit={handleReschedule} className="reschedule-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="reschedule-date">
                      <FiCalendar className="form-icon" aria-hidden="true" />
                      Ngày phỏng vấn
                    </label>
                    <input
                      id="reschedule-date"
                      type="date"
                      value={rescheduleForm.interviewDate}
                      onChange={(e) =>
                        setRescheduleForm((prev) => ({ ...prev, interviewDate: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="reschedule-time">
                      <FiClock className="form-icon" aria-hidden="true" />
                      Giờ phỏng vấn
                    </label>
                    <input
                      id="reschedule-time"
                      type="time"
                      value={rescheduleForm.interviewTime}
                      onChange={(e) =>
                        setRescheduleForm((prev) => ({ ...prev, interviewTime: e.target.value }))
                      }
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="reschedule-mode">
                    <FiVideo className="form-icon" aria-hidden="true" />
                    Hình thức
                  </label>
                  <select
                    id="reschedule-mode"
                    value={rescheduleForm.interviewMode}
                    onChange={(e) =>
                      setRescheduleForm((prev) => ({
                        ...prev,
                        interviewMode: e.target.value,
                        interviewLocation: "",
                      }))
                    }
                  >
                    <option value="Online">Online</option>
                    <option value="ASL">Online (ASL)</option>
                    <option value="Offline">Trực tiếp</option>
                    <option value="Hybrid">Kết hợp</option>
                  </select>
                </div>

                {rescheduleForm.interviewMode !== "ASL" && (
                  <div className="form-group">
                    <label htmlFor="reschedule-location">
                      <FiMapPin className="form-icon" aria-hidden="true" />
                      {rescheduleForm.interviewMode === "Online" ? "Link phỏng vấn" : "Địa điểm"}
                    </label>
                    <input
                      id="reschedule-location"
                      type={rescheduleForm.interviewMode === "Online" ? "url" : "text"}
                      value={rescheduleForm.interviewLocation}
                      onChange={(e) =>
                        setRescheduleForm((prev) => ({ ...prev, interviewLocation: e.target.value }))
                      }
                      placeholder={
                        rescheduleForm.interviewMode === "Online"
                          ? "https://meet.google.com/..."
                          : "Nhập địa chỉ phỏng vấn"
                      }
                    />
                  </div>
                )}

                <div className="modal-hint">
                  Ứng viên sẽ nhận được thông báo về lịch phỏng vấn mới và cần xác nhận lại.
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-cancel" onClick={closeReschedule}>
                    Hủy
                  </button>
                  <button type="submit" className="btn-confirm-reschedule" disabled={rescheduling}>
                    <FiSave aria-hidden="true" />
                    {rescheduling ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default InterviewDashboard;
