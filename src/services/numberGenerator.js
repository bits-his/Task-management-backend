import db from "../models/index.js";

/**
 * Atomically increment number_generator and return the next code string.
 * Mirrors stored-procedure ID generation (STA, dpt, TAS, USR, etc.).
 */
export async function nextCode(prefix, description, options = {}) {
  const { pad = 2, numericOnly = false, transaction: outerTx } = options;
  const run = async (transaction) => {
    const row = await db.number_generator.findOne({
      where: { prefix, description },
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    if (!row) {
      throw new Error(
        `number_generator row not found for prefix=${prefix} description=${description}`
      );
    }

    const next = Number(row.last_code) + 1;
    await row.update({ last_code: next }, { transaction });

    const padded = String(next).padStart(pad, "0");
    const code = numericOnly ? padded : `${prefix}${padded}`;

    return { next, code, padded, row };
  };

  if (outerTx) {
    return run(outerTx);
  }

  return db.sequelize.transaction(run);
}

/**
 * Startup insert uses strp for display startup_id (matching procedure).
 * STA row is updated when present (legacy procedure behavior).
 */
export async function nextStartupCode(transaction) {
  const strp = await nextCode("strp", "startups", {
    pad: 2,
    numericOnly: true,
    transaction,
  });

  try {
    await nextCode("STA", "startup", { pad: 5, transaction });
  } catch (err) {
    // STA row may be missing in some dumps; strp is the source of startup_id
  }

  return {
    startupCode: strp.padded,
  };
}

/**
 * Generate next user_id like USR00003 from NumberGenerator table.
 */
export async function nextUserId(rolePrefix = "USR") {
  return db.sequelize.transaction(async (transaction) => {
    let row = await db.NumberGenerator.findOne({
      where: { role: rolePrefix },
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    if (!row) {
      row = await db.NumberGenerator.create(
        { role: rolePrefix, last_number: 0 },
        { transaction }
      );
    }

    let next = Number(row.last_number) + 1;
    let userId = `${rolePrefix}${String(next).padStart(5, "0")}`;

    // Avoid collisions if users already exist beyond generator
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const exists = await db.users.findOne({
        where: { user_id: userId },
        transaction,
      });
      if (!exists) break;
      next += 1;
      userId = `${rolePrefix}${String(next).padStart(5, "0")}`;
    }

    await row.update({ last_number: next }, { transaction });
    return userId;
  });
}

export default { nextCode, nextStartupCode, nextUserId };
