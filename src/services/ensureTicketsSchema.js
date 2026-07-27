/**
 * Ensure tickets table has startup_id / org_id for request routing.
 * Sequelize sync() does not ALTER existing tables.
 */
export default async function ensureTicketsSchema(sequelize) {
  const columns = [
    { name: "startup_id", definition: "VARCHAR(50) NULL" },
    { name: "org_id", definition: "VARCHAR(50) NULL" },
  ];

  for (const { name, definition } of columns) {
    try {
      const [cols] = await sequelize.query(
        `SHOW COLUMNS FROM \`tickets\` LIKE '${name}'`
      );
      if (!cols?.length) {
        await sequelize.query(
          `ALTER TABLE \`tickets\` ADD COLUMN \`${name}\` ${definition}`
        );
        console.log(`ensureTicketsSchema: added ${name} to tickets`);
      }
    } catch (err) {
      console.warn(`ensureTicketsSchema ${name}:`, err.message);
    }
  }
}
