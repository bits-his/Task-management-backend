import { get_task_form, task_form, update_task_status } from "../controllers/task_form";
module.exports = (app) => {
  app.post("/api/create_task", task_form);
  app.post("api/update_task_status", update_task_status);
  app.get("/api/get_task", get_task_form);
};
