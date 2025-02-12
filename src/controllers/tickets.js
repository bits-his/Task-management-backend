import db from "../models";
const { v4: uuidv4 } = require("uuid");
const tickets = (req, res) => {
  console.log(req.body);
  const {
    query_type = "create",

    ticket_name = null,
    description = null,
    status = "",
    priority = null,
    department = null,
    user_id = null,
  } = req.body;
    const ticked_id = uuidv4();
      db.sequelize
        .query(
          `CALL tickets(:query_type, :ticked_id, :ticket_name, :description, :status, :priority,:department, :user_id)`,
          {
            replacements: {
              query_type,
              ticked_id,
              ticket_name,
              description,
              status,
              priority,
              department,
              user_id,
            },
          }
        )
        .then((data) => res.json({ success: true, data }))
        .catch((err) => {
          console.error("Error managing contacts:", err);
          res.status(500).json({ success: false, error: err.message });
        });
};
const get_tickets = (req, res) => {
  const {
    query_type = "select",
    ticked_id = null,
    ticket_name = null,
    description = null,
    status = null,
    priority = null,
    department = null,
    user_id = null,
  } = req.body;

  db.sequelize
    .query(
      `CALL tickets(:query_type, :ticked_id, :ticket_name, :description, :status, :priority,:department, :user_id)`,
      {
        replacements: {
          query_type,
          ticked_id,
          ticket_name,
          description,
          status,
          priority,
          department,
          user_id,
        },
      }
    )
    .then((data) => res.json({ success: true, data }))
    .catch((err) => {
      console.error("Error managing contacts:", err);
      res.status(500).json({ success: false, error: err.message });
    });
};

export { tickets, get_tickets };
