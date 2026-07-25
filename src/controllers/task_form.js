import db from "../models/index.js";
import { CreateNotifications } from "./notification.js";
import { nextCode } from "../services/numberGenerator.js";
import Sequelize from "sequelize";
const {  Op  } = Sequelize;

async function insertAssignees(task_id, assignedToStr, transaction) {
  if (!assignedToStr) return;
  const users = String(assignedToStr)
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);
  for (const user_id of users) {
    await db.assignee_table.create(
      { user_id, task_id, status: "pending" },
      { transaction }
    );
  }
}

function parseSubtasks(subtasks) {
  if (!subtasks) return [];
  if (typeof subtasks === "string") {
    try {
      return JSON.parse(subtasks);
    } catch (e) {
      return [];
    }
  }
  return Array.isArray(subtasks) ? subtasks : [];
}

async function buildAssigneesWithStatus(task_id) {
  const rows = await db.assignee_table.findAll({
    where: { task_id, status: { [Op.ne]: "deactivated" } },
    include: [
      {
        model: db.users,
        as: "user",
        attributes: ["user_id", "fullname", "profile"],
        required: false,
      },
    ],
  });
  const userIds = rows
    .map((a) => a.user?.user_id || a.user_id)
    .filter(Boolean);
  const { getPrimaryMembershipMap } = await import(
    "../services/membershipService.js"
  );
  const primaryMap = userIds.length
    ? await getPrimaryMembershipMap(userIds)
    : {};

  return rows
    .map((a) => {
      const uid = a.user?.user_id || a.user_id || "";
      return JSON.stringify({
        user_id: uid,
        fullname: a.user?.fullname || "",
        profile: a.user?.profile || "/placeholder.svg",
        role: primaryMap[uid]?.role || "",
        task_id,
        user_task_status: a.status || "",
        rating: a.rating || "",
      });
    })
    .join(",");
}

async function buildSubtasksJson(task_id) {
  const rows = await db.subtasks.findAll({
    where: { task_id },
    raw: true,
  });
  const enriched = await Promise.all(
    rows.map(async (s) => {
      let completedByName = "null";
      if (s.completedBy) {
        const u = await db.users.findOne({
          where: { user_id: s.completedBy },
          attributes: ["fullname"],
          raw: true,
        });
        completedByName = u?.fullname || "null";
      }
      return {
        id: s.id,
        task_id: s.task_id,
        title: s.title,
        status: s.status,
        completedBy: completedByName,
      };
    })
  );
  return JSON.stringify(enriched);
}

async function handleTaskQuery(params) {
  const {
    query_type = "create",
    id = null,
    task_id = null,
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
    images = "",
    subtasks = null,
  } = params;

  const resolvedTaskId = task_id || id;

  switch (query_type) {
    case "create": {
      return db.sequelize.transaction(async (transaction) => {
        const { next } = await nextCode("TAS", "task", {
          pad: 10,
          transaction,
        });
        const new_task_code = `TAS${String(next).padStart(10, "0")}`;

        await db.task_form.create(
          {
            task_id: new_task_code,
            title,
            description,
            due_date,
            priority,
            status,
            assigned_to,
            created_by,
            startup_id,
            images,
          },
          { transaction }
        );

        await insertAssignees(new_task_code, assigned_to, transaction);

        const list = parseSubtasks(subtasks);
        for (const st of list) {
          if (st?.title) {
            await db.subtasks.create(
              { task_id: new_task_code, title: st.title },
              { transaction }
            );
          }
        }

        return [{ task_id: new_task_code }];
      });
    }

    case "select": {
      const tasks = await db.task_form.findAll({
        where: { startup_id },
        order: [["created_at", "DESC"]],
        raw: true,
      });
      const data = [];
      for (const t of tasks) {
        const assignees = await db.assignee_table.findAll({
          where: {
            task_id: t.task_id,
            status: { [Op.ne]: "deactivated" },
          },
          raw: true,
        });
        if (!assignees.length) continue;
        const comment_count = await db.comments.count({
          where: { task_id: t.task_id },
        });
        const subtask_count = await db.subtasks.count({
          where: { task_id: t.task_id },
        });
        const assignees_with_status = await buildAssigneesWithStatus(t.task_id);
        data.push({
          ...t,
          comment_count,
          subtask_count,
          assignees_with_status,
        });
      }
      return data;
    }

    case "by_id": {
      const t = await db.task_form.findOne({
        where: { task_id: resolvedTaskId },
        raw: true,
      });
      if (!t) return [];
      const comment_count = await db.comments.count({
        where: { task_id: t.task_id },
      });
      return [
        {
          ...t,
          subtasks: await buildSubtasksJson(t.task_id),
          comment_count,
          assignees_with_status: await buildAssigneesWithStatus(t.task_id),
        },
      ];
    }

    case "underReview": {
      const assignees = await db.assignee_table.findAll({
        where: { status: "underReview" },
        include: [
          {
            model: db.users,
            as: "user",
            attributes: ["fullname", "profile"],
          },
          {
            model: db.task_form,
            as: "task",
            where: { startup_id },
            required: true,
          },
        ],
      });
      return Promise.all(
        assignees.map(async (a) => {
          const task = a.task?.get ? a.task.get({ plain: true }) : a.task;
          return {
            user_id: a.user_id,
            ...task,
            fullname: a.user?.fullname,
            submitted_at: a.submitted_at,
            profile: a.user?.profile,
            subtasks: await buildSubtasksJson(a.task_id),
          };
        })
      );
    }

    case "reassign": {
      await updateTaskAndAssignees({
        task_id: resolvedTaskId,
        user_id: null,
        status: "pending",
        new_assignees: assigned_to,
        rating: null,
      });
      await db.task_form.update(
        { assigned_to, due_date, status: "pending" },
        { where: { task_id: resolvedTaskId } }
      );
      return [{ task_id: resolvedTaskId }];
    }

    case "edit-task": {
      await db.task_form.update(
        { title, due_date, priority, description, status },
        { where: { task_id: resolvedTaskId } }
      );
      const list = parseSubtasks(subtasks);
      if (list.length) {
        await db.subtasks.destroy({ where: { task_id: resolvedTaskId } });
        for (const st of list) {
          if (st?.title) {
            await db.subtasks.create({
              task_id: resolvedTaskId,
              title: st.title,
            });
          }
        }
      }
      return [{ task_id: resolvedTaskId }];
    }

    case "update-status": {
      const fields = { status };
      if (status === "inprogress") {
        fields.start_time = new Date();
      } else if (status === "underReview" || status === "completed") {
        fields.submitted_date = new Date();
        if (status === "completed") fields.end_time = new Date();
        await db.assignee_table.update(
          {
            submitted_at: new Date(),
            ...(status === "completed" ? { status: "completed" } : {}),
          },
          { where: { task_id: resolvedTaskId } }
        );
      }
      await db.task_form.update(fields, {
        where: { task_id: resolvedTaskId },
      });
      return [{ task_id: resolvedTaskId, status }];
    }

    case "review": {
      await db.task_form.update(
        {
          status,
          rating,
          comment,
          end_time: new Date(),
        },
        { where: { id: resolvedTaskId } }
      );
      return [{ id: resolvedTaskId, status }];
    }

    default:
      throw new Error("Unsupported query type!");
  }
}

async function updateTaskAndAssignees({
  task_id,
  user_id,
  status: new_status,
  new_assignees,
  rating,
}) {
  return db.sequelize.transaction(async (transaction) => {
    if (new_assignees != null && String(new_assignees).trim() !== "") {
      await db.assignee_table.update(
        { status: "deactivated" },
        { where: { task_id }, transaction }
      );
      await insertAssignees(task_id, new_assignees, transaction);
    }

    if (user_id) {
      const fields = { status: new_status };
      if (rating) fields.rating = rating;
      if (new_status === "underReview" || new_status === "completed") {
        fields.submitted_at = new Date();
      }
      await db.assignee_table.update(fields, {
        where: { task_id, user_id },
        transaction,
      });
      const taskFields = { updatedAt: new Date() };
      if (new_status === "underReview" || new_status === "completed") {
        taskFields.submitted_date = new Date();
      }
      if (new_status === "completed") {
        taskFields.end_time = new Date();
      }
      await db.task_form.update(taskFields, {
        where: { task_id },
        transaction,
      });
    }

    const active = await db.assignee_table.findAll({
      where: { task_id, status: { [Op.ne]: "deactivated" } },
      transaction,
      raw: true,
    });
    const order = { pending: 0, inprogress: 1, underReview: 2, completed: 3 };
    active.sort(
      (a, b) => (order[a.status] ?? 99) - (order[b.status] ?? 99)
    );
    const new_global_status = active[0]?.status || "pending";
    await db.task_form.update(
      { status: new_global_status },
      { where: { task_id }, transaction }
    );
  });
}

const task_form = async (req, res) => {
  try {
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
      subtasks = null,
    } = req.body;

    let images = [];
    if (req.files) {
      images = req.files.map((image) => image.path);
    }

    const processedAssignedTo = Array.isArray(assigned_to)
      ? assigned_to.filter(Boolean).join(",")
      : assigned_to || null;

    const data = await handleTaskQuery({
      query_type,
      id,
      title,
      description,
      due_date:
        due_date == "Invalid date" ? null : due_date ? due_date : null,
      priority,
      status,
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
          ? null
          : subtasks || null,
    });

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
  } catch (err) {
    console.error("Error in task_form:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

const get_task_form = async (req, res) => {
  try {
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
    } = req.body;
    const { query_type = "select", task_id = 0, startup_id = null } = req.query;

    const data = await handleTaskQuery({
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
    });
    res.json({ success: true, data });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
};

const update_task_status = async (req, res) => {
  try {
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

    const data = await handleTaskQuery({
      query_type,
      task_id,
      title,
      description,
      due_date,
      priority,
      status,
      assigned_to,
      images: Array.isArray(images) ? images.join(",") : images,
    });
    res.json({ success: true, data });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
};

export const updateSubTask = async (req, res) => {
  try {
    const {
      task_id = null,
      status = "",
      completedBy = null,
      query_type = "select",
    } = req.query;

    if (query_type === "update") {
      await db.subtasks.update(
        { status, completedBy },
        { where: { id: task_id } }
      );
      return res.json({ success: true, data: [{ id: task_id, status }] });
    }

    const rows = await db.subtasks.findAll({
      where: { task_id },
      raw: true,
    });
    const data = await Promise.all(
      rows.map(async (s) => {
        let completedByName = null;
        if (s.completedBy) {
          const u = await db.users.findOne({
            where: { user_id: s.completedBy },
            attributes: ["fullname"],
            raw: true,
          });
          completedByName = u?.fullname || null;
        }
        return {
          id: s.id,
          task_id: s.task_id,
          title: s.title,
          status: s.status,
          completedBy: completedByName,
        };
      })
    );
    res.json({ success: true, data });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
};

export const updateAssignee = async (req, res) => {
  try {
    const {
      task_id = 0,
      status = "pending",
      user_id = null,
      new_assignees = null,
      rating = null,
    } = req.body;

    await updateTaskAndAssignees({
      task_id,
      user_id,
      status,
      new_assignees,
      rating: rating || null,
    });
    res.json({ success: true, data: [{ task_id }] });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
};

export { task_form, get_task_form, update_task_status };
