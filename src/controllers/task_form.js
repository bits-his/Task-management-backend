import { NULL } from "mysql2/lib/constants/types";
import db from "../models";
import { CreateNotifications } from "./notification";
const moment = require("moment");
const task_form = (req, res) => {
  const {
    query_type = "create",
    id = null,
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
    subtasks = [],
  } = req.body;
  console.log(JSON.stringify(req.body));
  let images = [];
  if (req.files) {
    images = req.files.map((image) => image.path);
  }

  // Handle assigned_to as a comma-separated string or NULL
  const processedAssignedTo = Array.isArray(assigned_to)
    ? assigned_to.filter(Boolean).join(",")
    : assigned_to
    ? assigned_to
    : null;
  console.log("Assigned To:", req.body);
  console.log("Processed Assigned To:", processedAssignedTo);

  db.sequelize
    .query(
      `call task_form(
        :query_type, :id, :title, :description, :due_date, 
        :priority, :status, :assigned_to, :rating, :comment, 
        :created_by, :startup_id, :submitted_at, :images,:subtasks)`,
      {
        replacements: {
          query_type,
          id,
          title,
          description,
          due_date: moment().format("YYYY-MM-DD HH:mm:ss"),
          priority,
          status: status === "backlog" ? "pending" : status,
          assigned_to: processedAssignedTo,
          rating,
          comment,
          created_by,
          startup_id,
          submitted_at,
          images: images.join(","),
          subtasks:
            query_type === "reassign" ||
            query_type === "edit-task" ||
            query_type === "update-status"
              ? ""
              : subtasks || null,
        },
      }
    )
    .then((data) => {
      if (query_type == "create") {
        CreateNotifications(
          "Task",
          assigned_to,
          "Task Created",
          `New task has been assigned to you with a priority of ${priority}`
        );
      } else if (query_type == "under-review") {
        CreateNotifications(
          "Task",
          created_by,
          "Task Review",
          `A task has been submitted to you for review `
        );
      } else if (query_type == "completed") {
        CreateNotifications(
          "Task",
          created_by,
          "Task Completed",
          `The Task ${title} has been reviewed and is now completed`
        );
      } else if (query_type == "reassign") {
        CreateNotifications(
          "Task",
          created_by,
          "Task Reassigned",
          `The Task ${title} has been Reassigned to you`
        );
      }
      res.json({ success: true, data });
    })
    .catch((err) => {
      console.error("Error in task_form:", err);
      res.status(500).json({ success: false, error: err.message });
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
      `call task_form(:query_type,:task_id, :title, :description, :due_date, :priority, :status, :assigned_to,:rating,:comment,:created_by,:startup_id,:submitted_at,:images,:subtasks)`,
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
          subtasks: null,
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
    task_id = "",
    title = null,
    description = null,
    due_date = null,
    priority = "medium",
    status = null,
    assigned_to = null,
    images = [],
  } = req.body;
  const { query_type = "update" } = req.query;
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

export const updateSubTask = (req, res) => {
  const {
    task_id = null,
    status = "",
    completedBy = null,
    query_type = "select",
  } = req.query;
  console.log(req.query);

  db.sequelize
    .query(`call update_subtask(:task_id,:status,:completedBy,:query_type)`, {
      replacements: {
        task_id,
        status,
        completedBy,
        query_type,
      },
    })
    .then((data) => res.json({ success: true, data }))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ success: false });
    });
};
export const updateAssignee = (req, res) => {
  const {
    task_id = 0,
    status = "pending",
    user_id = null,
    new_assignees = null,
  } = req.body;

  db.sequelize
    .query(
      `call update_task_assignee(:task_id,:user_id,:new_status,:new_assignees)`,
      {
        replacements: {
          task_id,
          user_id,
          new_status: status,
          new_assignees,
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
