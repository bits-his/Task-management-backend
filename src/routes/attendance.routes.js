const { signIn, signOut, getTodayStatus, getAttendanceHistory } = require('../controllers/attendance.controller');


module.exports = (app) => {
  app.post('/api/attendance/signin', signIn);
  app.post('/api/attendance/signout', signOut);
  app.get('/api/attendance/status', getTodayStatus);
  app.get('/api/attendance/history', getAttendanceHistory);
  
  app.get("/check-router", async (req, res) => {
    console.log("Checking router...");
    try {
      const response = await fetch("http://192.168.1.1");
      console.log(response);
      res.json({ connected: true });
    } catch (error) {
      console.error(error);
      res.json({ connected: false });
    }
  });
};
