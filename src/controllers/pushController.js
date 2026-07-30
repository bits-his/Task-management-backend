import webpush from "web-push";
import Sequelize from "sequelize";
import db from "../models/index.js";

const { Op } = Sequelize;

const saveSubscription = async (subscription, userId) => {
  const { endpoint, keys } = subscription;
  const uid = String(userId || "1").slice(0, 20);
  const existing = await db.subscriptions.findOne({
    where: { endpoint },
  });
  if (existing) {
    await existing.update({
      data_keys: JSON.stringify(keys),
      user_id: uid,
    });
    return existing;
  }
  return db.subscriptions.create({
    endpoint,
    data_keys: JSON.stringify(keys),
    user_id: uid,
  });
};

const subscribeUser = (req, res) => {
  const subscription = req.body;
  const userId =
    req.body?.user_id ||
    req.query?.user_id ||
    subscription?.user_id ||
    "1";

  saveSubscription(subscription, userId)
    .then(() =>
      res
        .status(201)
        .json({ success: true, message: "Subscription saved successfully" })
    )
    .catch((err) => {
      console.log(err);
      return res.status(500).json({ error: "Error saving subscription" });
    });
};

/**
 * Send web-push to subscribed devices for one or more users.
 * Payload includes title, body, and url for deep-link open.
 */
export async function sendPushToUsers(
  userIds,
  { title, body, url = null } = {}
) {
  const ids = (Array.isArray(userIds) ? userIds : [userIds])
    .map((id) => String(id || "").trim())
    .filter(Boolean);
  if (!ids.length || !title) return;

  try {
    const results = await db.subscriptions.findAll({
      where: { user_id: { [Op.in]: ids } },
      raw: true,
    });
    if (!results.length) return;

    const payload = JSON.stringify({
      title,
      body: body || "",
      message: body || "",
      url: url || null,
      action_url: url || null,
    });

    await Promise.allSettled(
      results.map((subscription) => {
        let keys;
        try {
          keys = JSON.parse(subscription.data_keys);
        } catch {
          return Promise.resolve();
        }
        return webpush
          .sendNotification(
            { endpoint: subscription.endpoint, keys },
            payload
          )
          .catch((err) => console.error("webpush error:", err?.message || err));
      })
    );
  } catch (err) {
    console.error("sendPushToUsers:", err?.message || err);
  }
}

const sendNotificationToAll = (req, res) => {
  const message = req.body.message || "This is a test notification";
  const url = req.body.url || req.body.action_url || null;
  const payload = JSON.stringify({
    title: req.body.title || "New Notification",
    body: message,
    message,
    url,
    action_url: url,
  });

  db.subscriptions
    .findAll({ raw: true })
    .then((results) => {
      const subscriptions = results.map((subscription) => ({
        endpoint: subscription.endpoint,
        keys: JSON.parse(subscription.data_keys),
      }));
      Promise.all(
        subscriptions.map((subscription) =>
          webpush.sendNotification(subscription, payload)
        )
      )
        .then(() => {
          console.log("Notification sent successfully");
          res.status(200).json({ message: "Notification sent successfully" });
        })
        .catch(
          (error) =>
            console.error("Error sending notifications:", error) ||
            res.status(500).json({ error: "Error sending notifications" })
        );
    })
    .catch(() => {
      res.status(500).json({ error: "Error fetching subscriptions" });
    });
};

export { subscribeUser, sendNotificationToAll };
