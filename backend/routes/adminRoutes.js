import express from "express";
import { getAdminStats } from "../controllers/AdminStatsController.js";
import { isAuthenticated, authorizeRoles } from "../middlewares/auth.js";

const router = express.Router();

// Admin statistics route
router.get("/stats", isAuthenticated, authorizeRoles("Admin"), getAdminStats);

export default router;
