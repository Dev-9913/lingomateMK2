import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    // The folder where files will be stored in Cloudinary
    folder: "chat-app", // optional folder name
    allowed_formats: ["jpg", "png", "webp", "mp4", "mov", "pdf"], // adjust as needed
    use_filename: true,
    unique_filename: false,
    overwrite: true,
  },
});

export default cloudinary;
