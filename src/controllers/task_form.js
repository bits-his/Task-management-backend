import db from "../models";

const task_form = (req, res) => {
  const {
    id = null,
    query_type = "create",
    title = null,
    description = null,
    due_date = null,
    priority = null,
    status = null,
    assigned_to = null,
    created_at = null,
  } = req.body;
  db.sequelize
    .query(
      `call task_form(:query_type, :title, :description, :due_date, :priority, :status, :assigned_to,:created_at)`,
      {
        replacements: {
          query_type,
          title,
          description,
          due_date,
          priority,
          status,
          assigned_to,
          created_at,
        },
      }
    )
    .then((data) => res.json({ success: true, data }))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ success: false });
    });
};
const get_task_form = (req, res) => {
  const {
    id = null,
    query_type = "select",
    title = null,
    description = null,
    due_date = null,
    priority = null,
    status = null,
    assigned_to = null,
    created_at = null,
  } = req.body;
  db.sequelize
    .query(
      `call task_form(:query_type, :title, :description, :due_date, :priority, :status, :assigned_to,:created_at)`,
      {
        replacements: {
          query_type,
          title,
          description,
          due_date,
          priority,
          status,
          assigned_to,
          created_at,
        },
      }
    )
    .then((data) => res.json({ success: true, data }))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ success: false });
    });
};
