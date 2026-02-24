import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import { Job } from "../models/jobSchema.js";
import { Notification } from "../models/notificationSchema.js";
import ErrorHandler from "../middlewares/error.js";

export const getPendingJobs = catchAsyncErrors(async (req, res, next) => {
  const jobs = await Job.find({ status: "pending", isDeleted: { $ne: true } })
    .populate("postedBy", "name email");

  res.status(200).json({
    success: true,
    count: jobs.length,
    jobs,
  });
});
export const approveJob = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const job = await Job.findById(id);

  if (!job) {
    return next(new ErrorHandler("Không tìm thấy công việc.", 404));
  }

  if (job.isDeleted) {
    return next(new ErrorHandler("Không thể duyệt tin đã bị xóa.", 400));
  }

  job.status = "approved";
  job.approvedBy = req.user._id;
  job.approvedAt = new Date();
  job.expired = false;

  await job.save();

  // Tạo thông báo cho nhà tuyển dụng
  await Notification.create({
    userId: job.postedBy,
    type: "job_approved",
    title: "Tin tuyển dụng đã được duyệt",
    message: `Tin tuyển dụng "${job.title}" của bạn đã được duyệt và đang hiển thị công khai.`,
    jobId: job._id,
  });

  res.status(200).json({
    success: true,
    message: "Duyệt tin tuyển dụng thành công!",
  });
});
export const rejectJob = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason) {
    return next(new ErrorHandler("Vui lòng nhập lý do từ chối.", 400));
  }

  const job = await Job.findById(id);

  if (!job) {
    return next(new ErrorHandler("Không tìm thấy công việc.", 404));
  }

  // Tạo thông báo cho nhà tuyển dụng
  await Notification.create({
    userId: job.postedBy,
    type: "job_rejected",
    title: "Tin tuyển dụng bị từ chối",
    message: `Tin tuyển dụng "${job.title}" của bạn đã bị từ chối. Lý do: ${reason}`,
    jobId: job._id,
  });

  // Soft delete: đánh dấu đã xóa thay vì xóa khỏi DB
  job.status = "rejected";
  job.rejectionReason = reason;
  job.isDeleted = true;
  job.deletedAt = new Date();
  await job.save();

  res.status(200).json({
    success: true,
    message: `Đã từ chối tin tuyển dụng. Lý do: ${reason}`,
  });
});

export const approveManyJobs = catchAsyncErrors(async (req, res, next) => {
  const { jobIds } = req.body;

  if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
    return next(new ErrorHandler("Vui lòng chọn ít nhất một tin tuyển dụng.", 400));
  }

  const result = await Job.updateMany(
    { _id: { $in: jobIds }, isDeleted: { $ne: true } },
    {
      $set: {
        status: "approved",
        approvedBy: req.user._id,
        approvedAt: new Date(),
        expired: false
      }
    }
  );

  res.status(200).json({
    success: true,
    message: `Đã duyệt ${result.modifiedCount} tin tuyển dụng.`,
    modifiedCount: result.modifiedCount
  });
});
