import { deals, get_deals } from "../controllers/deals.js";
export default (app) => {
  app.post("/api/create-deals", deals);
  app.get("/api/get_deals", get_deals);
};
