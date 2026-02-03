import cloudinary from "cloudinary";
import { config } from "dotenv";

config({ path: "./.env" });

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log("📋 Đang kiểm tra Cloudinary credentials...\n");
console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("API Key:", process.env.CLOUDINARY_API_KEY);
console.log("API Secret:", process.env.CLOUDINARY_API_SECRET ? "✓ Đã set" : "✗ Chưa set");

// Test connection
cloudinary.v2.api.ping()
  .then(() => {
    console.log("\n✅ Kết nối Cloudinary thành công!");
  })
  .catch((error) => {
    console.error("\n❌ Lỗi kết nối Cloudinary:");
    console.error(error.message);
    console.error("\n💡 Hãy kiểm tra lại API credentials trong file .env");
  });
