import db from "../models/index.js";
import Sequelize from "sequelize";
import { getMembersForContext } from "./membershipService.js";

const { Op, fn, col } = Sequelize;

async function countTasksByStatus(where = {}) {
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
    under_review: map.underReview || map.under_review || 0,
    in_progress: map.inprogress || map.inProgress || map.in_progress || 0,
  };
}

function toChartRows(counts) {
  return [
    { name: "Pending", value: counts.pending },
    { name: "In Progress", value: counts.in_progress },
    { name: "Under Review", value: counts.under_review },
    { name: "Completed", value: counts.completed },
    { name: "Backlog", value: counts.backlog },
  ].filter((r) => r.value > 0);
}

function resolveProfile({ context_type, role, startup_id }) {
  if (
    role === "manager" ||
    role === "Manager" ||
    (context_type === "organization" &&
      (role === "manager" || role === "Manager"))
  ) {
    return "org_manager";
  }
  if (context_type === "organization" && role === "admin") {
    return "org_admin";
  }
  if (startup_id && (role === "ceos" || role === "CEO" || role === "CTO" || role === "admin")) {
    return "startup_executive";
  }
  if (startup_id && role === "senior_devs") {
    return "team_lead";
  }
  if (role === "siwes" || role === "SIWES" || role === "intern") {
    return "siwes";
  }
  return "member";
}

function resolveLayout(profile) {
  if (profile === "org_manager") return "org_ops";
  if (profile === "org_admin") return "admin_ops";
  if (profile === "startup_executive") return "executive";
  if (profile === "team_lead") return "team";
  if (profile === "siwes") return "siwes";
  return "personal";
}

async function resolveDepartmentMeta(dept_id, access_to = "") {
  let deptName = null;
  if (dept_id) {
    const dept = await db.departments.findOne({
      where: { dept_id },
      attributes: ["dept_name"],
      raw: true,
    });
    deptName = dept?.dept_name || null;
  }

  const haystack = `${access_to} ${deptName || ""}`.toLowerCase();
  let key = "general";

  if (haystack.includes("technical") || haystack.includes("engineering")) {
    key = "technical";
  } else if (haystack.includes("business")) {
    key = "business";
  } else if (haystack.includes("finance") || haystack.includes("account")) {
    key = "finance";
  } else if (haystack.includes("marketing") || haystack.includes("sales")) {
    key = "marketing";
  } else if (haystack.includes("design") || haystack.includes("product")) {
    key = "design";
  }

  return {
    key,
    name: deptName || "General",
  };
}

function normalizeTaskStatus(status = "") {
  const value = String(status || "pending").toLowerCase();
  if (value.includes("progress")) return "in_progress";
  if (value.includes("review")) return "under_review";
  if (value === "completed") return "completed";
  if (value === "backlog") return "backlog";
  return "pending";
}

function formatDueLabel(due_date) {
  if (!due_date) return null;
  const due = new Date(due_date);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  const diff = Math.round((dueDay - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "Overdue";
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return `${diff} days left`;
}

async function getRecentTasks({
  user_id,
  startup_id = null,
  personalOnly = false,
  limit = 8,
}) {
  const where = {};
  if (startup_id) where.startup_id = startup_id;

  if (personalOnly && user_id) {
    where[Op.and] = [
      Sequelize.where(
        Sequelize.fn("FIND_IN_SET", user_id, Sequelize.col("assigned_to")),
        { [Op.gt]: 0 }
      ),
    ];
  }

  const rows = await db.task_form.findAll({
    where,
    attributes: ["task_id", "title", "status", "priority", "due_date"],
    order: [["updatedAt", "DESC"]],
    limit,
    raw: true,
  });

  return rows.map((task) => ({
    id: task.task_id,
    title: task.title || "Untitled task",
    status: normalizeTaskStatus(task.status),
    priority: task.priority || "medium",
    due_label: formatDueLabel(task.due_date),
  }));
}

async function getStartupPerformanceTable() {
  const startups = await db.startups.findAll({ raw: true });

  return Promise.all(
    startups.map(async (startup) => {
      const counts = await countTasksByStatus({ startup_id: startup.startup_id });
      const total =
        counts.pending +
        counts.in_progress +
        counts.under_review +
        counts.completed +
        counts.backlog;
      const completionRate = total
        ? Math.round((counts.completed / total) * 100)
        : 0;

      return {
        startup_id: startup.startup_id,
        name: startup.name,
        logo: startup.logo,
        completion_rate: `${completionRate}%`,
        pending: counts.pending,
        in_progress: counts.in_progress,
        completed: counts.completed,
        trend: [
          counts.pending,
          counts.in_progress,
          counts.under_review,
          counts.completed,
        ],
      };
    })
  );
}

function withMeta(payload, { profile, department, access_to = "" }) {
  const layout = resolveLayout(profile);
  const departmentLabels = {
    technical: "Technical",
    business: "Business Development",
    finance: "Finance & Accounts",
    marketing: "Marketing & Sales",
    design: "Design & Product",
    general: "Workspace",
  };

  return {
    ...payload,
    layout,
    profile,
    department: {
      key: department.key,
      name: department.name,
      label: departmentLabels[department.key] || department.name,
    },
    access_modules: access_to
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  };
}

function buildQuickActions(functionalities = "", profile) {
  const funcs = functionalities.split(",").map((f) => f.trim()).filter(Boolean);
  const actions = [];

  const add = (label, url, requires = null) => {
    if (!requires || funcs.includes(requires)) {
      actions.push({ label, url });
    }
  };

  if (profile === "org_manager") {
    actions.push(
      { label: "Attendance", url: "/app/attendance" },
      { label: "SIWES applications", url: "/app/internship/applications" },
      { label: "Create invoice", url: "/app/invoice-processing/create-invoice" },
      // { label: "Finance", url: "/app/finance-dashboard" },
      // { label: "Payroll", url: "/app/payrol-dashboard" },
      { label: "Members", url: "/app/members-management" }
    );
    return actions.slice(0, 6);
  }

  if (profile === "org_admin") {
    actions.push(
      { label: "Pending users", url: "/app/user-management" },
      { label: "Attendance", url: "/app/attendance" },
      { label: "Startups", url: "/app/user-management/startups" },
      { label: "Departments", url: "/app/user-management/departments" }
    );
    return actions;
  }

  if (profile === "siwes") {
    actions.push(
      { label: "My tasks", url: "/app/tasks" },
      { label: "Submit report", url: "/app/reports" },
      { label: "Attendance", url: "/app/attendance" }
    );
    return actions;
  }

  add("View tasks", "/app/tasks", "Tasks");
  add("Create task", "/app/tasks/create", "Tasks");
  add("Submit report", "/app/reports", "Reports");
  add("Team members", "/app/members", "Members");
  add("Attendance", "/app/attendance", "Attendance");

  if (!actions.length) {
    actions.push({ label: "View tasks", url: "/app/tasks" });
  }

  return actions.slice(0, 4);
}

async function countUserTasks(user_id, startup_id = null) {
  const where = {
    [Op.and]: [
      Sequelize.where(
        Sequelize.fn("FIND_IN_SET", user_id, Sequelize.col("assigned_to")),
        { [Op.gt]: 0 }
      ),
    ],
  };
  if (startup_id) {
    where.startup_id = startup_id;
  }
  return countTasksByStatus(where);
}

async function getWeeklyReportsCount(userIds = null) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const where = {
    status: "submitted",
    report_date: { [Op.gte]: weekAgo },
  };
  if (userIds?.length) {
    where.user_id = { [Op.in]: userIds };
  }
  return db.weekly_reports.count({ where });
}

async function countPendingUsers(org_id = null) {
  const where = { status: { [Op.in]: ["Pending", "pending"] } };
  if (org_id) where.org_id = org_id;
  return db.users.count({ where });
}

async function countOrgMemberships(org_id = null) {
  const where = { status: "active" };
  if (org_id) where.org_id = org_id;
  const n = await db.user_memberships.count({
    where,
    distinct: true,
    col: "user_id",
  });
  if (n > 0) return n;
  const userWhere = { status: "Approved" };
  if (org_id) userWhere.org_id = org_id;
  return db.users.count({ where: userWhere });
}

async function getOpsSignals(org_id = null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const in30 = new Date(today);
  in30.setDate(in30.getDate() + 30);
  const in30Str = in30.toISOString().slice(0, 10);

  let startupIds = null;
  if (org_id) {
    const startups = await db.startups.findAll({
      where: { org_id },
      attributes: ["startup_id"],
      raw: true,
    });
    startupIds = startups.map((s) => s.startup_id).filter(Boolean);
  }

  const taskWhere = { status: "underReview" };
  if (startupIds?.length) {
    taskWhere.startup_id = { [Op.in]: startupIds };
  }

  const placementWhere = {
    status: { [Op.in]: ["active", "pending"] },
    end_date: { [Op.between]: [todayStr, in30Str] },
  };
  if (startupIds?.length) {
    placementWhere.startup_id = { [Op.in]: startupIds };
  }

  const [
    tasks_under_review,
    internship_pipeline,
    placements_ending,
    reports_submitted_7d,
  ] = await Promise.all([
    db.task_form.count({ where: taskWhere }),
    db.internship_application
      ? db.internship_application.count({
          where: {
            status: {
              [Op.in]: [
                "submitted",
                "under_review",
                "document_verification",
                "interview_scheduled",
                "waiting_list",
              ],
            },
          },
        })
      : 0,
    db.internship_placement
      ? db.internship_placement.count({ where: placementWhere })
      : 0,
    getWeeklyReportsCount(),
  ]);

  let attendance_today = 0;
  try {
    if (org_id) {
      const members = await getMembersForContext({ org_id });
      const ids = members.map((m) => m.user_id);
      attendance_today = ids.length
        ? await db.attendances.count({
            where: { date: todayStr, user_id: { [Op.in]: ids } },
          })
        : 0;
    } else {
      attendance_today = await db.attendances.count({
        where: { date: todayStr },
      });
    }
  } catch {
    attendance_today = 0;
  }

  return {
    tasks_under_review,
    internship_pipeline,
    placements_ending,
    reports_submitted_7d,
    attendance_today,
  };
}

async function buildOrgAdminDashboard(
  functionalities,
  department,
  profile = "org_admin",
  org_id = null
) {
  const startupWhere = org_id ? { org_id } : {};
  const counts = await countTasksByStatus();
  const total_startups = await db.startups.count({ where: startupWhere });
  const total_members = await countOrgMemberships(org_id);
  const pending_users = await countPendingUsers(org_id);
  const weekly_reports = await getWeeklyReportsCount();
  const attendance_rate = await getAttendanceRate();
  const signals = await getOpsSignals(org_id);
  const isManager = profile === "org_manager";

  const statusDist = await db.task_form.findAll({
    attributes: ["status", [fn("COUNT", col("id")), "count"]],
    group: ["status"],
    raw: true,
  });

  const byStartup = await db.task_form.findAll({
    attributes: ["startup_id", "status", [fn("COUNT", col("id")), "count"]],
    group: ["startup_id", "status"],
    raw: true,
  });

  const startups = await db.startups.findAll({
    where: startupWhere,
    raw: true,
  });
  const startupNames = Object.fromEntries(
    startups.map((s) => [s.startup_id, s.name])
  );
  const startupIds = new Set(startups.map((s) => s.startup_id));

  const task_status_by_startup = {};
  byStartup.forEach((row) => {
    if (!row.startup_id) return;
    if (org_id && !startupIds.has(row.startup_id)) return;
    if (!task_status_by_startup[row.startup_id]) {
      task_status_by_startup[row.startup_id] = {
        startup: startupNames[row.startup_id] || row.startup_id,
        pending: 0,
        inProgress: 0,
        completed: 0,
      };
    }
    const n = parseInt(row.count, 10) || 0;
    if (row.status === "pending") task_status_by_startup[row.startup_id].pending = n;
    if (["inprogress", "inProgress", "in_progress"].includes(row.status)) {
      task_status_by_startup[row.startup_id].inProgress = n;
    }
    if (row.status === "completed") task_status_by_startup[row.startup_id].completed = n;
  });

  const membershipWhere = { status: "active", role: { [Op.ne]: null } };
  if (org_id) membershipWhere.org_id = org_id;
  const roleRows = await db.user_memberships.findAll({
    attributes: ["role", [fn("COUNT", col("id")), "count"]],
    where: membershipWhere,
    group: ["role"],
    raw: true,
  });

  let startup_performance = await getStartupPerformanceTable();
  if (org_id) {
    startup_performance = startup_performance.filter((r) =>
      startupIds.has(r.startup_id)
    );
  }

  return withMeta(
    {
      title: isManager ? "Operations overview" : "Organization overview",
      description: isManager
        ? "Run attendance, SIWES, finance, and day-to-day org operations"
        : "Monitor health and approve what needs your attention",
      kpis: [
        {
          id: "startups",
          label: "Active startups",
          value: total_startups,
          subtitle: "Across organization",
          tone: "blue",
        },
        {
          id: "members",
          label: "Active members",
          value: total_members,
          subtitle: "With active memberships",
          tone: "teal",
        },
        {
          id: "pending_users",
          label: "Pending approvals",
          value: pending_users,
          subtitle: pending_users ? "Needs review" : "All clear",
          tone: "amber",
        },
        {
          id: "under_review",
          label: "Tasks in review",
          value: signals.tasks_under_review,
          subtitle: "SIWES / intern submissions",
          tone: "amber",
        },
        {
          id: "internship",
          label: "Internship pipeline",
          value: signals.internship_pipeline,
          subtitle: "Open applications",
          tone: "indigo",
        },
        {
          id: "placements_ending",
          label: "Placements ending",
          value: signals.placements_ending,
          subtitle: "Next 30 days",
          tone: "rose",
        },
        {
          id: "attendance",
          label: "Attendance rate",
          value: `${attendance_rate}%`,
          subtitle: `Signed in today: ${signals.attendance_today}`,
          tone: "indigo",
        },
        {
          id: "reports",
          label: "Reports (7d)",
          value: weekly_reports,
          subtitle: "Submitted this week",
          tone: "slate",
        },
      ],
      alerts: [
        pending_users > 0 && {
          id: "pending_users",
          tone: "amber",
          message: `${pending_users} user(s) waiting for approval`,
          href: "/app/user-management",
          cta: "Review",
        },
        signals.tasks_under_review > 0 && {
          id: "under_review",
          tone: "amber",
          message: `${signals.tasks_under_review} task(s) awaiting review`,
          href: "/app/tasks?panel=reviews",
          cta: "Open reviews",
        },
        signals.internship_pipeline > 0 && {
          id: "internship",
          tone: "blue",
          message: `${signals.internship_pipeline} internship application(s) in pipeline`,
          href: "/app/internship/applications",
          cta: "View inbox",
        },
        signals.placements_ending > 0 && {
          id: "placements",
          tone: "rose",
          message: `${signals.placements_ending} placement(s) end within 30 days`,
          href: "/app/internship/applications",
          cta: "Check",
        },
      ].filter(Boolean),
      chart_data: toChartRows(counts),
      task_status_distribution: statusDist.map((r) => ({
        status: r.status,
        count: parseInt(r.count, 10) || 0,
      })),
      task_status_by_startup: Object.values(task_status_by_startup),
      users_by_role: roleRows.map((r) => ({
        name: r.role,
        value: parseInt(r.count, 10) || 0,
      })),
      startup_performance,
      quick_actions: buildQuickActions(functionalities, profile),
      focus: isManager ? "operations" : "oversight",
    },
    { profile, department, access_to: functionalities }
  );
}

async function getAttendanceRate(userIds = null) {
  const where = {};
  if (userIds?.length) {
    where.user_id = { [Op.in]: userIds };
  }
  const total = await db.attendances.count({ where });
  if (!total) return 0;
  const signedIn = await db.attendances.count({
    where: { ...where, sign_in_time: { [Op.ne]: null } },
  });
  return Number(((signedIn * 100) / total).toFixed(1));
}

async function buildSiwesDashboard({ user_id, functionalities, department }) {
  const personalCounts = await countUserTasks(user_id);
  const recent_tasks = await getRecentTasks({
    user_id,
    personalOnly: true,
    limit: 8,
  });

  return withMeta(
    {
      title: "SIWES workspace",
      description: "Follow your roadmap — tasks, attendance, and weekly reports",
      kpis: [
        {
          id: "pending",
          label: "Pending",
          value: personalCounts.pending,
          subtitle: "Assigned to you",
          tone: "amber",
        },
        {
          id: "in_progress",
          label: "In progress",
          value: personalCounts.in_progress,
          subtitle: "Currently active",
          tone: "blue",
        },
        {
          id: "completed",
          label: "Completed",
          value: personalCounts.completed,
          subtitle: "Finished tasks",
          tone: "green",
        },
        {
          id: "backlog",
          label: "Backlog",
          value: personalCounts.backlog,
          subtitle: "Not started yet",
          tone: "slate",
        },
      ],
      chart_data: toChartRows(personalCounts),
      recent_tasks,
      quick_actions: buildQuickActions(functionalities, "siwes"),
      roadmap: [
        {
          id: "onboard",
          title: "Get set up",
          detail: "Sign attendance and open your first task",
          href: "/app/attendance",
        },
        {
          id: "tasks",
          title: "Work your tasks",
          detail: "Move items to in progress and complete them",
          href: "/app/tasks",
        },
        {
          id: "report",
          title: "Submit a weekly report",
          detail: "Summarize what you learned and delivered",
          href: "/app/reports",
        },
        {
          id: "review",
          title: "Request feedback",
          detail: "Send work for review when a task is ready",
          href: "/app/tasks",
        },
      ],
    },
    { profile: "siwes", department, access_to: functionalities }
  );
}

async function buildStartupDashboard({
  startup_id,
  dept_id,
  org_id,
  user_id,
  role,
  profile,
  functionalities,
  department,
}) {
  const members = await getMembersForContext({ startup_id, dept_id, org_id });
  const memberIds = members.map((m) => m.user_id);
  const teamWhere = { startup_id };

  const teamCounts = await countTasksByStatus(teamWhere);
  const personalCounts = user_id
    ? await countUserTasks(user_id, startup_id)
    : teamCounts;

  const counts =
    profile === "member" ? personalCounts : teamCounts;

  const weekly_reports = await getWeeklyReportsCount(
    profile === "member" ? [user_id] : memberIds
  );
  const attendance_rate = await getAttendanceRate(
    profile === "member" ? [user_id] : memberIds
  );

  const startup = await db.startups.findOne({
    where: { startup_id },
    raw: true,
  });

  const departmentLabels = {
    technical: "Technical",
    business: "Business Development",
    finance: "Finance & Accounts",
    marketing: "Marketing & Sales",
    design: "Design & Product",
    general: "Workspace",
  };
  const departmentLabel =
    departmentLabels[department.key] || department.name || "Team";

  const titles = {
    startup_executive: "Startup overview",
    team_lead: "Team dashboard",
    member: "My workspace",
  };

  const descriptions = {
    startup_executive: `${startup?.name || "Startup"} performance snapshot`,
    team_lead: `${departmentLabel} activity and delivery`,
    member: `Your ${departmentLabel.toLowerCase()} at a glance`,
  };

  const recent_tasks = await getRecentTasks({
    user_id,
    startup_id,
    personalOnly: profile === "member",
    limit: profile === "member" ? 10 : 6,
  });

  const kpis =
    profile === "member"
      ? [
          {
            id: "pending",
            label: "Pending",
            value: counts.pending,
            subtitle: "Assigned to you",
            tone: "amber",
          },
          {
            id: "in_progress",
            label: "In progress",
            value: counts.in_progress,
            subtitle: "Currently active",
            tone: "blue",
          },
          {
            id: "review",
            label: "Under review",
            value: counts.under_review,
            subtitle: "Awaiting feedback",
            tone: "purple",
          },
          {
            id: "completed",
            label: "Completed",
            value: counts.completed,
            subtitle: "Done in this context",
            tone: "green",
          },
          {
            id: "backlog",
            label: "Backlog",
            value: counts.backlog,
            subtitle: "Not started yet",
            tone: "slate",
          },
        ]
      : [
          {
            id: "members",
            label: "Team members",
            value: members.length,
            subtitle: department.name,
            tone: "indigo",
          },
          {
            id: "pending",
            label: "Pending tasks",
            value: teamCounts.pending,
            subtitle: "Across the team",
            tone: "amber",
          },
          {
            id: "completed",
            label: "Completed",
            value: teamCounts.completed,
            subtitle: "This startup",
            tone: "green",
          },
          {
            id: "reports",
            label: "Reports (7d)",
            value: weekly_reports,
            subtitle: "Submitted recently",
            tone: "slate",
          },
          {
            id: "attendance",
            label: "Attendance",
            value: `${attendance_rate}%`,
            subtitle: "Team average",
            tone: "blue",
          },
        ];

  return withMeta(
    {
      title: titles[profile] || titles.member,
      description: descriptions[profile] || descriptions.member,
      context_label: startup?.name || null,
      context_logo: startup?.logo || null,
      kpis,
      chart_data: toChartRows(profile === "member" ? personalCounts : teamCounts),
      team_members: members.slice(0, 6).map((m) => ({
        user_id: m.user_id,
        fullname: m.fullname,
        role: m.role,
        profile: m.profile,
      })),
      recent_tasks,
      startup_performance:
        profile === "startup_executive"
          ? await getStartupPerformanceTable().then((rows) =>
              rows.filter((row) => row.startup_id === startup_id)
            )
          : [],
      quick_actions: buildQuickActions(functionalities, profile),
    },
    { profile, department, access_to: functionalities }
  );
}

export async function getDashboardSummary(params = {}) {
  const {
    user_id,
    startup_id = null,
    dept_id = null,
    org_id = null,
    context_type = "startup",
    role = "user",
    functionalities = "",
    access_to = "",
  } = params;

  const profile = resolveProfile({ context_type, role, startup_id });
  const department = await resolveDepartmentMeta(
    dept_id,
    access_to || functionalities
  );

  if (profile === "org_admin" || profile === "org_manager") {
    return buildOrgAdminDashboard(functionalities, department, profile, org_id);
  }

  if (profile === "siwes" && user_id) {
    return buildSiwesDashboard({
      user_id,
      functionalities,
      department,
    });
  }

  if (startup_id) {
    return buildStartupDashboard({
      startup_id,
      dept_id,
      org_id,
      user_id,
      role,
      profile,
      functionalities,
      department,
    });
  }

  if (user_id) {
    const personalCounts = await countUserTasks(user_id);
    const recent_tasks = await getRecentTasks({
      user_id,
      personalOnly: true,
      limit: 10,
    });

    return withMeta(
      {
        title: "My workspace",
        description: `Switch to a startup context for ${department.label.toLowerCase()} team insights`,
        kpis: [
          {
            id: "pending",
            label: "Pending",
            value: personalCounts.pending,
            subtitle: "Assigned to you",
            tone: "amber",
          },
          {
            id: "in_progress",
            label: "In progress",
            value: personalCounts.in_progress,
            subtitle: "Currently active",
            tone: "blue",
          },
          {
            id: "completed",
            label: "Completed",
            value: personalCounts.completed,
            subtitle: "Finished tasks",
            tone: "green",
          },
        ],
        chart_data: toChartRows(personalCounts),
        recent_tasks,
        quick_actions: buildQuickActions(functionalities, "member"),
      },
      { profile: "member", department, access_to: functionalities }
    );
  }

  return withMeta(
    {
      title: "Dashboard",
      description: "No context selected",
      kpis: [],
      chart_data: [],
      recent_tasks: [],
      quick_actions: [],
    },
    { profile: "member", department, access_to: functionalities }
  );
}
