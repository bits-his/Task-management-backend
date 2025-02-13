import db from "../models";
const { v4: uuidv4 } = require("uuid");

const department = (req, res) => {
  console.log(req.body);
  const {
    query_type = "create",

    dept_id = null,
    startup_id = null,
    department_name = "",
    org_id = null,
    user_id = null,
    status = "Active",
  } = req.body;

  db.sequelize
    .query(
      `CALL department(:query_type, :dept_id, :startup_id, :department_name, :org_id, :user_id,:status)`,
      {
        replacements: {
          query_type,
          dept_id,
          startup_id,
          department_name,
          org_id,
          user_id,
          status
        },
      }
    )
    .then((data) => res.json({ success: true, data }))
    .catch((err) => {
      console.error("Error managing contacts:", err);
      res.status(500).json({ success: false, error: err.message });
    });
};
const get_department = (req, res) => {
    const {
      query_type = "select",
      org_id = null,
      startup_id = null,
    } = req.query;
   const {

     dept_id = null,

     department_name = "",
  
     user_id = null,
     status = "active",
   } = req.body;

  db.sequelize
    .query(
      `CALL department(:query_type, :dept_id, :startup_id, :department_name, :org_id, :user_id,:status)`,
      {
        replacements: {
          query_type,
          dept_id,
          startup_id,
          department_name,
          org_id,
          user_id,
          status,
        },
      }
    )
    .then((data) => res.json({ success: true, data }))
    .catch((err) => {
      console.error("Error managing contacts:", err);
      res.status(500).json({ success: false, error: err.message });
    });
};

export { department, get_department };
