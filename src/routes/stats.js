const { getStats, getStatsAdmin } = require("../controllers/stats")


module.exports = (app)=>{
    app.get("/api/get-stats",getStats);
    app.get("/api/get-statts-admin",getStatsAdmin);
}