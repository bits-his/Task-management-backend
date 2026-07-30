import {
  addMaintenance,
  assignAsset,
  canManageAssets,
  createAsset,
  getAssetById,
  getAssetsDashboard,
  listAssignments,
  listAssets,
  listMaintenance,
  returnAsset,
  updateAsset,
} from "../services/assetService.js";
import { CreateNotifications } from "./notification.js";

export async function getAssets(req, res) {
  try {
    const {
      org_id = "",
      status = "all",
      category = "",
      q = "",
      startup_id = "",
    } = req.query;
    if (!org_id) {
      return res.status(400).json({
        success: false,
        message: "org_id is required",
      });
    }
    const data = await listAssets({
      org_id,
      status,
      category: category || null,
      q,
      startup_id: startup_id || null,
    });
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to list assets",
    });
  }
}

export async function getDashboard(req, res) {
  try {
    const { org_id = "" } = req.query;
    if (!org_id) {
      return res.status(400).json({
        success: false,
        message: "org_id is required",
      });
    }
    const data = await getAssetsDashboard({ org_id });
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load dashboard",
    });
  }
}

export async function getAsset(req, res) {
  try {
    const { id } = req.params;
    const data = await getAssetById(id);
    if (!data) {
      return res.status(404).json({ success: false, message: "Asset not found" });
    }
    const [assignments, maintenance] = await Promise.all([
      listAssignments(id),
      listMaintenance(id),
    ]);
    return res.json({
      success: true,
      data: { ...data, assignments, maintenance },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load asset",
    });
  }
}

export async function postAsset(req, res) {
  try {
    const role = req.body.role || req.query.role || "";
    if (!canManageAssets(role)) {
      return res.status(403).json({
        success: false,
        message: "Not allowed to create assets",
      });
    }

    let image = req.body.image || null;
    if (req.file?.path) image = req.file.path;
    if (req.files?.[0]?.path) image = req.files[0].path;

    const data = await createAsset({
      ...req.body,
      image,
    });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create asset",
    });
  }
}

export async function patchAsset(req, res) {
  try {
    const { id } = req.params;
    const role = req.body.role || req.query.role || "";
    if (!canManageAssets(role)) {
      return res.status(403).json({
        success: false,
        message: "Not allowed to update assets",
      });
    }

    let image;
    if (req.file?.path) image = req.file.path;
    if (req.files?.[0]?.path) image = req.files[0].path;

    const updates = { ...req.body };
    if (image) updates.image = image;

    const data = await updateAsset(id, updates);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update asset",
    });
  }
}

export async function postAssign(req, res) {
  try {
    const { id } = req.params;
    const {
      user_id,
      assigned_by,
      dept_id = null,
      startup_id = null,
      expected_return = null,
      condition_out = "good",
      notes = null,
      role = "",
    } = req.body;

    if (!canManageAssets(role)) {
      return res.status(403).json({
        success: false,
        message: "Not allowed to assign assets",
      });
    }

    const data = await assignAsset({
      asset_id: id,
      user_id,
      assigned_by,
      dept_id,
      startup_id,
      expected_return,
      condition_out,
      notes,
    });

    const asset = await getAssetById(id);
    CreateNotifications(
      "Asset",
      user_id,
      "Asset assigned",
      `${asset?.name || "An asset"} (${id}) was assigned to you.`,
      { action_url: `/app/assets/${id}` }
    );

    return res.json({ success: true, data, asset });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to assign asset",
    });
  }
}

export async function postReturn(req, res) {
  try {
    const { id } = req.params;
    const {
      returned_by,
      condition_in = "good",
      return_notes = null,
      next_status = null,
      role = "",
    } = req.body;

    if (!canManageAssets(role)) {
      return res.status(403).json({
        success: false,
        message: "Not allowed to return assets",
      });
    }

    const previous = await getAssetById(id);
    const assigneeId = previous?.current_assignee_user_id;

    const data = await returnAsset({
      asset_id: id,
      returned_by,
      condition_in,
      return_notes,
      next_status,
    });

    if (assigneeId) {
      CreateNotifications(
        "Asset",
        assigneeId,
        "Asset returned",
        `${previous?.name || "An asset"} (${id}) was marked returned.`,
        { action_url: `/app/assets/${id}` }
      );
    }

    const asset = await getAssetById(id);
    return res.json({ success: true, data, asset });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to return asset",
    });
  }
}

export async function postMaintenance(req, res) {
  try {
    const { id } = req.params;
    const role = req.body.role || "";
    if (!canManageAssets(role)) {
      return res.status(403).json({
        success: false,
        message: "Not allowed to log maintenance",
      });
    }
    const data = await addMaintenance({
      asset_id: id,
      ...req.body,
    });
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to add maintenance",
    });
  }
}
