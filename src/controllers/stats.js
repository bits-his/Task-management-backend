import db from "../models";



export const getStats = (req,res)=>{
console.log(req.body);
    const {create_by="",excuse_type="",excuse_day="2024-12-12",status="",excuse_description="",approved_by="",id=0}=req.body;
    const{query_type="",user_id}=req.query;

    db.sequelize
      .query(`CALL getTaskStatistics(:query_type, :user_id)`, {
        replacements: {
          query_type,
           user_id,
        },
      })
      .then((resp) => {
        res.json({ success: true, data: resp });
      })
      .catch((err) => {
        console.log(err);
      });
}