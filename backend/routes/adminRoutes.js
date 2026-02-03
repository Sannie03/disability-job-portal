import express from "express";
import { getAdminStats } from "../controllers/AdminStatsController.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

// Admin statistics route
router.get("/stats", isAuthenticated, getAdminStats);

export default router;
