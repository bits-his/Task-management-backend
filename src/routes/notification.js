
const { getNotifications, updateNotifications } = require("../controllers/notification");

module.exports = (app) => {
  app.get(
    "/notifications",
    
    getNotifications
  );
    app.post(
      "/notifications",
      updateNotifications
    );

};
