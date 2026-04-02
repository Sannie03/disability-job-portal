import mongoose from "mongoose";
import validator from "validator";

const applicationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Vui lòng nhập tên của bạn!"],
    minLength: [3, "Tên phải chứa ít nhất 3 ký tự!"],
    maxLength: [30, "Tên không được vượt quá 30 ký tự!"],
  },
  email: {
    type: String,
    required: [true, "Vui lòng nhập email của bạn!"],
    validate: [validator.isEmail, "Vui lòng cung cấp một email hợp lệ!"],
  },
  coverLetter: {
    type: String,
    required: [true, "Vui lòng cung cấp thư xin việc!"],
    maxLength: [5000, "Thư xin việc không được vượt quá 5000 ký tự!"],
  },
  phone: {
    type: String,
    required: [true, "Vui lòng nhập số điện thoại của bạn!"],
    validate: {
      validator: function(v) {
        return /^0\d{9}$/.test(v);
      },
      message: "Số điện thoại phải có 10 chữ số và bắt đầu bằng số 0!"
    }
  },
  address: {
    type: String,
    required: [true, "Vui lòng nhập địa chỉ của bạn!"],
    maxLength: [200, "Địa chỉ không được vượt quá 200 ký tự!"],
  },
  // Thông tin khuyết tật của ứng viên (không bắt buộc — người bình thường có thể bỏ trống)
  disabilityType: {
    type: String,
    default: "",
  },
  // Ứng viên yêu cầu phỏng vấn bằng ngôn ngữ ký hiệu (ASL)
  requestASL: {
    type: Boolean,
    default: false,
  },
  resume: {
    public_id: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
  },
  applicantID: {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  employerID: {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  // Reference đến Job (soft delete đảm bảo job luôn tồn tại)
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Job",
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected", "scheduled"],
    default: "pending",
  },
  interviewSchedule: {
    date: {
      type: String,
    },
    time: {
      type: String,
    },
    mode: {
      type: String,
      enum: ["Online", "Offline", "Hybrid", "ASL"],
    },
    location: {
      type: String,
    },
  },
  // Phản hồi của ứng viên về lịch phỏng vấn
  interviewResponse: {
    type: String,
    enum: ["confirmed", "declined"],
  },
  // Transcript phỏng vấn Video ASL
  interviewTranscript: [{
    question: String,
    answer: String,
    answerVi: String,
    timestamp: { type: Date, default: Date.now },
  }],
  // Ghi chú của nhà tuyển dụng sau phỏng vấn
  interviewNotes: {
    type: String,
    default: "",
    maxLength: [5000, "Ghi chú không được vượt quá 5000 ký tự!"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index để tìm kiếm nhanh hơn
applicationSchema.index({ "applicantID.user": 1 });
applicationSchema.index({ "employerID.user": 1 });
applicationSchema.index({ jobId: 1 });
applicationSchema.index({ status: 1 });
applicationSchema.index({ "interviewSchedule.date": 1 });
applicationSchema.index({ createdAt: -1 });

// Compound index for common queries
applicationSchema.index({
  "employerID.user": 1,
  status: 1,
  "interviewSchedule.date": 1
});

// Prevent duplicate applications
applicationSchema.index({ "applicantID.user": 1, jobId: 1 }, { unique: true });

export const Application = mongoose.model("Application", applicationSchema);
