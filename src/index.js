import express from "express";
import passport from "passport";
import bodyParser from "body-parser";
import cors from "cors";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import expressWs from "express-ws";
import helmet from "helmet";

import models from "./models/index.js";
import webSocketService from "./services/webSocketService.js";
import configurePassport from "./config/passport.js";
import ensureAuthSchema from "./services/ensureAuthSchema.js";
import ensureReportSchema from "./services/ensureReportSchema.js";
import ensureBdSchema from "./services/ensureBdSchema.js";
import ensureTicketsSchema from "./services/ensureTicketsSchema.js";
import { ensureProjectSchema } from "./services/projectService.js";

import userRoutes from "./routes/user.js";
import startupsRoutes from "./routes/startups.js";
import excuseRoutes from "./routes/excuse.js";
import weeklyRoutes from "./routes/weekly.js";
import taskFormRoutes from "./routes/task_form.js";
import statsRoutes from "./routes/stats.js";
import attendanceRoutes from "./routes/attendance.routes.js";
import notificationRoutes from "./routes/notification.js";
import commentsRoutes from "./routes/comments.routes.js";
import clientsRoutes from "./routes/clients.js";
import marketRoutes from "./routes/market.js";
import ticketsRoutes from "./routes/tickets.js";
import departmentRoutes from "./routes/department.js";
import outreachRoutes from "./routes/outreach.js";
import partnerShipRoutes from "./routes/partnerShip.js";
import dealsRoutes from "./routes/deals.js";
import pushRoutes from "./routes/pushnotification.js";
import receiptRoutes from "./routes/reciept.js";
import postRoutes from "./routes/post.js";
import authRoutes from "./routes/auth.js";
import membershipRoutes from "./routes/membership.js";
import internshipRoutes from "./routes/internship.js";
import rolesRoutes from "./routes/roles.js";
import projectsRoutes from "./routes/projects.js";
import { seedDefaultOpportunities } from "./services/internshipService.js";
import { normalizeRolesInDb } from "./services/membershipService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
expressWs(app);

app.use(bodyParser.json());

const port = process.env.PORT || 34567;
const allowedOrigins = [
  "http://localhost:5100",
  "https://task.brainstorm.ng",
  "wss://task.brainstorm.ng/",
];

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);

const server = http.createServer(app);

webSocketService.init(server);

models.sequelize
  .sync()
  .then(async () => {
    await ensureAuthSchema(models.sequelize);
    await ensureReportSchema(models.sequelize);
    await ensureBdSchema(models.sequelize);
    await ensureTicketsSchema(models.sequelize);
    await ensureProjectSchema();
    await seedDefaultOpportunities();
    try {
      const normalized = await normalizeRolesInDb();
      if (normalized.usersUpdated || normalized.membershipsUpdated) {
        console.log(
          `Roles normalized: ${normalized.usersUpdated} users, ${normalized.membershipsUpdated} memberships`
        );
      }
    } catch (err) {
      console.error("Role normalize skipped:", err.message);
    }
    console.log("Database synced");
  })
  .catch((err) => console.error("Database sync error:", err));

app.use(passport.initialize());
app.use(helmet());
app.use(helmet.xContentTypeOptions());
configurePassport(passport);

app.get("/", async (_req, res) => {
  try {
    res.send("Hello my World");
  } catch (err) {
    console.error("Error in default route", err);
    res.status(500).send("Internal Server Error");
  }
});

authRoutes(app);
membershipRoutes(app);
rolesRoutes(app);
userRoutes(app);
startupsRoutes(app);
excuseRoutes(app);
weeklyRoutes(app);
taskFormRoutes(app);
statsRoutes(app);
attendanceRoutes(app);
projectsRoutes(app);
notificationRoutes(app);
commentsRoutes(app);
clientsRoutes(app);
marketRoutes(app);
ticketsRoutes(app);
departmentRoutes(app);
outreachRoutes(app);
partnerShipRoutes(app);
dealsRoutes(app);
pushRoutes(app);
receiptRoutes(app);
postRoutes(app);
internshipRoutes(app);

server.listen(port, function () {
  const host = server.address().address;
  const listeningPort = server.address().port;
  console.log("App listening at http://%s:%s", host, listeningPort);
});
