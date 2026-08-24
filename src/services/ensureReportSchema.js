/**
 * Ensure report_items exists and weekly_reports has a user+date unique key.
 * Safe to run on every boot (idempotent).
 */
export default async function ensureReportSchema(sequelize) {
  const qi = sequelize.getQueryInterface();

  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS report_items (
        id INT NOT NULL AUTO_INCREMENT,
        report_id INT NOT NULL,
        type ENUM('task','note','blocker','learning','other') NOT NULL DEFAULT 'note',
        task_id VARCHAR(100) NULL,
        title VARCHAR(255) NULL,
        body TEXT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY report_items_report_id (report_id),
        KEY report_items_task_id (task_id),
        CONSTRAINT report_items_report_fk
          FOREIGN KEY (report_id) REFERENCES weekly_reports (id)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (err) {
    // Table may already exist without FK, or FK may fail on bad data still usable
    if (!/already exists/i.test(err.message)) {
      console.warn("ensureReportSchema report_items:", err.message);
    }
  }

  try {
    const indexes = await qi.showIndex("weekly_reports");
    const hasUnique = indexes.some(
      (i) =>
        i.name === "weekly_reports_user_date_unique" ||
        (i.unique &&
          Array.isArray(i.fields) &&
          i.fields.map((f) => f.attribute || f.name).join(",") ===
            "user_id,report_date")
    );
    if (!hasUnique) {
      await sequelize.query(`
        ALTER TABLE weekly_reports
        ADD UNIQUE KEY weekly_reports_user_date_unique (user_id, report_date)
      `);
    }
  } catch (err) {
    console.warn("ensureReportSchema weekly_reports unique:", err.message);
  }
}
