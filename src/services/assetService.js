import Sequelize from "sequelize";
import db from "../models/index.js";
import { nextCode } from "./numberGenerator.js";
import {
  categoryDisplayName,
  isCategoryAssignable,
} from "../constants/assetCategories.js";
import {
  isOrgAttendanceRole,
  isOrgOpsRole,
  normalizeRole,
} from "../constants/roles.js";

const { Op } = Sequelize;

export const ASSET_STATUSES = [
  "available",
  "assigned",
  "maintenance",
  "lost",
  "damaged",
  "disposed",
  "retired",
];

export const ASSET_CONDITIONS = [
  "excellent",
  "good",
  "needs_repair",
  "damaged",
];

export const ASSET_TYPES = ["physical", "license", "access"];

let schemaReady = false;

export async function ensureAssetSchema() {
  if (schemaReady) return;
  const qi = db.sequelize.getQueryInterface();
  try {
    await db.assets.sync();
  } catch {
    /* exists */
  }
  try {
    await db.asset_assignments.sync();
  } catch {
    /* exists */
  }
  try {
    await db.asset_maintenance.sync();
  } catch {
    /* exists */
  }
  try {
    await db.asset_status_history.sync();
  } catch {
    /* exists */
  }
  try {
    await qi.addColumn("assets", "category", {
      type: Sequelize.STRING(80),
      allowNull: true,
    });
  } catch {
    /* exists */
  }
  schemaReady = true;
}

function toDateOnly(value) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const s = String(value).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

export function canManageAssets(role) {
  const id = normalizeRole(role);
  if (["siwes", "intern", "member"].includes(id)) return false;
  return (
    isOrgOpsRole(id) ||
    isOrgAttendanceRole(id) ||
    ["team_lead", "senior_devs"].includes(id)
  );
}

async function recordStatusChange({
  asset_id,
  from_status,
  to_status,
  changed_by,
  reason,
  transaction,
}) {
  if (!to_status || from_status === to_status) return;
  await db.asset_status_history.create(
    {
      asset_id,
      from_status: from_status || null,
      to_status,
      changed_by: changed_by || null,
      reason: reason || null,
    },
    { transaction }
  );
}

function enrichAsset(plain) {
  return {
    ...plain,
    category_name: categoryDisplayName(plain.category),
    category_assignable: isCategoryAssignable(plain.category),
    assignee_name: plain.assignee?.fullname || null,
  };
}

export async function listAssets({
  org_id,
  status = "all",
  category = null,
  q = "",
  startup_id = null,
}) {
  await ensureAssetSchema();
  if (!org_id) return [];

  const where = { org_id: String(org_id) };
  if (status && status !== "all") where.status = status;
  if (category) where.category = String(category);
  if (startup_id) where.startup_id = startup_id;
  if (q?.trim()) {
    const term = `%${q.trim()}%`;
    where[Op.or] = [
      { name: { [Op.like]: term } },
      { asset_id: { [Op.like]: term } },
      { brand: { [Op.like]: term } },
      { model: { [Op.like]: term } },
      { serial_number: { [Op.like]: term } },
      { category: { [Op.like]: term } },
    ];
  }

  const rows = await db.assets.findAll({
    where,
    include: [
      {
        model: db.users,
        as: "assignee",
        attributes: ["user_id", "fullname", "email", "profile"],
        required: false,
      },
    ],
    order: [["created_at", "DESC"]],
  });

  return rows.map((r) => enrichAsset(r.get({ plain: true })));
}

export async function getAssetById(assetId) {
  await ensureAssetSchema();
  const row = await db.assets.findOne({
    where: { asset_id: String(assetId) },
    include: [
      {
        model: db.users,
        as: "assignee",
        attributes: ["user_id", "fullname", "email", "profile"],
        required: false,
      },
      {
        model: db.users,
        as: "creator",
        attributes: ["user_id", "fullname"],
        required: false,
      },
    ],
  });
  if (!row) return null;
  return enrichAsset(row.get({ plain: true }));
}

export async function createAsset(payload = {}) {
  await ensureAssetSchema();
  const {
    org_id,
    name,
    created_by,
    category = null,
    asset_type = "physical",
    brand = null,
    model = null,
    serial_number = null,
    purchase_date = null,
    purchase_cost = null,
    supplier = null,
    warranty_expiry = null,
    status = "available",
    current_location = null,
    notes = null,
    image = null,
    startup_id = null,
  } = payload;

  if (!org_id || !name?.trim()) {
    throw new Error("org_id and name are required");
  }

  const nextStatus = ASSET_STATUSES.includes(String(status))
    ? String(status)
    : "available";
  const nextType = ASSET_TYPES.includes(String(asset_type))
    ? String(asset_type)
    : "physical";

  return db.sequelize.transaction(async (transaction) => {
    const { next } = await nextCode("AST", "asset", {
      pad: 5,
      transaction,
    });
    const asset_id = `AST-${String(next).padStart(5, "0")}`;

    const row = await db.assets.create(
      {
        asset_id,
        org_id: String(org_id),
        startup_id: startup_id || null,
        category: category ? String(category) : null,
        name: name.trim(),
        asset_type: nextType,
        brand: brand || null,
        model: model || null,
        serial_number: serial_number || null,
        purchase_date: toDateOnly(purchase_date),
        purchase_cost:
          purchase_cost === null || purchase_cost === ""
            ? null
            : Number(purchase_cost),
        supplier: supplier || null,
        warranty_expiry: toDateOnly(warranty_expiry),
        status: nextStatus,
        current_location: current_location || null,
        notes: notes || null,
        image: image || null,
        created_by: created_by || null,
      },
      { transaction }
    );

    await recordStatusChange({
      asset_id,
      from_status: null,
      to_status: nextStatus,
      changed_by: created_by,
      reason: "Asset created",
      transaction,
    });

    return row.get({ plain: true });
  });
}

export async function updateAsset(assetId, updates = {}) {
  await ensureAssetSchema();
  const row = await db.assets.findOne({
    where: { asset_id: String(assetId) },
  });
  if (!row) throw new Error("Asset not found");

  const patch = {};
  const fields = [
    "name",
    "brand",
    "model",
    "serial_number",
    "supplier",
    "current_location",
    "notes",
    "image",
    "startup_id",
    "category",
  ];
  for (const key of fields) {
    if (updates[key] !== undefined) patch[key] = updates[key] || null;
  }
  if (updates.name != null) patch.name = String(updates.name).trim();
  if (updates.category !== undefined) {
    patch.category = updates.category ? String(updates.category) : null;
  }
  if (updates.asset_type !== undefined) {
    if (!ASSET_TYPES.includes(String(updates.asset_type))) {
      throw new Error("Invalid asset_type");
    }
    patch.asset_type = String(updates.asset_type);
  }
  if (updates.purchase_date !== undefined) {
    patch.purchase_date = toDateOnly(updates.purchase_date);
  }
  if (updates.warranty_expiry !== undefined) {
    patch.warranty_expiry = toDateOnly(updates.warranty_expiry);
  }
  if (updates.purchase_cost !== undefined) {
    patch.purchase_cost =
      updates.purchase_cost === null || updates.purchase_cost === ""
        ? null
        : Number(updates.purchase_cost);
  }

  let statusChanged = null;
  if (updates.status !== undefined) {
    const next = String(updates.status).trim().toLowerCase();
    if (!ASSET_STATUSES.includes(next)) {
      throw new Error(`Invalid status. Use one of: ${ASSET_STATUSES.join(", ")}`);
    }
    if (next !== row.status) {
      patch.status = next;
      statusChanged = { from: row.status, to: next };
    }
  }

  await db.sequelize.transaction(async (transaction) => {
    await row.update(patch, { transaction });
    if (statusChanged) {
      await recordStatusChange({
        asset_id: row.asset_id,
        from_status: statusChanged.from,
        to_status: statusChanged.to,
        changed_by: updates.changed_by || updates.user_id || null,
        reason: updates.status_reason || "Status updated",
        transaction,
      });
    }
  });

  return getAssetById(assetId);
}

export async function listAssignments(assetId) {
  await ensureAssetSchema();
  const rows = await db.asset_assignments.findAll({
    where: { asset_id: String(assetId) },
    include: [
      {
        model: db.users,
        as: "user",
        attributes: ["user_id", "fullname", "email", "profile"],
        required: false,
      },
    ],
    order: [
      ["assigned_at", "DESC"],
      ["id", "DESC"],
    ],
  });
  return rows.map((r) => {
    const plain = r.get({ plain: true });
    return {
      ...plain,
      fullname: plain.user?.fullname || null,
      email: plain.user?.email || null,
      profile: plain.user?.profile || null,
    };
  });
}

export async function assignAsset({
  asset_id,
  user_id,
  assigned_by,
  dept_id = null,
  startup_id = null,
  expected_return = null,
  condition_out = "good",
  notes = null,
}) {
  await ensureAssetSchema();
  if (!asset_id || !user_id) throw new Error("asset_id and user_id are required");

  const condition = ASSET_CONDITIONS.includes(String(condition_out))
    ? String(condition_out)
    : "good";

  return db.sequelize.transaction(async (transaction) => {
    const asset = await db.assets.findOne({
      where: { asset_id: String(asset_id) },
      lock: transaction.LOCK.UPDATE,
      transaction,
    });
    if (!asset) throw new Error("Asset not found");
    if (!isCategoryAssignable(asset.category)) {
      throw new Error(
        "This category is facility/shared and cannot be assigned to a person"
      );
    }
    if (["disposed", "retired"].includes(asset.status)) {
      throw new Error("Cannot assign a disposed or retired asset");
    }
    if (asset.status === "assigned" && asset.current_assignee_user_id) {
      throw new Error("Asset is already assigned. Return it first.");
    }

    const assignment = await db.asset_assignments.create(
      {
        asset_id: asset.asset_id,
        user_id: String(user_id),
        dept_id: dept_id || null,
        startup_id: startup_id || null,
        assigned_at: new Date(),
        expected_return: toDateOnly(expected_return),
        condition_out: condition,
        assigned_by: assigned_by || null,
        notes: notes || null,
        status: "active",
      },
      { transaction }
    );

    const prevStatus = asset.status;
    await asset.update(
      {
        status: "assigned",
        current_assignee_user_id: String(user_id),
        startup_id: startup_id || asset.startup_id,
      },
      { transaction }
    );

    await recordStatusChange({
      asset_id: asset.asset_id,
      from_status: prevStatus,
      to_status: "assigned",
      changed_by: assigned_by,
      reason: `Assigned to ${user_id}`,
      transaction,
    });

    return assignment.get({ plain: true });
  });
}

export async function returnAsset({
  asset_id,
  returned_by,
  condition_in = "good",
  return_notes = null,
  next_status = null,
}) {
  await ensureAssetSchema();
  if (!asset_id) throw new Error("asset_id is required");

  const condition = ASSET_CONDITIONS.includes(String(condition_in))
    ? String(condition_in)
    : "good";

  let resolvedStatus = next_status;
  if (!resolvedStatus) {
    resolvedStatus =
      condition === "needs_repair" || condition === "damaged"
        ? "maintenance"
        : "available";
  }
  if (!ASSET_STATUSES.includes(resolvedStatus)) {
    throw new Error("Invalid next_status");
  }

  return db.sequelize.transaction(async (transaction) => {
    const asset = await db.assets.findOne({
      where: { asset_id: String(asset_id) },
      lock: transaction.LOCK.UPDATE,
      transaction,
    });
    if (!asset) throw new Error("Asset not found");

    const active = await db.asset_assignments.findOne({
      where: { asset_id: asset.asset_id, status: "active" },
      lock: transaction.LOCK.UPDATE,
      transaction,
      order: [["assigned_at", "DESC"]],
    });
    if (!active) throw new Error("No active assignment to return");

    await active.update(
      {
        returned_at: new Date(),
        condition_in: condition,
        returned_by: returned_by || null,
        return_notes: return_notes || null,
        status: "returned",
      },
      { transaction }
    );

    const prevStatus = asset.status;
    await asset.update(
      {
        status: resolvedStatus,
        current_assignee_user_id: null,
      },
      { transaction }
    );

    await recordStatusChange({
      asset_id: asset.asset_id,
      from_status: prevStatus,
      to_status: resolvedStatus,
      changed_by: returned_by,
      reason: `Returned (${condition})`,
      transaction,
    });

    return active.get({ plain: true });
  });
}

export async function listMaintenance(assetId) {
  await ensureAssetSchema();
  return db.asset_maintenance.findAll({
    where: { asset_id: String(assetId) },
    order: [["maintenance_date", "DESC"]],
    raw: true,
  });
}

export async function addMaintenance({
  asset_id,
  description,
  maintenance_date,
  technician = null,
  cost = null,
  created_by = null,
  set_status_maintenance = false,
}) {
  await ensureAssetSchema();
  if (!asset_id || !description?.trim()) {
    throw new Error("asset_id and description are required");
  }

  return db.sequelize.transaction(async (transaction) => {
    const asset = await db.assets.findOne({
      where: { asset_id: String(asset_id) },
      transaction,
    });
    if (!asset) throw new Error("Asset not found");

    const row = await db.asset_maintenance.create(
      {
        asset_id: asset.asset_id,
        description: description.trim(),
        maintenance_date:
          toDateOnly(maintenance_date) ||
          new Date().toISOString().slice(0, 10),
        technician: technician || null,
        cost: cost === null || cost === "" ? null : Number(cost),
        created_by: created_by || null,
      },
      { transaction }
    );

    if (set_status_maintenance && asset.status !== "maintenance") {
      const prev = asset.status;
      await asset.update({ status: "maintenance" }, { transaction });
      await recordStatusChange({
        asset_id: asset.asset_id,
        from_status: prev,
        to_status: "maintenance",
        changed_by: created_by,
        reason: "Maintenance logged",
        transaction,
      });
    }

    return row.get({ plain: true });
  });
}

export async function getAssetsDashboard({ org_id }) {
  await ensureAssetSchema();
  if (!org_id) {
    return {
      totals: {
        total: 0,
        available: 0,
        assigned: 0,
        maintenance: 0,
        lost: 0,
      },
      by_category: [],
      recent_activity: [],
    };
  }

  const assets = await db.assets.findAll({
    where: { org_id: String(org_id) },
    attributes: [
      "asset_id",
      "name",
      "status",
      "category",
      "updated_at",
    ],
    raw: true,
  });

  const totals = {
    total: assets.length,
    available: 0,
    assigned: 0,
    maintenance: 0,
    lost: 0,
    damaged: 0,
    disposed: 0,
    retired: 0,
  };
  const byCategoryMap = {};

  for (const plain of assets) {
    if (totals[plain.status] != null) totals[plain.status] += 1;
    const catName = categoryDisplayName(plain.category);
    byCategoryMap[catName] = (byCategoryMap[catName] || 0) + 1;
  }

  const by_category = Object.entries(byCategoryMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const history = await db.asset_status_history.findAll({
    where: {
      asset_id: {
        [Op.in]: assets.map((a) => a.asset_id).concat(["__none__"]),
      },
    },
    order: [["created_at", "DESC"]],
    limit: 12,
    raw: true,
  });

  const nameById = Object.fromEntries(
    assets.map((a) => [a.asset_id, a.name])
  );

  const recent_activity = history.map((h) => ({
    ...h,
    asset_name: nameById[h.asset_id] || h.asset_id,
  }));

  return { totals, by_category, recent_activity };
}
