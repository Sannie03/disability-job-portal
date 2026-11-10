import jwt from "jsonwebtoken";
import { Application } from "../models/applicationSchema.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";

export const getInterviewAccess = catchAsyncErrors(async (req, res, next) => {
  const application = await Application.findById(req.params.id);
  if (!application) {
    return next(new ErrorHandler("Không tìm thấy lịch phỏng vấn.", 404));
  }

  const userId = req.user._id.toString();
  const ownsInterview =
    (req.user.role === "Employer" && application.employerID.user.toString() === userId) ||
    (req.user.role === "Job Seeker" && application.applicantID.user.toString() === userId);
  if (!ownsInterview) {
    return next(new ErrorHandler("Bạn không có quyền tham gia phòng phỏng vấn này.", 403));
  }
  if (!["scheduled", "accepted"].includes(application.status) ||
      application.interviewSchedule?.mode !== "ASL" ||
      application.interviewResponse !== "confirmed") {
    return next(new ErrorHandler("Lịch phỏng vấn ASL chưa được xác nhận.", 403));
  }

  // Match the existing UI: access ends at the end of the day after the interview.
  const date = application.interviewSchedule.date;
  const deadline = /^\d{4}-\d{2}-\d{2}$/.test(date || "")
    ? new Date(`${date}T00:00:00+07:00`).getTime() + 2 * 24 * 60 * 60 * 1000
    : NaN;
  const lifetime = Math.min(2 * 60 * 60, Math.floor((deadline - Date.now()) / 1000));
  if (!Number.isFinite(lifetime) || lifetime <= 0) {
    return next(new ErrorHandler("Phòng phỏng vấn đã hết hạn truy cập.", 403));
  }
  const secret = process.env.ASL_TOKEN_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    return next(new ErrorHandler("Chưa cấu hình dịch vụ xác thực ASL.", 503));
  }

  const token = jwt.sign({ room_id: application._id.toString(), role: req.user.role }, secret, {
    algorithm: "HS256",
    subject: userId,
    audience: "asl-interview",
    issuer: "careerconnect-api",
    expiresIn: lifetime,
  });
  res.set("Cache-Control", "no-store");
  res.status(200).json({ success: true, token });
});
