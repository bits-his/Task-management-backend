const express = require('express');
const passport = require("passport");
const bodyParser = require("body-parser");
const cors = require("cors");
import models from "./models";
import 'regenerator-runtime/runtime';
const webSocketService = require("./services/webSocketService.js");
const helmet =  require("helmet");
const app = express();
const { createProxyMiddleware } = require("http-proxy-middleware");

app.use(bodyParser.json());

let port = process.env.PORT || 34567;
const allowedOrigins = ["http://localhost:5100", "https://task.brainstorm.ng/"];
// set the view engine to ejs
app.set("view engine", "ejs");

// make express look in the public directory for assets (css/js/img)
app.use(express.static(__dirname + "/public"));

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
const server = require("http").createServer(app);

webSocketService.init(server);

app.use(
  "/router",
  createProxyMiddleware({
    target: "http://192.168.1.1", // Router HTTP address
    changeOrigin: true,
    secure: false, // Disable SSL verification for non-HTTPS target

    // Log request details before proxying
    onProxyReq: (proxyReq, req, res) => {
      console.log(`[PROXY REQUEST] ${req.method} ${req.url}`);
      console.log("Request Headers:", req.headers);
      console.log("Request Body:", req.body); // Log request body if necessary (e.g., POST data)
    },

    // Log response details from the target
    onProxyRes: (proxyRes, req, res) => {
      console.log(`[PROXY RESPONSE] ${req.method} ${req.url}`);
      console.log("Response Status Code:", proxyRes.statusCode);
      proxyRes.on("data", (data) => {
        console.log("Response Data:", data.toString());
      });
    },

    // Log errors (in case the proxy fails)
    onError: (err, req, res) => {
      console.error("[PROXY ERROR]", err);
      res.status(500).send("Proxy Error: " + err.message);
    },
  })
);
// force: true will drop the table if it already exits
// models.sequelize.sync({ force: true }).then(() => {
models.sequelize.sync().then(() => {
  console.log("Drop and Resync with {force: true}");
});

// passport middleware
app.use(passport.initialize());
app.use(helmet());
app.use(helmet.xContentTypeOptions());

// passport config
require("./config/passport")(passport);

//default route
app.get("/", (req, res) => res.send("Hello my World"));

require('./routes/user.js')(app);
require('./routes/startups.js')(app);
require('./routes/excuse.js')(app);
require('./routes/weekly.js')(app);
require("./routes/task_form.js")(app);
require("./routes/stats.js")(app);
require("./routes/attendance.routes.js")(app);
require("./routes/notification.js")(app);
require("./routes/comments.routes.js")(app);

//create a server
server.listen(port, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log("App listening at http://%s:%s", host, port);
});
