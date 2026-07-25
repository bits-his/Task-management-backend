import { upload } from "../config/multerConfig.js";
import { meetingSchedule, get_meetingSchedule } from "../controllers/meeting.js";
import { partnerShip, get_partnerShip } from "../controllers/partnerShip.js";
export default (app) => {
  app.post("/api/create-new-partnership", upload.array("files", 5), partnerShip);
  app.get("/api/get_partnership", get_partnerShip);
  app.post("/api/create-new-meeting", upload.array("files", 5), meetingSchedule);
  app.get("/api/get_meetingSchedule", get_meetingSchedule);
};
