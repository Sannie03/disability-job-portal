import React, { useState } from "react";
import { useNotifications } from "../../context/NotificationContext";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import toast from "react-hot-toast";
import "./Notifications.css";

const Notifications = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } =
    useNotifications();
  const [filter, setFilter] = useState("all"); // all, unread, read

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;

    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "job_approved":
        return { emoji: "✅", color: "#10b981" };
      case "job_rejected":
        return { emoji: "❌", color: "#ef4444" };
      case "application_received":
        return { emoji: "📬", color: "#3b82f6" };
      case "interview_scheduled":
        return { emoji: "📅", color: "#8b5cf6" };
      case "interview_confirmed":
        return { emoji: "✓", color: "#10b981" };
      case "interview_declined":
        return { emoji: "✗", color: "#f59e0b" };
      case "application_accepted":
        return { emoji: "🎉", color: "#10b981" };
      case "application_rejected":
        return { emoji: "😔", color: "#ef4444" };
      default:
        return { emoji: "🔔", color: "#6b7280" };
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }

    // Chuyển đến trang liên quan theo loại thông báo
    if (notification.type === "application_received") {
      // Nhà tuyển dụng nhận được đơn ứng tuyển → Xem danh sách ứng viên
      navigate('/applications/me');
    } else if (notification.type === "interview_confirmed" || notification.type === "interview_declined") {
      // Nhà tuyển dụng nhận phản hồi về lịch phỏng vấn → Xem lịch phỏng vấn
      navigate('/interviews');
    } else if (notification.type === "interview_scheduled") {
      // Ứng viên nhận lịch phỏng vấn → Xem lịch phỏng vấn
      navigate('/interviews');
    } else if (notification.jobId) {
      // Các thông báo khác (job_approved, job_rejected) → Xem chi tiết công việc
      navigate(`/job/${notification.jobId}`);
    }
  };

  const handleDelete = (notificationId) => {
    deleteNotification(notificationId);
  };

  const handleInterviewResponse = async (notification, response) => {
    try {
      await api.post(
        "/application/interview-response",
        {
          notificationId: notification._id,
          jobId: notification.jobId,
          response: response,
        }
      );

      if (response === 'confirmed') {
        toast.success('Đã xác nhận tham gia phỏng vấn!');
      } else {
        toast.success('Đã từ chối lịch phỏng vấn');
      }

      // Đánh dấu thông báo đã đọc
      markAsRead(notification._id);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  // Filter notifications
  const filteredNotifications = notifications.filter((notif) => {
    if (filter === "unread") return !notif.isRead;
    if (filter === "read") return notif.isRead;
    return true;
  });

  return (
    <div className="notifications-page">
      <div className="notifications-container">
        <div className="notifications-header">
          <h1>Thông báo</h1>
          <button onClick={() => navigate(-1)} className="back-button">
            ← Quay lại
          </button>
        </div>

        <div className="notifications-controls">
          <div className="notification-filters">
            <button
              className={filter === "all" ? "active" : ""}
              onClick={() => setFilter("all")}
            >
              Tất cả ({notifications.length})
            </button>
            <button
              className={filter === "unread" ? "active" : ""}
              onClick={() => setFilter("unread")}
            >
              Chưa đọc ({unreadCount})
            </button>
            <button
              className={filter === "read" ? "active" : ""}
              onClick={() => setFilter("read")}
            >
              Đã đọc ({notifications.length - unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="mark-all-read-button">
              Đánh dấu tất cả đã đọc
            </button>
          )}
        </div>

        <div className="notifications-list">
          {filteredNotifications.length === 0 ? (
            <div className="no-notifications-full">
              <div className="no-notifications-icon">🔔</div>
              <h2>Không có thông báo</h2>
              <p>
                {filter === "unread"
                  ? "Bạn không có thông báo chưa đọc"
                  : filter === "read"
                  ? "Bạn không có thông báo đã đọc"
                  : "Bạn chưa có thông báo nào"}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => {
              const iconData = getNotificationIcon(notification.type);
              return (
                <div
                  key={notification._id}
                  className={`notification-card ${!notification.isRead ? "unread" : ""}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div
                    className="notification-card-icon"
                    style={{ backgroundColor: iconData.color + "20" }}
                  >
                    <span style={{ color: iconData.color }}>{iconData.emoji}</span>
                  </div>

                  <div className="notification-card-content">
                    <div className="notification-card-header">
                      <h3>{notification.title}</h3>
                      {!notification.isRead && <span className="unread-dot"></span>}
                    </div>
                    <p className="notification-card-message">{notification.message}</p>

                    {/* Hiển thị chi tiết lịch phỏng vấn nếu có */}
                    {notification.interviewDetails && (
                      <div className="interview-details-box">
                        <div className="interview-detail-item">
                          <strong>📅 Thời gian:</strong> {new Date(notification.interviewDetails.date).toLocaleDateString("vi-VN")} lúc {notification.interviewDetails.time}
                        </div>
                        <div className="interview-detail-item">
                          <strong>📍 Hình thức:</strong> {notification.interviewDetails.mode === "Online" ? "🌐 Online" : "🏢 Trực tiếp"}
                        </div>
                        <div className="interview-detail-item">
                          <strong>{notification.interviewDetails.mode === "Online" ? "🔗 Link:" : "📍 Địa điểm:"}</strong>
                          {notification.interviewDetails.mode === "Online" ? (
                            <a href={notification.interviewDetails.location} target="_blank" rel="noopener noreferrer">
                              {notification.interviewDetails.location || "Sẽ được thông báo sau"}
                            </a>
                          ) : (
                            <span>{notification.interviewDetails.location || "Sẽ được thông báo sau"}</span>
                          )}
                        </div>
                        <div className="interview-detail-item">
                          <strong>🏢 Nhà tuyển dụng:</strong> {notification.interviewDetails.employerName}
                        </div>
                        <div className="interview-detail-item">
                          <strong>📧 Email:</strong> <a href={`mailto:${notification.interviewDetails.employerEmail}`}>{notification.interviewDetails.employerEmail}</a>
                        </div>
                        {notification.interviewDetails.employerPhone && (
                          <div className="interview-detail-item">
                            <strong>📞 SĐT:</strong> <a href={`tel:${notification.interviewDetails.employerPhone}`}>{notification.interviewDetails.employerPhone}</a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Nút xác nhận/từ chối lịch phỏng vấn */}
                    {notification.type === "interview_scheduled" && notification.interviewDetails && !notification.interviewResponse && (
                      <div className="interview-response-buttons">
                        <button
                          className="btn-confirm-interview"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInterviewResponse(notification, 'confirmed');
                          }}
                        >
                          ✓ Xác nhận tham gia
                        </button>
                        <button
                          className="btn-decline-interview"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInterviewResponse(notification, 'declined');
                          }}
                        >
                          ✗ Không thể tham gia
                        </button>
                      </div>
                    )}

                    {/* Hiển thị trạng thái đã phản hồi */}
                    {notification.interviewResponse && (
                      <div className={`interview-response-status ${notification.interviewResponse}`}>
                        {notification.interviewResponse === 'confirmed' ? '✓ Đã xác nhận tham gia' : '✗ Đã từ chối'}
                      </div>
                    )}

                    <span className="notification-card-time">
                      {formatTime(notification.createdAt)}
                    </span>
                  </div>

                  <button
                    className="notification-card-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(notification._id);
                    }}
                    title="Xóa thông báo"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
