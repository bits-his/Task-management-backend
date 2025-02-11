import db from "../models";



export const getStats = (req,res)=>{
console.log(req.body);
    const {create_by="",excuse_type="",excuse_day="2024-12-12",status="",excuse_description="",approved_by="",id=0}=req.body;
    const{query_type="",user_id,startup_id = ''}=req.query;

    db.sequelize
      .query(`CALL getTaskStatistics(:query_type, :user_id, :startup_id)`, {
        replacements: {
          query_type,
           user_id,
           startup_id
        },
      })
      .then((resp) => {
        res.json({ success: true, data: resp });
      })
      .catch((err) => {
        console.log(err);
      });
}
export const getStatsAdmin = (req, res) => {
  db.sequelize.query(`CALL GetStartupStats()`, {
    type: db.Sequelize.QueryTypes.SELECT
  })
  .then((response) => {
    // Ensure we have a valid response
    if (!Array.isArray(response) || response.length === 0) {
      throw new Error('Invalid response from stored procedure');
    }

    const [
      totalStats,
      taskStatusDist,
      taskStatusByStartup,
      taskProgressTimeline,
      weeklyTaskComparison,
      milestoneProgress,
      issueResolution,
      attendanceTrends,
      startupAttendance,
      highAbsenteeism
    ] = response;

    const startupStats = {
      // KPI Summary Stats (from first result set)
      total_startups: totalStats && totalStats['0'] ? totalStats['0'].total_startups || 0 : 0,
      total_completed_tasks: totalStats && totalStats['0'] ? totalStats['0'].total_completed_tasks || 0 : 0,
      attendance_rate: totalStats && totalStats['0'] ? totalStats['0'].attendance_rate || "0.00" : "0.00",
      weekly_reports_submitted: totalStats && totalStats['0'] ? totalStats['0'].weekly_reports_submitted || 0 : 0,
      milestones_achieved: totalStats && totalStats['0'] ? totalStats['0'].milestones_achieved || 0 : 0,
      total_users: totalStats && totalStats['0'] ? totalStats['0'].total_users || 0 : 0,

      // Task Status Distribution
      task_status_distribution: transformNumberedObject(taskStatusDist, item => ({
        status: item.status,
        count: parseInt(item.count) || 0
      })),

      // Task Status by Startup
      task_status_by_startup: transformNumberedObject(taskStatusByStartup, item => ({
        startup: item.startup,
        pending: parseInt(item.pending) || 0,
        inProgress: parseInt(item.in_progress) || 0,
        completed: parseInt(item.completed) || 0
      })),

      // Task Progress Timeline
      task_progress_timeline: transformNumberedObject(taskProgressTimeline, item => ({
        date: item.date,
        startup: item.startup,
        task_count: parseInt(item.task_count) || 0
      })),

      // Weekly Task Comparison
      weekly_task_comparison: transformNumberedObject(weeklyTaskComparison, item => ({
        startup: item.startup,
        planned: parseInt(item.planned) || 0,
        completed: parseInt(item.completed) || 0
      })),

      // Milestone Progress
      milestone_progress: transformNumberedObject(milestoneProgress, item => ({
        startup: item.startup,
        achieved: parseInt(item.achieved) || 0,
        total: parseInt(item.total) || 0
      })),

      // Issue Resolution
      issue_resolution: transformNumberedObject(issueResolution, item => ({
        startup: item.startup,
        resolved: parseInt(item.resolved) || 0,
        unresolved: parseInt(item.unresolved) || 0
      })),

      // Attendance Trends
      attendance_trends: transformNumberedObject(attendanceTrends, item => ({
        date: item.date,
        rate: parseFloat(item.rate)
      })),

      // Startup Attendance
      startup_attendance: transformNumberedObject(startupAttendance, item => ({
        startup: item.startup_name,
        startup_id: item.startup_id,
        rate: parseFloat(item.attendance_rate).toFixed(2)
      })),

      // High Absenteeism
      high_absenteeism: transformNumberedObject(highAbsenteeism, item => ({
        startup: item.startup_name,
        startup_id: item.startup_id,
        absent_days: parseInt(item.absent_days) || 0
      })),

      // Static user roles data
      users_by_role: [
        { name: "Senior Developers", value: 15 },
        { name: "Interns", value: 8 },
        { name: "SIWES", value: 12 }
      ]
    };

    res.json({ success: true, data: startupStats });
  })
  .catch((err) => {
    console.error("Error executing stored procedure:", err);
    res.json({ success: false, message: err.message });
  });
};

// Helper function to transform numbered objects from stored procedure
function transformNumberedObject(obj, transformFn) {
  if (!obj || typeof obj !== 'object') return [];
  
  return Object.keys(obj)
    .filter(key => !isNaN(parseInt(key))) // Only process numeric keys
    .map(key => transformFn(obj[key]))
    .filter(item => item !== null); // Remove any null items
}


