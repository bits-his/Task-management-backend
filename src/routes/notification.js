
import { getNotifications, updateNotifications } from "../controllers/notification.js";
export default (app) => {
  app.get(
    "/notifications",
    
    getNotifications
  );
    app.post(
      "/notifications",
      updateNotifications
    );

};
