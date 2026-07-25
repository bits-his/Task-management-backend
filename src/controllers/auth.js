import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Sequelize from "sequelize";
import db from "../models/index.js";
import {
  createToken,
  hashToken,
  sendVerificationEmail,
  sendPasswordResetEmail,
  parseDeviceName,
} from "../services/mail.js";

const { Op } = Sequelize;
const User = db.users;
const UserSession = db.user_sessions;
const JWT_SECRET = process.env.JWT_SECRET || "secret";

function clientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
    req.ip ||
    req.connection?.remoteAddress ||
    null
  );
}

export async function requestPasswordReset(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({ where: { email } });
    // Always return success to avoid email enumeration
    if (!user) {
      return res.json({
        success: true,
        message: "If that email exists, a reset link has been sent.",
      });
    }

    const rawToken = createToken();
    await user.update({
      password_reset_token: hashToken(rawToken),
      password_reset_expires: new Date(Date.now() + 60 * 60 * 1000),
    });

    try {
      await sendPasswordResetEmail(user, rawToken);
    } catch (mailErr) {
      console.error("Password reset email failed:", mailErr.message);
    }

    return res.json({
      success: true,
      message: "If that email exists, a reset link has been sent.",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function resetPassword(req, res) {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Token and password are required" });
    }
    if (String(password).length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    const user = await User.findOne({
      where: {
        password_reset_token: hashToken(token),
        password_reset_expires: { [Op.gt]: new Date() },
      },
    });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired reset token" });
    }

    const hash = await bcrypt.hash(password, 10);
    await user.update({
      password: hash,
      password_reset_token: null,
      password_reset_expires: null,
    });

    // Revoke all sessions after password change
    if (UserSession) {
      await UserSession.update(
        { revoked_at: new Date() },
        { where: { user_id: user.user_id, revoked_at: null } }
      );
    }

    return res.json({
      success: true,
      message: "Password updated. You can sign in now.",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function verifyEmail(req, res) {
  try {
    const token = req.body.token || req.query.token;
    if (!token) {
      return res.status(400).json({ success: false, message: "Token is required" });
    }

    const user = await User.findOne({
      where: {
        email_verify_token: hashToken(token),
        email_verify_expires: { [Op.gt]: new Date() },
      },
    });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired verification token" });
    }

    await user.update({
      email_verified: true,
      email_verify_token: null,
      email_verify_expires: null,
    });

    return res.json({
      success: true,
      message: "Email verified successfully.",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function resendVerification(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.json({
        success: true,
        message: "If that email exists, a verification link has been sent.",
      });
    }

    if (user.email_verified) {
      return res.json({ success: true, message: "Email is already verified." });
    }

    const rawToken = createToken();
    await user.update({
      email_verify_token: hashToken(rawToken),
      email_verify_expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    try {
      await sendVerificationEmail(user, rawToken);
    } catch (mailErr) {
      console.error("Verification email failed:", mailErr.message);
    }

    return res.json({
      success: true,
      message: "If that email exists, a verification link has been sent.",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function createUserSession(user, req, token) {
  if (!UserSession) return null;
  const session_token = hashToken(token);
  const expires_at = new Date(Date.now() + 2 * 60 * 60 * 1000);
  return UserSession.create({
    user_id: user.user_id,
    session_token,
    device_name: parseDeviceName(req.headers["user-agent"]),
    user_agent: req.headers["user-agent"] || null,
    ip_address: clientIp(req),
    last_active: new Date(),
    expires_at,
  });
}

export async function listSessions(req, res) {
  try {
    const authUser = Array.isArray(req.user) ? req.user[0] : req.user;
    const user_id = authUser?.user_id || req.query.user_id;
    const currentToken = (req.headers.authorization || "")
      .replace(/^Bearer\s+/i, "")
      .trim();
    const currentHash = currentToken ? hashToken(currentToken) : null;

    if (!user_id) {
      return res.status(400).json({ success: false, message: "user_id required" });
    }

    const sessions = await UserSession.findAll({
      where: {
        user_id,
        revoked_at: null,
        expires_at: { [Op.gt]: new Date() },
      },
      order: [["last_active", "DESC"]],
      raw: true,
    });

    const data = sessions.map((s) => ({
      id: s.id,
      device_name: s.device_name,
      ip_address: s.ip_address,
      last_active: s.last_active,
      created_at: s.created_at,
      expires_at: s.expires_at,
      is_current: currentHash && s.session_token === currentHash,
    }));

    return res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function revokeSession(req, res) {
  try {
    const { sessionId } = req.params;
    const authUser = Array.isArray(req.user) ? req.user[0] : req.user;
    const user_id = authUser?.user_id || req.body.user_id;
    if (!user_id || !sessionId) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const session = await UserSession.findOne({
      where: { id: sessionId, user_id },
    });
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    await session.update({ revoked_at: new Date() });
    return res.json({ success: true, message: "Session revoked" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function revokeOtherSessions(req, res) {
  try {
    const authUser = Array.isArray(req.user) ? req.user[0] : req.user;
    const user_id = authUser?.user_id || req.body.user_id;
    const currentToken = (req.headers.authorization || "")
      .replace(/^Bearer\s+/i, "")
      .trim();
    if (!user_id || !currentToken) {
      return res.status(400).json({ success: false, message: "Unauthorized" });
    }

    await UserSession.update(
      { revoked_at: new Date() },
      {
        where: {
          user_id,
          revoked_at: null,
          session_token: { [Op.ne]: hashToken(currentToken) },
        },
      }
    );

    return res.json({ success: true, message: "Other sessions revoked" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export { JWT_SECRET };
