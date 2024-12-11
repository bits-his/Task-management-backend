import db from "../models";

const task_form = (req, res) => {
  console.log(req.body);
  const {
    query_type = "create",
    id = null,
    title = null,
    description = null,
    due_date = null,
    priority = null,
    status = "pending",
    assigned_to = null,
    created_at = null,
  } = req.body;
  db.sequelize
    .query(
      `call task_form(:query_type,:id, :title, :description, :due_date, :priority, :status, :assigned_to,:created_at)`,
      {
        replacements: {
          query_type,
          id,
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
    query_type = "select",
    id = null,
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
      `call task_form(:query_type,:id, :title, :description, :due_date, :priority, :status, :assigned_to,:created_at)`,
      {
        replacements: {
          query_type,
          id,
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

export { task_form, get_task_form };
