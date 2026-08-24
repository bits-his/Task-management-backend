import Sequelize from "sequelize";
import db from "../models/index.js";
import { nextCode } from "./numberGenerator.js";

const { Op } = Sequelize;

function addDays(d, days) {
  const res = new Date(d);
  res.setDate(res.getDate() + (parseInt(days, 10) || 0));
  return res;
}

function formatDate(d) {
  if (!d) return "";
  const res = new Date(d);
  if (isNaN(res.getTime())) return "";
  return res.toISOString().slice(0, 10);
}

function parseISO(str) {
  if (!str) return new Date();
  return new Date(str);
}

function toDateString(val) {
  if (!val) return null;
  const s = String(val).trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}

/**
 * Fetch template list with phase count and enrollment count.
 */
export async function getTemplates({ org_id = "1", status } = {}) {
  const where = { org_id };
  if (status) where.status = status;

  const templates = await db.roadmap_templates.findAll({
    where,
    order: [["created_at", "DESC"]],
    include: [
      {
        model: db.roadmap_phases,
        as: "phases",
        attributes: ["id", "phase_id", "title", "duration_weeks", "duration_days", "sort_order"],
      },
      {
        model: db.roadmap_enrollments,
        as: "enrollments",
        attributes: ["id", "status"],
      },
    ],
  });

  return templates.map((t) => {
    const raw = t.toJSON();
    raw.phase_count = raw.phases?.length || 0;
    raw.active_enrollments_count = (raw.enrollments || []).filter(
      (e) => e.status === "active"
    ).length;
    return raw;
  });
}

/**
 * Fetch single template detail with nested phases and items.
 */
export async function getTemplateById(roadmap_id) {
  const template = await db.roadmap_templates.findOne({
    where: { roadmap_id },
    include: [
      {
        model: db.roadmap_phases,
        as: "phases",
        include: [
          {
            model: db.roadmap_items,
            as: "items",
          },
        ],
      },
      {
        model: db.roadmap_enrollments,
        as: "enrollments",
        include: [
          {
            model: db.users,
            as: "student",
            attributes: ["user_id", "fullname", "email", "profile"],
          },
        ],
      },
    ],
    order: [
      [{ model: db.roadmap_phases, as: "phases" }, "sort_order", "ASC"],
      [
        { model: db.roadmap_phases, as: "phases" },
        { model: db.roadmap_items, as: "items" },
        "sort_order",
        "ASC",
      ],
    ],
  });

  if (!template) throw new Error("Roadmap template not found");
  return template.toJSON();
}

/**
 * Create a new roadmap template.
 */
export async function createTemplate({
  title,
  description,
  total_weeks = 10,
  created_by,
  org_id = "1",
}) {
  if (!title || !String(title).trim()) throw new Error("Title is required");
  const roadmap_id = await nextCode("RMP");

  const template = await db.roadmap_templates.create({
    roadmap_id,
    org_id,
    title: String(title).trim(),
    description: description ? String(description).trim() : null,
    total_weeks: parseInt(total_weeks, 10) || 10,
    status: "draft",
    created_by,
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
  if (updates.title !== undefined) payload.title = String(updates.title).trim();
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.total_weeks !== undefined)
    payload.total_weeks = parseInt(updates.total_weeks, 10) || 10;
  if (updates.status !== undefined) payload.status = updates.status;

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
  const phase_id = await nextCode("RPH");

  const count = await db.roadmap_phases.count({ where: { roadmap_id } });

  const phase = await db.roadmap_phases.create({
    phase_id,
    roadmap_id,
    title: String(title).trim(),
    sort_order: count + 1,
    duration_weeks: parseInt(duration_weeks, 10) || 2,
    duration_days: parseInt(duration_days, 10) || parseInt(duration_weeks, 10) * 7 || 14,
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
 * Add an item to a phase.
 */
export async function addItem(
  phase_id,
  {
    title,
    description,
    type = "lesson",
    resource_url,
    offset_days = 0,
    due_offset_days = 7,
    requires_submission = false,
    checklist = [],
  }
) {
  if (!title || !String(title).trim()) throw new Error("Item title is required");
  const item_id = await nextCode("RIT");

  const count = await db.roadmap_items.count({ where: { phase_id } });

  const item = await db.roadmap_items.create({
    item_id,
    phase_id,
    title: String(title).trim(),
    description: description ? String(description).trim() : null,
    sort_order: count + 1,
    offset_days: parseInt(offset_days, 10) || 0,
    due_offset_days: parseInt(due_offset_days, 10) || 7,
    type,
    resource_url: resource_url ? String(resource_url).trim() : null,
    checklist: Array.isArray(checklist) ? checklist : [],
    requires_submission: !!requires_submission,
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
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.type !== undefined) payload.type = updates.type;
  if (updates.resource_url !== undefined) payload.resource_url = updates.resource_url;
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
 * Enroll student in a roadmap template.
 */
export async function enrollStudent({
  roadmap_id,
  user_id,
  start_date,
  expected_end_date,
  assigned_by,
  mentor_user_id,
  custom_duration_overrides,
}) {
  if (!roadmap_id || !user_id) throw new Error("Roadmap ID and User ID are required");

  const template = await db.roadmap_templates.findOne({
    where: { roadmap_id },
    include: [
      {
        model: db.roadmap_phases,
        as: "phases",
        include: [{ model: db.roadmap_items, as: "items" }],
      },
    ],
  });
  if (!template) throw new Error("Roadmap template not found");

  const sDate = toDateString(start_date) || formatDate(new Date());

  // Calculate expected end date based on phases & custom overrides
  let totalDays = 0;
  for (const ph of template.phases || []) {
    const override = custom_duration_overrides?.[ph.phase_id];
    totalDays += override ? parseInt(override, 10) : ph.duration_days || 14;
  }
  const eDate =
    toDateString(expected_end_date) ||
    formatDate(addDays(parseISO(sDate), totalDays || 70));

  // Check existing active enrollment
  let enrollment = await db.roadmap_enrollments.findOne({
    where: { user_id, status: "active" },
  });

  if (enrollment) {
    // Re-assign or update active enrollment
    await enrollment.update({
      roadmap_id,
      start_date: sDate,
      expected_end_date: eDate,
      assigned_by,
      mentor_user_id: mentor_user_id || enrollment.mentor_user_id,
      custom_duration_overrides,
    });
  } else {
    const enrollment_id = await nextCode("REN");
    enrollment = await db.roadmap_enrollments.create({
      enrollment_id,
      roadmap_id,
      user_id,
      start_date: sDate,
      expected_end_date: eDate,
      assigned_by,
      mentor_user_id: mentor_user_id || null,
      custom_duration_overrides: custom_duration_overrides || null,
      status: "active",
    });
  }

  // Initialize roadmap_progress rows for all items in template
  for (const ph of template.phases || []) {
    for (const item of ph.items || []) {
      const [progress] = await db.roadmap_progress.findOrCreate({
        where: {
          enrollment_id: enrollment.enrollment_id,
          item_id: item.item_id,
        },
        defaults: {
          status: "not_started",
        },
      });
    }
  }

  return enrollment.toJSON();
}

/**
 * Get active student enrollment with complete calculated timeline and item progress.
 */
export async function getUserActiveEnrollment(user_id) {
  const enrollment = await db.roadmap_enrollments.findOne({
    where: { user_id, status: "active" },
    include: [
      {
        model: db.roadmap_templates,
        as: "template",
        include: [
          {
            model: db.roadmap_phases,
            as: "phases",
            include: [{ model: db.roadmap_items, as: "items" }],
          },
        ],
      },
    ],
    order: [
      [{ model: db.roadmap_templates, as: "template" }, { model: db.roadmap_phases, as: "phases" }, "sort_order", "ASC"],
      [
        { model: db.roadmap_templates, as: "template" },
        { model: db.roadmap_phases, as: "phases" },
        { model: db.roadmap_items, as: "items" },
        "sort_order",
        "ASC",
      ],
    ],
  });

  if (!enrollment) return null;
  const raw = enrollment.toJSON();

  // Fetch all progress records for this enrollment
  const progressList = await db.roadmap_progress.findAll({
    where: { enrollment_id: raw.enrollment_id },
  });
  const progressMap = new Map(progressList.map((p) => [p.item_id, p.toJSON()]));

  const startDate = parseISO(raw.start_date);
  const today = new Date();
  let dayCursor = startDate;
  let totalItemsCount = 0;
  let completedItemsCount = 0;
  let currentActivePhase = null;
  let nextDueItem = null;
  let overdueItemsCount = 0;

  const phasesTimeline = [];

  for (const ph of raw.template?.phases || []) {
    const overrideDays = raw.custom_duration_overrides?.[ph.phase_id];
    const phaseDays = overrideDays ? parseInt(overrideDays, 10) : ph.duration_days || 14;

    const phaseStart = dayCursor;
    const phaseEnd = addDays(phaseStart, phaseDays);
    dayCursor = phaseEnd;

    const isCurrentPhase = today >= phaseStart && today <= phaseEnd;
    if (isCurrentPhase || !currentActivePhase) {
      currentActivePhase = {
        title: ph.title,
        phase_id: ph.phase_id,
        start_date: formatDate(phaseStart),
        end_date: formatDate(phaseEnd),
      };
    }

    const itemsTimeline = [];

    for (const item of ph.items || []) {
      totalItemsCount++;
      const itemStart = addDays(phaseStart, item.offset_days || 0);
      const itemDue = addDays(itemStart, item.due_offset_days || 7);

      const prog = progressMap.get(item.item_id) || {
        status: "not_started",
      };

      let computedStatus = prog.status;
      if (prog.status === "completed") {
        completedItemsCount++;
      } else if (today > itemDue && prog.status !== "submitted") {
        computedStatus = "overdue";
        overdueItemsCount++;
      } else if (today >= itemStart && prog.status === "not_started") {
        computedStatus = "available";
      }

      const itemData = {
        ...item,
        progress: prog,
        computed_status: computedStatus,
        start_date: formatDate(itemStart),
        due_date: formatDate(itemDue),
      };

      if (!nextDueItem && (computedStatus === "available" || computedStatus === "in_progress" || computedStatus === "overdue")) {
        nextDueItem = itemData;
      }

      itemsTimeline.push(itemData);
    }

    phasesTimeline.push({
      ...ph,
      duration_days: phaseDays,
      start_date: formatDate(phaseStart),
      end_date: formatDate(phaseEnd),
      is_current: isCurrentPhase,
      items: itemsTimeline,
    });
  }

  const overallPct = totalItemsCount > 0 ? Math.round((completedItemsCount / totalItemsCount) * 100) : 0;

  return {
    enrollment_id: raw.enrollment_id,
    roadmap_id: raw.roadmap_id,
    roadmap_title: raw.template?.title || "Learning Path",
    start_date: raw.start_date,
    expected_end_date: raw.expected_end_date,
    status: raw.status,
    progress_pct: overallPct,
    completed_items_count: completedItemsCount,
    total_items_count: totalItemsCount,
    overdue_items_count: overdueItemsCount,
    current_phase: currentActivePhase,
    next_item: nextDueItem,
    phases: phasesTimeline,
  };
}

/**
 * Update roadmap item status for a student (start, complete, notes).
 * Auto-creates report item on completion!
 */
export async function updateProgressItem({
  enrollment_id,
  item_id,
  status,
  notes,
  user_id,
}) {
  let progress = await db.roadmap_progress.findOne({
    where: { enrollment_id, item_id },
  });

  if (!progress) {
    progress = await db.roadmap_progress.create({
      enrollment_id,
      item_id,
      status: status || "in_progress",
    });
  }

  const payload = {};
  if (status) payload.status = status;
  if (notes !== undefined) payload.notes = notes;

  if (status === "in_progress" && !progress.started_at) {
    payload.started_at = new Date();
  }
  if (status === "completed" && !progress.completed_at) {
    payload.completed_at = new Date();
  }

  await progress.update(payload);

  // Connection: If completed, log/sync to student's daily report!
  if (status === "completed" && user_id) {
    try {
      const item = await db.roadmap_items.findOne({ where: { item_id } });
      if (item) {
        await syncItemToReport({
          user_id,
          roadmap_item_id: item_id,
          title: `Completed: ${item.title}`,
          body: notes || item.description || "Completed roadmap item.",
        });
      }
    } catch (err) {
      console.warn("syncItemToReport error:", err.message);
    }
  }

  return progress.toJSON();
}

/**
 * Sync completed roadmap item directly into student's weekly/daily report items.
 */
async function syncItemToReport({ user_id, roadmap_item_id, title, body }) {
  const todayStr = formatDate(new Date());

  // Get or create today's weekly_reports entry
  let report = await db.weekly_reports.findOne({
    where: { user_id, report_date: todayStr },
  });

  if (!report) {
    report = await db.weekly_reports.create({
      user_id,
      report_date: todayStr,
      status: "pending",
      work_done: title,
    });
  }

  // Check if report_items row already exists for this roadmap_item_id
  const existingItem = await db.report_items.findOne({
    where: { report_id: report.id, roadmap_item_id },
  });

  if (!existingItem) {
    await db.report_items.create({
      report_id: report.id,
      type: "learning",
      roadmap_item_id,
      title,
      body,
      sort_order: 1,
    });
  }
}
