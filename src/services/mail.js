import crypto from "crypto";
import transporter, { hasSmtpAuth } from "../config/nodemailer.js";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5100";
const FROM_EMAIL = process.env.MAIL_FROM || '"Brainstorm Ops" <noreply@brainstorm.ng>';

export function isMailConfigured() {
  return hasSmtpAuth;
}

export function createToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function sendMail({ to, subject, html, text }) {
  if (!hasSmtpAuth) {
    console.warn(
      "[mail] SMTP_USER/SMTP_PASS not set skipping email to:",
      to,
      subject
    );
    return { skipped: true, to, subject };
  }

  return transporter.sendMail({
    from: FROM_EMAIL,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, " "),
  });
}

export async function sendVerificationEmail(user, rawToken) {
  const link = `${FRONTEND_URL}/verify-email?token=${rawToken}`;
  return sendMail({
    to: user.email,
    subject: "Verify your Brainstorm account email",
    html: `
      <p>Hi ${user.fullname || "there"},</p>
      <p>Please verify your email address to continue with your account.</p>
      <p><a href="${link}">Verify email</a></p>
      <p>Or copy this link: ${link}</p>
      <p>This link expires in 24 hours.</p>
    `,
  });
}

export async function sendPasswordResetEmail(user, rawToken) {
  const link = `${FRONTEND_URL}/reset-password?token=${rawToken}`;
  return sendMail({
    to: user.email,
    subject: "Reset your Brainstorm password",
    html: `
      <p>Hi ${user.fullname || "there"},</p>
      <p>We received a request to reset your password.</p>
      <p><a href="${link}">Reset password</a></p>
      <p>Or copy this link: ${link}</p>
      <p>This link expires in 1 hour. If you did not request this, ignore this email.</p>
    `,
  });
}

/**
 * Admin-provisioned account: temporary password + login instructions.
 */
export async function sendAdminInviteEmail(user, temporaryPassword) {
  const loginUrl = `${FRONTEND_URL}/login`;
  return sendMail({
    to: user.email,
    subject: "Your Brainstorm account is ready",
    html: `
      <p>Hi ${user.fullname || "there"},</p>
      <p>An administrator created your Brainstorm Ops account. Use the details below to sign in.</p>
      <p><strong>Login:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
      <p><strong>Email:</strong> ${user.email}</p>
      <p><strong>Temporary password:</strong> <code>${temporaryPassword}</code></p>
      <ol>
        <li>Open the login page.</li>
        <li>Sign in with your email and temporary password.</li>
        <li>Change your password after you sign in (recommended).</li>
      </ol>
      <p>If you did not expect this email, contact your administrator.</p>
    `,
    text: `Hi ${user.fullname || "there"},

An administrator created your Brainstorm Ops account.

Login: ${loginUrl}
Email: ${user.email}
Temporary password: ${temporaryPassword}

1. Open the login page.
2. Sign in with your email and temporary password.
3. Change your password after you sign in.

If you did not expect this email, contact your administrator.`,
  });
}

/**
 * Placement accepted: account created with temp password + how to access the platform.
 */
export async function sendPlacementWelcomeEmail(user, temporaryPassword, meta = {}) {
  const loginUrl = `${FRONTEND_URL}/login`;
  const typeLabel = (meta.application_type || "placement").replace(/_/g, " ");
  return sendMail({
    to: user.email,
    subject: "Welcome to Brainstorm your placement account",
    html: `
      <p>Hi ${user.fullname || "there"},</p>
      <p>Congratulations your <strong>${typeLabel}</strong> application has been accepted.</p>
      <p>We created your Brainstorm workspace account. Use these details to sign in:</p>
      <p><strong>Login page:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
      <p><strong>Email:</strong> ${user.email}</p>
      <p><strong>Temporary password:</strong> <code>${temporaryPassword}</code></p>
      ${meta.applicant_id ? `<p><strong>Applicant ID:</strong> ${meta.applicant_id}</p>` : ""}
      <p><strong>How to access the platform</strong></p>
      <ol>
        <li>Open <a href="${loginUrl}">${loginUrl}</a> on your browser.</li>
        <li>Sign in with your email and the temporary password above.</li>
        <li>Change your password after your first login.</li>
        <li>Use the sidebar for attendance, tasks, and weekly reports for your placement.</li>
      </ol>
      <p>If you have trouble signing in, reply to this email or contact your supervisor.</p>
    `,
    text: `Hi ${user.fullname || "there"},

Congratulations your ${typeLabel} application has been accepted.

Login: ${loginUrl}
Email: ${user.email}
Temporary password: ${temporaryPassword}
${meta.applicant_id ? `Applicant ID: ${meta.applicant_id}\n` : ""}
How to access the platform:
1. Open ${loginUrl}
2. Sign in with your email and temporary password
3. Change your password after first login
4. Use attendance, tasks, and weekly reports for your placement

If you have trouble signing in, contact your supervisor.`,
  });
}

export function parseDeviceName(userAgent = "") {
  const ua = String(userAgent);
  if (/edg\//i.test(ua)) return "Edge";
  if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) return "Chrome";
  if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) return "Safari";
  if (/firefox\//i.test(ua)) return "Firefox";
  if (/mobile/i.test(ua)) return "Mobile browser";
  return "Web browser";
}

export default {
  createToken,
  hashToken,
  sendMail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendAdminInviteEmail,
  sendPlacementWelcomeEmail,
  parseDeviceName,
};
