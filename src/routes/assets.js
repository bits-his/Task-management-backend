import { upload } from "../config/multerConfig.js";
import {
  getAsset,
  getAssets,
  getDashboard,
  patchAsset,
  postAsset,
  postAssign,
  postMaintenance,
  postReturn,
} from "../controllers/assets.js";

export default (app) => {
  app.get("/api/assets/dashboard", getDashboard);
  app.get("/api/assets", getAssets);
  app.post("/api/assets", upload.single("image"), postAsset);
  app.get("/api/assets/:id", getAsset);
  app.patch("/api/assets/:id", upload.single("image"), patchAsset);
  app.post("/api/assets/:id/assign", postAssign);
  app.post("/api/assets/:id/return", postReturn);
  app.post("/api/assets/:id/maintenance", postMaintenance);
};
