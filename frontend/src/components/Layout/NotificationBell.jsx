import { useState, useRef, useEffect } from "react";
import { useNotifications } from "../../context/NotificationContext";
import { Link, useNavigate } from "react-router-dom";
import "./NotificationBell.css";

const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } =
    useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigateTo = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }
    setIsOpen(false);

    // Chuyển đến trang liên quan theo loại thông báo
    if (notification.type === "application_received") {
      // Nhà tuyển dụng nhận được đơn ứng tuyển → Xem danh sách ứng viên
      navigateTo('/applications/me');
    } else if (notification.jobId) {
      // Các thông báo khác (job_approved, job_rejected) → Xem chi tiết công việc
      navigateTo(`/job/${notification.jobId}`);
    } else {
      // Không có jobId → Trang notifications
      navigateTo('/notifications');
    }
  };

  const handleDelete = (e, notificationId) => {
    e.stopPropagation();
    deleteNotification(notificationId);
  };

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

    return date.toLocaleDateString("vi-VN");
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "job_approved":
        return "✅";
      case "job_rejected":
        return "❌";
      case "application_received":
        return "📬";
      case "interview_scheduled":
        return "📅";
      case "application_accepted":
        return "🎉";
      case "application_rejected":
        return "😔";
      default:
        return "🔔";
    }
  };

  // Show only recent 5 notifications in dropdown
  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button className="notification-bell-button" onClick={toggleDropdown}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div
          className="notification-dropdown"
          style={{
            position: 'fixed',
            top: '60px',
            right: '20px',
            display: 'block',
            zIndex: 99999,
            animation: 'none',
            opacity: 1,
            visibility: 'visible'
          }}
        >
          <div className="notification-dropdown-header">
            <h3>Thông báo</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="mark-all-read-btn">
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          <div className="notification-dropdown-body">
            {recentNotifications.length === 0 ? (
              <div className="no-notifications">
                <p>🔔</p>
                <p>Không có thông báo</p>
              </div>
            ) : (
              recentNotifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`notification-item ${!notification.isRead ? "unread" : ""}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="notification-content">
                    <h4>{notification.title}</h4>
                    <p>{notification.message}</p>
                    <span className="notification-time">
                      {formatTime(notification.createdAt)}
                    </span>
                  </div>
                  <button
                    className="notification-delete-btn"
                    onClick={(e) => handleDelete(e, notification._id)}
                    title="Xóa thông báo"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notification-dropdown-footer">
              <Link to="/notifications" onClick={() => setIsOpen(false)}>
                Xem tất cả thông báo
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
