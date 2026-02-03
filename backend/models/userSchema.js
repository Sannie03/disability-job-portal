import mongoose from "mongoose";
import validator from "validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema({
  // Họ tên người dùng
  name: {
    type: String,
    required: [true, "Hãy nhập tên của bạn!"],
    minLength: [3, "Tên phải chứa ít nhất 3 ký tự!"],
    maxLength: [30, "Tên không được vượt quá 30 ký tự!"],
  },

  // Email đăng nhập
  email: {
    type: String,
    required: [true, "Vui lòng nhập email của bạn!"],
    unique: true,
    validate: [validator.isEmail, "Vui lòng cung cấp một email hợp lệ!"],
  },

  // Số điện thoại (bắt buộc với đăng ký thường)
  phone: {
    type: String,
  },

  // Mật khẩu (chỉ dùng cho đăng ký thường)
  password: {
    type: String,
    minLength: [8, "Mật khẩu phải chứa ít nhất 8 ký tự!"],
    maxLength: [32, "Mật khẩu không được vượt quá 32 ký tự!"],
    select: false,
  },

  // Vai trò người dùng
  role: {
    type: String,
    enum: ["Job Seeker", "Employer", "Admin"],
    required: true,
  },

  // Xác định phương thức đăng nhập
  authProvider: {
    type: String,
    enum: ["local", "google"],
    default: "local",
  },

  // ID Google (chỉ có khi đăng nhập Google)
  googleId: {
    type: String,
  },

  // Thông tin bổ sung cho Employer
  companyInfo: {
    companyName: {
      type: String,
      maxLength: [100, "Tên công ty không được vượt quá 100 ký tự!"],
    },
    companySize: {
      type: String,
      enum: ["1-10", "11-50", "51-200", "201-500", "500+", ""],
      default: "",
    },
    website: {
      type: String,
    },
    address: {
      type: String,
      maxLength: [200, "Địa chỉ không được vượt quá 200 ký tự!"],
    },
    description: {
      type: String,
      maxLength: [1000, "Mô tả không được vượt quá 1000 ký tự!"],
    },
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});



// Mã hóa mật khẩu trước khi lưu (chỉ áp dụng cho đăng ký thường)
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});


// So sánh mật khẩu khi đăng nhập thường
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Tạo JWT token
userSchema.methods.getJWTToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET_KEY,
    {
      expiresIn: process.env.JWT_EXPIRE,
    }
  );
};

export const User = mongoose.model("User", userSchema);
