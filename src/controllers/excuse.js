import db from "../models/index.js";
import { CreateNotifications } from "./notification.js";

export const postExcuse = async (req, res) => {
  try {
    const {
      create_by = "",
      excuse_type = "",
      excuse_day = "2024-12-12",
      status = "",
      excuse_description = "",
      approved_by = "",
      excuse_id = "",
    } = req.body;
    const { query_type = "" } = req.query;

    let data = [];

    if (query_type === "create") {
      const row = await db.excuses.create({
        create_by,
        excuses_type: excuse_type,
        excuse_day,
        excuse_description,
      });
      data = [row.get({ plain: true })];
    } else if (query_type === "select") {
      const rows = await db.excuses.findAll({
        order: [["created_at", "DESC"]],
        raw: true,
      });
      data = await Promise.all(
        rows.map(async (e) => {
          const u = await db.users.findOne({
            where: { user_id: e.create_by },
            attributes: ["fullname"],
            raw: true,
          });
          return {
            excuse_id: e.id,
            create_by: e.create_by,
            created_by_name: u?.fullname || null,
            excuses_type: e.excuses_type,
            excuse_day: e.excuse_day,
            status: e.status,
            excuse_description: e.excuse_description,
            approved_by: e.approved_by,
            created_at: e.created_at,
          };
        })
      );
    } else if (query_type === "update") {
      await db.excuses.update(
        { status, approved_by },
        { where: { id: excuse_id } }
      );
      data = [{ id: excuse_id, status, approved_by }];
    }

    if (query_type == "update") {
      CreateNotifications(
        "Excuse",
        create_by,
        "Excuse",
        `Your Excuse ${
          excuse_description ? excuse_description : excuse_type
        } has been ${
          status == "approved" ? "Approved" : "Rejected"
        } by ${approved_by} `
      );
    }
    res.json({ success: true, data });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: err.message });
  }
};
