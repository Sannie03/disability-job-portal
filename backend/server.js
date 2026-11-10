import app from "./app.js";
import cloudinary from "cloudinary";
import dbConnection from "./database/dbConnection.js";

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, // CLOUDINARY_CLIENT_NAME
  api_key: process.env.CLOUDINARY_API_KEY,       // CLOUDINARY_CLIENT_API
  api_secret: process.env.CLOUDINARY_API_SECRET, // CLOUDINARY_CLIENT_SECRET
});

const port = process.env.PORT || 5000;

try {
  if (!process.env.JWT_SECRET_KEY || Buffer.byteLength(process.env.JWT_SECRET_KEY) < 32) {
    throw new Error("JWT_SECRET_KEY must contain at least 32 bytes");
  }
  await dbConnection();
  app.listen(port, "0.0.0.0", () => {
    console.log(`Server running at port ${port}`);
  });
} catch (error) {
  console.error("Server startup failed:", error.message);
  process.exit(1);
}
