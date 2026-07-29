import { assertOfficePresence, getClientIp } from "../utils/networkValidator.js";
import db from "../models/index.js";
import moment from "moment-timezone";
import Sequelize from "sequelize";
import {
  getMembersForContext,
  getPrimaryMembershipMap,
} from "../services/membershipService.js";
import { ensureAbsentRecords } from "../services/attendanceAbsentService.js";

const { Op } = Sequelize;

const Attendance = db.attendances;
const SalaryDeduction = db.SalaryDeductions;
const TIMEZONE = "Africa/Lagos";

function normalizeClock(timeString, fallback = "09:00:00") {
  if (!timeString) return fallback;
  const t = String(timeString).trim();
  if (/^\d{2}:\d{2}$/.test(t)) return `${t}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(t)) return t;
  return fallback;
}

function getLocalTime(date, timeString, timezone = TIMEZONE) {
  const clock = normalizeClock(timeString);
  const localTime = moment.tz(
    `${date}T${clock}`,
    "YYYY-MM-DDTHH:mm:ss",
    timezone
  );
  if (!localTime.isValid()) {
    throw new Error("Invalid sign-in time format");
  }
  return localTime.format("YYYY-MM-DD HH:mm:ss");
}

const signIn = async (req, res) => {
  try {
    const {
      user_id,
      office_lan_ok,
      lat,
      lng,
    } = req.body;
    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "user_id is required",
        },
      });
    }

    const presence = assertOfficePresence(req, {
      office_lan_ok,
      lat,
      lng,
    });
    const clientIp = presence.clientIp || getClientIp(req);

    if (!presence.ok) {
      return res.status(403).json({
        success: false,
        error: {
          code: "INVALID_NETWORK",
          message:
            presence.message ||
            "You must be at the office to sign attendance",
        },
      });
    }

    const now = moment.tz(TIMEZONE);
    const date = now.format("YYYY-MM-DD");
    const signInTime = now.format("YYYY-MM-DD HH:mm:ss");
    const expectedSignInClock = normalizeClock(
      process.env.EXPECTED_SIGN_IN_TIME,
      "09:30:00"
    );
    const expectedSignOutClock = normalizeClock(
      process.env.EXPECTED_SIGN_OUT_TIME,
      "17:00:00"
    );
    const expectedSignInTime = getLocalTime(
      date,
      expectedSignInClock,
      TIMEZONE
    );

    const expectedSignIn = moment.tz(
      expectedSignInTime,
      "YYYY-MM-DD HH:mm:ss",
      TIMEZONE
    );
    const actualSignIn = moment.tz(signInTime, "YYYY-MM-DD HH:mm:ss", TIMEZONE);
    const status = actualSignIn.isSameOrBefore(expectedSignIn)
      ? "on_time"
      : "late";

    let attendance = await Attendance.findOne({ where: { user_id, date } });

    if (attendance && attendance.sign_in_time) {
      return res.status(400).json({
        success: false,
        error: {
          code: "ALREADY_SIGNED_IN",
          message: "Already signed in for today",
        },
      });
    }

    if (!attendance) {
      attendance = await Attendance.create({
        user_id,
        date,
        sign_in_time: signInTime,
        expected_sign_in_time: expectedSignInClock,
        expected_sign_out_time: expectedSignOutClock,
        status,
        network_name: process.env.OFFICE_NETWORK_NAME || null,
        ip_address: clientIp,
      });
    } else {
      attendance = await attendance.update({
        sign_in_time: signInTime,
        expected_sign_in_time: expectedSignInClock,
        expected_sign_out_time: expectedSignOutClock,
        status,
        network_name: process.env.OFFICE_NETWORK_NAME || null,
        ip_address: clientIp,
      });
    }

    if (status === "late") {
      await SalaryDeduction.create({
        user_id,
        reason: "Late Sign-In",
        amount_deducted: 100,
        date,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: attendance.id,
        user_id: attendance.user_id,
        date: attendance.date,
        sign_in_time: attendance.sign_in_time,
        status: attendance.status,
        message:
          status === "on_time"
            ? "Signed in successfully"
            : "Signed in late",
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "An error occurred while processing your request",
        details: error.message,
      },
    });
  }
};







const signOut = async (req, res) => {
  try {
    const { user_id, office_lan_ok, lat, lng } = req.body;
    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "user_id is required",
        },
      });
    }

    const presence = assertOfficePresence(req, {
      office_lan_ok,
      lat,
      lng,
    });
    if (!presence.ok) {
      return res.status(403).json({
        success: false,
        error: {
          code: "INVALID_NETWORK",
          message:
            presence.message ||
            "You must be at the office to sign attendance out",
        },
      });
    }

    const now = moment.tz(TIMEZONE);
    const date = now.format("YYYY-MM-DD");
    const signOutTime = now.format("YYYY-MM-DD HH:mm:ss");
    const expectedSignOutClock = normalizeClock(
      process.env.EXPECTED_SIGN_OUT_TIME,
      "17:00:00"
    );
    const expectedSignOutTime = getLocalTime(
      date,
      expectedSignOutClock,
      TIMEZONE
    );

    const attendance = await Attendance.findOne({
      where: { user_id, date },
    });

    if (!attendance || !attendance.sign_in_time) {
      return res.status(400).json({
        success: false,
        error: {
          code: "NOT_SIGNED_IN",
          message: "No sign-in record found for today",
        },
      });
    }

    if (attendance.sign_out_time) {
      return res.status(400).json({
        success: false,
        error: {
          code: "ALREADY_SIGNED_OUT",
          message: "Already signed out for today",
        },
      });
    }

    const expectedSignOut = moment.tz(
      expectedSignOutTime,
      "YYYY-MM-DD HH:mm:ss",
      TIMEZONE
    );
    const actualSignOut = moment.tz(signOutTime, "YYYY-MM-DD HH:mm:ss", TIMEZONE);
    const signInMoment = moment.tz(
      attendance.sign_in_time,
      TIMEZONE
    );

    if (actualSignOut.isBefore(signInMoment)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_SIGN_OUT_TIME",
          message: "Sign-out time cannot be before sign-in time",
        },
      });
    }

    const sign_out_status = actualSignOut.isBefore(expectedSignOut)
      ? "early_departure"
      : attendance.status;

    await attendance.update({
      sign_out_time: signOutTime,
      sign_out_status,
      ip_address: presence.clientIp || attendance.ip_address,
    });

    return res.status(200).json({
      success: true,
      data: {
        id: attendance.id,
        user_id: attendance.user_id,
        date: attendance.date,
        sign_in_time: attendance.sign_in_time,
        sign_out_time: attendance.sign_out_time,
        status: attendance.status,
        sign_out_status: attendance.sign_out_status,
        message:
          sign_out_status === "early_departure"
            ? "Signed out early"
            : "Signed out successfully",
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "An error occurred while processing your request",
        details: error.message,
      },
    });
  }
};

const getTodayStatus = async (req, res) => {
  try {
    const { user_id } = req.query;
    const date = moment.tz(TIMEZONE).format("YYYY-MM-DD");

    const attendance = await Attendance.findOne({
      where: { user_id, date },
    });

    return res.status(200).json({
      success: true,
      data: {
        has_signed_in: attendance && attendance.sign_in_time ? true : false,
        has_signed_out: attendance && attendance.sign_out_time ? true : false,
        attendance_record: attendance ? {
          id: attendance.id,
          date: attendance.date,
          sign_in_time: attendance.sign_in_time,
          sign_out_time: attendance.sign_out_time,
          status: attendance.status,
        } : null,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while processing your request',
        details: error.message,
      },
    });
  }
};

const getAttendanceHistory = async (req, res) => {
  try {
    const {
      user_id,
      start_date,
      end_date,
      role = "",
      startup_id = "",
      org_id = "",
      dept_id = "",
    } = req.query;

    if (!user_id || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message:
            "Missing required query parameters: user_id, start_date, end_date, role.",
        },
      });
    }

    const ORG_REPORT_ROLES = [
      "admin",
      "manager",
      "Manager",
      "accountant",
      "ceos",
      "CEO",
      "CTO",
    ];
    const isOrgWide = ORG_REPORT_ROLES.includes(role);

    const attendanceWhere = {
      date: { [Op.between]: [start_date, end_date] },
    };

    if (!isOrgWide) {
      attendanceWhere.user_id = user_id;
    } else if (startup_id || org_id) {
      const members = await getMembersForContext({
        startup_id: startup_id || null,
        org_id: org_id || null,
        dept_id: dept_id || null,
      });
      const memberIds = members.map((m) => m.user_id).filter(Boolean);
      if (memberIds.length) {
        attendanceWhere.user_id = { [Op.in]: memberIds };
      } else {
        return res.json({ success: true, data: [] });
      }

      // Mark expected no-shows as absent so they appear in admin views
      try {
        await ensureAbsentRecords({
          start_date,
          end_date,
          org_id: org_id || null,
          startup_id: startup_id || null,
          dept_id: dept_id || null,
        });
      } catch (absentErr) {
        console.error("ensureAbsentRecords error:", absentErr);
      }
    }

    const rows = await db.attendances.findAll({
      where: attendanceWhere,
      include: [
        {
          model: db.users,
          as: "users",
          attributes: [
            "user_id",
            "fullname",
            "email",
            "phone_no",
            "address",
            "status",
            "starting_date",
            "end_date",
            "createdAt",
            "updatedAt",
          ],
          required: false,
        },
      ],
      order: [["date", "ASC"]],
    });

    // Fallback if join missed anyone (legacy rows / association quirks)
    const missingUserIds = [
      ...new Set(
        rows
          .map((a) => {
            const plain = a.get({ plain: true });
            return plain.users ? null : plain.user_id;
          })
          .filter(Boolean)
      ),
    ];
    const fallbackUsers = {};
    if (missingUserIds.length) {
      const found = await db.users.findAll({
        where: { user_id: { [Op.in]: missingUserIds } },
        attributes: [
          "user_id",
          "fullname",
          "email",
          "phone_no",
          "address",
          "status",
          "starting_date",
          "end_date",
          "createdAt",
          "updatedAt",
        ],
        raw: true,
      });
      for (const u of found) fallbackUsers[u.user_id] = u;
    }

    const userIds = [
      ...new Set(
        rows
          .map((a) => {
            const plain = a.get({ plain: true });
            return plain.users?.user_id || plain.user_id;
          })
          .filter(Boolean)
      ),
    ];
    const primaryMap = userIds.length
      ? await getPrimaryMembershipMap(userIds)
      : {};

    const data = rows.map((a) => {
      const plain = a.get({ plain: true });
      const u = plain.users || fallbackUsers[plain.user_id] || {};
      const ctx = primaryMap[u.user_id || plain.user_id] || {};
      return {
        user_id: u.user_id || plain.user_id,
        fullname: u.fullname || null,
        name: u.fullname || null,
        email: u.email,
        phone_no: u.phone_no,
        address: u.address,
        role: ctx.role || null,
        status: u.status,
        startup_id: ctx.startup_id || null,
        starting_date: u.starting_date,
        end_date: u.end_date,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        attendance_id: plain.id,
        date: plain.date,
        sign_in_time: plain.sign_in_time,
        sign_out_time: plain.sign_out_time,
        attendance_status: plain.status,
        notes: plain.notes,
        sign_out_status: plain.sign_out_status,
        network_name: plain.network_name,
        ip_address: plain.ip_address,
        startup_name: ctx.label || null,
        startup_description: null,
        startup_logo: ctx.logo || null,
      };
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error("getAttendanceHistory error:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch attendance history",
        details: error.message,
      },
    });
  }
};

export { signIn, signOut, getTodayStatus, getAttendanceHistory };
