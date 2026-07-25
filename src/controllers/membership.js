import db from "../models/index.js";
import {
  buildAuthContext,
  deleteMembership,
  ensureUserMemberships,
  enrichUserWithPrimaryContext,
  listMembershipsForUser,
  upsertMembership,
} from "../services/membershipService.js";

export const getMyMemberships = async (req, res) => {
  try {
    const authUser = Array.isArray(req.user) ? req.user[0] : req.user;
    const user_id = authUser?.user_id || authUser?.dataValues?.user_id;
    if (!user_id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const memberships = await ensureUserMemberships(user_id);
    return res.json({ success: true, data: memberships });
  } catch (error) {
    console.error("getMyMemberships:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getUserMemberships = async (req, res) => {
  try {
    const { userId } = req.params;
    const memberships = await ensureUserMemberships(userId);
    return res.json({ success: true, data: memberships });
  } catch (error) {
    console.error("getUserMemberships:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const saveMembership = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await db.users.findOne({ where: { user_id: userId }, raw: true });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const membership = await upsertMembership({
      ...req.body,
      user_id: userId,
      org_id: req.body.org_id || user.org_id || "1",
    });

    const memberships = await listMembershipsForUser(userId);
    return res.json({ success: true, data: membership, memberships });
  } catch (error) {
    console.error("saveMembership:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const removeMembership = async (req, res) => {
  try {
    const { userId, membershipId } = req.params;
    const removed = await deleteMembership(Number(membershipId), userId);
    if (!removed) {
      return res.status(404).json({ success: false, message: "Membership not found" });
    }
    const memberships = await listMembershipsForUser(userId);
    return res.json({ success: true, memberships });
  } catch (error) {
    console.error("removeMembership:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAuthContext = async (req, res) => {
  try {
    const authUser = Array.isArray(req.user) ? req.user[0] : req.user;
    const user_id = authUser?.user_id || authUser?.dataValues?.user_id;
    if (!user_id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const user = await db.users.findOne({ where: { user_id }, raw: true });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const context = await buildAuthContext(user);
    const enriched = await enrichUserWithPrimaryContext(user);
    return res.json({
      success: true,
      user: enriched,
      ...context,
    });
  } catch (error) {
    console.error("getAuthContext:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
