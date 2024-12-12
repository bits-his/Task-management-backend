// routes/weeklyReport.js

import { 
    handleWeeklyReport,
    submitReport,
    submitExcuse,
    getUserReports,
    getAllReports,
    updateReport,
    updateExcuseStatus
} from '../controllers/weeklyReportController';

module.exports = (app) => {
    // Generic handler
    app.post('/api/weekly-report', handleWeeklyReport);

    // Reports
    app.post('/api/post-report', submitReport);
    app.get('/api/get-user-reports', getUserReports);
    app.post('/api/get-all-reports', getAllReports);
    app.post('/api/update-report', updateReport);

    // Excuses
    app.post('/api/post-excuse', submitExcuse);
    app.put('/api/update-excuse', updateExcuseStatus);
};