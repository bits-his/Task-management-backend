import db from "../models/index.js";

export const numberGeneratorApi = async (
  { description = null, query_type = null, code = null },
  callback = (f) => f,
  error = (f) => f
) => {
  try {
    if (query_type === "next") {
      const row = await db.number_generator.findOne({
        where: { description },
        raw: true,
      });
      const next = row ? Number(row.last_code) + 1 : 1;
      return callback([{ code: next }]);
    }
    if (query_type === "update") {
      await db.number_generator.update(
        { last_code: code },
        { where: { description } }
      );
      return callback([{ description, code }]);
    }
    return callback([]);
  } catch (err) {
    return error(err);
  }
};
