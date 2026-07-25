import { department, get_department, get_role } from "../controllers/department.js";
export default (app) => {
  app.post("/api/create-department", department);
  app.get("/api/get-department", get_department);
    app.get("/api/get-roles/:dept_id", get_role);
    app.post("/api/get-department", get_department);
  app.post("/api/sidebar-department", department);
};
