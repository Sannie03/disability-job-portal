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
import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

// Public
router.get("/getall", getAllJobs);
router.get("/search", searchJobs);

// Employer
router.post("/post", isAuthenticated, postJob);
router.get("/getmyjobs", isAuthenticated, getMyJobs);
router.put("/update/:id", isAuthenticated, updateJob);
router.put("/extend/:id", isAuthenticated, extendDeadline);
router.delete("/delete/:id", isAuthenticated, deleteJob);

// Admin – duyệt tin
router.get("/admin/pending", isAuthenticated, getPendingJobs);
router.put("/admin/:id/approve", isAuthenticated, approveJob);
router.put("/admin/:id/reject", isAuthenticated, rejectJob);
router.put("/admin/approve-many", isAuthenticated, approveManyJobs);

// Single job 
router.get("/:id", isAuthenticated, getSingleJob);

export default router;
