import { User } from "../models/userSchema.js";
import { Job } from "../models/jobSchema.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";

// @desc    Get admin dashboard statistics
// @route   GET /api/v1/admin/stats
// @access  Private/Admin
export const getAdminStats = catchAsyncErrors(async (req, res, next) => {
  // Verify admin role
  if (req.user.role !== "Admin") {
    return next(new ErrorHandler("Only admins can access statistics", 403));
  }

  // Count users by role
  const totalUsers = await User.countDocuments();
  const totalEmployers = await User.countDocuments({ role: "Employer" });
  const totalJobSeekers = await User.countDocuments({ role: "Job Seeker" });

  // Count jobs by approval status
  const totalJobs = await Job.countDocuments();
  const pendingJobs = await Job.countDocuments({ approvalStatus: "Pending" });
  const approvedJobs = await Job.countDocuments({ approvalStatus: "Approved" });
  const rejectedJobs = await Job.countDocuments({ approvalStatus: "Rejected" });

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
