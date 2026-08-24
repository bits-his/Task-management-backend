import Sequelize from "sequelize";

/**
 * Idempotent internship schema patches (safe on every boot).
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
      console.log("Added internship_application.school_state");
    }
    if (!cols.resubmit_token_hash) {
      await qi.addColumn("internship_application", "resubmit_token_hash", {
        type: Sequelize.STRING(64),
        allowNull: true,
      });
      console.log("Added internship_application.resubmit_token_hash");
    }
    if (!cols.resubmit_token_expires_at) {
      await qi.addColumn("internship_application", "resubmit_token_expires_at", {
        type: Sequelize.DATE,
        allowNull: true,
      });
      console.log("Added internship_application.resubmit_token_expires_at");
    }
  } catch (err) {
    console.warn("ensureInternshipSchema:", err.message);
  }
}
