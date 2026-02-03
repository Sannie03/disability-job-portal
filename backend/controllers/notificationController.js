import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import { Notification } from "../models/notificationSchema.js";
import ErrorHandler from "../middlewares/error.js";

// Lấy tất cả thông báo của user
export const getMyNotifications = catchAsyncErrors(async (req, res, next) => {
  const notifications = await Notification.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50);

  const unreadCount = await Notification.countDocuments({
    userId: req.user._id,
    isRead: false,
  });

  res.status(200).json({
    success: true,
    notifications,
    unreadCount,
  });
});

// Đánh dấu thông báo đã đọc
export const markAsRead = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  const notification = await Notification.findById(id);

  if (!notification) {
    return next(new ErrorHandler("Không tìm thấy thông báo.", 404));
  }

  // Kiểm tra quyền sở hữu
  if (notification.userId.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler("Bạn không có quyền truy cập thông báo này.", 403));
  }

  notification.isRead = true;
  await notification.save();

  res.status(200).json({
    success: true,
    message: "Đã đánh dấu đã đọc.",
  });
});

// Đánh dấu tất cả đã đọc
export const markAllAsRead = catchAsyncErrors(async (req, res, next) => {
  await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { isRead: true }
  );

  res.status(200).json({
    success: true,
    message: "Đã đánh dấu tất cả thông báo là đã đọc.",
  });
});

// Xóa thông báo
export const deleteNotification = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  const notification = await Notification.findById(id);

  if (!notification) {
    return next(new ErrorHandler("Không tìm thấy thông báo.", 404));
  }

  // Kiểm tra quyền sở hữu
  if (notification.userId.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler("Bạn không có quyền xóa thông báo này.", 403));
  }

  await notification.deleteOne();

  res.status(200).json({
    success: true,
    message: "Đã xóa thông báo.",
  });
});
