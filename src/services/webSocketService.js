const WebSocket = require("ws");
const db = require("../models"); 
const transport = require("../config/nodemailer");
// const { newRelease } = require("./templates/new-release");

class WebSocketService {
  constructor() {
    this.clients = {}; // To store user ID and WebSocket connection
    this.wss = null;
  }

  init(server) {
    this.wss = new WebSocket.Server({ server });

    this.wss.on("connection", (ws) => {
      let userId;
      let startup_id
      //console.log("New WebSocket connection");

      ws.on("message", (message) => {
        const data = JSON.parse(message.toString());
        const { userId, type } = data;
        console.log(data)

 if (!userId) {
   console.error("UserId is not defined");
   return;
 }
        if (type === "connect") {
          startup_id = data.startup_id;
          //userId = data.userId; // Store the user ID when they connect
          this.clients[userId] = ws; // Map the user ID to the WebSocket connection
          console.log(`User connected: ${userId} to the Socket`);
          console.log(`${Object.keys(this.clients).length} connected `)
          console.log(`${Object.keys(this.clients)} ` )
        } else if (type === "fetchNotifications") {
          //userId = data.userId;
          this.fetchNotifications(userId, ws);
        } else if (type === "sendNotification") {

          this.sendNotification(data.notification,ws);
        } else if (type === "markAsRead") {
          this.markAsRead(data.notificationId, ws);
        }
      });

      ws.on("close", () => {
        if (userId) {
          delete this.clients[userId]; // Remove the user from the map when they disconnect
          console.log(`WebSocket connection closed for user ${userId}`);
        }
      });
    });
  }

  fetchNotifications(userId, ws) {
     if (!userId) {
       console.error("UserId is not defined");
       return;
     }
    //  let username= userId
    db.sequelize
      .query(`call notifications('fetchNotifications', :userId)`, {
        replacements: { userId },
      })
      .then((results) => {
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
      });
  }
  
sendNotification(notification, userId) {
    const recipientWs = this.clients[userId];
    
    if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
        recipientWs.send(
            JSON.stringify({
                type: "notification",
                notification: notification,  // The notification data
            })
        );
    } else {
        console.log(`No WebSocket connection for user ${userId}`);
    }
}


  markAsRead(notificationId, ws) {
    db.sequelize
      .query(`call notifications('markAsRead')`, {
        replacements: { notificationId },
      })
      .then(() => {
        ws.send(JSON.stringify({ type: "readNotification", notificationId }));
      })
      .catch((err) => {
        console.log(err);
      });
  }
}

module.exports = new WebSocketService();
