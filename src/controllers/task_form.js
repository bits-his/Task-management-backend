import { NULL } from "mysql2/lib/constants/types";
import db from "../models";

const task_form = (req, res) => {
  // console.log(req);
  const {
    query_type = "create",
    id = NULL,
    title = null,
    description = null,
    due_date = null,
    priority = null,
    status = "pending",
    assigned_to = null,
    rating = null,
    comment = null,
    created_by = null,
    startup_id = null,
    submitted_at = null,
    tasks = [],
  } = req.body;

  let images = [];
  if (req.files) {
    images = req.files.map((image) => image.path);
  }

  console.log("imagessssssssssssssssssss", images);
  // console.log(req.files);
  db.sequelize
    .query(
      `call task_form(
      :query_type,:id, :title, :description, :due_date, :priority, :status, :assigned_to,:rating,:comment,:created_by,:startup_id,:submitted_at,:images)`,
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
          rating,
          comment,
          created_by,
          startup_id,
          submitted_at,
          images: `${images}`,
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
    title = null,
    description = null,
    due_date = null,
    priority = null,
    status = null,
    assigned_to = null,
    rating = null,
    comment = null,
    created_by = null,
    submitted_at = null,
    images = [],
  } = req.body;

  const { query_type = "select", task_id = 0, startup_id = null } = req.query;
  console.log(req.query);
  db.sequelize
    .query(
      `call task_form(:query_type,:task_id, :title, :description, :due_date, :priority, :status, :assigned_to,:rating,:comment,:created_by,:startup_id,:submitted_at,:images)`,
      {
        replacements: {
          query_type,
          task_id,
          title,
          description,
          due_date,
          priority,
          status,
          assigned_to,
          rating,
          comment,
          created_by,
          startup_id,
          submitted_at,
          images: "",
        },
      }
    )
    .then((data) => res.json({ success: true, data }))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ success: false });
    });
};
const update_task_status = (req, res) => {
  const {
    query_type = "update",
    task_id = "",
    title = null,
    description = null,
    due_date = null,
    priority = null,
    status = null,
    assigned_to = null,
    images = [],
  } = req.body;
  console.log(req.body);
  db.sequelize
    .query(
      `call task_form(:query_type,:task_id, :title, :description, :due_date, :priority, :status, :assigned_to,:images)`,
      {
        replacements: {
          query_type,
          task_id,
          title,
          description,
          due_date,
          priority,
          status,
          assigned_to,
          images,
        },
      }
    )
    .then((data) => res.json({ success: true, data }))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ success: false });
    });
};
export { task_form, get_task_form, update_task_status };
