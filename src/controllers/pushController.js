import webpush from "web-push";
import db from "../models/index.js";
const saveSubscription = async (subscription) => {
  const { endpoint, keys } = subscription;
  return db.subscriptions.create({
    endpoint,
    data_keys: JSON.stringify(keys),
    user_id: "1",
  });
};

const subscribeUser = (req, res) => {
  const subscription = req.body;

  saveSubscription(subscription)
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

const sendNotificationToAll = (req, res) => {
  const message = req.body.message || "This is a test notification";
  const payload = JSON.stringify({ title: "New Notification", body: message });

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
