export default (sequelize, DataTypes) => {
  const ProjectMember = sequelize.define(
    "project_members",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      project_id: { type: DataTypes.STRING(30), allowNull: false },
      user_id: { type: DataTypes.STRING(20), allowNull: false },
      role: {
        type: DataTypes.ENUM("lead", "contributor"),
        allowNull: false,
        defaultValue: "contributor",
      },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        {
          unique: true,
          fields: ["project_id", "user_id"],
        },
      ],
    }
  );

  ProjectMember.associate = (models) => {
    ProjectMember.belongsTo(models.projects, {
      foreignKey: "project_id",
      targetKey: "project_id",
      as: "project",
    });
    ProjectMember.belongsTo(models.users, {
      foreignKey: "user_id",
      targetKey: "user_id",
      as: "user",
    });
  };

  return ProjectMember;
};
