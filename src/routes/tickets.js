const { tickets, get_tickets, update_tickets } = require("../controllers/tickets");

module.exports = (app) => {
  app.post("/api/create-tickets", tickets);
  app.post("/api/update-ticket", update_tickets);
  app.get("/api/get-tickets", get_tickets);
};
