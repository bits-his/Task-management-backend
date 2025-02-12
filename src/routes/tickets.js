const { tickets, get_tickets } = require("../controllers/tickets");

module.exports = (app) => {
  app.post("/api/create-tickets", tickets);
  app.get("/api/get-tickets", get_tickets);
};
