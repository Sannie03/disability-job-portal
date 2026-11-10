import express from "express";
import jobRouter from "./routes/jobRoutes.js";
import userRouter from "./routes/userRoutes.js";
import applicationRouter from "./routes/applicationRoutes.js";
import notificationRouter from "./routes/notificationRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import { config } from "dotenv";
import cors from "cors";
import { errorMiddleware } from "./middlewares/error.js";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import mongoose from "mongoose";

const app = express();
config({ path: "./.env" });

if (process.env.NODE_ENV === "production") {
  // Direct Render traffic has one trusted proxy; override for another topology.
  const proxyHops = Number(process.env.TRUST_PROXY_HOPS || 1);
  if (!Number.isInteger(proxyHops) || proxyHops < 1) {
    throw new Error("TRUST_PROXY_HOPS must be a positive integer");
  }
  app.set("trust proxy", proxyHops);
}

app.get("/health", (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ status: ready ? "ok" : "unavailable" });
});

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
}));

// CORS phải chạy TRƯỚC rate limiter để 429 response cũng có CORS headers
const fallbackOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  "https://23b620f57c0d.ngrok-free.app",
  "https://52hzconnect.site",
  "https://www.52hzconnect.site",
];

const envOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((origin) => origin.trim()).filter(Boolean)
  : [];

const allowedOrigins = envOrigins.length ? envOrigins : fallbackOrigins;

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "DELETE", "PUT"],
    credentials: true,
  })
);

// Rate limiting chung - chống DDoS/brute force
const isDev = process.env.NODE_ENV !== "production";
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: isDev ? 1000 : 100,  // dev: 1000, production: 100
  message: { success: false, message: "Quá nhiều yêu cầu, vui lòng thử lại sau." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

// Rate limit riêng cho login/register (chặt hơn)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 20,  // dev: 100, production: 20
  message: { success: false, message: "Quá nhiều lần thử đăng nhập, vui lòng thử lại sau 15 phút." },
});
app.use("/api/v1/user/login", authLimiter);
app.use("/api/v1/user/register", authLimiter);
app.use("/api/v1/user/google-login", authLimiter);

app.use(cookieParser());
app.use("/api/v1/application/save-transcript", express.json({ limit: "256kb" }));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(mongoSanitize());

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "./tmp/",
  })
);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/job", jobRouter);
app.use("/api/v1/application", applicationRouter);
app.use("/api/v1/notification", notificationRouter);
app.use("/api/v1/admin", adminRouter);

app.use(errorMiddleware);
export default app;
