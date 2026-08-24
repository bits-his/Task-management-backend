import db from "../models/index.js";
import webSocketService from "../services/webSocketService.js";
import { sendPushToUsers } from "./pushController.js";

let schemaReady = false;
let backfillDone = false;

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

/** Fill missing action_url on legacy rows with best-effort defaults. */
async function backfillActionUrls() {
  if (backfillDone) return;
  try {
    await db.sequelize.query(`
      UPDATE notification_table
      SET action_url = CASE
        WHEN LOWER(CONCAT(IFNULL(notification_type,''), ' ', IFNULL(title,''))) LIKE '%excuse%'
          THEN '/app/excuses'
        WHEN LOWER(CONCAT(IFNULL(notification_type,''), ' ', IFNULL(title,''))) LIKE '%project%'
          THEN '/app/projects'
        ELSE '/app/tasks'
      END
      WHERE action_url IS NULL OR TRIM(action_url) = ''
    `);
  } catch (err) {
    console.log("notification action_url backfill:", err?.message || err);
  }
  backfillDone = true;
}

/**
 * Create one notification per user with optional deep link.
 * Also emits WS + web-push when subscriptions exist.
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
    .then(() =>
      sendPushToUsers(ids, {
        title,
        body: message,
        url: action_url,
      })
    )
    .catch((err) => console.log(err));
};

export const getNotifications = (req, res) => {
  const { type = "", user_id = "", id = "" } = req.query;

  const run = async () => {
    await ensureNotificationSchema();
    await backfillActionUrls();
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
    await backfillActionUrls();
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
  /* legacy WS bootstrap unused kept for import compatibility */
}
