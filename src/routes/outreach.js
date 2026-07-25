import { outreach, get_outreach } from "../controllers/outreach.js";
export default (app) => {
  app.post("/api/create-outreach", outreach);
  app.get("/api/get_outreach", get_outreach);
};
