import Sequelize from "sequelize";

/**
 * Idempotent schema patches (safe on every boot).
 */
export default async function ensureInternshipSchema(sequelize) {
  const qi = sequelize.getQueryInterface();

  try {
    const cols = await qi.describeTable("internship_application");
    if (!cols.school_state) {
      await qi.addColumn("internship_application", "school_state", {
        type: Sequelize.STRING(80),
        allowNull: true,
      });
    }
    if (!cols.resubmit_token_hash) {
      await qi.addColumn("internship_application", "resubmit_token_hash", {
        type: Sequelize.STRING(64),
        allowNull: true,
      });
    }
    if (!cols.resubmit_token_expires_at) {
      await qi.addColumn("internship_application", "resubmit_token_expires_at", {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
  } catch (err) {
    console.warn("ensureInternshipSchema (application table):", err.message);
  }

  // Ensure users.office_days exists and default Mon-Fri is set for existing users
  try {
    const userCols = await qi.describeTable("users");
    if (!userCols.office_days) {
      await qi.addColumn("users", "office_days", {
        type: Sequelize.TEXT("long"),
        allowNull: true,
      });
      console.log("Added users.office_days column");
    }

    // Set default Mon-Fri for users without office_days
    await sequelize.query(
      `UPDATE users SET office_days = '["mon","tue","wed","thu","fri"]' WHERE office_days IS NULL OR TRIM(office_days) = ''`
    ).catch(() => {});

    // Copy legacy placement office_days to users table if available
    await sequelize.query(`
      UPDATE users u
      INNER JOIN internship_person p ON p.user_id = u.user_id
      INNER JOIN internship_placement pl ON pl.person_id = p.id
      SET u.office_days = pl.office_days
      WHERE pl.office_days IS NOT NULL AND TRIM(pl.office_days) != ''
    `).catch(() => {});

  } catch (err) {
    console.warn("ensureInternshipSchema (users table office_days):", err.message);
  }
}
