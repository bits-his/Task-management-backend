const express = require("express");
const passport = require("passport");
const bodyParser = require("body-parser");
const cors = require("cors");
import models from "./models";
import "regenerator-runtime/runtime";
const webSocketService = require("./services/webSocketService.js");
const expressWs = require("express-ws");
const helmet = require("helmet");

const app = express();
expressWs(app);

app.use(bodyParser.json());

let port = process.env.PORT || 34567;
const allowedOrigins = [
  "http://localhost:5100",
  "https://task.brainstorm.ng",
  "wss://task.brainstorm.ng/",
];
// set the view engine to ejs
app.set("view engine", "ejs");

// make express look in the public directory for assets (css/js/img)
app.use(express.static(__dirname + "/public"));

app.use(
  cors({
    origin: (origin, callback) => {
      console.log("Connection from:", origin);
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

// force: true will drop the table if it already exits
// models.sequelize.sync({ force: true }).then(() => {
models.sequelize.sync().then(() => {
  console.log("Drop and Resync with {force: true}");
});

// passport middleware
app.use(passport.initialize());
app.use(helmet());
app.use(helmet.xContentTypeOptions());
app.use(helmet.xContentTypeOptions());
// passport config
require("./config/passport")(passport);

//default route
app.get("/", async (req, res) => {
  try {
    res.send("Hello my World");
  } catch (err) {
    console.error("Error in default route", err);
    res.status(500).send("Internal Server Error");
  }
});

require("./routes/user.js")(app);
require("./routes/startups.js")(app);
require("./routes/excuse.js")(app);
require("./routes/weekly.js")(app);
require("./routes/task_form.js")(app);
require("./routes/stats.js")(app);
require("./routes/attendance.routes.js")(app);
require("./routes/notification.js")(app);
require("./routes/comments.routes.js")(app);
require("./routes/clients.js")(app);

//create a server
server.listen(port, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log("App listening at http://%s:%s", host, port);
});
