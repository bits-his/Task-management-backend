import db from "../models/index.js";
import WebSocket from "ws";
import webSocketService from "../services/webSocketService.js";

export default async function initNotificationWs(server) {
  const wss = new WebSocket.Server({ server });
  const clients = {};

  wss.on("connection", (ws) => {
    let userId;
    console.log(`Web Socket Connected`);

    ws.on("message", (message) => {
      const data = JSON.parse(message.toString());
      const { type } = data;
      if (type === "connect") {
        userId = data.userId;
        clients[userId] = ws;
        console.log(`New User connected: ${userId}`);
        ws.send(
          JSON.stringify({
            type: "notification",
            notification: [
              {
                message: "New task assigned to you",
                time: "2 hours ago",
                color: "blue",
              },
            ],
          })
        );
      } else if (data.type === "fetchNotifications") {
        const { userId: uid } = data;
        db.notification_table
          .findAll({
            where: { user_id: uid },
            order: [["created_at", "DESC"]],
            limit: 5,
            raw: true,
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
          .catch((err) => console.log(err));
      } else if (data.type === "sendNotification") {
        const { message: msg, user_id } = data.notification;
        const newNotification = {
          message: msg,
          created_at: new Date(),
          status: "unread",
          user_id,
        };
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
      } else if (data.type === "markAsRead") {
        const { notificationId } = data;
        db.notification_table
          .update({ status: "read" }, { where: { id: notificationId } })
          .then(() => {
            ws.send(
              JSON.stringify({ type: "readNotification", notificationId })
            );
          })
          .catch((err) => console.log(err));
      }
    });

    ws.on("close", () => {
      delete clients[userId];
      console.log("WebSocket connection closed");
    });
  });
}

export const getNotifications = (req, res) => {
  const { type = "", user_id = "", id = "" } = req.query;

  const run = async () => {
    if (type === "fetchNotifications") {
      return db.notification_table.findAll({
        where: { user_id },
        order: [["created_at", "DESC"]],
        limit: 5,
        raw: true,
      });
    }
    if (type === "fetchAllNotifications") {
      return db.notification_table.findAll({
        where: { user_id },
        order: [["created_at", "DESC"]],
        raw: true,
      });
    }
    if (type === "markAsRead") {
      await db.notification_table.update(
        { status: "read" },
        { where: { id } }
      );
      return [{ id, status: "read" }];
    }
    return [];
  };

  run()
    .then((results) => res.json({ success: true, results }))
    .catch((err) => console.log(err));
};

export const CreateNotifications = (notif_type, user_id, title, message) => {
  db.notification_table
    .create({
      notification_type: notif_type,
      user_id: Array.isArray(user_id)
        ? user_id.join(",")
        : String(user_id || ""),
      title,
      message,
      status: "unread",
    })
    .then((result) => {
      webSocketService.sendNotification(result, user_id);
      return result;
    })
    .catch((err) => console.log(err));
};

export const updateNotifications = (req, res) => {
  const { type = "", user_id = "", id = "" } = req.query;

  const run = async () => {
    if (type === "markAsRead") {
      await db.notification_table.update(
        { status: "read" },
        { where: { id } }
      );
      return [{ id, status: "read" }];
    }
    if (type === "fetchAllNotifications" || type === "fetchNotifications") {
      return db.notification_table.findAll({
        where: { user_id },
        order: [["created_at", "DESC"]],
        ...(type === "fetchNotifications" ? { limit: 5 } : {}),
        raw: true,
      });
    }
    return [];
  };

  run()
    .then((results) => res.json({ success: true, results }))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ success: false, err });
    });
};
