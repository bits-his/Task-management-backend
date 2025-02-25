const { subscribeUser, sendNotificationToAll } = require("../controllers/pushController");

module.exports = (app) => {
app.post("/api/subscribe", subscribeUser);
app.post("/api/send-notification", sendNotificationToAll);
};
