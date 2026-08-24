import db from "../models/index.js";
import Sequelize from "sequelize";
import {
  getRoleAccessPreset,
  normalizeRole,
  ROLE_ACCESS_PRESETS,
} from "../constants/roles.js";

const { Op } = Sequelize;

const ADMIN_DEFAULT_ACCESS = ROLE_ACCESS_PRESETS.admin.access_to;
const ADMIN_DEFAULT_FUNCTIONALITIES =
  ROLE_ACCESS_PRESETS.admin.functionalities;
const TECHNICAL_DEFAULT_ACCESS = ROLE_ACCESS_PRESETS.member.access_to;
const TECHNICAL_DEFAULT_FUNCTIONALITIES =
  ROLE_ACCESS_PRESETS.member.functionalities;

export { getRoleAccessPreset, normalizeRole };

export async function getDepartmentAccessTemplate(dept_id) {
  if (!dept_id) return { access_to: null, functionalities: null };
  const access = await db.department_access.findOne({
    where: { dept_id },
    raw: true,
  });
  return {
    access_to: access?.access_to || null,
    functionalities: access?.functionalities || null,
  };
}

export async function resolveContextLabel(membership) {
  if (!membership.startup_id) {
    const org = await db.organizations.findOne({
      where: { org_id: membership.org_id },
      raw: true,
    });
    const dept = membership.dept_id
      ? await db.departments.findOne({
          where: { dept_id: membership.dept_id },
          raw: true,
        })
      : null;
    const orgName = org?.org_name || "Organization";
    return dept?.dept_name ? `${orgName} · ${dept.dept_name}` : orgName;
  }

  const startup = await db.startups.findOne({
    where: { startup_id: membership.startup_id },
    raw: true,
  });
  const dept = membership.dept_id
    ? await db.departments.findOne({
        where: { dept_id: membership.dept_id },
        raw: true,
      })
    : null;
  const startupName = startup?.name || membership.startup_id;
  return dept?.dept_name
    ? `${startupName} · ${dept.dept_name}`
    : startupName;
}

export async function resolveMembershipMeta(membership) {
  const label = await resolveContextLabel(membership);
  let logo = null;

  if (membership.startup_id) {
    const startup = await db.startups.findOne({
      where: { startup_id: membership.startup_id },
      attributes: ["logo", "name"],
      raw: true,
    });
    logo = startup?.logo || null;
  }

  return { label, logo };
}

export function serializeMembership(row, meta = null) {
  const label = typeof meta === "string" ? meta : meta?.label || null;
  const logo = typeof meta === "object" && meta ? meta.logo || null : null;

  return {
    id: row.id,
    user_id: row.user_id,
    org_id: row.org_id,
    startup_id: row.startup_id || null,
    dept_id: row.dept_id || null,
    role: row.role || null,
    access_to: row.access_to || "",
    functionalities: row.functionalities || "",
    is_primary: !!row.is_primary,
    status: row.status || "active",
    context_type: row.startup_id ? "startup" : "organization",
    label: label || null,
    logo,
  };
}

export async function listMembershipsForUser(user_id, { activeOnly = true } = {}) {
  const where = { user_id };
  if (activeOnly) where.status = "active";

  const rows = await db.user_memberships.findAll({
    where,
    order: [
      ["is_primary", "DESC"],
      ["created_at", "ASC"],
    ],
    raw: true,
  });

  return Promise.all(
    rows.map(async (row) => {
      const meta = await resolveMembershipMeta(row);
      return serializeMembership(row, meta);
    })
  );
}

export async function getPrimaryMembership(user_id) {
  let primary = await db.user_memberships.findOne({
    where: { user_id, status: "active", is_primary: true },
    raw: true,
  });

  if (!primary) {
    primary = await db.user_memberships.findOne({
      where: { user_id, status: "active" },
      order: [["created_at", "ASC"]],
      raw: true,
    });
  }

  if (!primary) return null;
  const meta = await resolveMembershipMeta(primary);
  return serializeMembership(primary, meta);
}

/** Batch primary membership lookup for admin lists */
export async function getPrimaryMembershipMap(userIds = []) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return {};

  const rows = await db.user_memberships.findAll({
    where: { user_id: { [Op.in]: ids }, status: "active" },
    order: [
      ["is_primary", "DESC"],
      ["created_at", "ASC"],
    ],
    raw: true,
  });

  const map = {};
  for (const row of rows) {
    if (!map[row.user_id]) {
      map[row.user_id] = row;
    }
  }

  const enriched = {};
  await Promise.all(
    Object.entries(map).map(async ([user_id, row]) => {
      const meta = await resolveMembershipMeta(row);
      enriched[user_id] = serializeMembership(row, meta);
    })
  );
  return enriched;
}

/**
 * Merge primary membership onto a user row for API responses.
 * Context fields (role, startup, dept, ACL) come from user_memberships only.
 */
export async function enrichUserWithPrimaryContext(userRow) {
  const primary = await getPrimaryMembership(userRow.user_id);
  const ctx = primary || {};
  return {
    ...userRow,
    role: ctx.role || null,
    startup_id: ctx.startup_id ?? null,
    dept_id: ctx.dept_id ?? null,
    org_id: ctx.org_id || userRow.org_id || "1",
    access_to: ctx.access_to || "",
    functionalities: ctx.functionalities || "",
    startup_name: ctx.label || null,
    activeContext: primary,
  };
}

async function resolveValidStartupId(startup_id) {
  if (!startup_id) return null;
  const row = await db.startups.findOne({
    where: { startup_id },
    attributes: ["startup_id"],
    raw: true,
  });
  return row ? startup_id : null;
}

export async function syncLegacyUserToMembership(userRow) {
  const user_id = userRow.user_id;
  const existing = await db.user_memberships.count({ where: { user_id } });
  if (existing > 0) return;

  // Pending accounts get memberships on approve do not invent context here
  if (String(userRow.status || "").toLowerCase() !== "approved") return;

  const org_id = userRow.org_id || "1";
  const legacyRole = userRow.role ? normalizeRole(userRow.role) : "member";
  const startup_id = await resolveValidStartupId(userRow.startup_id);
  let access_to = userRow.access_to || "";
  let functionalities = userRow.functionalities || "";
  const dept_id = userRow.dept_id || null;

  if (!access_to) {
    if (legacyRole === "admin") {
      access_to = ADMIN_DEFAULT_ACCESS;
      functionalities = ADMIN_DEFAULT_FUNCTIONALITIES;
    } else if (dept_id) {
      const template = await getDepartmentAccessTemplate(dept_id);
      access_to = template.access_to || TECHNICAL_DEFAULT_ACCESS;
      functionalities =
        template.functionalities || TECHNICAL_DEFAULT_FUNCTIONALITIES;
    } else {
      const preset = getRoleAccessPreset(legacyRole);
      access_to = preset.access_to;
      functionalities = preset.functionalities;
    }
  }

  await db.user_memberships.create({
    user_id,
    org_id,
    startup_id,
    dept_id,
    role: legacyRole,
    access_to,
    functionalities,
    is_primary: true,
    status: "active",
  });

  if (legacyRole === "admin") {
    const orgMembership = await db.user_memberships.findOne({
      where: { user_id, startup_id: null, org_id },
      raw: true,
    });
    if (!orgMembership) {
      await db.user_memberships.create({
        user_id,
        org_id,
        startup_id: null,
        dept_id: null,
        role: "admin",
        access_to: ADMIN_DEFAULT_ACCESS,
        functionalities: ADMIN_DEFAULT_FUNCTIONALITIES,
        is_primary: !startup_id,
        status: "active",
      });
    }
  }
}

/**
 * One-time backfill from legacy users.* context columns into user_memberships.
 * Uses raw SQL so it still works while those columns exist, and no-ops after drop.
 */
export async function migrateAllUsersToMemberships() {
  const sequelize = db.sequelize;
  const [roleCols] = await sequelize.query(
    `SHOW COLUMNS FROM \`users\` LIKE 'role'`
  );

  if (roleCols?.length) {
    const [rows] = await sequelize.query(
      `SELECT user_id, org_id, status, role, startup_id, dept_id, access_to, functionalities
       FROM \`users\``
    );
    for (const user of rows) {
      await syncLegacyUserToMembership(user);
    }
    return;
  }

  // Columns already removed ensure Approved users still have at least one membership
  const users = await db.users.findAll({
    where: { status: "Approved" },
    attributes: ["user_id", "org_id", "status"],
    raw: true,
  });
  for (const user of users) {
    await syncLegacyUserToMembership(user);
  }
}

export async function ensureUserMemberships(user_id) {
  const user = await db.users.findOne({ where: { user_id }, raw: true });
  if (!user) return [];
  await syncLegacyUserToMembership(user);
  return listMembershipsForUser(user_id);
}

export async function buildAuthContext(userRow) {
  await syncLegacyUserToMembership(userRow);
  const memberships = await listMembershipsForUser(userRow.user_id);
  const primary =
    memberships.find((m) => m.is_primary) || memberships[0] || null;

  return {
    memberships,
    activeContext: primary,
  };
}

export async function upsertMembership(payload) {
  const {
    id,
    user_id,
    org_id,
    startup_id = null,
    dept_id = null,
    role = null,
    access_to = "",
    functionalities = "",
    is_primary = false,
    status = "active",
  } = payload;

  let resolvedAccess = access_to;
  let resolvedFunctionalities = functionalities;

  if (!resolvedAccess && dept_id) {
    const template = await getDepartmentAccessTemplate(dept_id);
    resolvedAccess = template.access_to || TECHNICAL_DEFAULT_ACCESS;
    resolvedFunctionalities =
      template.functionalities || TECHNICAL_DEFAULT_FUNCTIONALITIES;
  }

  if (!resolvedAccess && role) {
    const preset = getRoleAccessPreset(normalizeRole(role));
    resolvedAccess = preset.access_to;
    resolvedFunctionalities =
      resolvedFunctionalities || preset.functionalities;
  }

  if (!resolvedAccess) {
    resolvedAccess = TECHNICAL_DEFAULT_ACCESS;
    resolvedFunctionalities =
      resolvedFunctionalities || TECHNICAL_DEFAULT_FUNCTIONALITIES;
  }

  if (is_primary) {
    await db.user_memberships.update(
      { is_primary: false },
      { where: { user_id } }
    );
  }

  if (id) {
    await db.user_memberships.update(
      {
        org_id,
        startup_id: (await resolveValidStartupId(startup_id)) || null,
        dept_id: dept_id || null,
        role: role ? normalizeRole(role) : role,
        access_to: resolvedAccess,
        functionalities: resolvedFunctionalities,
        is_primary,
        status,
      },
      { where: { id, user_id } }
    );
    const updated = await db.user_memberships.findOne({
      where: { id, user_id },
      raw: true,
    });
    const meta = await resolveMembershipMeta(updated);
    return serializeMembership(updated, meta);
  }

  const validStartupId = await resolveValidStartupId(startup_id);

  const existingWhere = {
    user_id,
    org_id,
    ...(validStartupId
      ? { startup_id: validStartupId }
      : { startup_id: { [Op.is]: null } }),
  };
  const existing = await db.user_memberships.findOne({
    where: existingWhere,
    raw: true,
  });

  if (existing) {
    await db.user_memberships.update(
      {
        dept_id: dept_id || null,
        role: role ? normalizeRole(role) : role,
        access_to: resolvedAccess,
        functionalities: resolvedFunctionalities,
        is_primary,
        status,
      },
      { where: { id: existing.id, user_id } }
    );
    const updated = await db.user_memberships.findOne({
      where: { id: existing.id, user_id },
      raw: true,
    });
    const meta = await resolveMembershipMeta(updated);
    return serializeMembership(updated, meta);
  }

  const created = await db.user_memberships.create({
    user_id,
    org_id,
    startup_id: validStartupId,
    dept_id: dept_id || null,
    role: role ? normalizeRole(role) : role,
    access_to: resolvedAccess,
    functionalities: resolvedFunctionalities,
    is_primary,
    status,
  });

  const meta = await resolveMembershipMeta(created.get({ plain: true }));
  return serializeMembership(created.get({ plain: true }), meta);
}

export async function deleteMembership(id, user_id) {
  const row = await db.user_memberships.findOne({
    where: { id, user_id },
    raw: true,
  });
  if (!row) return false;
  await db.user_memberships.destroy({ where: { id, user_id } });

  if (row.is_primary) {
    const next = await db.user_memberships.findOne({
      where: { user_id, status: "active" },
      order: [["created_at", "ASC"]],
      raw: true,
    });
    if (next) {
      await db.user_memberships.update(
        { is_primary: true },
        { where: { id: next.id } }
      );
    }
  }
  return true;
}

async function attachTaskStats(user_id, startup_id = null) {
  const taskWhere = { assigned_to: user_id };
  if (startup_id) {
    taskWhere.startup_id = startup_id;
  }

  const completed_tasks = await db.task_form.count({
    where: { ...taskWhere, status: "completed" },
  });

  const pending_tasks = await db.task_form.count({
    where: {
      ...taskWhere,
      status: { [Op.or]: [{ [Op.ne]: "completed" }, null] },
    },
  });

  return { completed_tasks, pending_tasks };
}

/**
 * Resolve startup/org members via user_memberships.
 */
export async function getMembersForContext({
  startup_id = null,
  dept_id = null,
  org_id = null,
} = {}) {
  if (!startup_id && !org_id) {
    return [];
  }

  const membershipWhere = {
    status: "active",
  };

  if (startup_id) {
    membershipWhere.startup_id = startup_id;
  } else {
    membershipWhere.startup_id = null;
    membershipWhere.org_id = org_id;
  }

  if (dept_id) {
    membershipWhere.dept_id = dept_id;
  }

  const memberships = await db.user_memberships.findAll({
    where: membershipWhere,
    raw: true,
  });

  const userIds = [...new Set(memberships.map((m) => m.user_id))];
  if (!userIds.length) return [];

  const users = await db.users.findAll({
    where: { user_id: { [Op.in]: userIds } },
    raw: true,
  });

  const userMap = Object.fromEntries(users.map((u) => [u.user_id, u]));

  const seen = new Set();
  const results = [];

  for (const membership of memberships) {
    if (seen.has(membership.user_id)) continue;
    seen.add(membership.user_id);

    const u = userMap[membership.user_id];
    if (!u) continue;

    const deptRow = membership.dept_id
      ? await db.departments.findOne({
          where: { dept_id: membership.dept_id },
          attributes: ["dept_name"],
          raw: true,
        })
      : null;

    const stats = await attachTaskStats(u.user_id, startup_id || null);

    results.push({
      ...u,
      role: membership.role || null,
      dept_id: membership.dept_id || null,
      org_id: membership.org_id || u.org_id,
      startup_id: membership.startup_id || null,
      dept_name: deptRow?.dept_name || null,
      membership_id: membership.id,
      context_role: membership.role,
      is_primary_membership: !!membership.is_primary,
      ...stats,
    });
  }

  return results;
}

export async function countMembersForStartup(startup_id) {
  if (!startup_id) return 0;

  return db.user_memberships.count({
    where: { startup_id, status: "active" },
    distinct: true,
    col: "user_id",
  });
}

/**
 * Rewrite legacy role strings on memberships to the canonical ROLE_IDS.
 * Safe to run repeatedly.
 */
export async function normalizeRolesInDb() {
  const memberships = await db.user_memberships.findAll({
    attributes: ["id", "role"],
    raw: true,
  });
  let membershipsUpdated = 0;
  for (const m of memberships) {
    if (!m.role) continue;
    const next = normalizeRole(m.role);
    if (next !== m.role) {
      await db.user_memberships.update({ role: next }, { where: { id: m.id } });
      membershipsUpdated += 1;
    }
  }

  return { usersUpdated: 0, membershipsUpdated };
}
