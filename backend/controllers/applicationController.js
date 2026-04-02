import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";
import { Application } from "../models/applicationSchema.js";
import { Job } from "../models/jobSchema.js";
import { Notification } from "../models/notificationSchema.js";
import { User } from "../models/userSchema.js";
import cloudinary from "cloudinary";
import fs from "fs";
import { DISABILITY_TYPES } from "../utils/constants.js";

// Loại file cần upload dạng raw
const RAW_MIMETYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// Helper function: Upload file lên Cloudinary bằng stream
const uploadToCloudinary = (filePath, mimetype) => {
  // PDF/DOC/DOCX → raw (giữ file gốc), ảnh → image
  const resourceType = RAW_MIMETYPES.includes(mimetype) ? "raw" : "image";

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.v2.uploader.upload_stream(
      {
        folder: "CV",
        resource_type: resourceType,
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
    // Validate body TRƯỚC KHI upload để tránh upload file rồi mới báo lỗi
    const { name, email, coverLetter, phone, address, disabilityType, jobId, requestASL } = req.body;

    if (!name || !email || !coverLetter || !phone || !address || !jobId) {
      return next(new ErrorHandler("Vui lòng điền đầy đủ thông tin.", 400));
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return next(new ErrorHandler("Email không hợp lệ.", 400));
    }

    // Validate disabilityType nếu có (không bắt buộc — người bình thường bỏ trống)
    if (disabilityType && disabilityType.trim()) {
      const trimmedDisability = disabilityType.trim();
      if (trimmedDisability.length < 2 || trimmedDisability.length > 50) {
        return next(new ErrorHandler("Loại khuyết tật phải từ 2 đến 50 ký tự.", 400));
      }
    }

    // Check job EXISTS and VALID before uploading to save storage
    const jobDetails = await Job.findById(jobId);

    if (!jobDetails || jobDetails.isDeleted) {
      return next(new ErrorHandler("Không tìm thấy công việc!", 404));
    }

    // Check job status
    if (jobDetails.status !== "approved") {
      return next(new ErrorHandler("Công việc này chưa được duyệt!", 400));
    }

    // Check job not expired (so sánh theo ngày, deadline hôm nay vẫn được nộp)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dl = new Date(jobDetails.deadline);
    dl.setHours(0, 0, 0, 0);
    if (jobDetails.expired || today > dl) {
      return next(new ErrorHandler("Công việc này đã hết hạn nộp hồ sơ!", 400));
    }

    // Check duplicate application (chỉ chặn nộp lại CÙNG 1 job, cho phép nộp nhiều job khác nhau)
    const existingApplication = await Application.findOne({
      "applicantID.user": req.user._id,
      jobId,
    });

    if (existingApplication) {
      return next(
        new ErrorHandler("Bạn đã nộp đơn cho công việc này rồi!", 400)
      );
    }

    // Upload to Cloudinary SAU KHI validate xong
    const cloudinaryResponse = await uploadToCloudinary(resume.tempFilePath, resume.mimetype);

    // Xóa file tạm sau khi upload
    try { fs.unlinkSync(resume.tempFilePath); } catch (_) {}

    if (!cloudinaryResponse || cloudinaryResponse.error) {
      console.error("Cloudinary Error");
      return next(new ErrorHandler("Không thể tải lên Resume lên Cloudinary", 500));
    }

    const application = await Application.create({
      name,
      email,
      coverLetter,
      phone,
      address,
      disabilityType,
      requestASL: requestASL === "true" || requestASL === true,
      applicantID: { user: req.user._id },
      employerID: { user: jobDetails.postedBy },
      jobId: jobDetails._id,
      resume: {
        public_id: cloudinaryResponse.public_id,
        url: cloudinaryResponse.secure_url,
      },
    });

    // Lưu disabilityType lên User profile (auto-fill cho lần sau) — chỉ khi có giá trị
    if (disabilityType && disabilityType.trim()) {
      if (DISABILITY_TYPES.includes(disabilityType)) {
        await User.findByIdAndUpdate(req.user._id, {
          disabilityType,
          customDisabilityDetail: "",
        });
      } else {
        await User.findByIdAndUpdate(req.user._id, {
          disabilityType: "Khác",
          customDisabilityDetail: disabilityType,
        });
      }
    }

    // Tạo thông báo cho nhà tuyển dụng
    try {
      const notification = await Notification.create({
        userId: jobDetails.postedBy,
        type: "application_received",
        title: "Nhận được đơn ứng tuyển mới",
        message: `${name} đã nộp đơn ứng tuyển cho vị trí "${jobDetails.title}"${(requestASL === "true" || requestASL === true) ? "\n⚠️ Ứng viên yêu cầu phỏng vấn bằng ngôn ngữ ký hiệu (ASL)" : ""}`,
        jobId: jobId,
      });
      // Thông báo đã tạo thành công
    } catch (notifError) {
      console.error("Lỗi khi tạo thông báo:", notifError);
    }

    res.status(201).json({
      success: true,
      message: "Đơn xin việc đã được gửi!",
      application,
    });
  } catch (error) {
    // Handle E11000 duplicate key (race condition: 2 requests cùng lúc vượt qua findOne check)
    if (error.code === 11000) {
      return next(new ErrorHandler("Bạn đã nộp đơn cho công việc này rồi!", 400));
    }

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
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const filter = { "employerID.user": _id };

    const [applications, total] = await Promise.all([
      Application.find(filter)
        .populate("applicantID.user", "name email phone")
        .populate("jobId", "title category location city description workMode fixedSalary salaryFrom salaryTo deadline")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Application.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      applications,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalApplications: total,
        perPage: limit,
      },
    });
  }
);

export const jobseekerGetAllApplications = catchAsyncErrors(
  async (req, res, next) => {
    const { _id } = req.user;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const filter = { "applicantID.user": _id };

    const [applications, total] = await Promise.all([
      Application.find(filter)
        .populate("jobId", "title category location city workMode fixedSalary salaryFrom salaryTo deadline")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Application.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      applications,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalApplications: total,
        perPage: limit,
      },
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

    // Không cho xóa nếu có lịch phỏng vấn và chưa qua ngày
    if (application.interviewSchedule && application.interviewSchedule.date) {
      const interviewDate = new Date(application.interviewSchedule.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (today <= interviewDate) {
        return next(
          new ErrorHandler("Không thể xóa đơn ứng tuyển đã được đặt lịch phỏng vấn.", 400)
        );
      }
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

    // Track accepted/rejected jobs on user profile
    try {
      const jobRefId = application.jobId?._id || application.jobId;
      if (status === "accepted" || application.status === "scheduled") {
        const applicantUser = await User.findById(application.applicantID.user);
        if (applicantUser) {
          const alreadyTracked = applicantUser.acceptedJobs?.some(
            (aj) => aj.applicationId?.toString() === application._id.toString()
          );
          if (!alreadyTracked) {
            applicantUser.acceptedJobs.push({
              jobId: jobRefId,
              applicationId: application._id,
              acceptedAt: new Date(),
            });
            await applicantUser.save({ validateModifiedOnly: true });
          }
        }
      } else if (status === "rejected") {
        await User.findByIdAndUpdate(application.applicantID.user, {
          $pull: { acceptedJobs: { applicationId: application._id } },
        });
      }
    } catch (trackError) {
      console.error("Lỗi khi cập nhật acceptedJobs:", trackError);
    }

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

          const modeTextMap = { Online: "Online", ASL: "Online (ASL)", Offline: "Trực tiếp", Hybrid: "Kết hợp" };
          const interviewModeText = modeTextMap[interviewMode] || interviewMode;

          notificationMessage = `Chúc mừng! Bạn đã được mời phỏng vấn cho vị trí "${jobTitle}".\n\n`;
          notificationMessage += `Thời gian: ${formattedDate} lúc ${interviewTime}\n`;
          notificationMessage += `Hình thức: ${interviewModeText}\n`;

          if (interviewMode === "ASL") {
            notificationMessage += `Phỏng vấn qua hệ thống ASL trực tuyến trên website.\n`;
          } else if (interviewMode === "Online") {
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
        // Thông báo đã gửi thành công
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

// Lưu transcript phỏng vấn Video ASL
export const saveInterviewTranscript = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const { transcript } = req.body;

  if (!transcript || !Array.isArray(transcript)) {
    return next(new ErrorHandler("Transcript không hợp lệ.", 400));
  }

  const application = await Application.findById(id);
  if (!application) {
    return next(new ErrorHandler("Không tìm thấy đơn ứng tuyển.", 404));
  }

  // Cho phép cả Employer và Job Seeker lưu transcript
  const isEmployer = application.employerID.user.toString() === req.user._id.toString();
  const isApplicant = application.applicantID.user.toString() === req.user._id.toString();

  if (!isEmployer && !isApplicant) {
    return next(new ErrorHandler("Bạn không có quyền lưu transcript này.", 403));
  }

  application.interviewTranscript = transcript.map((item) => ({
    question: item.question || "",
    answer: item.answer || "",
    answerVi: item.answer_vi || item.answerVi || "",
    timestamp: new Date(),
  }));

  await application.save();

  res.status(200).json({
    success: true,
    message: "Đã lưu transcript phỏng vấn!",
    transcript: application.interviewTranscript,
  });
});

// Kiểm tra ứng viên đã nộp đơn cho job chưa (nhẹ, chỉ trả true/false)
export const checkApplied = catchAsyncErrors(async (req, res, next) => {
  const { jobId } = req.params;

  if (!jobId) {
    return res.status(200).json({ success: true, applied: false });
  }

  const existing = await Application.findOne(
    { "applicantID.user": req.user._id, jobId },
    { _id: 1 }
  ).lean();

  res.status(200).json({
    success: true,
    applied: !!existing,
    applicationId: existing?._id || null,
  });
});

// Lấy danh sách job IDs mà ứng viên đã nộp đơn (nhẹ, dùng cho listing)
export const getAppliedJobIds = catchAsyncErrors(async (req, res, next) => {
  const applications = await Application.find(
    { "applicantID.user": req.user._id },
    { jobId: 1, _id: 0 }
  ).lean();
  const jobIds = applications.map((app) => app.jobId.toString());
  res.status(200).json({ success: true, jobIds });
});

// Lấy lịch phỏng vấn theo khoảng thời gian (cho Calendar Dashboard)
export const employerGetInterviewsByDateRange = catchAsyncErrors(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return next(new ErrorHandler("Vui lòng cung cấp startDate và endDate.", 400));
  }

  const interviews = await Application.find({
    "employerID.user": req.user._id,
    status: { $in: ["accepted", "scheduled"] },
    "interviewSchedule.date": {
      $gte: startDate,
      $lte: endDate,
    },
  })
    .populate("jobId", "title location")
    .sort({ "interviewSchedule.date": 1, "interviewSchedule.time": 1 })
    .lean();

  res.status(200).json({
    success: true,
    interviews,
  });
});

// Sửa lịch phỏng vấn (Employer)
export const rescheduleInterview = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const { interviewDate, interviewTime, interviewMode, interviewLocation } = req.body;

  if (!interviewDate || !interviewTime) {
    return next(new ErrorHandler("Vui lòng cung cấp ngày và giờ phỏng vấn.", 400));
  }

  const application = await Application.findById(id).populate("jobId", "title location");
  if (!application) {
    return next(new ErrorHandler("Không tìm thấy đơn ứng tuyển.", 404));
  }

  if (application.employerID.user.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler("Bạn không có quyền sửa lịch phỏng vấn này.", 403));
  }

  if (!application.interviewSchedule?.date) {
    return next(new ErrorHandler("Đơn ứng tuyển này chưa có lịch phỏng vấn.", 400));
  }

  if (application.interviewResponse === "confirmed") {
    return next(new ErrorHandler("Không thể sửa lịch khi ứng viên đã xác nhận tham gia.", 400));
  }

  // Cập nhật lịch phỏng vấn
  application.interviewSchedule = {
    date: interviewDate,
    time: interviewTime,
    mode: interviewMode || application.interviewSchedule.mode || "Online",
    location: interviewLocation ?? application.interviewSchedule.location ?? "",
  };

  // Reset phản hồi của ứng viên vì lịch đã thay đổi
  application.interviewResponse = undefined;

  await application.save();

  // Gửi thông báo cho ứng viên về lịch mới
  try {
    const employerDetails = await User.findById(req.user._id);
    const jobTitle = application.jobId?.title || "Không rõ vị trí";

    const formattedDate = new Date(interviewDate).toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const modeTextMap = { Online: "Online", ASL: "Online (ASL)", Offline: "Trực tiếp", Hybrid: "Kết hợp" };
    const interviewModeText = modeTextMap[interviewMode] || interviewMode;

    let notificationMessage = `Lịch phỏng vấn cho vị trí "${jobTitle}" đã được thay đổi.\n\n`;
    notificationMessage += `Thời gian mới: ${formattedDate} lúc ${interviewTime}\n`;
    notificationMessage += `Hình thức: ${interviewModeText}\n`;

    if (interviewMode === "ASL") {
      notificationMessage += `Phỏng vấn qua hệ thống ASL trực tuyến trên website.\n`;
    } else if (interviewMode === "Online") {
      notificationMessage += `Link phỏng vấn: ${interviewLocation}\n`;
    } else {
      notificationMessage += `Địa điểm: ${interviewLocation || application.jobId?.location || "Sẽ được thông báo sau"}\n`;
    }

    notificationMessage += `\nVui lòng xác nhận lại lịch phỏng vấn mới.`;

    await Notification.create({
      userId: application.applicantID.user,
      type: "interview_scheduled",
      title: "Lịch phỏng vấn đã được thay đổi",
      message: notificationMessage,
      jobId: application.jobId?._id || application.jobId,
      interviewDetails: {
        date: interviewDate,
        time: interviewTime,
        jobTitle,
        mode: interviewMode || "Online",
        location: interviewLocation || application.jobId?.location || "",
        employerName: employerDetails?.name || req.user.name,
        employerEmail: employerDetails?.email || req.user.email,
        employerPhone: employerDetails?.phone || "",
      },
    });
  } catch (notifError) {
    console.error("Lỗi khi tạo thông báo:", notifError);
  }

  res.status(200).json({
    success: true,
    message: "Đã cập nhật lịch phỏng vấn!",
    application,
  });
});

// Lưu ghi chú phỏng vấn (Employer)
export const saveInterviewNotes = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const { notes } = req.body;

  if (typeof notes !== "string") {
    return next(new ErrorHandler("Ghi chú không hợp lệ.", 400));
  }

  if (notes.length > 5000) {
    return next(new ErrorHandler("Ghi chú không được vượt quá 5000 ký tự.", 400));
  }

  const application = await Application.findById(id);
  if (!application) {
    return next(new ErrorHandler("Không tìm thấy đơn ứng tuyển.", 404));
  }

  if (application.employerID.user.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler("Bạn không có quyền ghi chú cho đơn ứng tuyển này.", 403));
  }

  if (!application.interviewSchedule?.date) {
    return next(new ErrorHandler("Đơn ứng tuyển này chưa có lịch phỏng vấn.", 400));
  }

  application.interviewNotes = notes;
  await application.save();

  res.status(200).json({
    success: true,
    message: "Đã lưu ghi chú phỏng vấn!",
    interviewNotes: application.interviewNotes,
  });
});
