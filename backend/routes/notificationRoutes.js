import express from "express";
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "../controllers/notificationController.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

router.get("/my", isAuthenticated, getMyNotifications);
router.put("/:id/read", isAuthenticated, markAsRead);
router.put("/read-all", isAuthenticated, markAllAsRead);
router.delete("/:id", isAuthenticated, deleteNotification);

export default router;
