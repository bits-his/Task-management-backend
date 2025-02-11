const { deals, get_deals } = require("../controllers/deals");

module.exports = (app) => {
  app.post("/api/create-deals", deals);
  app.get("/api/get_deals", get_deals);
};
