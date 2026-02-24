import express from "express";
import {
  deleteJob,
  getAllJobs,
  getMyJobs,
  getSingleJob,
  postJob,
  updateJob,
  searchJobs,
  extendDeadline,
} from "../controllers/jobController.js";
import {
  getPendingJobs,
  approveJob,
  rejectJob,
  approveManyJobs
} from "../controllers/AdminJobPostApprovalController.js";
import { isAuthenticated, authorizeRoles } from "../middlewares/auth.js";

const router = express.Router();

// Public
router.get("/getall", getAllJobs);
router.get("/search", searchJobs);

// Employer
router.post("/post", isAuthenticated, authorizeRoles("Employer"), postJob);
router.get("/getmyjobs", isAuthenticated, authorizeRoles("Employer"), getMyJobs);
router.put("/update/:id", isAuthenticated, authorizeRoles("Employer"), updateJob);
router.put("/extend/:id", isAuthenticated, authorizeRoles("Employer"), extendDeadline);
router.delete("/delete/:id", isAuthenticated, authorizeRoles("Employer"), deleteJob);

// Admin – duyệt tin
router.get("/admin/pending", isAuthenticated, authorizeRoles("Admin"), getPendingJobs);
router.put("/admin/:id/approve", isAuthenticated, authorizeRoles("Admin"), approveJob);
router.put("/admin/:id/reject", isAuthenticated, authorizeRoles("Admin"), rejectJob);
router.put("/admin/approve-many", isAuthenticated, authorizeRoles("Admin"), approveManyJobs);

// Single job
router.get("/:id", getSingleJob);

export default router;
