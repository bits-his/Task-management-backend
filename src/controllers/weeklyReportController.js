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

const transformData = (dbResults, currentUserId) => {
    const currentUser = dbResults.find(user => user.user_id === currentUserId);

    // Create a Map to store unique team members
    const teamMembersMap = new Map();
    dbResults.forEach(row => {
        if (!teamMembersMap.has(row.user_id)) {
            teamMembersMap.set(row.user_id, {
                id: row.user_id,
                name: row.user_name,
                role: row.role,
                startupName: row.startup_name
            });
        }
    });
    const teamMembers = Array.from(teamMembersMap.values());

    const weeklyReports = dbResults.reduce((weeks, row) => {
        const week = weeks.find(w => w.week_start === row.week_start);
        const dailyReport = {
            date: row.report_date,
            content: row.report_content || "",
            status: row.report_status || "pending",
            last_edited: row.last_edited,
            daily_tasks: row.daily_tasks ? row.daily_tasks.split(", ") : [],
            excuse: row.excuse_type
                ? {
                    type: row.excuse_type,
                    status: row.excuse_status,
                    excuse_description: row.excuse_description,
                    excuse_day: row.excuse_day
                }
                : {}
        };

        if (!week) {
            // Create new week entry
            weeks.push({
                week_start: row.week_start,
                reports: [{
                    user_id: row.user_id,
                    name: row.user_name,
                    role: row.role,
                    daily_reports: [dailyReport]
                }]
            });
        } else {
            const existingUserReport = week.reports.find(r => r.user_id === row.user_id);
            if (!existingUserReport) {
                // Add new user report to existing week
                week.reports.push({
                    user_id: row.user_id,
                    name: row.user_name,
                    role: row.role,
                    daily_reports: [dailyReport]
                });
            } else {
                // Add daily report to existing user report
                existingUserReport.daily_reports.push(dailyReport);
            }
        }
        return weeks;
    }, []);

    // Sort weekly reports by date (newest first)
    weeklyReports.sort((a, b) => new Date(b.week_start) - new Date(a.week_start));

    // Sort daily reports by date for each user
    weeklyReports.forEach(week => {
        week.reports.forEach(userReport => {
            userReport.daily_reports.sort((a, b) => new Date(a.date) - new Date(b.date));
        });
    });

    return {
        success: true,
        data: {
            current_user: currentUser ? {
                id: currentUser.user_id,
                name: currentUser.user_name,
                role: currentUser.role,
                startupName: currentUser.startup_name
            } : null,
            team_members: teamMembers,
            weekly_reports: weeklyReports
        },
        message: "Data fetched successfully"
    };
};

export const getAllReports = (req, res) => {
    const {startup_id=0}=req.query;

    db.sequelize.query(`CALL weekly_report(:startup_id)`,
       {
        replacements: {startup_id:startup_id}
       }
    )
    .then((results) => {
        const transformedData = transformData(results, startup_id);
        res.json(transformedData);
    })
    .catch((err) => {
        res.json({ 
            success: false, 
            message: err.message || "An error occurred" 
        });
    });
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