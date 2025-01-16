const { getStats } = require("../controllers/stats")


module.exports = (app)=>{
    app.get("/api/get-stats",getStats);
}