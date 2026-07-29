import db from "../models/index.js";
import { nextCode, nextStartupCode } from "../services/numberGenerator.js";
import {
  countMembersForStartup,
  getMembersForContext,
} from "../services/membershipService.js";
import Sequelize from "sequelize";
const {  Op, literal  } = Sequelize;

const handleStartupQuery = async ({
  query_type = "select-all",
  startup_id = null,
  name = null,
  description = null,
  logo = null,
  created_by = null,
  org_id = null,
  department_id = null,
}) => {
  switch (query_type) {
    case "select": {
      const members_count = await countMembersForStartup(startup_id);
      const startup = await db.startups.findOne({
        where: { startup_id },
        raw: true,
      });
      if (!startup) return [];
      return [{ ...startup, members_count }];
    }

    case "select-all": {
      const startups = await db.startups.findAll({
        attributes: {
          include: [
            [
              literal(
                `(SELECT COUNT(DISTINCT um.user_id) FROM user_memberships um WHERE um.startup_id = startups.startup_id AND um.status = 'active')`
              ),
              "members_count",
            ],
            [
              literal(
                `(SELECT COUNT(DISTINCT t.id) FROM task_form t WHERE t.startup_id = startups.startup_id AND t.status = 'completed')`
              ),
              "tasks_completed",
            ],
            [
              literal(
                `(SELECT COUNT(DISTINCT t.id) FROM task_form t WHERE t.startup_id = startups.startup_id AND t.status = 'pending')`
              ),
              "tasks_pending",
            ],
          ],
        },
        raw: true,
      });
      return startups;
    }

    case "by_id": {
      const startup = await db.startups.findOne({
        where: { startup_id },
        attributes: [["name", "startup_name"]],
        raw: true,
      });
      return startup ? [startup] : [];
    }

    case "department": {
      return db.sequelize.transaction(async (transaction) => {
        const { padded: department_code } = await nextCode("dpt", "Department", {
          pad: 2,
          numericOnly: true,
          transaction,
        });
        await db.departments.create(
          {
            dept_id: department_code,
            dept_name: name,
            group_code: org_id,
          },
          { transaction }
        );
        return [{ dept_id: department_code, dept_name: name }];
      });
    }

    case "insert": {
      return db.sequelize.transaction(async (transaction) => {
        const { startupCode } = await nextStartupCode(transaction);
        await db.startups.create(
          {
            startup_id: startupCode,
            org_id,
            name,
            description,
            logo,
            created_by,
          },
          { transaction }
        );
        const head = `${org_id || ""}${startupCode}0000`.slice(0, 7);
        const subhead = `${org_id || ""}000000`.slice(0, 7);
        // Ensure org root exists so the startup node is not orphaned in the tree
        const rootHead = subhead;
        const root = await db.organization_chart.findByPk(rootHead, {
          transaction,
        });
        if (!root) {
          const org = await db.organizations.findOne({
            where: { org_id: org_id || "1" },
            transaction,
            raw: true,
          });
          await db.organization_chart.create(
            {
              head: rootHead,
              subhead: "",
              description: org?.org_name || "Organization",
              group_code: String(org_id || "1").slice(0, 1),
              startup_code: "",
              department_code: "",
              unit_code: "",
            },
            { transaction }
          );
        }
        await db.organization_chart.create(
          {
            head,
            subhead,
            description: name,
            group_code: String(org_id || "1").slice(0, 1),
            startup_code: String(startupCode).slice(0, 2),
            department_code: "",
            unit_code: "",
          },
          { transaction }
        );
        return [{ startup_id: startupCode, name }];
      });
    }

    case "unit": {
      return db.sequelize.transaction(async (transaction) => {
        const { padded: unit_code } = await nextCode("unt", "Unit", {
          pad: 2,
          numericOnly: true,
          transaction,
        });
        const head = `${org_id || ""}${startup_id || ""}00${unit_code}`.slice(
          0,
          7
        );
        await db.organization_chart.create(
          {
            head,
            subhead: "",
            description: name,
            group_code: "1",
            startup_code: String(unit_code).slice(0, 2),
            department_code: "",
            unit_code: String(unit_code).slice(0, 2),
          },
          { transaction }
        );
        return [{ unit_code, name }];
      });
    }

    case "role": {
      return db.sequelize.transaction(async (transaction) => {
        const { next } = await nextCode("rol", "Role", {
          pad: 3,
          transaction,
        });
        const role_id = `ROL${String(next).padStart(3, "0")}`;
        await db.roles.create(
          {
            role_id,
            role_name: name,
            dept_id: department_id,
          },
          { transaction }
        );
        return [{ role_id, role_name: name }];
      });
    }

    case "update": {
      const fields = {};
      if (name != null) fields.name = name;
      if (description != null) fields.description = description;
      if (logo != null) fields.logo = logo;
      if (created_by != null) fields.created_by = created_by;
      await db.startups.update(fields, { where: { startup_id } });
      return [{ startup_id, ...fields }];
    }

    default:
      return [];
  }
};

const findAllStartups = async (req, res) => {
  try {
    const { query_type = "select-all" } = req.query;
    const {
      startup_id = null,
      name = null,
      description = null,
      logo = null,
      created_by = null,
      org_id = null,
      department_id = null,
    } = req.body;

    const data = await handleStartupQuery({
      query_type,
      startup_id,
      name,
      description,
      logo,
      created_by,
      org_id,
      department_id,
    });
    res.json({ success: true, data });
  } catch (err) {
    res.json({ success: false, message: err.message || err });
  }
};

const createStartups = async (req, res) => {
  try {
    const {
      query_type = "insert",
      startup_id = null,
      name = null,
      description = null,
      created_by = null,
      org_id = null,
      department_id = null,
    } = req.body;
    const logo = req.file ? req.file.path : null;

    const data = await handleStartupQuery({
      query_type,
      startup_id,
      name,
      description,
      logo,
      created_by,
      org_id,
      department_id,
    });
    res.json({
      success: true,
      data,
      message: "Startup created successfully",
    });
  } catch (err) {
    res.json({ success: false, message: err.message || err });
  }
};

const updateStartups = async (req, res) => {
  try {
    const {
      query_type = "update",
      startup_id = null,
      name = null,
      description = null,
      created_by = null,
      org_id = null,
      department_id = null,
    } = req.body;
    const logo = req.file ? req.file.path : null;

    const data = await handleStartupQuery({
      query_type,
      startup_id,
      name,
      description,
      logo,
      created_by,
      org_id,
      department_id,
    });
    res.json({
      success: true,
      data,
      message: "Startup updated successfully",
    });
  } catch (err) {
    res.json({ success: false, message: err.message || err });
  }
};

export const getAllStartupMembers = async (req, res) => {
  try {
    const { startup_id = "", dept_id = "", org_id = "" } = req.query;

    if (!startup_id && !org_id) {
      return res.json({ success: true, data: [] });
    }

    const data = await getMembersForContext({
      startup_id: startup_id || null,
      dept_id: dept_id || null,
      org_id: org_id || null,
    });

    res.json({ success: true, data });
  } catch (err) {
    res.json({ success: false, message: err.message || err });
  }
};

export { findAllStartups, createStartups, updateStartups };
