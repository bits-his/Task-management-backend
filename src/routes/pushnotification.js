import { subscribeUser, sendNotificationToAll } from "../controllers/pushController.js";
export default (app) => {
app.post("/api/subscribe", subscribeUser);
app.post("/api/send-notification", sendNotificationToAll);
};
