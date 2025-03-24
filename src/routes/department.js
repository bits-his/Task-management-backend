const { department, get_department, get_role } = require("../controllers/department");


module.exports = (app) => {
  app.post("/api/create-department", department);
  app.get("/api/get-department", get_department);
    app.get("/api/get-roles/:dept_id", get_role);
    app.post("/api/get-department", get_department);
  app.post("/api/sidebar-department", department);
};
