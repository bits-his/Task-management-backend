import db from "./models/index.js";
import ensureRoadmapSchema from "./services/ensureRoadmapSchema.js";

async function runSeed() {
  console.log("🚀 Starting Roadmap Seeder Script...");

  try {
    // 1. Ensure DB connection and tables
    await db.sequelize.authenticate();
    console.log("✅ Database connection authenticated.");

    await ensureRoadmapSchema(db.sequelize);
    console.log("✅ Database tables ensured.");

    const seq = db.sequelize;

    // 2. Force-seed Templates if RMP-00001 is not present
    const [existing] = await seq.query(
      "SELECT roadmap_id FROM roadmap_templates WHERE roadmap_id = 'RMP-00001'"
    );

    if (existing && existing.length > 0) {
      console.log("ℹ️ Default Roadmap templates already exist in database.");
    } else {
      console.log("🌱 Inserting standard curriculum seed data...");
      // ensureRoadmapSchema handles template inserts
    }

    // Print summary of seeded templates
    const [templates] = await seq.query(
      "SELECT roadmap_id, title, total_weeks, status FROM roadmap_templates ORDER BY roadmap_id ASC"
    );

    console.log("\n📋 --- SEEDED ROADMAP TEMPLATES ---");
    templates.forEach((t, idx) => {
      console.log(
        ` [${idx + 1}] ID: ${t.roadmap_id} | ${t.title} (${t.total_weeks} Weeks) [${t.status.toUpperCase()}]`
      );
    });
    console.log("------------------------------------\n");

    console.log("🎉 Roadmap Seeding Completed Successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Roadmap Seeder Failed:", err.message);
    process.exit(1);
  }
}

runSeed();
