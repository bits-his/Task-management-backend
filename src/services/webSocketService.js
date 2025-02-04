const { Server } = require("socket.io");
const db = require("../models"); // Make sure to import your models (or database logic)
const transport = require("../config/nodemailer");

const allowedOrigins = ["http://localhost:5100", "https://task.brainstorm.ng/"];
class WebSocketService {
  constructor() {
    this.clients = {}; // To store user ID and WebSocket connection
    this.io = null;
  }

  init(server) {
    // Initialize the Socket.IO server
    this.io = new Server(server, {
      transports: ["websocket"], // Force WebSocket (no polling fallback)
      cors: {
        origin: (origin, callback) => {
          // Allow connections from specific origins
          if (!origin || allowedOrigins.includes(origin)) {
            console.log("Connection from:", origin);
            callback(null, true);
          } else {
            callback(new Error("Not allowed by CORS"));
          }
        },
        methods: ["GET", "POST"], // Specify allowed methods
        credentials: true, // Allow credentials (cookies, etc.)
      },
    });


    // Handle new WebSocket connections
    this.io.on("connection", (socket) => {
      let userId;
      let startup_id;

      console.log("a user connected");

      // Listen for messages from clients
      socket.on("message", (message) => {
        const data = JSON.parse(message.toString());
        const { userId, type } = data;

        if (!userId) {
          console.error("UserId is not defined");
          return;
        }

        if (type === "connect") {
          startup_id = data.startup_id;
          this.clients[userId] = socket; // Store the socket for this userId
          console.log(`User connected: ${userId}`);
        } else if (type === "fetchNotifications") {
          this.fetchNotifications(userId, socket);
        } else if (type === "sendNotification") {
          this.sendNotification(data.notification, socket);
        } else if (type === "markAsRead") {
          this.markAsRead(data.notificationId, socket);
        }
      });

      // Handle disconnect event
      socket.on("disconnect", () => {
        if (userId) {
          delete this.clients[userId]; // Remove the user when they disconnect
          console.log(`User disconnected: ${userId}`);
        }
      });
    });
  }

  fetchNotifications(userId, socket) {
    db.sequelize
      .query(`call notifications('fetchNotifications', :userId)`, {
        replacements: { userId },
      })
      .then((results) => {
        socket.emit(
          "notifications", // Emit the notifications to the connected user
          {
            success: true,
            notifications: results,
          }
        );
      })
      .catch((err) => {
        console.error("Error fetching notifications", err);
      });
  }

  sendNotification(notification, user_id) {
    // Check if the user is connected
    const userSocket = this.clients[user_id];

    // If the user is connected, send the notification to that specific user
    if (userSocket && userSocket.connected) {
      userSocket.emit("notification", {
        type: "sendNotification",
        notification: notification,
      });
      console.log(`Notification sent to user ${user_id}`);
    } else {
      console.log(`User ${user_id} is not connected`);
    }
  }

  markAsRead(notificationId, socket) {
    db.sequelize
      .query(`call notifications('markAsRead', :notificationId)`, {
        replacements: { notificationId },
      })
      .then(() => {
        socket.emit("notificationRead", notificationId);
      })
      .catch((err) => {
        console.error("Error marking notification as read", err);
      });
  }
}

module.exports = new WebSocketService();
