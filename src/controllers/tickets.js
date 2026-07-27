import db from "../models/index.js";
import { v4 as uuidv4 } from "uuid";

const tickets = async (req, res) => {
  try {
    const {
      query_type = "create",
      ticket_name = null,
      description = null,
      status = "",
      priority = null,
      department = null,
      user_id = null,
      startup_id = null,
      org_id = null,
    } = req.body;
    const ticket_id = uuidv4();

    if (query_type === "create") {
      const row = await db.tickets.create({
        ticket_id,
        ticket_name,
        description,
        status: status || "open",
        priority,
        department,
        user_id,
        startup_id,
        org_id,
      });
      return res.json({ success: true, data: [row.get({ plain: true })] });
    }

    res.json({ success: true, data: [] });
  } catch (err) {
    console.error("Error managing tickets:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

const get_tickets = async (req, res) => {
  try {
    const { startup_id = null, org_id = null } = req.query;
    const where = {};
    if (startup_id) where.startup_id = startup_id;
    if (org_id) where.org_id = org_id;

    const data = await db.tickets.findAll({
      where,
      include: [
        {
          model: db.users,
          as: "creator",
          attributes: ["fullname", "email", "user_id"],
          required: false,
        },
      ],
      order: [["created_at", "DESC"]],
    });

    const userIds = [
      ...new Set(
        data
          .map((row) => row.user_id)
          .filter(Boolean)
          .map(String)
      ),
    ];

    const memberships = userIds.length
      ? await db.user_memberships.findAll({
          where: { user_id: userIds, status: "active" },
          attributes: ["user_id", "role", "startup_id", "is_primary"],
          order: [["is_primary", "DESC"]],
        })
      : [];

    const roleByUser = {};
    for (const m of memberships) {
      const uid = String(m.user_id);
      if (!roleByUser[uid]) roleByUser[uid] = m.role;
    }

    const plain = data.map((row) => {
      const t = row.get({ plain: true });
      const creator = t.creator || null;
      delete t.creator;
      const uid = creator?.user_id || t.user_id;
      return {
        ...t,
        requester_name: creator?.name || null,
        requester_email: creator?.email || null,
        requester_role: (uid && roleByUser[String(uid)]) || null,
      };
    });

    res.json({ success: true, data: plain });
  } catch (err) {
    console.error("Error fetching tickets:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

const update_tickets = async (req, res) => {
  try {
    const {
      ticket_id = null,
      ticket_name = null,
      description = null,
      status = null,
      priority = null,
      department = null,
      user_id = null,
    } = req.body;

    const fields = {};
    if (ticket_name != null) fields.ticket_name = ticket_name;
    if (description != null) fields.description = description;
    if (status != null) fields.status = status;
    if (priority != null) fields.priority = priority;
    if (department != null) fields.department = department;
    if (user_id != null) fields.user_id = user_id;

    await db.tickets.update(fields, { where: { ticket_id } });
    res.json({ success: true, data: [{ ticket_id, ...fields }] });
  } catch (err) {
    console.error("Error updating ticket:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export { tickets, get_tickets, update_tickets };
