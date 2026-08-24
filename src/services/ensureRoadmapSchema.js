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
        custom_duration_overrides JSON NULL,
        status ENUM('active', 'completed', 'paused') NOT NULL DEFAULT 'active',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY roadmap_enrollments_enrollment_id (enrollment_id),
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

  // 6. Ensure report_items has roadmap_item_id column
  try {
    const tableInfo = await qi.describeTable("report_items");
    if (!tableInfo.roadmap_item_id) {
      await qi.addColumn("report_items", "roadmap_item_id", {
        type: db.Sequelize.STRING(50),
        allowNull: true,
      });
    }
  } catch (err) {
    /* column or table might already exist */
  }

  // 7. Seed Default Templates if not present
  await seedDefaultTemplates();
}

async function seedDefaultTemplates() {
  try {
    const existing = await db.roadmap_templates.findOne({
      where: { roadmap_id: "RMP-00001" },
    });
    if (existing) return;

    // Seed 1: Web Foundations — W3Schools Curriculum (10 Weeks / 2-3 Months)
    const rmp1 = "RMP-00001";
    await db.roadmap_templates.findOrCreate({
      where: { roadmap_id: rmp1 },
      defaults: {
        roadmap_id: rmp1,
        org_id: "1",
        title: "Web Foundations (W3Schools Curriculum — 10 Weeks)",
        description: "Structured Web Development roadmap for SIWES & Interns based on W3Schools HTML, CSS, and JavaScript tutorials.",
        total_weeks: 10,
        status: "published",
        created_by: "SYSTEM",
      },
    });

    // Phase 1: HTML (14 days / 2 weeks)
    const ph1 = "RPH-00001";
    await db.roadmap_phases.findOrCreate({
      where: { phase_id: ph1 },
      defaults: {
        phase_id: ph1,
        roadmap_id: rmp1,
        title: "HTML5 Tutorial & Semantics (2 Weeks)",
        sort_order: 1,
        duration_weeks: 2,
        duration_days: 14,
        learning_goals: "W3Schools HTML Tutorial: Learn document structure, semantic tags, forms, tables, and accessibility.",
      },
    });

    const itemsPhase1 = [
      {
        item_id: "RIT-00001",
        title: "HTML Introduction, Editors & Basic Syntax",
        description: "Study DOCTYPE, html, head, body, headings, paragraphs, and HTML elements.",
        sort_order: 1,
        offset_days: 0,
        due_offset_days: 2,
        type: "lesson",
        resource_url: "https://www.w3schools.com/html/html_intro.asp",
      },
      {
        item_id: "RIT-00002",
        title: "HTML Attributes, Styles, Links & Images",
        description: "Learn href, src, alt, width/height, inline styles, target attributes, and image paths.",
        sort_order: 2,
        offset_days: 2,
        due_offset_days: 2,
        type: "lesson",
        resource_url: "https://www.w3schools.com/html/html_attributes.asp",
      },
      {
        item_id: "RIT-00003",
        title: "HTML Tables, Lists, Block & Inline Elements",
        description: "Master div, span, ul, ol, li, table, tr, th, td, block vs inline display.",
        sort_order: 3,
        offset_days: 4,
        due_offset_days: 3,
        type: "exercise",
        resource_url: "https://www.w3schools.com/html/html_tables.asp",
      },
      {
        item_id: "RIT-00004",
        title: "HTML Forms, Input Types & Validation",
        description: "Create interactive forms with text, email, password, radio, checkbox, submit, and HTML5 validation attributes.",
        sort_order: 4,
        offset_days: 7,
        due_offset_days: 3,
        type: "exercise",
        resource_url: "https://www.w3schools.com/html/html_forms.asp",
      },
      {
        item_id: "RIT-00005",
        title: "HTML Semantic Elements & W3Schools Quiz",
        description: "Master header, nav, section, article, section, footer, main, and pass W3Schools HTML Quiz.",
        sort_order: 5,
        offset_days: 10,
        due_offset_days: 2,
        type: "quiz",
        resource_url: "https://www.w3schools.com/html/html_quiz.asp",
      },
      {
        item_id: "RIT-00006",
        title: "HTML Practical Mini-Project: Personal Profile Page",
        description: "Build a multi-page personal profile site with semantic tags, forms, tables, and images.",
        sort_order: 6,
        offset_days: 12,
        due_offset_days: 2,
        type: "project",
        requires_submission: true,
      },
    ];

    for (const item of itemsPhase1) {
      await db.roadmap_items.findOrCreate({
        where: { item_id: item.item_id },
        defaults: {
          ...item,
          phase_id: ph1,
        },
      });
    }

    // Phase 2: CSS (28 days / 4 weeks)
    const ph2 = "RPH-00002";
    await db.roadmap_phases.findOrCreate({
      where: { phase_id: ph2 },
      defaults: {
        phase_id: ph2,
        roadmap_id: rmp1,
        title: "CSS Layouts & Responsive Design (4 Weeks)",
        sort_order: 2,
        duration_weeks: 4,
        duration_days: 28,
        learning_goals: "W3Schools CSS Tutorial: Master box model, positioning, Flexbox, Grid, and Media Queries.",
      },
    });

    const itemsPhase2 = [
      {
        item_id: "RIT-00007",
        title: "CSS Syntax, Selectors & Colors",
        description: "Learn element, class, id, group, descendant selectors, RGB, HEX, and HSL colors.",
        sort_order: 1,
        offset_days: 0,
        due_offset_days: 4,
        type: "lesson",
        resource_url: "https://www.w3schools.com/css/css_syntax.asp",
      },
      {
        item_id: "RIT-00008",
        title: "CSS Box Model, Margins, Borders & Padding",
        description: "Master content box, padding, border, margin collapse, and box-sizing: border-box.",
        sort_order: 2,
        offset_days: 4,
        due_offset_days: 5,
        type: "exercise",
        resource_url: "https://www.w3schools.com/css/css_boxmodel.asp",
      },
      {
        item_id: "RIT-00009",
        title: "CSS Flexbox Layout Module",
        description: "Study flex-direction, justify-content, align-items, flex-wrap, and flex-grow.",
        sort_order: 3,
        offset_days: 9,
        due_offset_days: 5,
        type: "lesson",
        resource_url: "https://www.w3schools.com/css/css3_flexbox.asp",
      },
      {
        item_id: "RIT-00010",
        title: "CSS Grid Layout & Responsive Media Queries",
        description: "Learn grid-template-columns, fr units, gap, and media queries for mobile/tablet.",
        sort_order: 4,
        offset_days: 14,
        due_offset_days: 7,
        type: "exercise",
        resource_url: "https://www.w3schools.com/css/css_rwd_mediaqueries.asp",
      },
      {
        item_id: "RIT-00011",
        title: "CSS Quiz & Responsive Landing Page Project",
        description: "Pass W3Schools CSS Quiz and submit a fully responsive landing page.",
        sort_order: 5,
        offset_days: 21,
        due_offset_days: 7,
        type: "project",
        requires_submission: true,
        resource_url: "https://www.w3schools.com/css/css_quiz.asp",
      },
    ];

    for (const item of itemsPhase2) {
      await db.roadmap_items.findOrCreate({
        where: { item_id: item.item_id },
        defaults: {
          ...item,
          phase_id: ph2,
        },
      });
    }

    // Phase 3: JS (28 days / 4 weeks)
    const ph3 = "RPH-00003";
    await db.roadmap_phases.findOrCreate({
      where: { phase_id: ph3 },
      defaults: {
        phase_id: ph3,
        roadmap_id: rmp1,
        title: "JavaScript ES6+ & DOM Programming (4 Weeks)",
        sort_order: 3,
        duration_weeks: 4,
        duration_days: 28,
        learning_goals: "W3Schools JS Tutorial: Variables, Functions, DOM manipulation, Events, Async/Await, and Fetch API.",
      },
    });

    const itemsPhase3 = [
      {
        item_id: "RIT-00013",
        title: "JS Variables, Data Types & Operators",
        description: "Study let, const, var, string, number, boolean, array, object, arithmetic & logical operators.",
        sort_order: 1,
        offset_days: 0,
        due_offset_days: 5,
        type: "lesson",
        resource_url: "https://www.w3schools.com/js/js_variables.asp",
      },
      {
        item_id: "RIT-00014",
        title: "JS Functions, Arrow Functions & Scope",
        description: "Master function declarations, parameters, return values, arrow functions, and scope.",
        sort_order: 2,
        offset_days: 5,
        due_offset_days: 5,
        type: "exercise",
        resource_url: "https://www.w3schools.com/js/js_functions.asp",
      },
      {
        item_id: "RIT-00015",
        title: "JS DOM Manipulation & Event Handling",
        description: "Learn getElementById, querySelector, addEventListener, innerHTML, classList.",
        sort_order: 3,
        offset_days: 10,
        due_offset_days: 5,
        type: "exercise",
        resource_url: "https://www.w3schools.com/js/js_htmldom.asp",
      },
      {
        item_id: "RIT-00016",
        title: "JS Async, Promises, Async/Await & Fetch API",
        description: "Master Promises, async/await, fetching JSON data from REST APIs, and handling errors.",
        sort_order: 4,
        offset_days: 15,
        due_offset_days: 5,
        type: "exercise",
        resource_url: "https://www.w3schools.com/js/js_async.asp",
      },
      {
        item_id: "RIT-00017",
        title: "JS Web APIs, Local Storage & W3Schools Quiz",
        description: "Save state in localStorage, parse JSON, and complete the W3Schools JavaScript Quiz.",
        sort_order: 5,
        offset_days: 20,
        due_offset_days: 4,
        type: "quiz",
        resource_url: "https://www.w3schools.com/js/js_quiz.asp",
      },
      {
        item_id: "RIT-00018",
        title: "JS Capstone Project: Interactive Web Application",
        description: "Build an interactive web application (Task Manager or Weather Dashboard) with API calls and local storage.",
        sort_order: 6,
        offset_days: 24,
        due_offset_days: 4,
        type: "project",
        requires_submission: true,
      },
    ];

    for (const item of itemsPhase3) {
      await db.roadmap_items.findOrCreate({
        where: { item_id: item.item_id },
        defaults: {
          ...item,
          phase_id: ph3,
        },
      });
    }

    // Seed 2: Full Stack Engineering (6 Months / 24 Weeks)
    const rmp2 = "RMP-00002";
    await db.roadmap_templates.findOrCreate({
      where: { roadmap_id: rmp2 },
      defaults: {
        roadmap_id: rmp2,
        org_id: "1",
        title: "Full Stack Engineering (W3Schools & Node.js — 6 Months)",
        description: "Comprehensive 6-month curriculum covering Web Foundations (HTML/CSS/JS), React, Node.js APIs, SQL Databases, and Capstone Project.",
        total_weeks: 24,
        status: "published",
        created_by: "SYSTEM",
      },
    });

    const phasesRmp2 = [
      { phase_id: "RPH-00004", title: "Phase 1: Web & JS Core", sort_order: 1, duration_weeks: 4, duration_days: 28, learning_goals: "Core HTML5, CSS3, ES6+ JavaScript foundation." },
      { phase_id: "RPH-00005", title: "Phase 2: React & Modern Frontend", sort_order: 2, duration_weeks: 6, duration_days: 42, learning_goals: "React components, hooks, router, and state management." },
      { phase_id: "RPH-00006", title: "Phase 3: Node.js & Backend APIs", sort_order: 3, duration_weeks: 6, duration_days: 42, learning_goals: "Express.js, REST APIs, authentication, and validation." },
      { phase_id: "RPH-00007", title: "Phase 4: Database & Deployment", sort_order: 4, duration_weeks: 4, duration_days: 28, learning_goals: "Relational databases, ORM, indexing, and CI/CD hosting." },
      { phase_id: "RPH-00008", title: "Phase 5: Full Stack Capstone Project", sort_order: 5, duration_weeks: 4, duration_days: 28, learning_goals: "Build and present a complete production full-stack application." },
    ];

    for (const ph of phasesRmp2) {
      await db.roadmap_phases.findOrCreate({
        where: { phase_id: ph.phase_id },
        defaults: {
          ...ph,
          roadmap_id: rmp2,
        },
      });
    }

    // Seed 3: UI/UX Design & Product Track (8 Weeks)
    const rmp3 = "RMP-00003";
    await db.roadmap_templates.findOrCreate({
      where: { roadmap_id: rmp3 },
      defaults: {
        roadmap_id: rmp3,
        org_id: "1",
        title: "UI/UX Design & Product Track (8 Weeks)",
        description: "Comprehensive product design roadmap covering user research, wireframing, Figma prototyping, and design systems.",
        total_weeks: 8,
        status: "published",
        created_by: "SYSTEM",
      },
    });

    // Seed 4: Data Analytics & Python Track (12 Weeks)
    const rmp4 = "RMP-00004";
    await db.roadmap_templates.findOrCreate({
      where: { roadmap_id: rmp4 },
      defaults: {
        roadmap_id: rmp4,
        org_id: "1",
        title: "Data Analytics & Python Track (12 Weeks)",
        description: "Data analysis track covering Python programming, Pandas, SQL data querying, data visualization, and business dashboards.",
        total_weeks: 12,
        status: "published",
        created_by: "SYSTEM",
      },
    });

    console.log("Roadmap schema ensured and default templates seeded successfully via Sequelize.");
  } catch (err) {
    console.warn("seedDefaultTemplates error:", err.message);
  }
}
