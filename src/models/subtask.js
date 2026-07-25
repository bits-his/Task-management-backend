export default (sequelize, DataTypes) => {
  const Subtask = sequelize.define(
    "subtasks",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      task_id: { type: DataTypes.STRING(30), allowNull: true },
      title: { type: DataTypes.STRING(255), allowNull: false },
      status: { type: DataTypes.STRING(100), defaultValue: "pending" },
      completedBy: { type: DataTypes.STRING(100), allowNull: true },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  Subtask.associate = (models) => {
    Subtask.belongsTo(models.task_form, {
      foreignKey: "task_id",
      targetKey: "task_id",
      as: "task",
      constraints: false,
    });
  };

  return Subtask;
};
