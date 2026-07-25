import multer from "multer";
import { storage } from "./cloudinaryConfig.js";

// Create the multer upload instance using Cloudinary storage
const upload = multer({ storage: storage });

export { upload };
