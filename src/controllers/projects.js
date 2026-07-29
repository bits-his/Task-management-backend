import {
  addProjectMember,
  canCreateProjects,
  canManageOrgProjects,
  createProject,
  deleteProject,
  getProjectById,
  getProjectReport,
  listProjectMembers,
  listProjects,
  removeProjectMember,
  updateProject,
  updateProjectMemberRole,
  userCanAccessProject,
} from "../services/projectService.js";
import { CreateNotifications } from "./notification.js";

export async function getProjects(req, res) {
  try {
    const {
      org_id = "",
      user_id = "",
      role = "",
      status = "active",
    } = req.query;

    if (!org_id) {
      return res.status(400).json({
        success: false,
        message: "org_id is required",
      });
    }

    const data = await listProjects({
      org_id,
      startup_id: null,
      user_id,
      role,
      status,
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error("getProjects error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to list projects",
    });
  }
}

export async function postProject(req, res) {
  try {
    const {
      org_id,
      name,
      description = null,
      created_by,
      role = "",
    } = req.body;

    if (!canCreateProjects(role)) {
      return res.status(403).json({
        success: false,
        message:
          "Not allowed to create projects. SIWES, interns, members, and accountants cannot create projects.",
      });
    }

    const data = await createProject({
      org_id,
      name,
      description,
      created_by,
      startup_id: null,
    });

    return res.status(201).json({ success: true, data });
  } catch (error) {
    console.error("postProject error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create project",
    });
  }
}

export async function getProject(req, res) {
  try {
    const { id } = req.params;
    const { user_id = "", role = "" } = req.query;
    const project = await getProjectById(id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    const ok = await userCanAccessProject(id, user_id, role);
    if (!ok) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    return res.json({ success: true, data: project });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load project",
    });
  }
}

export async function patchProject(req, res) {
  try {
    const { id } = req.params;
    const { role = "", ...updates } = req.body;
    if (!canManageOrgProjects(role) && !canCreateProjects(role)) {
      return res.status(403).json({
        success: false,
        message: "Not allowed to update projects",
      });
    }
    const data = await updateProject(id, updates);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update project",
    });
  }
}

export async function removeProject(req, res) {
  try {
    const { id } = req.params;
    const { role = "" } = req.query;
    if (!canCreateProjects(role) && !canManageOrgProjects(role)) {
      return res.status(403).json({
        success: false,
        message: "Not allowed to delete projects",
      });
    }
    if (String(req.query.hard || "") === "1") {
      if (!canManageOrgProjects(role)) {
        return res.status(403).json({
          success: false,
          message: "Only org admins/managers can permanently delete",
        });
      }
      const removed = await deleteProject(id);
      return res.json({ success: true, removed });
    }
    const data = await updateProject(id, { status: "archived" });
    return res.json({ success: true, data, archived: true });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to delete project",
    });
  }
}

export async function getMembers(req, res) {
  try {
    const { id } = req.params;
    const { user_id = "", role = "" } = req.query;
    const ok = await userCanAccessProject(id, user_id, role);
    if (!ok) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const data = await listProjectMembers(id);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to list members",
    });
  }
}

export async function postMember(req, res) {
  try {
    const { id } = req.params;
    const {
      user_id: memberUserId,
      role: memberRole = "contributor",
      actor_role = "",
      actor_user_id = "",
    } = req.body;

    if (
      !canManageOrgProjects(actor_role) &&
      !(await userCanAccessProject(id, actor_user_id, actor_role))
    ) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    if (!canManageOrgProjects(actor_role)) {
      const members = await listProjectMembers(id);
      const me = members.find((m) => m.user_id === String(actor_user_id));
      if (!me || me.role !== "lead") {
        return res.status(403).json({
          success: false,
          message: "Only leads or admins can add members",
        });
      }
    }

    if (!memberUserId) {
      return res.status(400).json({
        success: false,
        message: "user_id is required",
      });
    }

    const data = await addProjectMember(id, memberUserId, memberRole);
    CreateNotifications(
      "Project",
      memberUserId,
      "Added to project",
      `You were added to a project as ${memberRole === "lead" ? "lead" : "member"}.`,
      { action_url: `/app/projects/${id}` }
    );
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to add member",
    });
  }
}

export async function patchMember(req, res) {
  try {
    const { id, userId } = req.params;
    const {
      role: memberRole = "contributor",
      actor_role = "",
      actor_user_id = "",
    } = req.body;

    if (!canManageOrgProjects(actor_role)) {
      const members = await listProjectMembers(id);
      const me = members.find((m) => m.user_id === String(actor_user_id));
      if (!me || me.role !== "lead") {
        return res.status(403).json({
          success: false,
          message: "Only leads or admins can change roles",
        });
      }
    }

    const data = await updateProjectMemberRole(id, userId, memberRole);
    CreateNotifications(
      "Project",
      userId,
      "Project role updated",
      `Your project role is now ${memberRole === "lead" ? "lead" : "member"}.`,
      { action_url: `/app/projects/${id}?tab=members` }
    );
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update member role",
    });
  }
}

export async function deleteMember(req, res) {
  try {
    const { id, userId } = req.params;
    const { actor_role = "", actor_user_id = "" } = req.query;

    if (!canManageOrgProjects(actor_role)) {
      const members = await listProjectMembers(id);
      const me = members.find((m) => m.user_id === String(actor_user_id));
      if (!me || me.role !== "lead") {
        return res.status(403).json({
          success: false,
          message: "Only leads or admins can remove members",
        });
      }
    }

    const removed = await removeProjectMember(id, userId);
    return res.json({ success: true, removed });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to remove member",
    });
  }
}

export async function getReport(req, res) {
  try {
    const { id } = req.params;
    const { user_id = "", role = "" } = req.query;
    const ok = await userCanAccessProject(id, user_id, role);
    if (!ok) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const data = await getProjectReport(id);
    return res.json({ success: true, data });
  } catch (error) {
    console.error("getReport error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load project report",
    });
  }
}
