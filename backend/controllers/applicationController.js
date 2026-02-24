import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";
import { Application } from "../models/applicationSchema.js";
import { Job } from "../models/jobSchema.js";
import { Notification } from "../models/notificationSchema.js";
import { User } from "../models/userSchema.js";
import cloudinary from "cloudinary";
import fs from "fs";

// Helper function: Upload file lên Cloudinary bằng stream (nhanh hơn)
const uploadToCloudinary = (filePath) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.v2.uploader.upload_stream(
      {
        folder: "CV",
        resource_type: "auto",
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    fs.createReadStream(filePath).pipe(uploadStream);
  });
};

export const postApplication = catchAsyncErrors(async (req, res, next) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return next(new ErrorHandler("Vui lòng tải lên file CV!", 400));
  }

  const { resume } = req.files;

  // Check file size (5MB max)
  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  if (resume.size > MAX_FILE_SIZE) {
    return next(
      new ErrorHandler("File quá lớn. Kích thước tối đa là 5MB.", 400)
    );
  }

  const allowedFormats = [
    "image/png",
    "image/jpeg",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ];
  if (!allowedFormats.includes(resume.mimetype)) {
    return next(
      new ErrorHandler("Loại tệp không hợp lệ. Vui lòng tải lên tệp PNG, JPEG, WEBP, PDF hoặc DOCX.", 400)
    );
  }

  try {
    // Check job EXISTS and VALID before uploading to save storage
    const jobDetails = await Job.findById(req.body.jobId);

    if (!jobDetails || jobDetails.isDeleted) {
      return next(new ErrorHandler("Không tìm thấy công việc!", 404));
    }

    // Check job status
    if (jobDetails.status !== "approved") {
      return next(new ErrorHandler("Công việc này chưa được duyệt!", 400));
    }

    // Check job not expired
    if (jobDetails.expired || new Date() > jobDetails.deadline) {
      return next(new ErrorHandler("Công việc này đã hết hạn nộp hồ sơ!", 400));
    }

    // Check duplicate application
    const existingApplication = await Application.findOne({
      "applicantID.user": req.user._id,
      jobId: req.body.jobId,
    });

    if (existingApplication) {
      return next(
        new ErrorHandler("Bạn đã nộp đơn cho công việc này rồi!", 400)
      );
    }

    // NOW upload to Cloudinary
    const cloudinaryResponse = await uploadToCloudinary(resume.tempFilePath);

    if (!cloudinaryResponse || cloudinaryResponse.error) {
      console.error("Cloudinary Error");
      return next(new ErrorHandler("Không thể tải lên Resume lên Cloudinary", 500));
    }

    const { name, email, coverLetter, phone, address, disabilityType, jobId } = req.body;

    if (
      !name ||
      !email ||
      !coverLetter ||
      !phone ||
      !address ||
      !disabilityType ||
      !jobId ||
      !resume
    ) {
      return next(new ErrorHandler("Vui lòng điền đầy đủ thông tin.", 400));
    }

    const application = await Application.create({
      name,
      email,
      coverLetter,
      phone,
      address,
      disabilityType,
      applicantID: { user: req.user._id },
      employerID: { user: jobDetails.postedBy },
      jobId: jobDetails._id,
      resume: {
        public_id: cloudinaryResponse.public_id,
        url: cloudinaryResponse.secure_url,
      },
    });

    // Tạo thông báo cho nhà tuyển dụng
    try {
      const notification = await Notification.create({
        userId: jobDetails.postedBy,
        type: "application_received",
        title: "Nhận được đơn ứng tuyển mới",
        message: `${name} đã nộp đơn ứng tuyển cho vị trí "${jobDetails.title}"`,
        jobId: jobId,
      });
      console.log("Thông báo đã được tạo cho nhà tuyển dụng:", notification._id);
    } catch (notifError) {
      console.error("Lỗi khi tạo thông báo:", notifError);
    }

    res.status(200).json({
      success: true,
      message: "Đơn xin việc đã được gửi!",
      application,
    });
  } catch (error) {
    // Handle Cloudinary specific errors
    if (error.message && error.message.includes("api_key")) {
      console.error("Lỗi khóa API Cloudinary:", error.message);
      return next(new ErrorHandler("Lỗi cấu hình dịch vụ tải lên tệp", 500));
    }

    // Handle any other errors
    return next(error);
  }
});

export const employerGetAllApplications = catchAsyncErrors(
  async (req, res, next) => {
    const { _id } = req.user;
    const applications = await Application.find({ "employerID.user": _id })
      .populate("applicantID.user", "name email phone")
      .populate("jobId", "title category location city description workMode fixedSalary salaryFrom salaryTo deadline")
      .sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      applications,
    });
  }
);

export const jobseekerGetAllApplications = catchAsyncErrors(
  async (req, res, next) => {
    const { _id } = req.user;
    const applications = await Application.find({ "applicantID.user": _id })
      .populate("jobId", "title category location city workMode fixedSalary salaryFrom salaryTo deadline")
      .sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      applications,
    });
  }
);

export const jobseekerDeleteApplication = catchAsyncErrors(
  async (req, res, next) => {
    const { id } = req.params;
    const application = await Application.findById(id);
    if (!application) {
      return next(new ErrorHandler("Không tìm thấy đơn xin việc!", 404));
    }

    // Check ownership
    if (application.applicantID.user.toString() !== req.user._id.toString()) {
      return next(
        new ErrorHandler("Bạn không có quyền xóa đơn xin việc này.", 403)
      );
    }

    await application.deleteOne();
    res.status(200).json({
      success: true,
      message: "Đơn xin việc đã được xóa!",
    });
  }
);

export const updateApplicationStatus = catchAsyncErrors(
  async (req, res, next) => {
    const { id } = req.params;
    const { status, interviewDate, interviewTime, interviewMode, interviewLocation } = req.body;

    const application = await Application.findById(id).populate("jobId", "title location");
    if (!application) {
      return next(new ErrorHandler("Không tìm thấy đơn xin việc!", 404));
    }

    // Verify that this application belongs to the employer
    if (application.employerID.user.toString() !== req.user._id.toString()) {
      return next(
        new ErrorHandler("Bạn không có quyền cập nhật đơn ứng tuyển này.", 403)
      );
    }

    // Update status
    application.status = status;

    // If scheduling interview, save the schedule
    if (interviewDate && interviewTime) {
      application.interviewSchedule = {
        date: interviewDate,
        time: interviewTime,
        mode: interviewMode || "Online",
        location: interviewLocation || "",
      };
      application.status = "scheduled";
    }

    await application.save();

    // Create notification for job seeker
    try {
      let notificationTitle = "";
      let notificationMessage = "";
      let notificationType = "";
      let interviewDetails = null;

      // Lấy thông tin employer để gửi thông báo
      const employerDetails = await User.findById(req.user._id);

      // Lấy job details từ populate
      const jobTitle = application.jobId?.title || "Không rõ vị trí";
      const jobLocation = application.jobId?.location || "";

      if (status === "accepted" || application.status === "scheduled") {
        if (interviewDate && interviewTime) {
          notificationType = "interview_scheduled";
          notificationTitle = "Lịch phỏng vấn đã được xếp";

          const formattedDate = new Date(interviewDate).toLocaleDateString("vi-VN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          });

          const interviewModeText = interviewMode === "Online" ? "Online" : "Trực tiếp";

          notificationMessage = `Chúc mừng! Bạn đã được mời phỏng vấn cho vị trí "${jobTitle}".\n\n`;
          notificationMessage += `Thời gian: ${formattedDate} lúc ${interviewTime}\n`;
          notificationMessage += `Hình thức: ${interviewModeText}\n`;

          if (interviewMode === "Online") {
            notificationMessage += `Link phỏng vấn: ${interviewLocation}\n`;
          } else {
            notificationMessage += `Địa điểm: ${interviewLocation || jobLocation || "Sẽ được thông báo sau"}\n`;
          }

          notificationMessage += `Nhà tuyển dụng: ${employerDetails?.name || "Nhà tuyển dụng"}\n`;
          notificationMessage += `Email liên hệ: ${employerDetails?.email || req.user.email}\n`;
          if (employerDetails?.phone) {
            notificationMessage += `Số điện thoại: ${employerDetails.phone}\n`;
          }
          notificationMessage += `\nVui lòng chuẩn bị kỹ lưỡng và đến đúng giờ. Chúc bạn thành công!`;

          interviewDetails = {
            date: interviewDate,
            time: interviewTime,
            jobTitle: jobTitle,
            mode: interviewMode || "Online",
            location: interviewLocation || jobLocation || "",
            employerName: employerDetails?.name || req.user.name,
            employerEmail: employerDetails?.email || req.user.email,
            employerPhone: employerDetails?.phone || "",
          };
        } else {
          notificationType = "application_accepted";
          notificationTitle = "Đơn ứng tuyển được chấp nhận";
          notificationMessage = `Chúc mừng! Đơn ứng tuyển của bạn cho vị trí "${jobTitle}" đã được chấp nhận. Nhà tuyển dụng sẽ sớm liên hệ với bạn.`;
        }
      } else if (status === "rejected") {
        notificationType = "application_rejected";
        notificationTitle = "Đơn ứng tuyển bị từ chối";
        notificationMessage = `Rất tiếc, đơn ứng tuyển của bạn cho vị trí "${jobTitle}" đã không được chấp nhận. Chúc bạn may mắn lần sau!`;
      }

      if (notificationType) {
        const notificationData = {
          userId: application.applicantID.user,
          type: notificationType,
          title: notificationTitle,
          message: notificationMessage,
          jobId: application.jobId?._id || application.jobId,
        };

        if (interviewDetails) {
          notificationData.interviewDetails = interviewDetails;
        }

        await Notification.create(notificationData);
        console.log("Thông báo đã được gửi cho ứng viên:", application.applicantID.user);
      }
    } catch (notifError) {
      console.error("Lỗi khi tạo thông báo:", notifError);
    }

    res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái đơn ứng tuyển thành công!",
      application,
    });
  }
);

// Lấy danh sách lịch phỏng vấn cho Employer
export const employerGetInterviews = catchAsyncErrors(async (req, res, next) => {
  const interviews = await Application.find({
    "employerID.user": req.user._id,
    status: { $in: ["accepted", "scheduled"] },
    "interviewSchedule.date": { $exists: true },
  })
    .populate("jobId", "title location")
    .sort({ "interviewSchedule.date": 1 });

  res.status(200).json({
    success: true,
    interviews,
  });
});

// Lấy danh sách lịch phỏng vấn cho Job Seeker
export const jobseekerGetInterviews = catchAsyncErrors(async (req, res, next) => {
  const interviews = await Application.find({
    "applicantID.user": req.user._id,
    status: { $in: ["accepted", "scheduled"] },
    "interviewSchedule.date": { $exists: true },
  })
    .populate("employerID.user", "name email phone")
    .populate("jobId", "title location")
    .sort({ "interviewSchedule.date": 1 });

  res.status(200).json({
    success: true,
    interviews,
  });
});

// Ứng viên phản hồi lịch phỏng vấn
export const interviewResponse = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const { response } = req.body; // 'confirmed' hoặc 'declined'

  if (!["confirmed", "declined"].includes(response)) {
    return next(new ErrorHandler("Phản hồi không hợp lệ.", 400));
  }

  const application = await Application.findById(id).populate("jobId", "title");
  if (!application) {
    return next(new ErrorHandler("Không tìm thấy lịch phỏng vấn.", 404));
  }

  // Kiểm tra quyền
  if (application.applicantID.user.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler("Bạn không có quyền phản hồi lịch phỏng vấn này.", 403));
  }

  application.interviewResponse = response;
  await application.save();

  const jobTitle = application.jobId?.title || "Không rõ vị trí";

  // Tạo thông báo cho nhà tuyển dụng
  try {
    await Notification.create({
      userId: application.employerID.user,
      type: response === "confirmed" ? "interview_confirmed" : "interview_declined",
      title:
        response === "confirmed"
          ? "Ứng viên xác nhận tham gia phỏng vấn"
          : "Ứng viên từ chối phỏng vấn",
      message:
        response === "confirmed"
          ? `${application.name} đã xác nhận tham gia phỏng vấn cho vị trí "${jobTitle}" vào ${new Date(application.interviewSchedule.date).toLocaleDateString("vi-VN")} lúc ${application.interviewSchedule.time}.`
          : `${application.name} đã từ chối lịch phỏng vấn cho vị trí "${jobTitle}". Vui lòng liên hệ ứng viên để sắp xếp lại.`,
      jobId: application.jobId?._id || application.jobId,
    });
  } catch (notifError) {
    console.error("Lỗi khi tạo thông báo:", notifError);
  }

  res.status(200).json({
    success: true,
    message:
      response === "confirmed"
        ? "Đã xác nhận tham gia phỏng vấn!"
        : "Đã từ chối lịch phỏng vấn.",
    application,
  });
});
