const { signIn, signOut, getTodayStatus, getAttendanceHistory } = require('../controllers/attendance.controller');

module.exports = (app) => {
  app.post('/api/attendance/signin', signIn);
  app.post('/api/attendance/signout', signOut);
  app.get('/api/attendance/status', getTodayStatus);
  app.get('/api/attendance/history', getAttendanceHistory);
};
