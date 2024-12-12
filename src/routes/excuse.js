const { postExcuse } = require("../controllers/excuse")


module.exports = (app)=>{
    app.post("/app/post-excuse",postExcuse)
}