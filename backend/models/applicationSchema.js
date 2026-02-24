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
  },
  // Thông tin khuyết tật của ứng viên
  disabilityType: {
    type: String,
    enum: ["Không có", "Khiếm thị", "Khiếm thính", "Vận động", "Khác"],
    required: [true, "Vui lòng chọn loại khiếm khuyết!"],
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
      enum: ["Online", "Offline"],
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
