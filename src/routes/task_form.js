import { get_task_form, task_form, update_task_status, updateSubTask } from "../controllers/task_form";
import { upload } from '../config/multerConfig';
module.exports = (app) => {
  app.post("/api/create_task", upload.array('images', 5), task_form);
  app.post("/api/update_task_status", update_task_status);
  app.get("/api/get_task", get_task_form);
  app.post("/api/update_sub_task", updateSubTask);
};
