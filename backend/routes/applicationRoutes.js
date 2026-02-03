import express from "express";
import {
  employerGetAllApplications,
  jobseekerDeleteApplication,
  jobseekerGetAllApplications,
  postApplication,
  updateApplicationStatus,
  employerGetInterviews,
  jobseekerGetInterviews,
  interviewResponse,
} from "../controllers/applicationController.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

router.post("/post", isAuthenticated, postApplication);
router.get("/employer/getall", isAuthenticated, employerGetAllApplications);
router.get("/jobseeker/getall", isAuthenticated, jobseekerGetAllApplications);
router.delete("/delete/:id", isAuthenticated, jobseekerDeleteApplication);
router.put("/update-status/:id", isAuthenticated, updateApplicationStatus);

// Interview routes
router.get("/employer/interviews", isAuthenticated, employerGetInterviews);
router.get("/jobseeker/interviews", isAuthenticated, jobseekerGetInterviews);
router.put("/interview-response/:id", isAuthenticated, interviewResponse);

export default router;
