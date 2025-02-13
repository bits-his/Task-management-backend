const { upload } = require("../config/multerConfig");
const { partnerShip, get_partnerShip } = require("../controllers/partnerShip");

module.exports = (app) => {
  app.post("/api/create-new-partnership", upload.array("files", 5), partnerShip);
  app.get("/api/get_partnership", get_partnerShip);
};
