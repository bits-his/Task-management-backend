const db = require("../models");
const WebSocket = require("ws");



module.exports = async function (server) {
  const wss = new WebSocket.Server({ server });
  const clients = {};

  wss.on("connection", (ws) => {
    let userId;
    console.log(`Web Socket Connected`);

    // Fetch all notifications for a user when they connect
    ws.on("message", (message) => {
      const data = JSON.parse(message.toString());
      const { type } = JSON.parse(message.toString());
      if (type === "connect") {
        userId = data.userId; // Store the user ID when they connect
        clients[userId] = ws;
        console.log(`New User connected: ${userId}`);
        console.log(Object.keys(clients).length);
        console.log("aiialpha ")
         ws.send(
           JSON.stringify({
             type: "notification",
             notification: [
               {
                 message: "New task assigned to you",
                 time: "2 hours ago",
                 color: "blue",
               },
               {
                 message: "Your last task was approved",
                 time: "5 hours ago",
                 color: "green",
               },
               {
                 message: "Weekly report due tomorrow",
                 time: "1 day ago",
                 color: "yellow",
               },
             ],
           })
         );
      } else if (data.type === "fetchNotifications") {
        const { userId } = data;
        db.sequelize
          .query(`call notifications(:type)`, {
            replacements: { type },
          })
          .then((results) => {
            console.log(results)
 
            //bring back later
            ws.send(
              JSON.stringify({
                success: true,
                type: "allNotifications",
                notifications: results,
              })
            );
          })
          .catch((err) => {
            console.log(err);
            //res.status(500).json({ success: false, err });
          });
      } else if (data.type === "sendNotification") {
        const { message, user_id } = data.notification;
        const newNotification = {
          message,
          created_at: new Date(),
          status: "unread",
          user_id,
        };

        // Store notification in database
        db.sequelize
          .query(`call notifications(:type)`, { replacements: { type } })
          .then((results) => {
            //sending notification to a specific user
            // const recipientWs = clients.get(user_id);
            // if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
            //   recipientWs.send(
            //     JSON.stringify({
            //       type: "notification",
            //       notification: newNotification,
            //     })
            //   );
            // }
            //Sending Notification to all users
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(
                  JSON.stringify({
                    type: "notification",
                    notification: newNotification,
                  })
                );
              }
            });
          })
          .catch((err) => {
            console.log(err);
            //res.status(500).json({ success: false, err });
          });
      } else if (data.type === "markAsRead") {
        const { notificationId, type } = data;

        db.sequelize
          .query(`call notifications(:type)`, { replacements: { type } })
          .then((results) => {
            ws.send(
              JSON.stringify({ type: "readNotification", notificationId })
            );
          })
          .catch((err) => {
            console.log(err);
            //res.status(500).json({ success: false, err });
          });
      }
    });
console.log("WebSocket server started");


console.log("WebSocket server starte 1d");
    ws.on("close", () => {
      delete clients[userId];
      console.log("WebSocket connection closed");
    });
  });
};

module.exports.getNotifications = (req, res) => {

    const { type = "", user_id = "" } = req.query;

console.log(user_id)
    db.sequelize
      .query(`call notifications(:type, :user_id)`, {
        replacements: { type, user_id },
      })
      .then((results) => {
        res.json({ success: true, results });
      })
      .catch((err) => {
        console.log(err);
        //res.status(500).json({ success: false, err });
      });
};
