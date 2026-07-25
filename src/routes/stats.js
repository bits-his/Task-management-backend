import { getStats, getStatsAdmin, getDashboardSummaryHandler } from "../controllers/stats.js";
import db from "../models/index.js";
export default (app)=>{
    app.get("/api/get-stats",getStats);
    app.get("/api/get-statts-admin",getStatsAdmin);
    app.get("/api/dashboard/summary", getDashboardSummaryHandler);
    app.get('/api/analytics/status-distribution', async (req, res) => {
        const {assigned_to=""}=req.query;
        try {
          const query = `
            SELECT status, COUNT(*) as count 
            FROM task_form where assigned_to = "${assigned_to}"
            GROUP BY status 
          `;
          const data = await db.sequelize.query(query);
          res.json(data);
        } catch (error) {
          res.status(500).json({ error: 'Failed to fetch status distribution' });
        }
      });

      
      // Get priority distribution
      app.get('/api/analytics/priority-distribution', async (req, res) => {
        const {assigned_to=""}=req.query;
        try {
          const query = `
            SELECT priority, COUNT(*) as count 
            FROM task_form where assigned_to = "${assigned_to}"
            GROUP BY priority`;
          const data = await db.sequelize.query(query);
          res.json(data);
        } catch (error) {
          res.status(500).json({ error: 'Failed to fetch priority distribution' });
        }
      });
      
      // Get team performance
      app.get('/api/analytics/team-performance', async (req, res) => {
        const {assigned_to=""}=req.query;
        try {
          const query = `
            SELECT assigned_to, 
                   COUNT(*) as total_tasks,
                   SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
                   AVG(CASE WHEN rating IS NOT NULL THEN rating ELSE NULL END) as avg_rating
            FROM task_form 
            WHERE assigned_to IS NOT NULL and assigned_to = "${assigned_to}"
            GROUP BY assigned_to   `;
          const data = await db.sequelize.query(query);
          res.json(data);
        } catch (error) {
          res.status(500).json({ error: 'Failed to fetch team performance' });
        }
      });
      
      // Get task completion trend (last 30 days)
      app.get('/api/analytics/completion-trend', async (req, res) => {
        const {assigned_to=""}=req.query;
        try {
          const query = `
           SELECT DATE(submitted_date) as date, COUNT(*) as completed_tasks
FROM task_form 
WHERE status = 'completed' and assigned_to = "${assigned_to}"
GROUP BY DATE(submitted_date)
ORDER BY date;

          `;
          const data = await db.sequelize.query(query);
          res.json(data);
        } catch (error) {
          res.status(500).json({ error: 'Failed to fetch completion trend' });
        }
      });
      
      // Get overdue tasks
      app.get('/api/analytics/overdue-tasks', async (req, res) => {
        const {assigned_to=""}=req.query;
        try {
          const query = `
            SELECT COUNT(*) as overdue_count
            FROM task_form 
            WHERE due_date < NOW() 
              AND status NOT IN ('completed', 'cancelled') and assigned_to = "${assigned_to}"
          `;
          const data = await db.sequelize.query(query);
          res.json({ overdue_count: data[0].overdue_count });
        } catch (error) {
          res.status(500).json({ error: 'Failed to fetch overdue tasks' });
        }
      });
      
      // Get task ratings distribution
      app.get('/api/analytics/ratings-distribution', async (req, res) => {
        const {assigned_to=""}=req.query;
        try {
          const query = `
            SELECT rating, COUNT(*) as count 
            FROM task_form 
            WHERE rating IS NOT NULL and assigned_to = "${assigned_to}"
            GROUP BY rating
            ORDER BY rating
          `;
          const data = await db.sequelize.query(query);
          res.json(data);
        } catch (error) {
          res.status(500).json({ error: 'Failed to fetch ratings distribution' });
        }
      });
      
      // Get startup workload
      app.get('/api/analytics/startup-workload', async (req, res) => {
        const {assigned_to=""}=req.query;
        try {
          const query = `
            SELECT startup_id, 
                   COUNT(*) as total_tasks,
                   SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
                   SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
                   SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_tasks
            FROM task_form 
            WHERE startup_id IS NOT NULL and assigned_to = "${assigned_to}"
            GROUP BY startup_id
          `;
          const data = await db.sequelize.query(query);
          res.json(data);
        } catch (error) {
          res.status(500).json({ error: 'Failed to fetch startup workload' });
        }
      });
      
      // Get task creation vs completion
      app.get('/api/analytics/creation-vs-completion', async (req, res) => {
        const {assigned_to=""}=req.query;
        try {
          const query = `
            SELECT 
              DATE(created_at) as date,
              COUNT(*) as created_tasks,
              COALESCE(completed.completed_tasks, 0) as completed_tasks
            FROM task_form t
            LEFT JOIN (
              SELECT DATE(submitted_date) as date, COUNT(*) as completed_tasks
              FROM task_form 
              WHERE submitted_date IS NOT NULL and assigned_to = "${assigned_to}"
              GROUP BY DATE(submitted_date)
            ) completed ON DATE(t.created_at) = completed.date
            WHERE t.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(t.created_at)
            ORDER BY date
          `;
          const data = await db.sequelize.query(query);
          res.json(data);
        } catch (error) {
          res.status(500).json({ error: 'Failed to fetch creation vs completion data' });
        }
      });
      
      // Get dashboard summary
      app.get('/api/analytics/summary', async (req, res) => {
        const {assigned_to=""}=req.query;
        try {
          const queries = await Promise.all([
            db.sequelize.query('SELECT COUNT(*) as total FROM task_form'),
            db.sequelize.query('SELECT COUNT(*) as completed FROM task_form WHERE status = "completed"'),
            db.sequelize.query('SELECT COUNT(*) as in_progress FROM task_form WHERE status = "in_progress"'),
            db.sequelize.query('SELECT COUNT(*) as overdue FROM task_form WHERE due_date < NOW() AND status NOT IN ("completed", "cancelled")'),
            db.sequelize.query('SELECT AVG(rating) as avg_rating FROM task_form WHERE rating IS NOT NULL'),
            db.sequelize.query('SELECT COUNT(*) as rejected FROM task_form WHERE rejected = 1')
          ]);
      
          const summary = {
            total_tasks: queries[0][0].total,
            completed_tasks: queries[1][0].completed,
            in_progress_tasks: queries[2][0].in_progress,
            overdue_tasks: queries[3][0].overdue,
            average_rating: parseFloat(queries[4][0].avg_rating || 0).toFixed(1),
            rejected_tasks: queries[5][0].rejected
          };
      
          res.json(summary);
        } catch (error) {
          res.status(500).json({ error: 'Failed to fetch dashboard summary' });
        }
      });
      
}