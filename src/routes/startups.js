import { findAllStartups , createStartups, getAllStartupMembers, updateStartups } from '../controllers/startups';
import { upload } from "../config/multerConfig";
module.exports = (app) => {
    app.get('/api/startups', findAllStartups);
    app.post('/api/startups',upload.single("logo"),  createStartups);
    app.put("/api/startups", upload.single("logo"), updateStartups);
    app.get("/api/get-all-startups-members", getAllStartupMembers);
}