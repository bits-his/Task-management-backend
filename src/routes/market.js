const { upload } = require("../config/multerConfig");
const { insertMarketResearch, getMarketResearch } = require("../controllers/marketResearch");


module.exports = (app) => {
    app.post("/api/market-research",  upload.array('files', 5), insertMarketResearch);
    app.get('/get-research',getMarketResearch)
};
