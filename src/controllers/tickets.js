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
      });
      return res.json({ success: true, data: [row.get({ plain: true })] });
    }

    res.json({ success: true, data: [] });
  } catch (err) {
    console.error("Error managing contacts:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

const get_tickets = async (req, res) => {
  try {
    const data = await db.tickets.findAll({
      order: [["created_at", "DESC"]],
      raw: true,
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error("Error managing contacts:", err);
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
    console.error("Error managing contacts:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export { tickets, get_tickets, update_tickets };
