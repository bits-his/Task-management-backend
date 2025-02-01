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

  sendNotification(notification,ws ) {
    console.log(notification)
  //  ws.send(notification)
//   const subjectFunctions = {
//     // "Pending Releases": newRelease,
//     // "": maintenanceNotice,
//     // "": systemUpdate,
//   };
//   users.forEach(user => {
//     const recipientWs = this.clients[user.username];
//     if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
//       recipientWs.send(
//         JSON.stringify({
//           type: "notification",
//           notification: notification,
//         })
//       );
//     }else if( users.email !== null ){
//        const subjectFunction = subjectFunctions[subject];
//        console.log(subjectFunction)
//       const emailContent = subjectFunction ? subjectFunction(notif_key) : '';
      
//       console.log('email content')
//       // transport.sendMail(
//       //   {
//       //     from: '"KIFMIS" <kifmis-support@brainstorm.ng>',
//       //     to: user.email,
//       //     subject: `[KIFMIS] ${subject}`,
//       //     html: emailContent,
//       //   },
//       //   (error, info) => {
//       //     if (error) {
//       //       console.log("Error sending email:", error);
//       //       return res.status(500).json({
//       //         success: false,
//       //         message: "Email not sent",
//       //         error,
//       //       });
//       //     } else {
//       //       console.log("Email sent:", info.response);
//       //       return res.json({
//       //         success: true,
//       //         message: "Email sent",
//       //         info: info.response,
//       //       });
//       //     }
//       //   }
//       // );
//     }
// })

   
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
