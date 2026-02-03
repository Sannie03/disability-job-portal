import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: [
      "job_rejected",
      "job_approved",
      "application_received",
      "application_accepted",
      "application_rejected",
      "interview_scheduled",
      "interview_confirmed",
      "interview_declined",
      "other"
    ],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  jobId: {
    type: mongoose.Schema.ObjectId,
    ref: "Job",
  },
  // Thông tin chi tiết lịch phỏng vấn (cho notification về interview)
  interviewDetails: {
    date: String,
    time: String,
    jobTitle: String,
    mode: String, // "Online" hoặc "Offline"
    location: String, // Link (nếu Online) hoặc địa điểm (nếu Offline)
    employerName: String,
    employerEmail: String,
    employerPhone: String,
  },
  // Phản hồi của ứng viên (nếu notification là về interview)
  interviewResponse: {
    type: String,
    enum: ["confirmed", "declined"],
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Notification = mongoose.model("Notification", notificationSchema);
