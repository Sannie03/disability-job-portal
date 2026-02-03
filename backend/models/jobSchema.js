import mongoose from "mongoose";

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Vui lòng nhập tiêu đề."],
    minLength: [3, "Tiêu đề phải chứa ít nhất 3 ký tự!"],
    maxLength: [100, "Tiêu đề không được vượt quá 100 ký tự!"],
  },
  description: {
    type: String,
    required: [true, "Vui lòng nhập mô tả."],
    minLength: [30, "Mô tả phải chứa ít nhất 30 ký tự!"],
    maxLength: [2000, "Mô tả không được vượt quá 2000 ký tự!"],
  },
  category: {
    type: String,
    required: [true, "Vui lòng nhập danh mục."],
  },
  city: {
    type: String,
    required: [true, "Vui lòng nhập tên thành phố."],
  },
  location: {
    type: String,
    required: [true, "Vui lòng nhập địa điểm."],
    minLength: [10, "Địa điểm phải chứa ít nhất 10 ký tự!"],
  },
  
  // Thông tin làm việc
  workMode: {
    type: String,
    enum: ["Online", "Offline", "Hybrid"],
    required: [true, "Vui lòng chọn hình thức làm việc."],
  },
  isFlexibleTime: {
    type: Boolean,
    default: false,
  },
  workTime: {
    start: {
      type: String, // Format: "HH:MM"
    },
    end: {
      type: String, // Format: "HH:MM"
    },
  },
  
  // Thông tin lương
  fixedSalary: {
    type: Number,
    min: [1000, "Mức lương phải ít nhất 1,000"],
    max: [999999999, "Mức lương không được vượt quá 999,999,999"],
  },
  salaryFrom: {
    type: Number,
    min: [1000, "Mức lương phải ít nhất 1,000"],
    max: [999999999, "Mức lương không được vượt quá 999,999,999"],
  },
  salaryTo: {
    type: Number,
    min: [1000, "Mức lương phải ít nhất 1,000"],
    max: [999999999, "Mức lương không được vượt quá 999,999,999"],
  },
  
  // Thông tin hỗ trợ người khiếm khuyết
  isDisabilityFriendly: {
    type: Boolean,
    default: false,
  },
  supportedDisabilities: {
    type: [String],
    enum: ["Khiếm thị", "Khiếm thính", "Vận động"],
    default: [],
  },
  // Trạng thái duyệt tin
status: {
  type: String,
  enum: ["pending", "approved", "rejected"],
  default: "pending",
},

approvedBy: {
  type: mongoose.Schema.ObjectId,
  ref: "User",
},

approvedAt: {
  type: Date,
},

rejectionReason: {
  type: String,
  default: "",
},

  // Thời hạn và trạng thái
  deadline: {
    type: Date,
    required: [true, "Vui lòng nhập hạn nộp hồ sơ."],
  },
  expired: {
    type: Boolean,
    default: false,
  },
  jobPostedOn: {
    type: Date,
    default: Date.now,
  },
  
  // Người đăng
  postedBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
  },
});

// Middleware để tự động cập nhật trạng thái expired dựa trên deadline
jobSchema.pre("save", function (next) {
  // Chỉ set expired = true nếu deadline đã qua
  if (this.deadline && new Date() > this.deadline) {
    this.expired = true;
  }

  next();
});


// Validation: Đảm bảo chỉ có fixedSalary HOẶC salaryFrom/salaryTo
jobSchema.pre("save", function (next) {
  const hasFixedSalary = this.fixedSalary != null;
  const hasRangedSalary = this.salaryFrom != null && this.salaryTo != null;

  if (!hasFixedSalary && !hasRangedSalary) {
    return next(new Error("Vui lòng nhập lương cố định hoặc khoảng lương."));
  }

  if (hasFixedSalary && hasRangedSalary) {
    return next(new Error("Chỉ được nhập lương cố định HOẶC khoảng lương, không được cả hai."));
  }

  if (hasRangedSalary && this.salaryFrom >= this.salaryTo) {
    return next(new Error("Lương từ phải nhỏ hơn lương đến."));
  }

  next();
});

// Validation: Kiểm tra workTime nếu không flexible
jobSchema.pre("save", function (next) {
  if (!this.isFlexibleTime) {
    if (!this.workTime || !this.workTime.start || !this.workTime.end) {
      return next(new Error("Vui lòng nhập thời gian làm việc."));
    }
  }
  next();
});

// Validation: Kiểm tra supportedDisabilities nếu isDisabilityFriendly = true
jobSchema.pre("save", function (next) {
  if (this.isDisabilityFriendly && (!this.supportedDisabilities || this.supportedDisabilities.length === 0)) {
    return next(new Error("Vui lòng chọn ít nhất một loại khiếm khuyết được hỗ trợ."));
  }
  next();
});

// Index để tìm kiếm nhanh hơn
jobSchema.index({ isDisabilityFriendly: 1 });
jobSchema.index({ supportedDisabilities: 1 });
jobSchema.index({ city: 1 });
jobSchema.index({ category: 1 });
jobSchema.index({ expired: 1 });
jobSchema.index({ deadline: 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ postedBy: 1 });
jobSchema.index({ jobPostedOn: -1 });

export const Job = mongoose.model("Job", jobSchema);