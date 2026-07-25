export default (sequelize, DataTypes) => {
  const Role = sequelize.define(
    "roles",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      role_id: { type: DataTypes.STRING(10), allowNull: false, unique: true },
      role_name: { type: DataTypes.STRING(100), allowNull: false },
      dept_id: { type: DataTypes.STRING(10), allowNull: false },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  Role.associate = (models) => {
    Role.belongsTo(models.departments, { foreignKey: "dept_id", targetKey: "dept_id", as: "department" });
  };

  return Role;
};
