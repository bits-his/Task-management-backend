import { upload } from "../config/multerConfig.js";
import { insertMarketResearch, getMarketResearch } from "../controllers/marketResearch.js";
export default (app) => {
    app.post("/api/market-research",  upload.array('files', 5), insertMarketResearch);
    app.get('/get-research',getMarketResearch)
};
