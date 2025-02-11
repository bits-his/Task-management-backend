const { clients, get_clients } = require("../controllers/clients");

module.exports = (app) => {
  app.post("/api/create-client", clients);
  app.get("/api/get_clients", get_clients);
};
