import { useContext, useEffect, useState } from "react";
import { Context } from "../../main";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import toast from "react-hot-toast";
import "./InterviewSchedule.css";

const InterviewSchedule = () => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, isAuthorized } = useContext(Context);
  const navigate = useNavigate();

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

    fetchInterviews();
  }, [isAuthorized]);

  // fetch lịch phỏng vấn theo role
  const fetchInterviews = async () => {
    try {
      const endpoint =
        user.role === "Employer"
          ? "/application/employer/interviews"
          : "/application/jobseeker/interviews";

      const { data } = await api.get(endpoint);

      setInterviews(data.interviews || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tải lịch phỏng vấn");
    } finally {
      setLoading(false);
    }
  };

  // job seeker xác nhận hoặc từ chối lịch phỏng vấn
  const handleResponse = async (interviewId, response) => {
    try {
      await api.put(
        `/application/interview-response/${interviewId}`,
        { response }
      );

      toast.success(
        response === "confirmed"
          ? "Đã xác nhận tham gia phỏng vấn"
          : "Đã từ chối lịch phỏng vấn"
      );

      fetchInterviews();
    } catch (error) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
    }
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
      fetchInterviews();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể cập nhật lịch phỏng vấn");
    } finally {
      setRescheduling(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusBadge = (interview) => {
    if (interview.interviewResponse === "confirmed") {
      return <span className="status-badge confirmed">Đã xác nhận</span>;
    }
    if (interview.interviewResponse === "declined") {
      return <span className="status-badge declined">Đã từ chối</span>;
    }
    const interviewDate = new Date(interview.interviewSchedule?.date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (now > interviewDate) {
      return <span className="status-badge expired">Hết hạn</span>;
    }
    return <span className="status-badge pending">Chờ xác nhận</span>;
  };

  // tạo text mô tả trạng thái cho screen reader
  const getStatusText = (interview) => {
    if (interview.interviewResponse === "confirmed") return "Đã xác nhận tham gia";
    if (interview.interviewResponse === "declined") return "Đã từ chối";
    const interviewDate = new Date(interview.interviewSchedule?.date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (now > interviewDate) return "Đã hết hạn xác nhận";
    return "Đang chờ xác nhận";
  };

  if (loading) {
    return (
      <div className="loading" role="status" aria-live="polite">
        <span className="sr-only">Đang tải dữ liệu</span>
        Đang tải...
      </div>
    );
  }

  const pageTitle = user.role === "Employer" ? "Lịch phỏng vấn đã đặt" : "Lịch phỏng vấn của tôi";

  return (
    <section className="interview-schedule-page" aria-label={pageTitle}>
      <div className="container">
        <header className="page-header">
          <h1 id="page-title">{pageTitle}</h1>
        </header>

        <p className="sr-only" aria-live="polite">
          {interviews.length > 0
            ? `Bạn có ${interviews.length} lịch phỏng vấn`
            : "Chưa có lịch phỏng vấn nào"}
        </p>

        {interviews.length === 0 ? (
          <div className="no-interviews" role="status">
            <h2>Chưa có lịch phỏng vấn</h2>
            <p>
              {user.role === "Employer"
                ? "Bạn chưa đặt lịch phỏng vấn nào"
                : "Bạn chưa nhận được lịch phỏng vấn nào"}
            </p>
          </div>
        ) : (
          <div className="interviews-grid" role="list" aria-labelledby="page-title">
            {interviews.map((interview) => {
              const jobTitle = interview.jobId?.title || "Vị trí ứng tuyển";
              return (
                <article
                  key={interview._id}
                  className="interview-card"
                  role="listitem"
                  aria-label={`Lịch phỏng vấn cho vị trí ${jobTitle}`}
                >
                  <header className="interview-card-header">
                    <h2>{jobTitle}</h2>
                    <span
                      className={`status-badge ${interview.interviewResponse || "pending"}`}
                      role="status"
                      aria-label={`Trạng thái: ${getStatusText(interview)}`}
                    >
                      {interview.interviewResponse === "confirmed" && "Đã xác nhận"}
                      {interview.interviewResponse === "declined" && "Đã từ chối"}
                      {!interview.interviewResponse && "Chờ xác nhận"}
                    </span>
                  </header>

                  <dl className="interview-details">
                    {user.role === "Employer" ? (
                      <>
                        <div className="detail-row">
                          <dt>Ứng viên:</dt>
                          <dd>{interview.name}</dd>
                        </div>
                        <div className="detail-row">
                          <dt>Email:</dt>
                          <dd>
                            <a
                              href={`mailto:${interview.email}`}
                              aria-label={`Gửi email đến ${interview.name}`}
                            >
                              {interview.email}
                            </a>
                          </dd>
                        </div>
                        <div className="detail-row">
                          <dt>SĐT:</dt>
                          <dd>
                            <a
                              href={`tel:${interview.phone}`}
                              aria-label={`Gọi điện cho ${interview.name}`}
                            >
                              {interview.phone}
                            </a>
                          </dd>
                        </div>
                        {interview.disabilityType && interview.disabilityType !== "Không có" && (
                          <div className="detail-row">
                            <dt>Loại khuyết tật:</dt>
                            <dd>{interview.disabilityType}</dd>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="detail-row">
                        <dt>Công ty:</dt>
                        <dd>{interview.employerID?.user?.name || "Nhà tuyển dụng"}</dd>
                      </div>
                    )}

                    <div className="detail-row">
                      <dt>Ngày:</dt>
                      <dd>{formatDate(interview.interviewSchedule.date)}</dd>
                    </div>

                    <div className="detail-row">
                      <dt>Giờ:</dt>
                      <dd>{interview.interviewSchedule.time}</dd>
                    </div>

                    <div className="detail-row">
                      <dt>Hình thức:</dt>
                      <dd>
                        {interview.interviewSchedule.mode === "ASL" ? "Online (ASL)" : interview.interviewSchedule.mode === "Online" ? "Online" : "Trực tiếp"}
                      </dd>
                    </div>

                    {interview.interviewSchedule.mode === "ASL" ? (
                      <div className="detail-row">
                        <dt>Phương thức:</dt>
                        <dd>Phỏng vấn ASL trực tuyến trên hệ thống</dd>
                      </div>
                    ) : (
                      <div className="detail-row">
                        <dt>
                          {interview.interviewSchedule.mode === "Online" ? "Link:" : "Địa điểm:"}
                        </dt>
                        <dd>
                          {interview.interviewSchedule.mode === "Online" ? (
                            <a
                              href={interview.interviewSchedule.location}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Mở link phỏng vấn online trong tab mới"
                            >
                              {interview.interviewSchedule.location}
                            </a>
                          ) : (
                            interview.interviewSchedule.location ||
                            interview.jobId?.location
                          )}
                        </dd>
                      </div>
                    )}

                    {user.role === "Job Seeker" && (
                      <>
                        <div className="detail-row">
                          <dt>Email liên hệ:</dt>
                          <dd>
                            <a
                              href={`mailto:${interview.employerID?.user?.email}`}
                              aria-label="Gửi email đến nhà tuyển dụng"
                            >
                              {interview.employerID?.user?.email}
                            </a>
                          </dd>
                        </div>
                        {interview.employerID?.user?.phone && (
                          <div className="detail-row">
                            <dt>SĐT:</dt>
                            <dd>
                              <a
                                href={`tel:${interview.employerID?.user?.phone}`}
                                aria-label="Gọi điện cho nhà tuyển dụng"
                              >
                                {interview.employerID?.user?.phone}
                              </a>
                            </dd>
                          </div>
                        )}
                      </>
                    )}
                  </dl>

                  {/* Nút sửa lịch cho Employer */}
                  {user.role === "Employer" && (
                    <button
                      className="btn-reschedule"
                      onClick={() => openReschedule(interview)}
                      disabled={interview.interviewResponse === "confirmed"}
                    >
                      Sửa lịch phỏng vấn
                    </button>
                  )}

                  {/* Nút xác nhận/từ chối cho Job Seeker */}
                  {user.role === "Job Seeker" && !interview.interviewResponse && (() => {
                    const interviewDate = new Date(interview.interviewSchedule?.date);
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    return now <= interviewDate;
                  })() && (
                    <div className="interview-actions" role="group" aria-label="Hành động">
                      <button
                        className="btn-confirm"
                        onClick={() => handleResponse(interview._id, "confirmed")}
                        aria-label={`Xác nhận tham gia phỏng vấn cho vị trí ${jobTitle}`}
                      >
                        Xác nhận tham gia
                      </button>
                      <button
                        className="btn-decline"
                        onClick={() => handleResponse(interview._id, "declined")}
                        aria-label={`Từ chối tham gia phỏng vấn cho vị trí ${jobTitle}`}
                      >
                        Không thể tham gia
                      </button>
                    </div>
                  )}
                  {user.role === "Job Seeker" && !interview.interviewResponse && (() => {
                    const interviewDate = new Date(interview.interviewSchedule?.date);
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    return now > interviewDate;
                  })() && (
                    <span className="status-badge expired">Đã hết hạn xác nhận</span>
                  )}

                  {/* Nút phỏng vấn Video ASL — mở trước, ẩn sau ngày PV 1 ngày */}
                  {interview.interviewResponse === "confirmed" &&
                    interview.interviewSchedule?.mode === "ASL" &&
                    (() => {
                      const interviewDate = new Date(interview.interviewSchedule.date);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const deadline = new Date(interviewDate);
                      deadline.setDate(deadline.getDate() + 1);
                      deadline.setHours(23, 59, 59, 999);
                      return today <= deadline;
                    })() && (
                    <div className="interview-actions" role="group" aria-label="Phỏng vấn video">
                      <button
                        className="btn-asl-interview"
                        onClick={() => navigate(`/interview-room/${interview._id}`)}
                        aria-label={`Bắt đầu phỏng vấn Video ASL cho vị trí ${jobTitle}`}
                      >
                        Phỏng vấn Video ASL
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {/* Reschedule Modal */}
        {rescheduleId && (
          <div className="reschedule-overlay" onClick={closeReschedule}>
            <div
              className="reschedule-modal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="Sửa lịch phỏng vấn"
            >
              <div className="reschedule-modal-header">
                <h3>Sửa lịch phỏng vấn</h3>
                <button className="reschedule-close" onClick={closeReschedule} aria-label="Đóng">
                  ✕
                </button>
              </div>

              <form onSubmit={handleReschedule} className="reschedule-form">
                <div className="reschedule-row">
                  <div className="reschedule-group">
                    <label htmlFor="rs-date">Ngày phỏng vấn</label>
                    <input
                      id="rs-date"
                      type="date"
                      value={rescheduleForm.interviewDate}
                      onChange={(e) =>
                        setRescheduleForm((prev) => ({ ...prev, interviewDate: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="reschedule-group">
                    <label htmlFor="rs-time">Giờ phỏng vấn</label>
                    <input
                      id="rs-time"
                      type="time"
                      value={rescheduleForm.interviewTime}
                      onChange={(e) =>
                        setRescheduleForm((prev) => ({ ...prev, interviewTime: e.target.value }))
                      }
                      required
                    />
                  </div>
                </div>

                <div className="reschedule-group">
                  <label htmlFor="rs-mode">Hình thức</label>
                  <select
                    id="rs-mode"
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
                  <div className="reschedule-group">
                    <label htmlFor="rs-location">
                      {rescheduleForm.interviewMode === "Online" ? "Link phỏng vấn" : "Địa điểm"}
                    </label>
                    <input
                      id="rs-location"
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

                <div className="reschedule-hint">
                  Ứng viên sẽ nhận được thông báo về lịch mới và cần xác nhận lại.
                </div>

                <div className="reschedule-actions">
                  <button type="button" className="btn-rs-cancel" onClick={closeReschedule}>
                    Hủy
                  </button>
                  <button type="submit" className="btn-rs-save" disabled={rescheduling}>
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

export default InterviewSchedule;
