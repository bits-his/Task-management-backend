import db from "../models/index.js";
import Sequelize from "sequelize";

const { Op } = Sequelize;

const MAX_RANGE_DAYS = 730;
const DONE_STATUSES = ["completed", "underReview"];

/** Format a Date as local YYYY-MM-DD (never UTC via toISOString). */
function toLocalDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse YYYY-MM-DD as local calendar date (avoids UTC midnight shift). */
function parseLocalDate(input) {
  if (input instanceof Date && !Number.isNaN(input.getTime())) {
    return new Date(input.getFullYear(), input.getMonth(), input.getDate());
  }
  const s = String(input || "").slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function clampDateRange(fromInput, toInput) {
  const today = parseLocalDate(new Date());

  let to = parseLocalDate(toInput) || new Date(today);
  let from = parseLocalDate(fromInput);
  if (!from) {
    from = new Date(to);
    from.setDate(from.getDate() - 30);
  }

  if (from > to) {
    const tmp = from;
    from = to;
    to = tmp;
  }

  const maxSpan = MAX_RANGE_DAYS - 1;
  const spanMs = to.getTime() - from.getTime();
  if (spanMs > maxSpan * 86400000) {
    from = new Date(to);
    from.setDate(from.getDate() - maxSpan);
  }

  return {
    date_from: toLocalDateString(from),
    date_to: toLocalDateString(to),
  };
}

function asDateOnly(value) {
  if (value == null) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toLocalDateString(value);
  }
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = parseLocalDate(s);
  return d ? toLocalDateString(d) : null;
}

function normalizeItems(items = []) {
  if (!Array.isArray(items)) return [];
  return items
    .map((raw, index) => {
      const type = ["task", "note", "blocker", "learning", "other"].includes(
        raw?.type
      )
        ? raw.type
        : raw?.task_id
          ? "task"
          : "note";
      const task_id = raw?.task_id ? String(raw.task_id) : null;
      const title = (raw?.title || "").trim() || null;
      const body = (raw?.body || "").trim() || null;
      if (type === "task" && !task_id && !title) return null;
      if (type !== "task" && !body && !title) return null;
      return {
        type,
        task_id: type === "task" ? task_id : null,
        title,
        body,
        sort_order: Number.isFinite(raw?.sort_order) ? raw.sort_order : index,
      };
    })
    .filter(Boolean);
}

async function replaceReportItems(reportId, items) {
  const normalized = normalizeItems(items);
  // Dedupe task items by task_id
  const seenTasks = new Set();
  const deduped = [];
  for (const item of normalized) {
    if (item.type === "task" && item.task_id) {
      const key = String(item.task_id);
      if (seenTasks.has(key)) continue;
      seenTasks.add(key);
    }
    deduped.push(item);
  }
  await db.report_items.destroy({ where: { report_id: reportId } });
  if (!deduped.length) return [];
  const rows = await db.report_items.bulkCreate(
    deduped.map((item) => ({ ...item, report_id: reportId }))
  );
  return rows.map((r) => r.get({ plain: true }));
}

async function upsertDayReport({
  user_id,
  report_date,
  week_start,
  content,
  status,
  items,
}) {
  const nextStatus = status === "submitted" ? "submitted" : "pending";
  const dateOnly = asDateOnly(report_date) || report_date;
  const weekOnly = asDateOnly(week_start) || week_start;

  let report = await db.weekly_reports.findOne({
    where: { user_id, report_date: dateOnly },
  });

  if (report) {
    await report.update({
      content: content ?? report.content,
      week_start: weekOnly || report.week_start,
      status: nextStatus,
      last_edited: new Date(),
    });
  } else {
    report = await db.weekly_reports.create({
      user_id,
      report_date: dateOnly,
      week_start: weekOnly,
      content: content || "",
      status: nextStatus,
      last_edited: new Date(),
    });
  }

  let savedItems = [];
  if (items !== undefined) {
    if (!db.report_items) {
      throw new Error("report_items table is not available — restart the server");
    }
    savedItems = await replaceReportItems(report.id, items);
  } else {
    savedItems = await db.report_items.findAll({
      where: { report_id: report.id },
      order: [
        ["sort_order", "ASC"],
        ["id", "ASC"],
      ],
      raw: true,
    });
  }

  return {
    ...report.get({ plain: true }),
    items: savedItems,
  };
}

/** Tasks completed / under review for users in a date window. */
async function fetchCompletedTasksForUsers(userIds, dateFrom, dateTo) {
  if (!userIds.length) return [];

  const idSet = new Set(userIds.map((id) => String(id)));
  const idLower = new Map(
    userIds.map((id) => [String(id).toLowerCase(), String(id)])
  );

  // Prefer assignee_table rows; also pull task_form for CSV assignees
  const [rows] = await db.sequelize.query(
    `
    SELECT
      t.task_id,
      t.title,
      t.status,
      t.assigned_to,
      a.user_id AS assignee_user_id,
      DATE(
        COALESCE(
          a.submitted_at,
          t.submitted_date,
          t.end_time,
          t.updatedAt,
          t.created_at
        )
      ) AS done_date
    FROM task_form t
    LEFT JOIN assignee_table a
      ON a.task_id = t.task_id
      AND a.status != 'deactivated'
    WHERE t.status IN (:statuses)
      AND (
        a.user_id IN (:userIds)
        OR t.assigned_to IS NOT NULL
      )
      AND DATE(
        COALESCE(
          a.submitted_at,
          t.submitted_date,
          t.end_time,
          t.updatedAt,
          t.created_at
        )
      ) BETWEEN :dateFrom AND :dateTo
    `,
    {
      replacements: {
        userIds,
        statuses: DONE_STATUSES,
        dateFrom,
        dateTo,
      },
    }
  );

  const out = [];
  const seen = new Set();

  const resolveUser = (raw) => {
    if (!raw) return null;
    const s = String(raw).trim();
    if (idSet.has(s)) return s;
    return idLower.get(s.toLowerCase()) || null;
  };

  for (const row of rows) {
    const candidates = new Set();
    const fromAssignee = resolveUser(row.assignee_user_id);
    if (fromAssignee) candidates.add(fromAssignee);

    if (row.assigned_to) {
      String(row.assigned_to)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((id) => {
          const resolved = resolveUser(id);
          if (resolved) candidates.add(resolved);
        });
    }

    // Skip tasks that matched only via assigned_to IS NOT NULL but no user in set
    if (!candidates.size) continue;

    const done = asDateOnly(row.done_date) || dateTo;

    for (const user_id of candidates) {
      const key = `${user_id}:${row.task_id}:${done}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        user_id,
        task_id: row.task_id,
        title: row.title,
        status: row.status,
        done_date: done,
      });
    }
  }
  return out;
}

async function loadItemsByReportIds(reportIds) {
  if (!reportIds.length) return new Map();
  const items = await db.report_items.findAll({
    where: { report_id: { [Op.in]: reportIds } },
    order: [
      ["sort_order", "ASC"],
      ["id", "ASC"],
    ],
    raw: true,
  });
  const map = new Map();
  for (const item of items) {
    if (!map.has(item.report_id)) map.set(item.report_id, []);
    map.get(item.report_id).push(item);
  }
  return map;
}

const handleWeeklyReport = async (req, res) => {
  try {
    const {
      query_type = "create",
      user_id = null,
      report_date = null,
      week_start = null,
      content = null,
      excuse_type = null,
      excuse_description = null,
      items,
      status,
    } = req.body;

    let resp = [];

    if (query_type === "create" || query_type === "update") {
      if (!user_id || !report_date) {
        return res.json({
          success: false,
          message: "user_id and report_date are required",
        });
      }
      const row = await upsertDayReport({
        user_id,
        report_date,
        week_start,
        content,
        status: status || "submitted",
        items,
      });
      resp = [row];
    } else if (query_type === "create_excuse") {
      const row = await db.excuses.create({
        create_by: user_id,
        excuses_type: excuse_type,
        excuse_day: report_date,
        excuse_description,
      });
      resp = [row.get({ plain: true })];
    } else if (query_type === "get_user_reports") {
      const reports = await db.weekly_reports.findAll({
        where: { user_id, week_start },
        order: [["report_date", "ASC"]],
        include: [{ model: db.report_items, as: "items" }],
      });
      resp = reports.map((wr) => {
        const plain = wr.get({ plain: true });
        return {
          id: plain.id,
          report_date: plain.report_date,
          content: plain.content,
          report_status: plain.status,
          last_edited: plain.last_edited,
          items: plain.items || [],
        };
      });
    } else if (query_type === "update_excuse") {
      await db.excuses.update(
        { status: req.body.status || "approved" },
        {
          where: {
            create_by: user_id,
            excuse_day: report_date,
          },
        }
      );
      resp = [{ user_id, report_date }];
    } else if (query_type === "suggested_tasks") {
      const date = report_date || new Date().toISOString().slice(0, 10);
      const completed = await fetchCompletedTasksForUsers(
        [user_id],
        date,
        date
      );
      const report = await db.weekly_reports.findOne({
        where: { user_id, report_date: date },
        include: [{ model: db.report_items, as: "items" }],
      });
      const attached = new Set(
        (report?.items || [])
          .filter((i) => i.task_id)
          .map((i) => String(i.task_id))
      );
      resp = completed
        .filter((t) => !attached.has(String(t.task_id)))
        .map((t) => ({
          task_id: t.task_id,
          title: t.title,
          status: t.status,
          done_date: t.done_date,
        }));
    }

    res.json({
      success: true,
      data: resp,
      message: "Operation completed successfully",
    });
  } catch (err) {
    res.json({
      success: false,
      message: err.message || "An error occurred",
    });
  }
};

export const submitReport = (req, res) => {
  req.body.query_type = "create";
  if (!req.body.status) req.body.status = "submitted";
  handleWeeklyReport(req, res);
};

const submitExcuse = (req, res) => {
  req.body.query_type = "create_excuse";
  handleWeeklyReport(req, res);
};

const getUserReports = (req, res) => {
  req.body.query_type = "get_user_reports";
  handleWeeklyReport(req, res);
};

const transformData = (dbResults, currentUserId, extras = {}) => {
  const { itemsByReportId = new Map(), completedByUserDate = new Map() } =
    extras;
  const currentUser = dbResults.find((row) => row.user_id === currentUserId);

  const teamMembersMap = new Map();
  dbResults.forEach((row) => {
    if (!teamMembersMap.has(row.user_id)) {
      teamMembersMap.set(row.user_id, {
        id: row.user_id,
        name: row.user_name,
        role: row.role,
        startupName: row.startup_name,
        starting_date: row.member_start || row.starting_date || null,
      });
    }
  });
  const teamMembers = Array.from(teamMembersMap.values());

  const weeklyReports = dbResults.reduce((weeks, row) => {
    const weekStart = asDateOnly(row.week_start);
    const week = weeks.find((w) => w.week_start === weekStart);
    const reportDate = asDateOnly(row.report_date);
    const reportId = row.report_id || null;
    const items = reportId ? itemsByReportId.get(reportId) || [] : [];
    const completedKey = `${row.user_id}:${reportDate}`;
    const completed = completedByUserDate.get(completedKey) || [];
    const attachedIds = new Set(
      items.filter((i) => i.task_id).map((i) => String(i.task_id))
    );
    const suggested = completed.filter(
      (t) => !attachedIds.has(String(t.task_id))
    );

    const dailyReport = {
      id: reportId,
      date: reportDate,
      content: row.report_content || "",
      status: row.report_status || "pending",
      last_edited: row.last_edited,
      items,
      suggested_tasks: suggested,
      daily_tasks: items
        .filter((i) => i.type === "task")
        .map((i) => i.title || i.task_id)
        .concat(
          !items.length && row.daily_tasks
            ? String(row.daily_tasks).split(", ").filter(Boolean)
            : []
        ),
      excuse: row.excuse_type
        ? {
            type: row.excuse_type,
            status: row.excuse_status,
            excuse_description: row.excuse_description,
            excuse_day: asDateOnly(row.excuse_day) || reportDate,
          }
        : {},
    };

    if (!week) {
      weeks.push({
        week_start: weekStart,
        reports: [
          {
            user_id: row.user_id,
            name: row.user_name,
            role: row.role,
            daily_reports: [dailyReport],
          },
        ],
      });
    } else {
      const existingUserReport = week.reports.find(
        (r) => r.user_id === row.user_id
      );
      if (!existingUserReport) {
        week.reports.push({
          user_id: row.user_id,
          name: row.user_name,
          role: row.role,
          daily_reports: [dailyReport],
        });
      } else {
        existingUserReport.daily_reports.push(dailyReport);
      }
    }
    return weeks;
  }, []);

  weeklyReports.sort(
    (a, b) => new Date(b.week_start) - new Date(a.week_start)
  );

  weeklyReports.forEach((week) => {
    week.reports.forEach((userReport) => {
      userReport.daily_reports.sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );
    });
  });

  return {
    success: true,
    data: {
      current_user: currentUser
        ? {
            id: currentUser.user_id,
            name: currentUser.user_name,
            role: currentUser.role,
            startupName: currentUser.startup_name,
            starting_date: currentUser.member_start || null,
          }
        : null,
      team_members: teamMembers,
      weekly_reports: weeklyReports,
      range: null,
    },
    message: "Data fetched successfully",
  };
};

export const getAllReports = async (req, res) => {
  try {
    const src = { ...req.query, ...req.body };
    const org_id = src.org_id || null;
    const startup_id = src.startup_id || null;
    const dept_id = src.dept_id || null;
    const viewer_user_id = src.user_id || src.viewer_user_id || null;

    const { date_from, date_to } = clampDateRange(
      src.date_from || src.from,
      src.date_to || src.to
    );

    const hasOrg = Boolean(org_id);
    const hasStartup = Boolean(startup_id);
    const hasDept = Boolean(dept_id);

    const [results] = await db.sequelize.query(
      `
      WITH RECURSIVE all_dates AS (
        SELECT DATE(:date_from) AS report_date
        UNION ALL
        SELECT report_date + INTERVAL 1 DAY
        FROM all_dates
        WHERE report_date < DATE(:date_to)
      ),
      context_users AS (
        SELECT
          u.user_id,
          MAX(u.fullname) AS user_name,
          MAX(m.role) AS role,
          MAX(m.startup_id) AS startup_id,
          MAX(s.name) AS startup_name,
          MIN(
            DATE(
              COALESCE(
                NULLIF(TRIM(u.starting_date), ''),
                DATE(m.created_at),
                DATE(u.createdAt)
              )
            )
          ) AS member_start
        FROM users u
        INNER JOIN user_memberships m
          ON m.user_id = u.user_id
          AND m.status = 'active'
          AND (:has_org = 0 OR m.org_id = :org_id)
        LEFT JOIN startups s
          ON s.startup_id = m.startup_id
        WHERE u.status = 'Approved'
          AND (
            (
              :has_org = 1
              AND (
                :has_startup = 0
                OR m.startup_id = :startup_id
              )
              AND (:has_dept = 0 OR m.dept_id = :dept_id)
            )
            OR (
              :has_org = 0
              AND :has_startup = 1
              AND m.startup_id = :startup_id
            )
          )
        GROUP BY u.user_id
      )
      SELECT
        cu.user_id AS user_id,
        cu.user_name,
        cu.role,
        cu.startup_id AS startup_id,
        cu.startup_name,
        cu.member_start,
        DATE(ad.report_date - INTERVAL WEEKDAY(ad.report_date) DAY) AS week_start,
        ad.report_date,
        wr.id AS report_id,
        COALESCE(wr.content, '') AS report_content,
        COALESCE(wr.status, 'pending') AS report_status,
        wr.last_edited,
        COALESCE(e.excuses_type, '') AS excuse_type,
        COALESCE(e.status, 'pending') AS excuse_status,
        COALESCE(e.excuse_description, '') AS excuse_description,
        e.excuse_day AS excuse_day
      FROM context_users cu
      CROSS JOIN all_dates ad
      LEFT JOIN weekly_reports wr
        ON cu.user_id = wr.user_id AND ad.report_date = wr.report_date
      LEFT JOIN excuses e
        ON ad.report_date = e.excuse_day AND e.create_by = cu.user_id
      WHERE WEEKDAY(ad.report_date) < 5
        AND ad.report_date >= cu.member_start
      ORDER BY week_start DESC, cu.user_id, ad.report_date
      `,
      {
        replacements: {
          org_id: org_id || "",
          startup_id: startup_id || "",
          dept_id: dept_id || "",
          has_org: hasOrg ? 1 : 0,
          has_startup: hasStartup ? 1 : 0,
          has_dept: hasDept ? 1 : 0,
          date_from,
          date_to,
        },
      }
    );

    const reportIds = [
      ...new Set(results.map((r) => r.report_id).filter(Boolean)),
    ];
    const userIds = [...new Set(results.map((r) => r.user_id))];

    const [itemsByReportId, completed] = await Promise.all([
      loadItemsByReportIds(reportIds),
      fetchCompletedTasksForUsers(userIds, date_from, date_to),
    ]);

    const completedByUserDate = new Map();
    for (const t of completed) {
      const key = `${t.user_id}:${asDateOnly(t.done_date)}`;
      if (!completedByUserDate.has(key)) completedByUserDate.set(key, []);
      completedByUserDate.get(key).push(t);
    }

    const payload = transformData(results, viewer_user_id, {
      itemsByReportId,
      completedByUserDate,
    });
    payload.data.range = { from: date_from, to: date_to };
    res.json(payload);
  } catch (err) {
    res.json({
      success: false,
      message: err.message || "An error occurred",
    });
  }
};

export const updateReport = (req, res) => {
  req.body.query_type = "update";
  if (!req.body.status) req.body.status = "submitted";
  handleWeeklyReport(req, res);
};

const updateExcuseStatus = (req, res) => {
  req.body.query_type = "update_excuse";
  handleWeeklyReport(req, res);
};

export const getSuggestedTasks = (req, res) => {
  req.body = { ...(req.body || {}), ...(req.query || {}) };
  req.body.query_type = "suggested_tasks";
  handleWeeklyReport(req, res);
};

export {
  handleWeeklyReport,
  submitExcuse,
  getUserReports,
  updateExcuseStatus,
  clampDateRange,
  MAX_RANGE_DAYS,
};
