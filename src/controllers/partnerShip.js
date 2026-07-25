import db from "../models/index.js";

const runPartnership = async ({
  query_type = "create",
  LeadID = "",
  status = "",
  start_date = "",
  end_date = "",
  terms = "",
  files = "",
}) => {
  if (query_type === "create") {
    const row = await db.Partnerships.create({
      LeadID,
      status,
      start_date,
      end_date,
      terms,
      files,
    });
    return [row.get({ plain: true })];
  }
  if (query_type === "select") {
    const rows = await db.Partnerships.findAll({ raw: true });
    return Promise.all(
      rows.map(async (a) => {
        const client = await db.clients.findOne({
          where: { id: a.LeadID },
          attributes: ["name"],
          raw: true,
        });
        return {
          name: client?.name || null,
          leadID: a.LeadID,
          status: a.status,
          start_date: a.start_date,
          end_date: a.end_date,
          files: a.files,
          terms: a.terms,
        };
      })
    );
  }
  return [];
};

const partnerShip = async (req, res) => {
  try {
    const {
      query_type = "create",
      LeadID = "",
      status = "",
      start_date = "",
      end_date = "",
      terms = "",
    } = req.body;
    let images = [];
    if (req.files) {
      images = req.files.map((image) => image.path);
    }
    const data = await runPartnership({
      query_type,
      LeadID,
      status,
      start_date,
      end_date,
      terms,
      files: images.slice(0, 5).join(","),
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error("Error managing contacts:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

const get_partnerShip = async (req, res) => {
  try {
    const {
      query_type = "select",
      LeadID = "",
      status = "",
      start_date = "",
      end_date = "",
      terms = "",
      files = "",
    } = req.body;
    const data = await runPartnership({
      query_type,
      LeadID,
      status,
      start_date,
      end_date,
      terms,
      files,
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error("Error managing contacts:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export { partnerShip, get_partnerShip };
