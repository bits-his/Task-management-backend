import db from "../models/index.js";

/**
 * Ensure tables for roadmap module exist and seed default published templates with W3Schools curriculum.
 * Safe to run on every server boot (idempotent).
 */
export default async function ensureRoadmapSchema(sequelize) {
  const qi = (sequelize || db.sequelize).getQueryInterface();
  const seq = sequelize || db.sequelize;

  // 1. Create roadmap_templates
  try {
    await seq.query(`
      CREATE TABLE IF NOT EXISTS roadmap_templates (
        id INT NOT NULL AUTO_INCREMENT,
        roadmap_id VARCHAR(50) NOT NULL,
        org_id VARCHAR(50) NOT NULL DEFAULT '1',
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        total_weeks INT NOT NULL DEFAULT 10,
        status ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
        created_by VARCHAR(100) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY roadmap_templates_roadmap_id (roadmap_id),
        KEY roadmap_templates_org_id (org_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (err) {
    if (!/already exists/i.test(err.message)) {
      console.warn("ensureRoadmapSchema roadmap_templates:", err.message);
    }
  }

  // 2. Create roadmap_phases
  try {
    await seq.query(`
      CREATE TABLE IF NOT EXISTS roadmap_phases (
        id INT NOT NULL AUTO_INCREMENT,
        phase_id VARCHAR(50) NOT NULL,
        roadmap_id VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        duration_weeks INT NOT NULL DEFAULT 2,
        duration_days INT NOT NULL DEFAULT 14,
        learning_goals TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY roadmap_phases_phase_id (phase_id),
        KEY roadmap_phases_roadmap_id (roadmap_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (err) {
    if (!/already exists/i.test(err.message)) {
      console.warn("ensureRoadmapSchema roadmap_phases:", err.message);
    }
  }

  // 3. Create roadmap_items
  try {
    await seq.query(`
      CREATE TABLE IF NOT EXISTS roadmap_items (
        id INT NOT NULL AUTO_INCREMENT,
        item_id VARCHAR(50) NOT NULL,
        phase_id VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        question TEXT NULL,
        description TEXT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        offset_days INT NOT NULL DEFAULT 0,
        due_offset_days INT NOT NULL DEFAULT 7,
        type ENUM('lesson', 'exercise', 'project', 'quiz') NOT NULL DEFAULT 'lesson',
        resource_url VARCHAR(500) NULL,
        checklist JSON NULL,
        requires_submission TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY roadmap_items_item_id (item_id),
        KEY roadmap_items_phase_id (phase_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (err) {
    if (!/already exists/i.test(err.message)) {
      console.warn("ensureRoadmapSchema roadmap_items:", err.message);
    }
  }

  // 4. Create roadmap_enrollments
  try {
    await seq.query(`
      CREATE TABLE IF NOT EXISTS roadmap_enrollments (
        id INT NOT NULL AUTO_INCREMENT,
        enrollment_id VARCHAR(50) NOT NULL,
        roadmap_id VARCHAR(50) NOT NULL,
        user_id VARCHAR(100) NOT NULL,
        start_date DATE NOT NULL,
        expected_end_date DATE NOT NULL,
        assigned_by VARCHAR(100) NULL,
        mentor_user_id VARCHAR(100) NULL,
        status ENUM('active', 'completed', 'paused', 'dropped') NOT NULL DEFAULT 'active',
        custom_duration_overrides JSON NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY enrollment_user_roadmap (user_id, roadmap_id),
        KEY roadmap_enrollments_user_id (user_id),
        KEY roadmap_enrollments_roadmap_id (roadmap_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (err) {
    if (!/already exists/i.test(err.message)) {
      console.warn("ensureRoadmapSchema roadmap_enrollments:", err.message);
    }
  }

  // 5. Create roadmap_progress
  try {
    await seq.query(`
      CREATE TABLE IF NOT EXISTS roadmap_progress (
        id INT NOT NULL AUTO_INCREMENT,
        enrollment_id VARCHAR(50) NOT NULL,
        item_id VARCHAR(50) NOT NULL,
        status ENUM('not_started', 'in_progress', 'submitted', 'completed', 'overdue') NOT NULL DEFAULT 'not_started',
        started_at DATETIME NULL,
        completed_at DATETIME NULL,
        notes TEXT NULL,
        task_id VARCHAR(100) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY progress_enrollment_item (enrollment_id, item_id),
        KEY roadmap_progress_enrollment_id (enrollment_id),
        KEY roadmap_progress_item_id (item_id),
        KEY roadmap_progress_task_id (task_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (err) {
    if (!/already exists/i.test(err.message)) {
      console.warn("ensureRoadmapSchema roadmap_progress:", err.message);
    }
  }

  // 6. Ensure roadmap_items has new columns
  try {
    const itemTable = await qi.describeTable("roadmap_items");
    if (!itemTable.question) {
      await qi.addColumn("roadmap_items", "question", { type: db.Sequelize.TEXT, allowNull: true });
    }
    if (!itemTable.image_url) {
      await qi.addColumn("roadmap_items", "image_url", { type: db.Sequelize.STRING(500), allowNull: true });
    }
    if (!itemTable.submission_type) {
      await qi.addColumn("roadmap_items", "submission_type", {
        type: db.Sequelize.ENUM("none", "text", "url", "select", "multi_select"),
        allowNull: false,
        defaultValue: "none",
      });
    }
    if (!itemTable.submission_options) {
      await qi.addColumn("roadmap_items", "submission_options", { type: db.Sequelize.JSON, allowNull: true });
    }
    if (!itemTable.correct_answer) {
      await qi.addColumn("roadmap_items", "correct_answer", { type: db.Sequelize.TEXT, allowNull: true });
    }
  } catch (err) {
    /* ignore if exists */
  }

  // 7. Ensure roadmap_progress has submission_url & checklist_progress
  try {
    const progTable = await qi.describeTable("roadmap_progress");
    if (!progTable.submission_url) {
      await qi.addColumn("roadmap_progress", "submission_url", { type: db.Sequelize.STRING(500), allowNull: true });
    }
    if (!progTable.checklist_progress) {
      await qi.addColumn("roadmap_progress", "checklist_progress", { type: db.Sequelize.JSON, allowNull: true });
    }
  } catch (err) {
    /* ignore if exists */
  }
}
