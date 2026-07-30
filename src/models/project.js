export default (sequelize, DataTypes) => {
  const Project = sequelize.define(
    "projects",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      project_id: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      org_id: { type: DataTypes.STRING(50), allowNull: false },
      startup_id: { type: DataTypes.STRING(50), allowNull: true },
      name: { type: DataTypes.STRING(200), allowNull: false },
      description: { type: DataTypes.TEXT("long"), allowNull: true },
      start_date: { type: DataTypes.DATEONLY, allowNull: true },
      due_date: { type: DataTypes.DATEONLY, allowNull: true },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "active",
      },
      created_by: { type: DataTypes.STRING(20), allowNull: true },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  Project.associate = (models) => {
    Project.hasMany(models.project_members, {
      foreignKey: "project_id",
      sourceKey: "project_id",
      as: "members",
    });
    Project.belongsTo(models.users, {
      foreignKey: "created_by",
      targetKey: "user_id",
      as: "creator",
    });
  };

  return Project;
};
