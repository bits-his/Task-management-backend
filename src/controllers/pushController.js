// server/controllers/pushController.js
const webpush = require("web-push");
const db = require("../models");


// Set your VAPID keys here
// const publicVapidKey = process.env.VAPID_PUBLIC_KEY|| "YOUR_PUBLIC_VAPID_KEY";
// const privateVapidKey = process.env.VAPID_PRIVATE_KEY || "YOUR_PRIVATE_VAPID_KEY";

// webpush.setVapidDetails(
//   "mailto:aii07038713563@gmail.com",
//   publicVapidKey,
//   privateVapidKey
// );

// Save subscription to MySQL
const saveSubscription = (subscription) => {
  return new Promise((resolve, reject) => {
    const { endpoint, keys } = subscription;

    db.sequelize.query(
      `INSERT INTO subscriptions (endpoint, data_keys,user_id) VALUES (?, ?,?)`,
      {
        replacements: [endpoint, JSON.stringify(keys),1],
      }
    )
      .then((result) => {
        resolve(result);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

// Route handler to store the subscription
const subscribeUser = (req, res) => {
  const subscription = req.body;

  saveSubscription(subscription)
    .then(() =>{
     return res.status(201).json({success: true, message: "Subscription saved successfully" })
    }
    )
    .catch((err) =>{

      console.log(err)
     return res.status(500).json({ error: "Error saving subscription" })
    }
    );
};

// Send notification to all subscribers
const sendNotificationToAll = (req, res) => {
  const message = req.body.message || "This is a test notification";

  const payload = JSON.stringify({ title: "New Notification", body: message });

  db.sequelize.query("SELECT * FROM subscriptions")
    .then((results) => {

      const subscriptions = results[0].map(subscription => ({endpoint: subscription.endpoint, keys: JSON.parse(subscription.data_keys)}));
      Promise.all(
        subscriptions.map((subscription) => {

          return webpush.sendNotification(subscription, payload);
        })
      )
        .then(() =>{
console.log("Notification sent successfully")
          res.status(200).json({ message: "Notification sent successfully" })
        }
        )
        .catch((error) =>
          console.error("Error sending notifications:", error) ||
          res.status(500).json({ error: "Error sending notifications" })
        );
    })
    .catch((err) => {
      res.status(500).json({ error: "Error fetching subscriptions" });
    });
};


// Send push notification
const sendPushNotification = async (subscription, payload) => {
  try {
    await webpush.sendNotification(subscription, payload);
  } catch (error) {
    // If the subscription is no longer valid, remove it from your database
    if (error.statusCode === 410) {
      console.log("Subscription is no longer valid, removing from database.");
      // Remove from the database (using your ORM or database query)
      await removeSubscriptionFromDb(subscription.endpoint);
    }
    console.error("Error sending notification", error);
  }
};

// Remove invalid subscription from your database
// const removeSubscriptionFromDb = (endpoint) => {
//   // Implement your logic to delete or mark the subscription as invalid in your database
//   // Example: db.query('DELETE FROM subscriptions WHERE endpoint = ?', [endpoint]);
//   console.log(`Removed subscription with endpoint: ${endpoint}`);
// };


module.exports = { subscribeUser, sendNotificationToAll };
