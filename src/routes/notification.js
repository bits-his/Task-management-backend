
const { getNotifications } = require("../controllers/notification");

module.exports = (app) => {
  app.get(
    "/notifications",
    
    getNotifications
  );

};
