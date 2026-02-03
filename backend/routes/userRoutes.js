import express from "express";
import { login, register, logout, getUser, googleLogin, updateProfile } from "../controllers/userController.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/logout", isAuthenticated, logout);
router.post("/google-login", googleLogin);
router.get("/getuser", isAuthenticated, getUser);
router.put("/update", isAuthenticated, updateProfile);

export default router;
