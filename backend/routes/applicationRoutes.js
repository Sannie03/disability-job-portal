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
import { isAuthenticated, authorizeRoles } from "../middlewares/auth.js";

const router = express.Router();

// Job Seeker routes
router.post("/post", isAuthenticated, authorizeRoles("Job Seeker"), postApplication);
router.get("/jobseeker/getall", isAuthenticated, authorizeRoles("Job Seeker"), jobseekerGetAllApplications);
router.delete("/delete/:id", isAuthenticated, authorizeRoles("Job Seeker"), jobseekerDeleteApplication);

// Employer routes
router.get("/employer/getall", isAuthenticated, authorizeRoles("Employer"), employerGetAllApplications);
router.put("/update-status/:id", isAuthenticated, authorizeRoles("Employer"), updateApplicationStatus);

// Interview routes 
router.get("/employer/interviews", isAuthenticated, authorizeRoles("Employer"), employerGetInterviews);
router.get("/jobseeker/interviews", isAuthenticated, authorizeRoles("Job Seeker"), jobseekerGetInterviews);
router.put("/interview-response/:id", isAuthenticated, authorizeRoles("Job Seeker"), interviewResponse);

export default router;
