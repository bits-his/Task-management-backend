import fs from "fs";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const INTERNSHIP_UPLOAD_DIR = path.join(
  __dirname,
  "../../uploads/internship"
);

if (!fs.existsSync(INTERNSHIP_UPLOAD_DIR)) {
  fs.mkdirSync(INTERNSHIP_UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, INTERNSHIP_UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const base = path
      .basename(file.originalname || "file", ext)
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 80);
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

export const internshipUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export function internshipFilePublicUrl(file) {
  if (!file) return null;
  if (file.location) return file.location;
  if (file.filename) {
    const base =
      process.env.API_PUBLIC_URL ||
      `http://localhost:${process.env.PORT || 34567}`;
    return `${base}/uploads/internship/${file.filename}`;
  }
  return file.path || null;
}
