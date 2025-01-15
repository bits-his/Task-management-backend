import db from "../models";
export const numberGeneratorApi = (
  { description = null, query_type = null, code = null },
  callback = (f) => f,
  error = (f) => f
) => {
  db.sequelize
    .query(`CALL number_gen(:query_type, :description, :code)`, {
      replacements: {
        query_type,
        description,
        code,
      },
    })
    .then(callback)
    .catch(error);
};
