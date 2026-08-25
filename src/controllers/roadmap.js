import jwt from "jsonwebtoken";
import * as roadmapService from "../services/roadmapService.js";

function extractUserId(req) {
  if (req.user?.user_id) return req.user.user_id;
  if (req.query?.user_id) return req.query.user_id;
  if (req.body?.user_id) return req.body.user_id;

  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (authHeader) {
    try {
      let token = String(authHeader).trim();
      while (token.startsWith("Bearer ")) {
        token = token.slice(7).trim();
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
      return decoded?.user_id || decoded?.id || null;
    } catch {
      return null;
    }
  }
  return null;
}

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
    const template = await roadmapService.createTemplate(req.body);
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

export async function deletePhase(req, res) {
  try {
    const { phaseId } = req.params;
    const result = await roadmapService.deletePhase(phaseId);
    return res.json({ success: true, ...result });
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

export async function deleteItem(req, res) {
  try {
    const { itemId } = req.params;
    const result = await roadmapService.deleteItem(itemId);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function enrollStudent(req, res) {
  try {
    const { roadmap_id, user_id, start_date, expected_end_date, mentor_user_id, custom_duration_overrides } = req.body;
    const assigned_by = extractUserId(req);

    const enrollment = await roadmapService.enrollStudent({
      roadmap_id,
      user_id,
      start_date: start_date || null,
      expected_end_date: expected_end_date || null,
      assigned_by,
      mentor_user_id: mentor_user_id || null,
      custom_duration_overrides: custom_duration_overrides || null,
    });
    return res.status(201).json({ success: true, enrollment });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function getMyActiveEnrollment(req, res) {
  try {
    const user_id = extractUserId(req);
    if (!user_id) throw new Error("User authentication required");

    const { roadmap_id } = req.query;
    const { enrollments, enrollment } = await roadmapService.getUserActiveEnrollments(
      user_id,
      roadmap_id || null
    );
    return res.json({ success: true, enrollments, enrollment });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function updateProgressItem(req, res) {
  try {
    const { enrollment_id, item_id, status, notes, submission_url, checklist_progress } = req.body;
    const user_id = extractUserId(req);

    const progress = await roadmapService.updateProgressItem({
      enrollment_id,
      item_id,
      status,
      notes,
      submission_url,
      checklist_progress,
      user_id,
    });
    return res.json({ success: true, progress });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}
