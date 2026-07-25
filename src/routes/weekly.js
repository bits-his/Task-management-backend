import {
  handleWeeklyReport,
  submitReport,
  submitExcuse,
  getUserReports,
  getAllReports,
  updateReport,
  updateExcuseStatus,
  getSuggestedTasks,
} from "../controllers/weeklyReportController.js";

export default (app) => {
  app.post("/api/weekly-report", handleWeeklyReport);

  app.post("/api/post-report", submitReport);
  app.get("/api/get-user-reports", getUserReports);
  app.post("/api/get-all-reports", getAllReports);
  app.post("/api/update-report", updateReport);
  app.post("/api/report-suggested-tasks", getSuggestedTasks);
  app.get("/api/report-suggested-tasks", getSuggestedTasks);

  app.post("/api/post-excuse", submitExcuse);
  app.put("/api/update-excuse", updateExcuseStatus);
};
