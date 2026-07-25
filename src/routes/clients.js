import { clients, get_clients } from "../controllers/clients.js";
export default (app) => {
  app.post("/api/create-client", clients);
  app.get("/api/get_clients", get_clients);
};
