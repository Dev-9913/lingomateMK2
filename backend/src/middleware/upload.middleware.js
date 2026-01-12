import multer from "multer";
import { storage } from "../lib/cloudinary.js";

export const upload = multer({ storage: multer.memoryStorage() });
