const express = require('express');
const passport = require("passport");
const bodyParser = require("body-parser");
const cors = require("cors");
import models from "./models";
import 'regenerator-runtime/runtime';
const webSocketService = require("./services/webSocketService.js");

const app = express();

app.use(bodyParser.json());

let port = process.env.PORT || 34567;

// set the view engine to ejs
app.set("view engine", "ejs");

// make express look in the public directory for assets (css/js/img)
app.use(express.static(__dirname + "/public"));

app.use(cors());
const server = require("http").createServer(app);
webSocketService.init(server);

// force: true will drop the table if it already exits
// models.sequelize.sync({ force: true }).then(() => {
models.sequelize.sync().then(() => {
  console.log("Drop and Resync with {force: true}");
});

// passport middleware
app.use(passport.initialize());

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
