import mongoose from "mongoose";
import { config } from "dotenv";
import { Notification } from "./models/notificationSchema.js";
import { User } from "./models/userSchema.js";

config({ path: "./.env" });

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: "MERN_JOB_SEEKING_WEBAPP",
    });
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

// Test notification creation
const testNotification = async () => {
  try {
    // Tìm một user có role Employer
    const employer = await User.findOne({ role: "Employer" });

    if (!employer) {
      console.log("❌ Không tìm thấy Employer nào. Vui lòng tạo user Employer trước.");
      return;
    }

    console.log("✅ Tìm thấy Employer:", employer.name, "-", employer.email);

    // Tạo notification test
    const notification = await Notification.create({
      userId: employer._id,
      type: "application_received",
      title: "TEST: Nhận được đơn ứng tuyển mới",
      message: "Nguyễn Văn A đã nộp đơn ứng tuyển cho vị trí 'Senior Developer'",
    });

    console.log("✅ Notification test đã được tạo thành công!");
    console.log("   ID:", notification._id);
    console.log("   Gửi đến:", employer.email);
    console.log("   Tiêu đề:", notification.title);

    // Kiểm tra lại trong database
    const notificationCount = await Notification.countDocuments({
      userId: employer._id
    });
    console.log(`✅ Tổng số notifications của employer này: ${notificationCount}`);

    const unreadCount = await Notification.countDocuments({
      userId: employer._id,
      isRead: false
    });
    console.log(`✅ Số notifications chưa đọc: ${unreadCount}`);

  } catch (error) {
    console.error("❌ Lỗi khi tạo notification:", error);
  }
};

// Run test
const run = async () => {
  await connectDB();
  await testNotification();

  console.log("\n📋 Hướng dẫn:");
  console.log("1. Đăng nhập vào frontend với tài khoản Employer này");
  console.log("2. Kiểm tra icon chuông trên navbar");
  console.log("3. Phải thấy badge với số thông báo chưa đọc");

  process.exit(0);
};

run();
