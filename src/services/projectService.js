import Sequelize from "sequelize";
import db from "../models/index.js";
import {
  isOrgAttendanceRole,
  isOrgOpsRole,
  normalizeRole,
} from "../constants/roles.js";

export const PROJECT_STATUSES = [
  "active",
  "on_hold",
  "completed",
  "archived",
];

let schemaReady = false;

export async function ensureProjectSchema() {
  if (schemaReady) return;
  const qi = db.sequelize.getQueryInterface();
  try {
    await db.projects.sync();
  } catch {
    /* exists */
  }
  try {
    await db.project_members.sync();
  } catch {
    /* exists */
  }
  try {
    await qi.changeColumn("projects", "status", {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: "active",
    });
  } catch {
    /* exists or dialect mismatch */
  }
  try {
    await qi.addColumn("task_form", "project_id", {
      type: Sequelize.STRING(30),
      allowNull: true,
    });
  } catch {
    /* exists */
  }
  try {
    await qi.addColumn("task_form", "org_id", {
      type: Sequelize.STRING(50),
      allowNull: true,
    });
  } catch {
    /* exists */
  }
  schemaReady = true;
}

function generateProjectId() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PRJ${stamp}${rand}`.slice(0, 30);
}

export function canManageOrgProjects(role) {
  return isOrgOpsRole(role) || isOrgAttendanceRole(role);
}

/** Create projects: not siwes, intern, member, or accountant. */
export function canCreateProjects(role) {
  const id = normalizeRole(role);
  if (["siwes", "intern", "member", "accountant"].includes(id)) return false;
  return ["admin", "manager", "ceos", "team_lead", "senior_devs"].includes(id);
}

export async function listProjects({
  org_id,
  startup_id = null,
  user_id,
  role,
  status = "active",
}) {
  await ensureProjectSchema();
  if (!org_id) return [];

  const where = {
    org_id: String(org_id),
    startup_id: startup_id || null,
  };
  if (status && status !== "all") {
    where.status = status;
  }

  const rows = await db.projects.findAll({
    where,
    order: [["created_at", "DESC"]],
  });

  let projects = rows.map((r) => r.get({ plain: true }));

  if (!canManageOrgProjects(role)) {
    const memberships = await db.project_members.findAll({
      where: { user_id: String(user_id) },
      attributes: ["project_id", "role"],
      raw: true,
    });
    const allowed = new Set(memberships.map((m) => m.project_id));
    const roleByProject = Object.fromEntries(
      memberships.map((m) => [m.project_id, m.role])
    );
    projects = projects
      .filter((p) => allowed.has(p.project_id))
      .map((p) => ({ ...p, my_role: roleByProject[p.project_id] || null }));
  }

  const ids = projects.map((p) => p.project_id);
  const memberCountByProject = {};
  if (ids.length) {
    const counts = await db.project_members.findAll({
      where: { project_id: ids },
      attributes: [
        "project_id",
        [Sequelize.fn("COUNT", Sequelize.col("id")), "member_count"],
      ],
      group: ["project_id"],
      raw: true,
    });
    for (const row of counts) {
      memberCountByProject[row.project_id] = Number(row.member_count) || 0;
    }
  }

  return projects.map((p) => ({
    ...p,
    member_count: memberCountByProject[p.project_id] || 0,
  }));
}

export async function getProjectById(projectId) {
  await ensureProjectSchema();
  const row = await db.projects.findOne({
    where: { project_id: String(projectId) },
  });
  return row ? row.get({ plain: true }) : null;
}

export async function userCanAccessProject(projectId, userId, role) {
  if (canManageOrgProjects(role)) return true;
  const m = await db.project_members.findOne({
    where: {
      project_id: String(projectId),
      user_id: String(userId),
    },
  });
  return !!m;
}

export async function createProject({
  org_id,
  name,
  description = null,
  created_by,
  startup_id = null,
}) {
  await ensureProjectSchema();
  if (!org_id || !name?.trim()) {
    throw new Error("org_id and name are required");
  }

  const project_id = generateProjectId();
  const project = await db.sequelize.transaction(async (transaction) => {
    const row = await db.projects.create(
      {
        project_id,
        org_id: String(org_id),
        startup_id: startup_id || null,
        name: name.trim(),
        description: description || null,
        status: "active",
        created_by: created_by || null,
      },
      { transaction }
    );

    if (created_by) {
      await db.project_members.create(
        {
          project_id,
          user_id: String(created_by),
          role: "lead",
        },
        { transaction }
      );
    }

    return row.get({ plain: true });
  });

  return project;
}

export async function updateProject(projectId, updates = {}) {
  await ensureProjectSchema();
  const row = await db.projects.findOne({
    where: { project_id: String(projectId) },
  });
  if (!row) throw new Error("Project not found");

  const patch = {};
  if (updates.name != null) patch.name = String(updates.name).trim();
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.status != null) {
    const next = String(updates.status).trim().toLowerCase();
    if (!PROJECT_STATUSES.includes(next)) {
      throw new Error(
        `Invalid status. Use one of: ${PROJECT_STATUSES.join(", ")}`
      );
    }
    patch.status = next;
  }

  await row.update(patch);
  return row.get({ plain: true });
}

export async function listProjectMembers(projectId) {
  await ensureProjectSchema();
  const rows = await db.project_members.findAll({
    where: { project_id: String(projectId) },
    include: [
      {
        model: db.users,
        as: "user",
        attributes: ["user_id", "fullname", "email", "profile"],
        required: false,
      },
    ],
    order: [["created_at", "ASC"]],
  });

  return rows.map((r) => {
    const plain = r.get({ plain: true });
    return {
      id: plain.id,
      project_id: plain.project_id,
      user_id: plain.user_id,
      role: plain.role,
      fullname: plain.user?.fullname || null,
      email: plain.user?.email || null,
      profile: plain.user?.profile || null,
    };
  });
}

export async function addProjectMember(projectId, userId, role = "contributor") {
  await ensureProjectSchema();
  const project = await getProjectById(projectId);
  if (!project) throw new Error("Project not found");

  const existing = await db.project_members.findOne({
    where: {
      project_id: String(projectId),
      user_id: String(userId),
    },
  });
  if (existing) {
    await existing.update({
      role: role === "lead" ? "lead" : "contributor",
    });
    return existing.get({ plain: true });
  }

  const row = await db.project_members.create({
    project_id: String(projectId),
    user_id: String(userId),
    role: role === "lead" ? "lead" : "contributor",
  });
  return row.get({ plain: true });
}

export async function removeProjectMember(projectId, userId) {
  await ensureProjectSchema();
  const deleted = await db.project_members.destroy({
    where: {
      project_id: String(projectId),
      user_id: String(userId),
    },
  });
  return deleted > 0;
}

export async function updateProjectMemberRole(
  projectId,
  userId,
  role = "contributor"
) {
  await ensureProjectSchema();
  const row = await db.project_members.findOne({
    where: {
      project_id: String(projectId),
      user_id: String(userId),
    },
  });
  if (!row) throw new Error("Member not found on this project");
  await row.update({
    role: role === "lead" ? "lead" : "contributor",
  });
  return row.get({ plain: true });
}

export async function deleteProject(projectId) {
  await ensureProjectSchema();
  const project = await getProjectById(projectId);
  if (!project) throw new Error("Project not found");
  await db.project_members.destroy({
    where: { project_id: String(projectId) },
  });
  await db.projects.destroy({ where: { project_id: String(projectId) } });
  return true;
}

export async function getProjectMemberUserIds(projectId) {
  await ensureProjectSchema();
  const rows = await db.project_members.findAll({
    where: { project_id: String(projectId) },
    attributes: ["user_id"],
    raw: true,
  });
  return rows.map((r) => r.user_id);
}

/**
 * Project report for the Projects module.
 * Task stats are optional (rows may have project_id from API); Tasks UI stays independent.
 */
export async function getProjectReport(projectId) {
  await ensureProjectSchema();
  const project = await getProjectById(projectId);
  if (!project) throw new Error("Project not found");

  const members = await listProjectMembers(projectId);
  const leads = members.filter((m) => m.role === "lead").length;
  const contributors = members.length - leads;

  const tasks = {
    total: 0,
    by_status: {},
    linked: false,
  };

  try {
    const [rows] = await db.sequelize.query(
      `SELECT COALESCE(NULLIF(TRIM(status), ''), 'unknown') AS status,
              COUNT(*) AS count
       FROM task_form
       WHERE project_id = :pid
       GROUP BY COALESCE(NULLIF(TRIM(status), ''), 'unknown')`,
      { replacements: { pid: String(projectId) } }
    );
    for (const row of rows || []) {
      const key = String(row.status || "unknown");
      const count = Number(row.count) || 0;
      tasks.by_status[key] = count;
      tasks.total += count;
    }
    tasks.linked = tasks.total > 0;
  } catch {
    /* project_id column missing or query failed — report still useful */
  }

  return {
    project_id: project.project_id,
    name: project.name,
    status: project.status,
    created_at: project.created_at,
    updated_at: project.updated_at,
    members: {
      total: members.length,
      leads,
      contributors,
      roster: members,
    },
    tasks,
  };
}
