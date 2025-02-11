import db from "../models";

const clients = (req, res) => {
  const {
    query_type = "create",
    contact_id = null,
    name = null,
    email = null,
    phone = null,
    company = null,
    job_title = null,
    status = "Active",
  } = req.body;

  db.sequelize
    .query(
      `CALL clients(:query_type, :contact_id, :name, :email, :phone, :company,:job_title, :status)`,
      {
        replacements: {
          query_type,
          contact_id,
          name,
          email,
          phone,
          company,
          job_title,
          status,
        },
      }
    )
    .then((data) => res.json({ success: true, data }))
    .catch((err) => {
      console.error("Error managing contacts:", err);
      res.status(500).json({ success: false, error: err.message });
    });
};
const get_clients = (req, res) => {
  const {
    query_type = "select",
    contact_id = null,
    name = null,
    email = null,
    phone = null,
    company = null,
    job_title = null,
    status = "Active",
  } = req.body;

  db.sequelize
    .query(
      `CALL clients(:query_type, :contact_id, :name, :email, :phone, :company,:job_title, :status)`,
      {
        replacements: {
          query_type,
          contact_id,
          name,
          email,
          phone,
          company,
          job_title,
          status,
        },
      }
    )
    .then((data) => res.json({ success: true, data }))
    .catch((err) => {
      console.error("Error managing contacts:", err);
      res.status(500).json({ success: false, error: err.message });
    });
};

export { clients, get_clients };
