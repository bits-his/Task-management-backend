import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import Sequelize from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const basename = path.basename(__filename);

const config = {
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  dialect: process.env.DB_DIALECT || "mysql",
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
};

const db = {};

const sequelize = config.use_env_variable
  ? new Sequelize(process.env[config.use_env_variable], config)
  : new Sequelize(
      config.database,
      config.username,
      config.password,
      config
    );

const modelFiles = fs
  .readdirSync(__dirname)
  .filter(
    (file) =>
      file.indexOf(".") !== 0 &&
      file !== basename &&
      file.slice(-3) === ".js"
  );

for (const file of modelFiles) {
  const fileUrl = pathToFileURL(path.join(__dirname, file)).href;
  const mod = await import(fileUrl);
  const defineModel = mod.default;
  if (typeof defineModel !== "function") {
    console.warn(`Skipping model file without default export: ${file}`);
    continue;
  }
  const model = defineModel(sequelize, Sequelize.DataTypes);
  db[model.name] = model;
}

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

export default db;
