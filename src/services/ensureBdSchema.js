/**
 * Ensure BD tables have startup_id for context scoping.
 */
export default async function ensureBdSchema(sequelize) {
  const tables = ["clients", "deals"];
  for (const table of tables) {
    try {
      const [cols] = await sequelize.query(`SHOW COLUMNS FROM \`${table}\` LIKE 'startup_id'`);
      if (!cols?.length) {
        await sequelize.query(
          `ALTER TABLE \`${table}\` ADD COLUMN startup_id VARCHAR(50) NULL AFTER id`
        );
        await sequelize.query(
          `ALTER TABLE \`${table}\` ADD INDEX \`${table}_startup_id\` (startup_id)`
        );
        console.log(`ensureBdSchema: added startup_id to ${table}`);
      }
    } catch (err) {
      console.warn(`ensureBdSchema ${table}:`, err.message);
    }
  }
}
