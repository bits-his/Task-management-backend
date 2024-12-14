import db from "../models";


const findAllStartups = (req, res) => {
const {query_type= 'select-all'} = req.query;
const { startup_id = null ,name = null, description = null, logo = null, created_by = null} = req.body;
   db.sequelize
     .query(`CALL startup(:query_type,:startup_id,:name,:description,:logo,:created_by)`, {
       replacements: {
         query_type,
         startup_id,
         name,
         description,
         logo,
         created_by,
       },
     })
     .then((resp) => {
       res.json({ success: true, data: resp });
     })
     .catch((err) => {
       res.json({ success: false, message: err });
     });
}
const createStartups = (req, res) => {
    const {
      query_type = "insert",
      startup_id = null,
      name = null,
      description = null,
      logo = null,
      created_by = null,
    } = req.body;
    console.log(req.body);
    db.sequelize
       .query(
         `CALL startup(:query_type,:startup_id,:name,:description,:logo,:created_by)`,
         {
           replacements: {
             query_type,
             startup_id,
             name,
             description,
             logo,
             created_by,
           },
         }
       )
       .then((resp) => {
         res.json({ success: true, data: resp, message :"Startup created successfully" });
       })
       .catch((err) => {
         res.json({ success: false, message: err });
       });
}
const updateStartups = (req, res) => {
       const {
         query_type = "insert",
         startup_id = null,
         name = null,
         description = null,
         logo = null,
         created_by = null,
       } = req.body;
       console.log(req.body);
       db.sequelize
         .query(
           `CALL startup(:query_type,:startup_id,:name,:description,:logo,:created_by)`,
           {
             replacements: {
               query_type,
               startup_id,
               name,
               description,
               logo,
               created_by,
             },
           }
         )
         .then((resp) => {
           res.json({
             success: true,
             data: resp,
             message: "Startup created successfully",
           });
         })
         .catch((err) => {
           res.json({ success: false, message: err });
         });
}



export const getAllStartupMembers = (req, res) => {
const {startup_id=""}=req.query;
  db.sequelize.query(`CALL startup_members(:startup_id)`,{
    replacements: {
      startup_id
    }
  })
  .then((resp) => {
       res.json({ success: true, data: resp });
     })
     .catch((err) => {
       res.json({ success: false, message: err });
     });
}

export { findAllStartups, createStartups };