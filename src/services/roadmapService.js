import db from "../models/index.js";
import { nextCode } from "./numberGenerator.js";

/**
 * Get all templates with enrollment counts and phase summary.
 * Supports passing either an options object ({ org_id, status }) or org_id string.
 */
export async function getTemplates(options = {}) {
  let org_id = "1";
  let status = null;

  if (typeof options === "object" && options !== null) {
    org_id = options.org_id || "1";
    status = options.status || null;
  } else if (typeof options === "string" || typeof options === "number") {
    org_id = String(options);
  }

  const where = { org_id: String(org_id) };
  if (status) {
    where.status = status;
  }

  const templates = await db.roadmap_templates.findAll({
    where,
    order: [["created_at", "DESC"]],
    include: [
      {
        model: db.roadmap_phases,
        as: "phases",
        include: [{ model: db.roadmap_items, as: "items" }],
      },
      {
        model: db.roadmap_enrollments,
        as: "enrollments",
      },
    ],
  });

  return templates.map((t) => {
    const json = t.toJSON();
    let totalItems = 0;
    (json.phases || []).forEach((ph) => {
      totalItems += (ph.items || []).length;
    });

    return {
      ...json,
      phase_count: (json.phases || []).length,
      item_count: totalItems,
      enrollment_count: (json.enrollments || []).length,
    };
  });
}

/**
 * Get single template by roadmap_id with full hierarchy.
 */
export async function getTemplateById(roadmap_id) {
  const template = await db.roadmap_templates.findOne({
    where: { roadmap_id },
    include: [
      {
        model: db.roadmap_phases,
        as: "phases",
        order: [["sort_order", "ASC"]],
        include: [
          {
            model: db.roadmap_items,
            as: "items",
            order: [["sort_order", "ASC"]],
          },
        ],
      },
      {
        model: db.roadmap_enrollments,
        as: "enrollments",
      },
    ],
  });

  if (!template) throw new Error("Roadmap template not found");

  const json = template.toJSON();

  // Sort phases and items explicitly by sort_order
  if (json.phases) {
    json.phases.sort((a, b) => a.sort_order - b.sort_order);
    json.phases.forEach((ph) => {
      if (ph.items) ph.items.sort((a, b) => a.sort_order - b.sort_order);
    });
  }

  return json;
}

/**
 * Create a new roadmap template.
 */
export async function createTemplate({
  title,
  description = null,
  total_weeks = 10,
  created_by = null,
  org_id = "1",
}) {
  if (!title || !String(title).trim()) throw new Error("Title is required");
  const { code: roadmap_id } = await nextCode("RMP", "roadmap_template");

  const template = await db.roadmap_templates.create({
    roadmap_id,
    org_id: org_id || "1",
    title: String(title).trim(),
    description: description && String(description).trim() ? String(description).trim() : null,
    total_weeks: parseInt(total_weeks, 10) || 10,
    status: "draft",
    created_by: created_by || null,
  });

  return template.toJSON();
}

/**
 * Update template details.
 */
export async function updateTemplate(roadmap_id, updates = {}) {
  const template = await db.roadmap_templates.findOne({
    where: { roadmap_id },
  });
  if (!template) throw new Error("Template not found");

  const payload = {};
  if (updates.title !== undefined && updates.title !== null)
    payload.title = String(updates.title).trim();
  if (updates.description !== undefined)
    payload.description = updates.description && String(updates.description).trim() ? String(updates.description).trim() : null;
  if (updates.total_weeks !== undefined && updates.total_weeks !== null)
    payload.total_weeks = parseInt(updates.total_weeks, 10) || 10;
  if (updates.status !== undefined && updates.status !== null)
    payload.status = updates.status;

  await template.update(payload);
  return template.toJSON();
}

/**
 * Publish template.
 */
export async function publishTemplate(roadmap_id) {
  return updateTemplate(roadmap_id, { status: "published" });
}

/**
 * Add a phase to a template.
 */
export async function addPhase(
  roadmap_id,
  { title, duration_weeks = 2, duration_days = 14, learning_goals }
) {
  if (!title || !String(title).trim()) throw new Error("Phase title is required");
  const { code: phase_id } = await nextCode("RPH", "roadmap_phase");

  const count = await db.roadmap_phases.count({ where: { roadmap_id } });

  const phase = await db.roadmap_phases.create({
    phase_id,
    roadmap_id,
    title: String(title).trim(),
    sort_order: count + 1,
    duration_weeks: parseInt(duration_weeks, 10) || 2,
    duration_days: parseInt(duration_days, 10) || (parseInt(duration_weeks, 10) || 2) * 7,
    learning_goals: learning_goals ? String(learning_goals).trim() : null,
  });

  return phase.toJSON();
}

/**
 * Update phase details.
 */
export async function updatePhase(phase_id, updates = {}) {
  const phase = await db.roadmap_phases.findOne({ where: { phase_id } });
  if (!phase) throw new Error("Phase not found");

  const payload = {};
  if (updates.title !== undefined) payload.title = String(updates.title).trim();
  if (updates.duration_weeks !== undefined)
    payload.duration_weeks = parseInt(updates.duration_weeks, 10);
  if (updates.duration_days !== undefined)
    payload.duration_days = parseInt(updates.duration_days, 10);
  if (updates.learning_goals !== undefined)
    payload.learning_goals = updates.learning_goals;
  if (updates.sort_order !== undefined)
    payload.sort_order = parseInt(updates.sort_order, 10);

  await phase.update(payload);
  return phase.toJSON();
}

/**
 * Delete a phase and its items.
 */
export async function deletePhase(phase_id) {
  const phase = await db.roadmap_phases.findOne({ where: { phase_id } });
  if (!phase) throw new Error("Phase not found");
  await db.roadmap_items.destroy({ where: { phase_id } });
  await phase.destroy();
  return { success: true, phase_id };
}

/**
 * Add an item to a phase.
 */
export async function addItem(
  phase_id,
  {
    title,
    question = null,
    description,
    type = "lesson",
    resource_url,
    image_url,
    submission_type = "none",
    submission_options = null,
    correct_answer = null,
    offset_days = 0,
    due_offset_days = 7,
    requires_submission = false,
    checklist = [],
  }
) {
  if (!title || !String(title).trim()) throw new Error("Item title is required");
  const { code: item_id } = await nextCode("RIT", "roadmap_item");

  const count = await db.roadmap_items.count({ where: { phase_id } });

  const item = await db.roadmap_items.create({
    item_id,
    phase_id,
    title: String(title).trim(),
    question: question ? String(question).trim() : null,
    description: description ? String(description).trim() : null,
    sort_order: count + 1,
    offset_days: parseInt(offset_days, 10) || 0,
    due_offset_days: parseInt(due_offset_days, 10) || 7,
    type,
    resource_url: resource_url ? String(resource_url).trim() : null,
    image_url: image_url ? String(image_url).trim() : null,
    submission_type: submission_type || (requires_submission ? "url" : "none"),
    submission_options: submission_options || null,
    correct_answer: correct_answer ? String(correct_answer).trim() : null,
    checklist: Array.isArray(checklist) ? checklist : [],
    requires_submission: !!requires_submission || submission_type !== "none",
  });

  return item.toJSON();
}

/**
 * Update item details.
 */
export async function updateItem(item_id, updates = {}) {
  const item = await db.roadmap_items.findOne({ where: { item_id } });
  if (!item) throw new Error("Item not found");

  const payload = {};
  if (updates.title !== undefined) payload.title = String(updates.title).trim();
  if (updates.question !== undefined) payload.question = updates.question ? String(updates.question).trim() : null;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.type !== undefined) payload.type = updates.type;
  if (updates.resource_url !== undefined) payload.resource_url = updates.resource_url;
  if (updates.image_url !== undefined) payload.image_url = updates.image_url;
  if (updates.submission_type !== undefined) payload.submission_type = updates.submission_type;
  if (updates.submission_options !== undefined) payload.submission_options = updates.submission_options;
  if (updates.correct_answer !== undefined) payload.correct_answer = updates.correct_answer;
  if (updates.offset_days !== undefined)
    payload.offset_days = parseInt(updates.offset_days, 10);
  if (updates.due_offset_days !== undefined)
    payload.due_offset_days = parseInt(updates.due_offset_days, 10);
  if (updates.requires_submission !== undefined)
    payload.requires_submission = !!updates.requires_submission;
  if (updates.checklist !== undefined) payload.checklist = updates.checklist;
  if (updates.sort_order !== undefined)
    payload.sort_order = parseInt(updates.sort_order, 10);

  await item.update(payload);
  return item.toJSON();
}

/**
 * Delete a topic item.
 */
export async function deleteItem(item_id) {
  const item = await db.roadmap_items.findOne({ where: { item_id } });
  if (!item) throw new Error("Item not found");
  await item.destroy();
  return { success: true, item_id };
}

/**
 * Enroll a user into a roadmap template.
 */
export async function enrollUser({
  roadmap_id,
  user_id,
  start_date = null,
  assigned_by = null,
  mentor_user_id = null,
  custom_duration_overrides = {},
}) {
  if (!roadmap_id || !user_id) throw new Error("Roadmap ID and User ID are required");

  const template = await db.roadmap_templates.findOne({ where: { roadmap_id } });
  if (!template) throw new Error("Roadmap template not found");

  const sDate = start_date ? new Date(start_date) : new Date();
  const eDate = new Date(sDate);
  eDate.setDate(eDate.getDate() + template.total_weeks * 7);

  const existing = await db.roadmap_enrollments.findOne({
    where: { roadmap_id, user_id },
  });

  if (existing) {
    await existing.update({
      start_date: sDate.toISOString().slice(0, 10),
      expected_end_date: eDate.toISOString().slice(0, 10),
      status: "active",
      mentor_user_id: mentor_user_id || existing.mentor_user_id,
      custom_duration_overrides: custom_duration_overrides || existing.custom_duration_overrides,
    });
    return existing.toJSON();
  }

  const { code: enrollment_id } = await nextCode("REN", "roadmap_enrollment");

  const enrollment = await db.roadmap_enrollments.create({
    enrollment_id,
    roadmap_id,
    user_id: String(user_id),
    start_date: sDate.toISOString().slice(0, 10),
    expected_end_date: eDate.toISOString().slice(0, 10),
    assigned_by: assigned_by || null,
    mentor_user_id: mentor_user_id || null,
    status: "active",
    custom_duration_overrides: custom_duration_overrides || {},
  });

  return enrollment.toJSON();
}

/**
 * Alias for enrollUser used by roadmap controller.
 */
export async function enrollStudent(args) {
  return enrollUser(args);
}

/**
 * Get active student enrollment with progress calculation and date resolution.
 */
export async function getUserEnrollment(user_id, roadmap_id = null) {
  const where = { user_id: String(user_id), status: "active" };
  if (roadmap_id) where.roadmap_id = roadmap_id;

  const enrollments = await db.roadmap_enrollments.findAll({
    where: { user_id: String(user_id) },
    order: [["created_at", "DESC"]],
    include: [{ model: db.roadmap_templates, as: "template" }],
  });

  if (enrollments.length === 0) return { enrollments: [], enrollment: null };

  const targetEnrollment = roadmap_id
    ? enrollments.find((e) => e.roadmap_id === roadmap_id) || enrollments[0]
    : enrollments[0];

  const fullTemplate = await getTemplateById(targetEnrollment.roadmap_id);

  const progressList = await db.roadmap_progress.findAll({
    where: { enrollment_id: targetEnrollment.enrollment_id },
  });

  const progressMap = {};
  progressList.forEach((p) => {
    progressMap[p.item_id] = p.toJSON();
  });

  const startDate = new Date(targetEnrollment.start_date);
  let totalItemsCount = 0;
  let completedItemsCount = 0;

  const phasesWithDates = (fullTemplate.phases || []).map((phase) => {
    const phaseItems = (phase.items || []).map((item) => {
      totalItemsCount += 1;
      const p = progressMap[item.item_id];

      const itemStartDate = new Date(startDate);
      itemStartDate.setDate(itemStartDate.getDate() + (item.offset_days || 0));

      const itemDueDate = new Date(itemStartDate);
      itemDueDate.setDate(itemDueDate.getDate() + (item.due_offset_days || 7));

      const isCompleted = p && p.status === "completed";
      if (isCompleted) completedItemsCount += 1;

      let computedStatus = p ? p.status : "not_started";
      if (!isCompleted && new Date() > itemDueDate) {
        computedStatus = "overdue";
      }

      return {
        ...item,
        start_date: itemStartDate.toISOString().slice(0, 10),
        due_date: itemDueDate.toISOString().slice(0, 10),
        computed_status: computedStatus,
        progress: p || null,
      };
    });

    return {
      ...phase,
      items: phaseItems,
    };
  });

  const progressPct = totalItemsCount > 0 ? Math.round((completedItemsCount / totalItemsCount) * 100) : 0;

  return {
    enrollments: enrollments.map((e) => ({
      enrollment_id: e.enrollment_id,
      roadmap_id: e.roadmap_id,
      roadmap_title: e.template?.title || "Learning Track",
      progress_pct: progressPct,
    })),
    enrollment: {
      ...targetEnrollment.toJSON(),
      roadmap_title: fullTemplate.title,
      total_weeks: fullTemplate.total_weeks,
      phases: phasesWithDates,
      completed_items_count: completedItemsCount,
      total_items_count: totalItemsCount,
      progress_pct: progressPct,
    },
  };
}

/**
 * Aliases for getUserEnrollment used by dashboardService and controllers.
 */
export async function getUserActiveEnrollment(user_id, roadmap_id = null) {
  return getUserEnrollment(user_id, roadmap_id);
}

export async function getUserActiveEnrollments(user_id, roadmap_id = null) {
  return getUserEnrollment(user_id, roadmap_id);
}

export async function getUserEnrollments(user_id, roadmap_id = null) {
  return getUserEnrollment(user_id, roadmap_id);
}

/**
 * Upsert student item progress entry.
 */
export async function updateProgress({
  enrollment_id,
  item_id,
  status,
  notes,
  submission_url,
  checklist_progress,
  task_id,
}) {
  if (!enrollment_id || !item_id) {
    throw new Error("Enrollment ID and Item ID are required");
  }

  let progress = await db.roadmap_progress.findOne({
    where: { enrollment_id, item_id },
  });

  const payload = {};
  if (status) payload.status = status;
  if (notes !== undefined) payload.notes = notes;
  if (submission_url !== undefined) payload.submission_url = submission_url;
  if (checklist_progress !== undefined) payload.checklist_progress = checklist_progress;
  if (task_id !== undefined) payload.task_id = task_id;

  if (status === "in_progress" && (!progress || !progress.started_at)) {
    payload.started_at = new Date();
  }
  if (status === "completed") {
    payload.completed_at = new Date();
  }

  if (progress) {
    await progress.update(payload);
  } else {
    progress = await db.roadmap_progress.create({
      enrollment_id,
      item_id,
      status: status || "not_started",
      ...payload,
    });
  }

  return progress.toJSON();
}

/**
 * Alias for updateProgress used by roadmap controller.
 */
export async function updateProgressItem(args) {
  return updateProgress(args);
}
