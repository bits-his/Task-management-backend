import { findAllStartups , createStartups } from '../controllers/startups';
module.exports = (app) => {
    app.get('/api/startups', findAllStartups);
    app.post('/api/startups', createStartups);
}