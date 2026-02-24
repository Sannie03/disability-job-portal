import React, { createContext, useState, useEffect, useContext } from "react";
import api from "../utils/api";
import toast from "react-hot-toast";
import { Context } from "../main";

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { isAuthorized, user } = useContext(Context);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch notifications from API
  const fetchNotifications = async () => {
    if (!isAuthorized) return;

    try {
      const response = await api.get("/notification/my");

      const newNotifications = response.data.notifications || [];
      const newUnreadCount = response.data.unreadCount || 0;

      // Check if there are new notifications (for toast)
      if (notifications.length > 0 && newNotifications.length > notifications.length) {
        const latestNotification = newNotifications[0];
        toast.success(latestNotification.title, {
          duration: 5000,
          icon: '🔔',
        });
      }

      setNotifications(newNotifications);
      setUnreadCount(newUnreadCount);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  // Mark single notification as read
  const markAsRead = async (notificationId) => {
    try {
      await api.put(
        `/notification/${notificationId}/read`,
        {}
      );

      // Update local state
      setNotifications((prev) =>
        prev.map((notif) =>
          notif._id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error("Không thể đánh dấu đã đọc");
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await api.put("/notification/read-all", {});

      // Update local state
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, isRead: true }))
      );
      setUnreadCount(0);
      toast.success("Đã đánh dấu tất cả là đã đọc");
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Không thể đánh dấu tất cả đã đọc");
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      await api.delete(`/notification/${notificationId}`);

      // Update local state
      const deletedNotif = notifications.find(n => n._id === notificationId);
      setNotifications((prev) => prev.filter((notif) => notif._id !== notificationId));

      if (deletedNotif && !deletedNotif.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      toast.success("Đã xóa thông báo");
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast.error("Không thể xóa thông báo");
    }
  };

  // Initial fetch when user logs in
  useEffect(() => {
    if (isAuthorized && user) {
      fetchNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthorized, user]);

  // Polling: Auto-refresh notifications every 60 seconds
  useEffect(() => {
    if (!isAuthorized) return;

    const interval = setInterval(() => {
      fetchNotifications();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [isAuthorized, notifications]);

  const value = {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Custom hook for easy access
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
};
