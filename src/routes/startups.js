import { findAllStartups , createStartups, getAllStartupMembers, updateStartups } from '../controllers/startups.js';
import { upload } from "../config/multerConfig.js";
export default (app) => {
    app.get('/api/startups', findAllStartups);
    app.post('/api/startups',upload.single("logo"),  createStartups);
    app.put("/api/startups", upload.single("logo"), updateStartups);
    app.get("/api/get-all-startups-members", getAllStartupMembers);
}