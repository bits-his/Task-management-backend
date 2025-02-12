const { department, get_department } = require("../controllers/department");


module.exports = (app) => {
  app.post("/api/create-department", department);
  app.get("/api/get-department", get_department);
};
