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
  saveInterviewTranscript,
  checkApplied,
  getAppliedJobIds,
  employerGetInterviewsByDateRange,
  saveInterviewNotes,
  rescheduleInterview,
} from "../controllers/applicationController.js";
import { isAuthenticated, authorizeRoles } from "../middlewares/auth.js";

const router = express.Router();

// Job Seeker routes
router.post("/post", isAuthenticated, authorizeRoles("Job Seeker"), postApplication);
router.get("/jobseeker/getall", isAuthenticated, authorizeRoles("Job Seeker"), jobseekerGetAllApplications);
router.delete("/delete/:id", isAuthenticated, authorizeRoles("Job Seeker"), jobseekerDeleteApplication);
router.get("/check/:jobId", isAuthenticated, authorizeRoles("Job Seeker"), checkApplied);
router.get("/applied-jobs", isAuthenticated, authorizeRoles("Job Seeker"), getAppliedJobIds);

// Employer routes
router.get("/employer/getall", isAuthenticated, authorizeRoles("Employer"), employerGetAllApplications);
router.put("/update-status/:id", isAuthenticated, authorizeRoles("Employer"), updateApplicationStatus);

// Interview routes
router.get("/employer/interviews", isAuthenticated, authorizeRoles("Employer"), employerGetInterviews);
router.get("/employer/interviews/calendar", isAuthenticated, authorizeRoles("Employer"), employerGetInterviewsByDateRange);
router.get("/jobseeker/interviews", isAuthenticated, authorizeRoles("Job Seeker"), jobseekerGetInterviews);
router.put("/interview-response/:id", isAuthenticated, authorizeRoles("Job Seeker"), interviewResponse);
router.put("/interview-notes/:id", isAuthenticated, authorizeRoles("Employer"), saveInterviewNotes);
router.put("/reschedule/:id", isAuthenticated, authorizeRoles("Employer"), rescheduleInterview);

// Video ASL transcript
router.put("/save-transcript/:id", isAuthenticated, saveInterviewTranscript);

export default router;
