import * as roadmapService from "../services/roadmapService.js";

export async function getTemplates(req, res) {
  try {
    const { status } = req.query;
    const org_id = req.user?.org_id || "1";
    const templates = await roadmapService.getTemplates({ org_id, status });
    return res.json({ success: true, templates });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function getTemplateById(req, res) {
  try {
    const { id } = req.params;
    const template = await roadmapService.getTemplateById(id);
    return res.json({ success: true, template });
  } catch (err) {
    return res.status(404).json({ success: false, message: err.message });
  }
}

export async function createTemplate(req, res) {
  try {
    const { title, description, total_weeks } = req.body;
    const created_by = req.user?.user_id;
    const org_id = req.user?.org_id || "1";

    const template = await roadmapService.createTemplate({
      title,
      description,
      total_weeks,
      created_by,
      org_id,
    });
    return res.status(201).json({ success: true, template });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function updateTemplate(req, res) {
  try {
    const { id } = req.params;
    const template = await roadmapService.updateTemplate(id, req.body);
    return res.json({ success: true, template });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function publishTemplate(req, res) {
  try {
    const { id } = req.params;
    const template = await roadmapService.publishTemplate(id);
    return res.json({ success: true, template });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function addPhase(req, res) {
  try {
    const { id } = req.params;
    const phase = await roadmapService.addPhase(id, req.body);
    return res.status(201).json({ success: true, phase });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function updatePhase(req, res) {
  try {
    const { phaseId } = req.params;
    const phase = await roadmapService.updatePhase(phaseId, req.body);
    return res.json({ success: true, phase });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function addItem(req, res) {
  try {
    const { phaseId } = req.params;
    const item = await roadmapService.addItem(phaseId, req.body);
    return res.status(201).json({ success: true, item });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function updateItem(req, res) {
  try {
    const { itemId } = req.params;
    const item = await roadmapService.updateItem(itemId, req.body);
    return res.json({ success: true, item });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function enrollStudent(req, res) {
  try {
    const { roadmap_id, user_id, start_date, expected_end_date, mentor_user_id, custom_duration_overrides } = req.body;
    const assigned_by = req.user?.user_id;

    const enrollment = await roadmapService.enrollStudent({
      roadmap_id,
      user_id,
      start_date,
      expected_end_date,
      assigned_by,
      mentor_user_id,
      custom_duration_overrides,
    });
    return res.status(201).json({ success: true, enrollment });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function getMyActiveEnrollment(req, res) {
  try {
    const user_id = req.user?.user_id;
    if (!user_id) throw new Error("User authentication required");

    const enrollment = await roadmapService.getUserActiveEnrollment(user_id);
    return res.json({ success: true, enrollment });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function updateProgressItem(req, res) {
  try {
    const { enrollment_id, item_id, status, notes } = req.body;
    const user_id = req.user?.user_id;

    const progress = await roadmapService.updateProgressItem({
      enrollment_id,
      item_id,
      status,
      notes,
      user_id,
    });
    return res.json({ success: true, progress });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}
