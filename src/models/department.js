export default (sequelize, DataTypes) => {
  const Department = sequelize.define(
    "departments",
    {
      dept_id: { type: DataTypes.STRING(50), primaryKey: true },
      dept_name: { type: DataTypes.STRING(255), allowNull: false },
      group_code: { type: DataTypes.STRING(10), allowNull: true },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  Department.associate = (models) => {
    Department.hasMany(models.user_memberships, {
      foreignKey: "dept_id",
      sourceKey: "dept_id",
      as: "memberships",
    });
    Department.hasMany(models.roles, { foreignKey: "dept_id", sourceKey: "dept_id", as: "roles" });
    Department.hasOne(models.department_access, { foreignKey: "dept_id", sourceKey: "dept_id", as: "access" });
    Department.hasMany(models.startup_departments, { foreignKey: "dept_id", sourceKey: "dept_id", as: "startupDepartments" });
  };

  return Department;
};
