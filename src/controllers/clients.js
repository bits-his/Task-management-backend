import db from "../models/index.js";

const runClients = async ({
  query_type = "create",
  contact_id = null,
  name = null,
  email = null,
  phone = null,
  company = null,
  job_title = null,
  status = "Active",
  startup_id = null,
}) => {
  if (query_type === "create") {
    const row = await db.clients.create({
      name,
      email,
      phone,
      company,
      job_title,
      status,
      startup_id: startup_id || null,
    });
    return [row.get({ plain: true })];
  }
  if (query_type === "update") {
    const patch = { name, email, phone, company, job_title, status };
    if (startup_id != null && startup_id !== "") patch.startup_id = startup_id;
    await db.clients.update(patch, { where: { id: contact_id } });
    return [{ id: contact_id }];
  }
  if (query_type === "delete") {
    await db.clients.destroy({ where: { id: contact_id } });
    return [{ id: contact_id }];
  }
  if (query_type === "select") {
    const where = {};
    if (contact_id != null && contact_id !== "") where.id = contact_id;
    if (startup_id != null && startup_id !== "" && startup_id !== "Not Assigned") {
      where.startup_id = startup_id;
    }
    return db.clients.findAll({ where, raw: true });
  }
  return [];
};

const clients = async (req, res) => {
  try {
    const src = { ...req.query, ...req.body };
    const {
      query_type = "create",
      contact_id = null,
      name = null,
      email = null,
      phone = null,
      company = null,
      job_title = null,
      status = "Active",
      startup_id = null,
    } = src;
    const data = await runClients({
      query_type,
      contact_id,
      name,
      email,
      phone,
      company,
      job_title,
      status,
      startup_id,
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error("Error managing contacts:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

const get_clients = async (req, res) => {
  try {
    const src = { ...req.query, ...req.body };
    const {
      query_type = "select",
      contact_id = null,
      name = null,
      email = null,
      phone = null,
      company = null,
      job_title = null,
      status = "Active",
      startup_id = null,
    } = src;
    const data = await runClients({
      query_type,
      contact_id,
      name,
      email,
      phone,
      company,
      job_title,
      status,
      startup_id,
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error("Error managing contacts:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export { clients, get_clients };
