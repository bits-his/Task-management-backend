import { get_task_form, task_form } from "../controllers/task_form";
module.exports = (app) => {
  app.get("/create_task", task_form);
  app.post("/get_task", get_task_form);
};
