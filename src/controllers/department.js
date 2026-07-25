import db from "../models/index.js";
import Sequelize from "sequelize";
import { orgWideRolesCsv, ROLES } from "../constants/roles.js";
const { Op, fn, col } = Sequelize;

const runDepartmentQuery = async ({
  query_type = "select",
  dept_id = null,
  startup_id = null,
  department_name = "",
  org_id = null,
  user_id = null,
  status = "active",
}) => {
  switch (query_type) {
    case "get-all":
      return db.departments.findAll({ raw: true });

    case "create": {
      await db.startup_departments.create({
        startup_id,
        dept_id,
        org_id,
        status: status || "active",
        created_by: user_id,
      });
      const head = `${org_id || ""}${startup_id || ""}${dept_id || ""}00`.slice(
        0,
        7
      );
      const subhead = `${org_id || ""}${startup_id || ""}0000`.slice(0, 7);
      await db.organization_chart.create({
        head,
        subhead,
        description: department_name,
        group_code: String(org_id || "1").slice(0, 1),
        startup_code: String(startup_id || "").slice(0, 2),
        department_code: String(dept_id || "").slice(0, 2),
        unit_code: "",
      });
      return [{ startup_id, dept_id, status }];
    }

    case "get-startup-department": {
      const rows = await db.startup_departments.findAll({
        where: { org_id, startup_id },
        include: [
          {
            model: db.departments,
            as: "department",
            attributes: ["dept_name"],
            required: true,
          },
        ],
        raw: true,
        nest: true,
      });

      const data = await Promise.all(
        rows.map(async (row) => {
          const access = await db.department_access.findOne({
            where: { dept_id: row.dept_id },
            raw: true,
          });
          const user_count = await db.user_memberships.count({
            where: {
              dept_id: row.dept_id,
              startup_id,
              status: "active",
            },
            distinct: true,
            col: "user_id",
          });
          return {
            dept_name: row.department?.dept_name,
            org_id: row.org_id,
            dept_id: row.dept_id,
            status: row.status,
            roles: orgWideRolesCsv(),
            access_to: access?.access_to || null,
            functionalities: access?.functionalities || null,
            user_count,
          };
        })
      );
      return data;
    }

    case "get-org-department1": {
      const rows = await db.startup_departments.findAll({
        where: { org_id, startup_id: null },
        include: [
          {
            model: db.departments,
            as: "department",
            attributes: ["dept_name"],
            required: true,
          },
        ],
        raw: true,
        nest: true,
      });
      return Promise.all(
        rows.map(async (row) => {
          const access = await db.department_access.findOne({
            where: { dept_id: row.dept_id },
            raw: true,
          });
          return {
            dept_name: row.department?.dept_name,
            org_id: row.org_id,
            dept_id: row.dept_id,
            status: row.status,
            roles: orgWideRolesCsv(),
            access_to: access?.access_to || null,
            functionalities: access?.functionalities || null,
          };
        })
      );
    }

    case "get-org-department":
      return db.departments.findAll({
        where: { group_code: org_id },
        raw: true,
      });

    case "sidebar-department":
      return db.departments.findAll({
        attributes: [[fn("DISTINCT", col("dept_name")), "dept_name"], "dept_id"],
        raw: true,
      });

    case "side-department-view": {
      const charts = await db.organization_chart.findAll({
        where: { department_code: dept_id },
        attributes: ["startup_code"],
        raw: true,
      });
      const startupIds = charts.map((c) => c.startup_code).filter(Boolean);
      if (!startupIds.length) return [];

      const startups = await db.startups.findAll({
        where: { startup_id: { [Op.in]: startupIds } },
        raw: true,
      });

      return Promise.all(
        startups.map(async (s) => {
          const chart = await db.organization_chart.findOne({
            where: {
              startup_code: s.startup_id,
              department_code: dept_id,
            },
            raw: true,
          });
          return {
            logo: s.logo,
            startup_name: s.name,
            startup_id: s.startup_id,
            head: chart?.head || null,
            dept_name: chart?.description || null,
          };
        })
      );
    }

    case "roles":
      // Org-wide roles — not per-department. dept_id ignored.
      return ROLES.map((r) => ({
        role_id: r.id,
        role_name: r.label,
        role_key: r.id,
        dept_id: dept_id || null,
      }));

    case "select":
    case "": {
      const depts = await db.departments.findAll({ raw: true });
      return Promise.all(
        depts.map(async (d) => {
          return {
            dept_id: d.dept_id,
            dept_name: d.dept_name,
            roles: orgWideRolesCsv(),
          };
        })
      );
    }

    default:
      return [];
  }
};

const department = async (req, res) => {
  try {
    const {
      query_type = "create",
      dept_id = null,
      startup_id = null,
      department_name = "",
      org_id = null,
      user_id = null,
      status = "Active",
    } = req.body;

    const data = await runDepartmentQuery({
      query_type,
      dept_id,
      startup_id,
      department_name,
      org_id,
      user_id,
      status,
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error("Error managing department:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

const get_department = async (req, res) => {
  try {
    const {
      query_type = "select",
      org_id = null,
      startup_id = null,
    } = req.query;
    const {
      dept_id = null,
      department_name = "",
      user_id = null,
      status = "active",
    } = req.body;

    const data = await runDepartmentQuery({
      query_type,
      dept_id,
      startup_id,
      department_name,
      org_id,
      user_id,
      status,
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error("Error managing department:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

const get_role = async (req, res) => {
  try {
    const { query_type = "roles", org_id = null, startup_id = null } =
      req.query;
    const {
      department_name = "",
      user_id = null,
      status = "active",
    } = req.body;
    const { dept_id = null } = req.params;

    const data = await runDepartmentQuery({
      query_type,
      dept_id,
      startup_id,
      department_name,
      org_id,
      user_id,
      status,
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error("Error managing roles:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export { department, get_department, get_role };
