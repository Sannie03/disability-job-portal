import { User } from "../models/userSchema.js";
import { Job } from "../models/jobSchema.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";

// @desc    Get admin dashboard statistics
// @route   GET /api/v1/admin/stats
// @access  Private/Admin
export const getAdminStats = catchAsyncErrors(async (req, res, next) => {
  // Count users by role
  const totalUsers = await User.countDocuments();
  const totalEmployers = await User.countDocuments({ role: "Employer" });
  const totalJobSeekers = await User.countDocuments({ role: "Job Seeker" });

  // Count jobs by approval status (không đếm job đã bị xóa)
  const notDeleted = { isDeleted: { $ne: true } };
  const totalJobs = await Job.countDocuments(notDeleted);
  const pendingJobs = await Job.countDocuments({ ...notDeleted, status: "pending" });
  const approvedJobs = await Job.countDocuments({ ...notDeleted, status: "approved" });
  const rejectedJobs = await Job.countDocuments({ ...notDeleted, status: "rejected" });

  // Get all users with basic info
  const users = await User.find({})
    .select("name email role createdAt")
    .sort({ createdAt: -1 })
    .limit(50);

  res.status(200).json({
    success: true,
    stats: {
      totalUsers,
      totalEmployers,
      totalJobSeekers,
      totalJobs,
      pendingJobs,
      approvedJobs,
      rejectedJobs,
    },
    users,
  });
});
