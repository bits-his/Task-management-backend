export default (sequelize, DataTypes) => {
  const StartupDepartment = sequelize.define(
    "startup_departments",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      startup_id: { type: DataTypes.STRING(50), allowNull: true },
      dept_id: { type: DataTypes.STRING(50), allowNull: false },
      org_id: { type: DataTypes.STRING(50), allowNull: false },
      status: { type: DataTypes.ENUM("active", "inactive"), defaultValue: "inactive" },
      created_by: { type: DataTypes.STRING(30), allowNull: false },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  StartupDepartment.associate = (models) => {
    StartupDepartment.belongsTo(models.startups, { foreignKey: "startup_id", targetKey: "startup_id", as: "startup" });
    StartupDepartment.belongsTo(models.departments, { foreignKey: "dept_id", targetKey: "dept_id", as: "department" });
  };

  return StartupDepartment;
};
