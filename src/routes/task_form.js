import { get_task_form, task_form } from "../controllers/task_form";
module.exports = (app) => {
  app.post("/api/create_task", task_form);
  app.get("/api/get_task", get_task_form);
};
