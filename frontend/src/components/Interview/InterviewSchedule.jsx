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
    return <span className="status-badge pending">Chờ xác nhận</span>;
  };

  // tạo text mô tả trạng thái cho screen reader
  const getStatusText = (interview) => {
    if (interview.interviewResponse === "confirmed") return "Đã xác nhận tham gia";
    if (interview.interviewResponse === "declined") return "Đã từ chối";
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
          <button
            onClick={() => navigate(-1)}
            className="back-btn"
            aria-label="Quay lại trang trước"
          >
            ← Quay lại
          </button>
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
                        {interview.interviewSchedule.mode === "Online" ? "Online" : "Trực tiếp"}
                      </dd>
                    </div>

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

                  {/* Nút xác nhận/từ chối cho Job Seeker */}
                  {user.role === "Job Seeker" && !interview.interviewResponse && (
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
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default InterviewSchedule;
