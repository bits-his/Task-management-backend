import db from "../models/index.js";
import webSocketService from "../services/webSocketService.js";

let schemaReady = false;

async function ensureNotificationSchema() {
  if (schemaReady) return;
  try {
    const qi = db.sequelize.getQueryInterface();
    await qi.addColumn("notification_table", "action_url", {
      type: db.Sequelize.STRING(500),
      allowNull: true,
    });
  } catch {
    /* exists */
  }
  schemaReady = true;
}

/**
 * Create one notification per user with optional deep link.
 * @param {string} notif_type
 * @param {string|string[]} user_id - single id, csv, or array
 * @param {string} title
 * @param {string} message
 * @param {{ action_url?: string }} [opts]
 */
export const CreateNotifications = (
  notif_type,
  user_id,
  title,
  message,
  opts = {}
) => {
  const action_url = opts.action_url || null;
  const ids = Array.isArray(user_id)
    ? user_id
    : String(user_id || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

  if (!ids.length) return;

  ensureNotificationSchema()
    .then(() =>
      Promise.all(
        ids.map(async (uid) => {
          const result = await db.notification_table.create({
            notification_type: notif_type,
            user_id: String(uid).slice(0, 10),
            title,
            message,
            action_url,
            status: "unread",
          });
          webSocketService.sendNotification(result, uid);
          return result;
        })
      )
    )
    .catch((err) => console.log(err));
};

export const getNotifications = (req, res) => {
  const { type = "", user_id = "", id = "" } = req.query;

  const run = async () => {
    await ensureNotificationSchema();
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

export const updateNotifications = (req, res) => {
  const { type = "", user_id = "", id = "" } = req.query;

  const run = async () => {
    await ensureNotificationSchema();
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

export default async function initNotificationWs() {
  /* legacy WS bootstrap unused — kept for import compatibility */
}
