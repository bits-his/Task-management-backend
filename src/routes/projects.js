import {
  deleteMember,
  getMembers,
  getProject,
  getProjects,
  getTaskStats,
  patchMember,
  patchProject,
  postMember,
  postProject,
  removeProject,
} from "../controllers/projects.js";

export default (app) => {
  app.get("/api/projects", getProjects);
  app.post("/api/projects", postProject);
  app.get("/api/projects/:id/task-stats", getTaskStats);
  app.get("/api/projects/:id/members", getMembers);
  app.post("/api/projects/:id/members", postMember);
  app.patch("/api/projects/:id/members/:userId", patchMember);
  app.delete("/api/projects/:id/members/:userId", deleteMember);
  app.get("/api/projects/:id", getProject);
  app.patch("/api/projects/:id", patchProject);
  app.delete("/api/projects/:id", removeProject);
};
