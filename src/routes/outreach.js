const { outreach, get_outreach } = require("../controllers/outreach");

module.exports = (app) => {
  app.post("/api/create-outreach", outreach);
  app.get("/api/get_outreach", get_outreach);
};
