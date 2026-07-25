import db from "../models/index.js";

function blank(v) {
  return v == null || String(v).trim() === "" || String(v) === "00";
}

function pad2(n) {
  return String(n).padStart(2, "0").slice(-2);
}

/** Infer structural level from filled code fields */
export function inferLevel(node) {
  if (!node) return "unknown";
  if (blank(node.startup_code)) return "org";
  if (blank(node.department_code)) return "startup";
  if (blank(node.unit_code)) return "department";
  return "unit";
}

async function nextGlobalDeptCode() {
  const chartRows = await db.organization_chart.findAll({
    attributes: ["department_code"],
    raw: true,
  });
  const deptRows = await db.departments.findAll({
    attributes: ["dept_id"],
    raw: true,
  });
  let max = 0;
  for (const row of chartRows) {
    const n = parseInt(String(row.department_code || "").replace(/\D/g, ""), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  for (const row of deptRows) {
    const n = parseInt(String(row.dept_id || "").replace(/\D/g, ""), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return pad2(max + 1);
}

async function nextCodeAmong(field, where = {}) {
  const rows = await db.organization_chart.findAll({
    where,
    attributes: [field],
    raw: true,
  });
  let max = 0;
  for (const row of rows) {
    const n = parseInt(String(row[field] || "").replace(/\D/g, ""), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return pad2(max + 1);
}

/**
 * Ensure every organization has a root chart node, and every startup
 * has a node under that root (so the tree is never empty / orphaned).
 */
export async function ensureOrganizationChartRoots() {
  const orgs = await db.organizations.findAll({ raw: true });
  for (const org of orgs) {
    const orgId = String(org.org_id || "1");
    const head = `${orgId}000000`.slice(0, 7);
    const existing = await db.organization_chart.findByPk(head);
    if (!existing) {
      await db.organization_chart.create({
        head,
        subhead: "",
        description: org.org_name || "Organization",
        group_code: orgId.slice(0, 1),
        startup_code: "",
        department_code: "",
        unit_code: "",
      });
    }
  }

  const startups = await db.startups.findAll({ raw: true });
  for (const s of startups) {
    const orgId = String(s.org_id || "1");
    const startupId = String(s.startup_id || "").slice(0, 2);
    if (!startupId) continue;
    const head = `${orgId}${startupId}0000`.slice(0, 7);
    const subhead = `${orgId}000000`.slice(0, 7);
    const existing = await db.organization_chart.findByPk(head);
    if (!existing) {
      await db.organization_chart.create({
        head,
        subhead,
        description: s.name || `Startup ${startupId}`,
        group_code: orgId.slice(0, 1),
        startup_code: startupId,
        department_code: "",
        unit_code: "",
      });
    }
  }
}

export const getOrganizationTree = async (req, res) => {
  try {
    await ensureOrganizationChartRoots();
    const rows = await db.organization_chart.findAll({
      order: [["head", "ASC"]],
      raw: true,
    });
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error("getOrganizationTree:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to load organization chart",
    });
  }
};

/**
 * Create a child node under parent_head.
 * type: department | unit | section (auto-adjusted to parent level when needed)
 */
export const createOrganizationNode = async (req, res) => {
  try {
    const {
      parent_head,
      description,
      type: requestedType = "department",
      org_id: bodyOrgId,
    } = req.body;

    if (!parent_head || !String(description || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "parent_head and description are required",
      });
    }

    const parent = await db.organization_chart.findByPk(parent_head, {
      raw: true,
    });
    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent node not found",
      });
    }

    const parentLevel = inferLevel(parent);
    let type = String(requestedType || "department").toLowerCase();

    // Coerce type to a valid child of this parent
    if (parentLevel === "org") {
      return res.status(400).json({
        success: false,
        message:
          "Add startups from Startups, then attach departments under a startup node.",
      });
    }
    if (parentLevel === "startup") {
      type = "department";
    } else if (parentLevel === "department") {
      if (type !== "unit" && type !== "section") type = "unit";
    } else if (parentLevel === "unit") {
      type = "section";
    }

    const group = String(parent.group_code || bodyOrgId || "1").slice(0, 1);
    const startup = String(parent.startup_code || "").slice(0, 2);
    const name = String(description).trim().slice(0, 100);

    let created;

    if (type === "department") {
      const department_code = await nextGlobalDeptCode();
      const head = `${group}${startup}${department_code}00`.slice(0, 7);

      if (await db.organization_chart.findByPk(head)) {
        return res.status(409).json({
          success: false,
          message: "A node with this code already exists",
        });
      }

      await db.sequelize.transaction(async (transaction) => {
        const existingDept = await db.departments.findOne({
          where: { dept_id: department_code },
          transaction,
        });
        if (!existingDept) {
          await db.departments.create(
            {
              dept_id: department_code,
              dept_name: name,
              group_code: group,
            },
            { transaction }
          );
        }

        const orgIdFull = String(bodyOrgId || parent.group_code || "1");
        const link = await db.startup_departments.findOne({
          where: {
            startup_id: startup,
            dept_id: department_code,
            org_id: orgIdFull,
          },
          transaction,
        });
        if (!link) {
          await db.startup_departments.create(
            {
              startup_id: startup,
              dept_id: department_code,
              org_id: orgIdFull,
              status: "active",
              created_by:
                req.user?.user_id ||
                req.user?.dataValues?.user_id ||
                "system",
            },
            { transaction }
          );
        }

        created = await db.organization_chart.create(
          {
            head,
            subhead: parent.head,
            description: name,
            group_code: group,
            startup_code: startup,
            department_code,
            unit_code: "",
          },
          { transaction }
        );
      });
    } else {
      // unit or section under department / unit
      const department_code = String(
        parent.department_code || ""
      ).slice(0, 2);
      if (blank(department_code)) {
        return res.status(400).json({
          success: false,
          message: "Parent must be a department (or unit) to add a unit/section",
        });
      }

      const unit_code = await nextCodeAmong("unit_code", {
        group_code: group,
        startup_code: startup,
        department_code,
      });
      const head = `${group}${startup}${department_code}${unit_code}`.slice(
        0,
        7
      );

      if (await db.organization_chart.findByPk(head)) {
        return res.status(409).json({
          success: false,
          message: "A node with this code already exists",
        });
      }

      created = await db.organization_chart.create({
        head,
        subhead: parent.head,
        description: name,
        group_code: group,
        startup_code: startup,
        department_code,
        unit_code,
      });
    }

    return res.json({
      success: true,
      data: created?.toJSON?.() || created,
      message: "Node created",
    });
  } catch (err) {
    console.error("createOrganizationNode:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to create node",
    });
  }
};

export const updateOrganizationNode = async (req, res) => {
  try {
    const { head, description } = req.body;
    if (!head || !String(description || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "head and description are required",
      });
    }

    const node = await db.organization_chart.findByPk(head);
    if (!node) {
      return res.status(404).json({
        success: false,
        message: "Node not found",
      });
    }

    const name = String(description).trim().slice(0, 100);
    await node.update({ description: name });

    // Keep departments table in sync when editing a department node
    if (
      !blank(node.department_code) &&
      blank(node.unit_code) &&
      !blank(node.startup_code)
    ) {
      await db.departments.update(
        { dept_name: name },
        { where: { dept_id: node.department_code } }
      );
    }

    // Keep startups.name in sync when editing a startup node
    if (
      !blank(node.startup_code) &&
      blank(node.department_code) &&
      blank(node.unit_code)
    ) {
      await db.startups.update(
        { name },
        { where: { startup_id: node.startup_code } }
      );
    }

    return res.json({
      success: true,
      data: node.toJSON(),
      message: "Node updated",
    });
  } catch (err) {
    console.error("updateOrganizationNode:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to update node",
    });
  }
};

export const deleteOrganizationNode = async (req, res) => {
  try {
    const head = req.params.head || req.body.head;
    if (!head) {
      return res.status(400).json({
        success: false,
        message: "head is required",
      });
    }

    const node = await db.organization_chart.findByPk(head, { raw: true });
    if (!node) {
      return res.status(404).json({
        success: false,
        message: "Node not found",
      });
    }

    const level = inferLevel(node);
    if (level === "org" || level === "startup") {
      return res.status(400).json({
        success: false,
        message:
          level === "org"
            ? "Cannot delete the organization root"
            : "Remove startups from the Startups page, not the chart",
      });
    }

    const childCount = await db.organization_chart.count({
      where: { subhead: head },
    });
    if (childCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Delete child nodes first",
      });
    }

    await db.organization_chart.destroy({ where: { head } });

    return res.json({ success: true, message: "Node deleted" });
  } catch (err) {
    console.error("deleteOrganizationNode:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to delete node",
    });
  }
};
