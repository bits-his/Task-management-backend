import {
  addItem,
  addPhase,
  createTemplate,
  enrollStudent,
  getMyActiveEnrollment,
  getTemplateById,
  getTemplates,
  publishTemplate,
  updateItem,
  updatePhase,
  updateProgressItem,
  updateTemplate,
} from "../controllers/roadmap.js";

export default (app) => {
  app.get("/api/roadmaps", getTemplates);
  app.post("/api/roadmaps", createTemplate);
  app.get("/api/roadmaps/enrollments/me", getMyActiveEnrollment);
  app.post("/api/roadmaps/enrollments", enrollStudent);
  app.patch("/api/roadmaps/progress", updateProgressItem);
  app.get("/api/roadmaps/:id", getTemplateById);
  app.patch("/api/roadmaps/:id", updateTemplate);
  app.post("/api/roadmaps/:id/publish", publishTemplate);
  app.post("/api/roadmaps/:id/phases", addPhase);
  app.patch("/api/roadmap-phases/:phaseId", updatePhase);
  app.post("/api/roadmap-phases/:phaseId/items", addItem);
  app.patch("/api/roadmap-items/:itemId", updateItem);
};
