import db from "../models/index.js";
import Sequelize from "sequelize";
import { getDashboardSummary } from "../services/dashboardService.js";

const { Op, fn, col } = Sequelize;

async function countByStatus(where = {}) {
  const rows = await db.task_form.findAll({
    where,
    attributes: ["status", [fn("COUNT", col("id")), "count"]],
    group: ["status"],
    raw: true,
  });
  const map = {};
  rows.forEach((r) => {
    map[r.status] = parseInt(r.count, 10) || 0;
  });
  return {
    completed: map.completed || 0,
    backlog: map.backlog || 0,
    pending: map.pending || 0,
    underReview: map.underReview || 0,
    inProgress: map.inprogress || map.inProgress || 0,
  };
}

export const getStats = async (req, res) => {
  try {
    const { query_type = "", user_id, startup_id = "" } = req.query;
    let counts;
    let extra = {};

    if (query_type === "admin") {
      counts = await countByStatus();
      extra.total_startups = await db.startups.count();
      const membershipCount = await db.user_memberships.count({
        where: { status: "active" },
        distinct: true,
        col: "user_id",
      });
      extra.total_members =
        membershipCount > 0 ? membershipCount : await db.users.count();
    } else if (query_type === "ceo") {
      counts = startup_id
        ? await countByStatus({ startup_id })
        : await countByStatus();
    } else if (query_type === "user") {
      counts = await countByStatus({ assigned_to: user_id });
    } else {
      return res.json({
        success: true,
        data: [{ message: "Invalid role type" }],
      });
    }

    const chart_data = {
      completed: counts.completed,
      backlog: counts.backlog,
      pending: counts.pending,
      underReview: counts.underReview,
      ...(query_type === "user"
        ? { inProgress: counts.inProgress }
        : {}),
    };

    const row = {
      completed_tasks: counts.completed,
      backlog_tasks: counts.backlog,
      pending_tasks: counts.pending,
      under_review_tasks: counts.underReview,
      ...(query_type === "user"
        ? { in_progress_tasks: counts.inProgress }
        : {}),
      ...(query_type === "admin"
        ? {
            total_startups: extra.total_startups,
            total_members: extra.total_members,
          }
        : {}),
      chart_data: JSON.stringify(chart_data),
    };

    res.json({ success: true, data: [row] });
  } catch (err) {
    console.log(err);
    res.json({ success: false, message: err.message });
  }
};

function transformNumberedObject(obj, transformFn) {
  if (!obj || typeof obj !== "object") return [];
  if (Array.isArray(obj)) return obj.map(transformFn).filter(Boolean);
  return Object.keys(obj)
    .filter((key) => !isNaN(parseInt(key)))
    .map((key) => transformFn(obj[key]))
    .filter((item) => item !== null);
}

export const getStatsAdmin = async (req, res) => {
  try {
    const { org_id = "1" } = req.query;
    const summary = await getDashboardSummary({
      context_type: "organization",
      role: "admin",
      org_id,
      functionalities: "",
    });
    res.json({ success: true, data: summary });
  } catch (err) {
    console.error("Error building admin stats:", err);
    res.json({ success: false, message: err.message });
  }
};

export const getDashboardSummaryHandler = async (req, res) => {
  try {
    const {
      user_id = "",
      startup_id = "",
      dept_id = "",
      org_id = "",
      context_type = "startup",
      role = "",
      functionalities = "",
      access_to = "",
    } = req.query;

    const data = await getDashboardSummary({
      user_id: user_id || null,
      startup_id: startup_id || null,
      dept_id: dept_id || null,
      org_id: org_id || null,
      context_type,
      role: role || "user",
      functionalities,
      access_to,
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error("Dashboard summary error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
