import db from "../models";



export const postExcuse = (req,res)=>{
console.log(req.body);
    const {create_by="",excuse_type="",excuse_day="2024-12-12",status="",excuse_description="",approved_by="",id=0}=req.body;
    const{query_type=""}=req.query;

    db.sequelize.query(`CALL excuses(:create_by,:excuse_type,:excuse_day,:excuse_description,:status,:approved_by,:query_type)`,{
        replacements: {
create_by,excuse_type,excuse_day,status,excuse_description,approved_by,query_type
        }
    })
      .then((resp) => {
       res.json({ success: true, data: resp });
     })
     .catch((err) => {
      console.log(err);
     });
}