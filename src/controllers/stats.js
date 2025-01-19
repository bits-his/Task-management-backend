import db from "../models";



export const getStats = (req,res)=>{
console.log(req.body);
    const {create_by="",excuse_type="",excuse_day="2024-12-12",status="",excuse_description="",approved_by="",id=0}=req.body;
    const{query_type="",user_id}=req.query;

    db.sequelize
      .query(`CALL getTaskStatistics(:query_type, :user_id)`, {
        replacements: {
          query_type,
           user_id,
        },
      })
      .then((resp) => {
        res.json({ success: true, data: resp });
      })
      .catch((err) => {
        console.log(err);
      });
}

export const getAllStartupMembers = (req, res) => {
  db.sequelize.query(`CALL GetStartupStats()`, {
    type: db.Sequelize.QueryTypes.SELECT
  })
  .then((response) => {
    const [totalStats, taskStatusDistribution, taskStatusByStartup, taskProgressTimeline, weeklyTaskComparison, milestoneProgress, issueResolution, attendanceTrends, startupAttendance, highAbsenteeism] = response;
    

    const startupStats = {

      total_startups: totalStats[0].total_startups,
      total_completed_tasks: totalStats[0].total_completed_tasks,
      attendance_rate: totalStats[0].attendance_rate,
      weekly_reports_submitted: totalStats[0].weekly_reports_submitted,
      milestones_achieved: totalStats[0].milestones_achieved,

 
      task_status_distribution: taskStatusDistribution.map(item => ({
        status: item.status,
        count: item.count
      })),
      task_status_by_startup: taskStatusByStartup.map(item => ({
        startup: item.startup,
        pending: item.pending,
        inProgress: item.in_progress,
        completed: item.completed
      })),
      task_progress_timeline: taskProgressTimeline.map(item => ({
        date: item.date,
        [item.startup]: item.task_count
      })),
      performance_metrics: milestoneProgress.map(item => ({
        startup: item.startup,
        completion_time: 85, 
        total_tasks: 45, 
        high_priority: item.total,
        overdue: 2 
      })),


      weekly_task_comparison: weeklyTaskComparison.map(item => ({
        startup: item.startup,
        planned: item.planned,
        completed: item.completed
      })),
      milestone_progress: milestoneProgress.map(item => ({
        startup: item.startup,
        achieved: item.achieved,
        total: item.total
      })),
      issue_resolution: issueResolution.map(item => ({
        startup: item.startup,
        resolved: item.resolved,
        unresolved: item.unresolved
      })),

   
      overall_attendance: 85,
      attendance_trends: attendanceTrends.map(item => ({
        date: item.date,
        rate: item.rate
      })),
      startup_attendance: startupAttendance.map(item => ({
        startup: item.startup_name,
        rate: item.attendance_rate
      })),
      high_absenteeism: highAbsenteeism.map(item => ({
        startup: item.startup_name,
        absent_days: item.absent_days
      })),


      startups_data: [], 
      users_by_role: [
        { name: "Senior Developers", value: 15 },
        { name: "Interns", value: 8 },
        { name: "SIWES", value: 12 }
      ]
    };
    
    res.json({ success: true, data: startupStats });
  })
  .catch((err) => {
    res.json({ success: false, message: err.message });
  });
};
