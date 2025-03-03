import db from "../models";

const outreach = (req, res) => {
  const {
    query_type = "create",
    LeadID = "",
    Type = "",
    Date = "",
    Outcome = "",
    Notes = "",
    FollowUpDate = "",
    startup_id = "",
  } = req.body;
  db.sequelize
    .query(
      `CALL outreach(:query_type, :LeadID, :Type, :Date, :Outcome, :Notes,:FollowUpDate,:startup_id)`,
      {
        replacements: {
          query_type,
          LeadID,
          Type,
          Date,
          Outcome,
          Notes,
          FollowUpDate,
          startup_id,
        },
      }
    )
    .then((data) => res.json({ success: true, data }))
    .catch((err) => {
      console.error("Error managing contacts:", err);
      res.status(500).json({ success: false, error: err.message });
    });
};

const get_outreach = (req, res) => {
  const {
    query_type = "select",
    LeadID = "",
    Type = "",
    Date = "",
    Outcome = "",
    Notes = "",
    FollowUpDate = "",
  } = req.body;

  const { startup_id = "" } = req.params;

  db.sequelize
    .query(
      `CALL outreach(:query_type, :LeadID, :Type, :Date, :Outcome, :Notes,:FollowUpDate,:startup_id)`,
      {
        replacements: {
          query_type,
          LeadID,
          Type,
          Date,
          Outcome,
          Notes,
          FollowUpDate,
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

export { get_outreach, outreach };
