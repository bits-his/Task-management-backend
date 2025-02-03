import db from "../models";
import { CreateNotifications } from "./Notification";



export const postExcuse = (req,res)=>{
console.log(req.body);
    const {create_by="",excuse_type="",excuse_day="2024-12-12",status="",excuse_description="",approved_by="",excuse_id=''}=req.body;
    const{query_type=""}=req.query;

    db.sequelize
      .query(
        `CALL excuses(:create_by,:excuse_type,:excuse_day,:excuse_description,:status,:approved_by,:query_type,:excuse_id)`,
        {
          replacements: {
            create_by,
            excuse_type,
            excuse_day,
            status,
            excuse_description,
            approved_by,
            query_type,
            excuse_id
          },
        }
      )
      .then((resp) => {
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
        res.json({ success: true, data: resp });
      })
      .catch((err) => {
        console.log(err);
      });
}