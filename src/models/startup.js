export default (sequelize, DataTypes) => {
  const Startup = sequelize.define(
    "startups",
    {
      startup_id: { type: DataTypes.STRING(50), primaryKey: true },
      org_id: { type: DataTypes.STRING(50), allowNull: true },
      name: { type: DataTypes.STRING(50), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: false },
      logo: { type: DataTypes.TEXT, allowNull: true },
      created_by: { type: DataTypes.STRING(10), allowNull: false },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  Startup.associate = (models) => {
    Startup.belongsTo(models.organizations, { foreignKey: "org_id", targetKey: "org_id", as: "organization" });
    Startup.hasMany(models.user_memberships, {
      foreignKey: "startup_id",
      sourceKey: "startup_id",
      as: "memberships",
    });
    Startup.hasMany(models.task_form, { foreignKey: "startup_id", sourceKey: "startup_id", as: "tasks" });
    Startup.hasMany(models.startup_departments, { foreignKey: "startup_id", sourceKey: "startup_id", as: "startupDepartments" });
  };

  return Startup;
};
