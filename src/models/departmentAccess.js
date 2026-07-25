export default (sequelize, DataTypes) => {
  const DepartmentAccess = sequelize.define(
    "department_access",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      dept_id: { type: DataTypes.STRING(50), allowNull: false },
      access_to: { type: DataTypes.TEXT, allowNull: false },
      functionalities: { type: DataTypes.TEXT, allowNull: false },
    },
    {
      freezeTableName: true,
      timestamps: false,
    }
  );

  DepartmentAccess.associate = (models) => {
    DepartmentAccess.belongsTo(models.departments, { foreignKey: "dept_id", targetKey: "dept_id", as: "department" });
  };

  return DepartmentAccess;
};
