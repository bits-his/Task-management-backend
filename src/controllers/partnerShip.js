import db from "../models";

const partnerShip = (req, res) => {
  const {
    query_type = "create",
    LeadID = "",
    status = "",
    start_date = "",
    end_date = "",
    terms = "",
    startup_id = "",
  } = req.body;
  let images = [];
  if (req.files) {
    images = req.files.map((image) => image.path);
  }
  db.sequelize
    .query(
      `CALL partnership(:query_type, :LeadID, :status, :start_date, :end_date, :terms, :files,:startup_id)`,
      {
        replacements: {
          query_type,
          LeadID,
          status,
          start_date,
          end_date,
          terms,
          files: `${images.splice(0, 5)}`,
          startup_id
        },
      }
    )
    .then((data) => res.json({ success: true, data }))
    .catch((err) => {
      console.error("Error managing contacts:", err);
      res.status(500).json({ success: false, error: err.message });
    });
};

const get_partnerShip = (req, res) => {
  const {
    query_type = "select",
    LeadID = "",
    status = "",
    start_date = "",
    end_date = "",
    terms = "",
    files = "",
  } = req.body;
  const {startup_id=null}=req.query;
  let images = [];
  if (req.files) {
    images = req.files.map((image) => image.path);
  }
  db.sequelize
    .query(
      `CALL partnership(:query_type, :LeadID, :status, :start_date, :end_date, :terms, :files,:startup_id)`,
      {
        replacements: {
          query_type,
          LeadID,
          status,
          start_date,
          end_date,
          terms,
          files,
          startup_id
        },
      }
    )
    .then((data) => res.json({ success: true, data }))
    .catch((err) => {
      console.error("Error managing contacts:", err);
      res.status(500).json({ success: false, error: err.message });
    });
};

export { partnerShip, get_partnerShip };
