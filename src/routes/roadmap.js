import {
  addItem,
  addPhase,
  createTemplate,
  deleteItem,
  deletePhase,
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

import { upload } from "../config/multerConfig.js";

export default (app) => {
  app.post("/api/roadmaps/upload-image", upload.single("image"), (req, res) => {
    try {
      if (!req.file || !req.file.path) {
        return res.status(400).json({ success: false, message: "No image file uploaded" });
      }
      return res.json({ success: true, url: req.file.path });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

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
  app.delete("/api/roadmap-phases/:phaseId", deletePhase);
  app.post("/api/roadmap-phases/:phaseId/items", addItem);
  app.patch("/api/roadmap-items/:itemId", updateItem);
  app.delete("/api/roadmap-items/:itemId", deleteItem);
};
