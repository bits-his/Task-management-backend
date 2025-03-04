const { upload } = require("../config/multerConfig");
const { meetingSchedule, get_meetingSchedule } = require("../controllers/meeting");
const { partnerShip, get_partnerShip } = require("../controllers/partnerShip");

module.exports = (app) => {
  app.post("/api/create-new-partnership", upload.array("files", 5), partnerShip);
  app.get("/api/get_partnership", get_partnerShip);
  app.post("/api/create-new-meeting", upload.array("files", 5), meetingSchedule);
  app.get("/api/get_meetingSchedule", get_meetingSchedule);
};
