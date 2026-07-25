import db from "../models/index.js";

const runOutreach = async ({
  query_type = "create",
  LeadID = "",
  Type = "",
  Date = "",
  Outcome = "",
  Notes = "",
  FollowUpDate = "",
}) => {
  if (query_type === "create" || query_type === "insert") {
    const row = await db.Outreach.create({
      LeadID: LeadID || null,
      Type,
      Date: Date || null,
      Outcome,
      Notes,
      FollowUpDate: FollowUpDate || null,
    });
    return [row.get({ plain: true })];
  }
  if (query_type === "select") {
    return db.Outreach.findAll({ raw: true });
  }
  return [];
};

const outreach = async (req, res) => {
  try {
    const {
      query_type = "create",
      LeadID = "",
      Type = "",
      Date = "",
      Outcome = "",
      Notes = "",
      FollowUpDate = "",
    } = req.body;
    const data = await runOutreach({
      query_type,
      LeadID,
      Type,
      Date,
      Outcome,
      Notes,
      FollowUpDate,
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error("Error managing contacts:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

const get_outreach = async (req, res) => {
  try {
    const {
      query_type = "select",
      LeadID = "",
      Type = "",
      Date = "",
      Outcome = "",
      Notes = "",
      FollowUpDate = "",
    } = req.body;
    const data = await runOutreach({
      query_type,
      LeadID,
      Type,
      Date,
      Outcome,
      Notes,
      FollowUpDate,
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error("Error managing contacts:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export { get_outreach, outreach };
