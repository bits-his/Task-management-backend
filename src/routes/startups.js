import { findAllStartups , createStartups, getAllStartupMembers } from '../controllers/startups';
module.exports = (app) => {
    app.get('/api/startups', findAllStartups);
    app.post('/api/startups', createStartups);
    app.get("/api/get-all-startups-members", getAllStartupMembers);
}