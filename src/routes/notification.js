
const { getNotifications } = require("../controllers/Notification");

module.exports = (app) => {
  app.get(
    "/notifications",
    
    getNotifications
  );

};
