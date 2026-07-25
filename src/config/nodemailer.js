import nodemailer from "nodemailer";

/**
 * Google SMTP (Gmail) via env:
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=465
 *   SMTP_SECURE=true
 *   SMTP_USER=your@gmail.com
 *   SMTP_PASS=app-password   (Google Account → App passwords)
 *   MAIL_FROM="Brainstorm Ops <your@gmail.com>"
 *
 * For port 587 use SMTP_SECURE=false (STARTTLS).
 */
const port = Number(process.env.SMTP_PORT || 465);
const secure =
  process.env.SMTP_SECURE != null
    ? String(process.env.SMTP_SECURE).toLowerCase() === "true"
    : port === 465;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port,
  secure,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export default transporter;
