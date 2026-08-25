import db from "../models/index.js";

/**
 * Ensure a number_generator row exists (seeds from defaults / max existing codes).
 * Used when dumps omit rows the old stored procedures assumed were present.
 */
export async function ensureNumberGeneratorRow(
  prefix,
  description = prefix,
  options = {}
) {
  const desc = (typeof description === "string" && description.trim()) ? description.trim() : prefix;
  const opts = (typeof description === "object" && description !== null) ? description : options;

  const {
    transaction,
    level = "1",
    max_code = 10,
    seedFromTaskIds = false,
  } = opts;

  let row = await db.number_generator.findOne({
    where: { prefix, description: desc },
    lock: transaction?.LOCK?.UPDATE,
    transaction,
  });
  if (row) return row;

  let last_code = 0;
  if (seedFromTaskIds) {
    try {
      const [rows] = await db.sequelize.query(
        `SELECT MAX(CAST(SUBSTRING(task_id, 4) AS UNSIGNED)) AS max_n
         FROM task_form
         WHERE task_id LIKE 'TAS%'`,
        { transaction }
      );
      last_code = Number(rows?.[0]?.max_n) || 0;
    } catch {
      last_code = 0;
    }
  }

  const maxPk = await db.number_generator.max("code", { transaction });
  const nextPk = Number(maxPk || 0) + 1;

  try {
    row = await db.number_generator.create(
      {
        prefix,
        code: nextPk,
        last_code,
        description: desc,
        level,
        max_code,
      },
      { transaction }
    );
  } catch (err) {
    // Race: another request may have inserted the same prefix/description
    row = await db.number_generator.findOne({
      where: { prefix, description: desc },
      lock: transaction?.LOCK?.UPDATE,
      transaction,
    });
    if (!row) throw err;
  }
  return row;
}

/**
 * Atomically increment number_generator and return the next code string.
 * Mirrors stored-procedure ID generation (STA, dpt, TAS, USR, etc.).
 * Creates the generator row if missing (e.g. TAS/task).
 */
export async function nextCode(prefix, description = prefix, options = {}) {
  const desc = (typeof description === "string" && description.trim()) ? description.trim() : prefix;
  const opts = (typeof description === "object" && description !== null) ? description : options;

  const {
    pad = 5,
    numericOnly = false,
    transaction: outerTx,
    ensure = true,
    seedFromTaskIds = prefix === "TAS" && desc === "task",
    level = "1",
    max_code = pad,
  } = opts;

  const run = async (transaction) => {
    let row = await db.number_generator.findOne({
      where: { prefix, description: desc },
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    if (!row && ensure) {
      await ensureNumberGeneratorRow(prefix, desc, {
        transaction,
        level,
        max_code,
        seedFromTaskIds,
      });
      row = await db.number_generator.findOne({
        where: { prefix, description: desc },
        lock: transaction.LOCK.UPDATE,
        transaction,
      });
    }

    if (!row) {
      throw new Error(
        `number_generator row not found for prefix=${prefix} description=${description}`
      );
    }

    const next = Number(row.last_code) + 1;
    await row.update({ last_code: next }, { transaction });

    const padded = String(next).padStart(pad, "0");
    const code = numericOnly ? padded : `${prefix}${padded}`;
    const res = { next, code, padded, row };
    res.toString = function () {
      return code;
    };
    res[Symbol.toPrimitive] = function () {
      return code;
    };
    return res;
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
  } catch {
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

export default { nextCode, nextStartupCode, nextUserId, ensureNumberGeneratorRow };
