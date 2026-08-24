import { migrateAllUsersToMemberships } from "./membershipService.js";

const LEGACY_USER_CONTEXT_COLUMNS = [
  "role",
  "startup_id",
  "dept_id",
  "access_to",
  "functionalities",
];

/**
 * Ensure auth-related columns/tables exist without force-dropping data.
 * Also migrates legacy users.* context columns into user_memberships, then drops them.
 */
export async function ensureAuthSchema(sequelize) {
  const alterIfMissing = async (table, column, definition) => {
    const [rows] = await sequelize.query(
      `SHOW COLUMNS FROM \`${table}\` LIKE :column`,
      { replacements: { column } }
    );
    if (!rows.length) {
      await sequelize.query(
        `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`
      );
      console.log(`Added column ${table}.${column}`);
    }
  };

  await alterIfMissing(
    "users",
    "email_verified",
    "TINYINT(1) NOT NULL DEFAULT 1"
  );
  await alterIfMissing(
    "users",
    "email_verify_token",
    "VARCHAR(128) NULL"
  );
  await alterIfMissing(
    "users",
    "email_verify_expires",
    "DATETIME NULL"
  );
  await alterIfMissing(
    "users",
    "password_reset_token",
    "VARCHAR(128) NULL"
  );
  await alterIfMissing(
    "users",
    "password_reset_expires",
    "DATETIME NULL"
  );

  // Create sessions table if missing (sync also creates it)
  await sequelize.getQueryInterface().createTable(
    "user_sessions",
    {
      id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: { type: sequelize.Sequelize.STRING(20), allowNull: false },
      session_token: {
        type: sequelize.Sequelize.STRING(128),
        allowNull: false,
        unique: true,
      },
      device_name: { type: sequelize.Sequelize.STRING(255), allowNull: true },
      user_agent: { type: sequelize.Sequelize.TEXT, allowNull: true },
      ip_address: { type: sequelize.Sequelize.STRING(64), allowNull: true },
      last_active: { type: sequelize.Sequelize.DATE, allowNull: false },
      expires_at: { type: sequelize.Sequelize.DATE, allowNull: false },
      revoked_at: { type: sequelize.Sequelize.DATE, allowNull: true },
      created_at: { type: sequelize.Sequelize.DATE, allowNull: false },
      updated_at: { type: sequelize.Sequelize.DATE, allowNull: false },
    },
    { logging: false }
  ).catch(() => {
    // table already exists
  });

  await sequelize.getQueryInterface().createTable(
    "user_memberships",
    {
      id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: { type: sequelize.Sequelize.STRING(10), allowNull: false },
      org_id: { type: sequelize.Sequelize.STRING(50), allowNull: false },
      startup_id: { type: sequelize.Sequelize.STRING(50), allowNull: true },
      dept_id: { type: sequelize.Sequelize.STRING(50), allowNull: true },
      role: { type: sequelize.Sequelize.STRING(50), allowNull: true },
      access_to: { type: sequelize.Sequelize.TEXT("long"), allowNull: true },
      functionalities: {
        type: sequelize.Sequelize.TEXT("long"),
        allowNull: true,
      },
      is_primary: {
        type: sequelize.Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      status: {
        type: sequelize.Sequelize.ENUM("active", "inactive"),
        allowNull: false,
        defaultValue: "active",
      },
      created_at: { type: sequelize.Sequelize.DATE, allowNull: false },
      updated_at: { type: sequelize.Sequelize.DATE, allowNull: false },
    },
    { logging: false }
  ).catch(() => {
    // table already exists
  });

  // Department is optional on memberships coerce NOT NULL → NULL if needed
  try {
    const [cols] = await sequelize.query(
      `SHOW COLUMNS FROM \`user_memberships\` LIKE 'dept_id'`
    );
    const col = cols?.[0];
    if (col && String(col.Null).toUpperCase() === "NO") {
      await sequelize.query(
        `ALTER TABLE \`user_memberships\` MODIFY COLUMN \`dept_id\` VARCHAR(50) NULL`
      );
      console.log("Altered user_memberships.dept_id to allow NULL");
    }
  } catch (err) {
    console.warn("user_memberships.dept_id nullability check:", err.message);
  }

  // Migrate legacy users context columns → memberships BEFORE dropping them
  try {
    await migrateAllUsersToMemberships();
    console.log("User memberships migration complete");
  } catch (err) {
    console.warn("Membership migration skipped:", err.message);
  }

  await dropLegacyUserContextColumns(sequelize);
}

async function dropLegacyUserContextColumns(sequelize) {
  try {
    // Drop FKs that point at startups / departments via legacy columns
    const [fks] = await sequelize.query(
      `SELECT CONSTRAINT_NAME, COLUMN_NAME
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'users'
         AND REFERENCED_TABLE_NAME IS NOT NULL
         AND COLUMN_NAME IN ('startup_id', 'dept_id')`
    );

    for (const fk of fks || []) {
      try {
        await sequelize.query(
          `ALTER TABLE \`users\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``
        );
        console.log(`Dropped FK users.${fk.CONSTRAINT_NAME}`);
      } catch (err) {
        console.warn(`Drop FK ${fk.CONSTRAINT_NAME}:`, err.message);
      }
    }

    for (const column of LEGACY_USER_CONTEXT_COLUMNS) {
      const [cols] = await sequelize.query(
        `SHOW COLUMNS FROM \`users\` LIKE :column`,
        { replacements: { column } }
      );
      if (!cols?.length) continue;
      try {
        await sequelize.query(
          `ALTER TABLE \`users\` DROP COLUMN \`${column}\``
        );
        console.log(`Dropped legacy column users.${column}`);
      } catch (err) {
        console.warn(`Drop users.${column}:`, err.message);
      }
    }
  } catch (err) {
    console.warn("Legacy users column cleanup:", err.message);
  }
}

export default ensureAuthSchema;
