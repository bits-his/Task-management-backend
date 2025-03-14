import db from "../models";


const findAllStartups = (req, res) => {
const {query_type= 'select-all'} = req.query;
const { startup_id = null ,name = null, description = null, logo = null, created_by = null,org_id = null} = req.body;
   db.sequelize
     .query(`CALL startup(:query_type,:startup_id,:name,:description,:logo,:created_by,:org_id)`, {
       replacements: {
         query_type,
         startup_id,
         name,
         description,
         logo,
         created_by,
         org_id
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
      created_by = null,
      org_id = null
    } = req.body;
       const logo = req.file ? req.file.path : null;

    db.sequelize
       .query(
         `CALL startup(:query_type,:startup_id,:name,:description,:logo,:created_by,:org_id)`,
         {
           replacements: {
             query_type,
             startup_id,
             name,
             description,
             logo,
             created_by,
             org_id
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
         query_type = "update",
         startup_id = null,
         name = null,
         description = null,
         created_by = null,
         org_id = null
       } = req.body;
       console.log(req.body);
         const logo = req.file ? req.file.path : null;

       db.sequelize
         .query(
           `CALL startup(:query_type,:startup_id,:name,:description,:logo,:created_by,:org_id)`,
           {
             replacements: {
               query_type,
               startup_id,
               name,
               description,
               logo,
               created_by,
               org_id
             },
           }
         )
         .then((resp) => {
           res.json({
             success: true,
             data: resp,
             message: "Startup updated successfully",
           });
         })
         .catch((err) => {
           res.json({ success: false, message: err });
         });
}

export const getAllStartupMembers = (req, res) => {
const {startup_id="",dept_id=""}=req.query;
  db.sequelize.query(`CALL startup_members(:startup_id,:dept_id)`,{
    replacements: {
      startup_id,
      dept_id
    }
  })
  .then((resp) => {
       res.json({ success: true, data: resp });
     })
     .catch((err) => {
       res.json({ success: false, message: err });
     });
}

// const Create

export { findAllStartups, createStartups, updateStartups };