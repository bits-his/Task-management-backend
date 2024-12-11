// controllers/weeklyReportController.js

import db from "../models";

const handleWeeklyReport = (req, res) => {
    const {
        query_type = "create",
        user_id = null,
        report_date = null,
        week_start = null,
        content = null,
        excuse_type = null,
        excuse_description = null
    } = req.body;

    db.sequelize
        .query(
            `CALL sp_weekly_report(:query_type,:user_id,:report_date,:week_start,:content,:excuse_type,:excuse_description)`,
            {
                replacements: {
                    query_type,
                    user_id,
                    report_date,
                    week_start,
                    content,
                    excuse_type,
                    excuse_description
                },
            }
        )
        .then((resp) => {
            res.json({ 
                success: true, 
                data: resp, 
                message: "Operation completed successfully" 
            });
        })
        .catch((err) => {
            res.json({ 
                success: false, 
                message: err.message || "An error occurred" 
            });
        });
};

export const submitReport = (req, res) => {
    req.body.query_type = "create";
    handleWeeklyReport(req, res);
};

const submitExcuse = (req, res) => {
    req.body.query_type = "create_excuse";
    handleWeeklyReport(req, res);
};

const getUserReports = (req, res) => {
    req.body.query_type = "get_user_reports";
    handleWeeklyReport(req, res);
};

export const getAllReports = (req, res) => {
    req.body.query_type = "get_all_reports";
    handleWeeklyReport(req, res);
};

export const updateReport = (req, res) => {
    req.body.query_type = "update";
    handleWeeklyReport(req, res);
};

const updateExcuseStatus = (req, res) => {
    req.body.query_type = "update_excuse";
    handleWeeklyReport(req, res);
};

module.exports = {
    handleWeeklyReport,
    submitReport,
    submitExcuse,
    getUserReports,
    getAllReports,
    updateReport,
    updateExcuseStatus
};