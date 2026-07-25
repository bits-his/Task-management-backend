export default (sequelize, DataTypes) => {
  const TaskForm = sequelize.define(
    "task_form",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      task_id: { type: DataTypes.STRING(30), allowNull: true },
      title: { type: DataTypes.STRING(200), allowNull: true },
      description: { type: DataTypes.TEXT("long"), allowNull: true },
      due_date: { type: DataTypes.DATE, allowNull: true },
      submitted_date: { type: DataTypes.DATE, allowNull: true },
      start_time: { type: DataTypes.DATE, allowNull: true },
      end_time: { type: DataTypes.DATE, allowNull: true },
      priority: { type: DataTypes.ENUM("medium", "high", "low"), allowNull: true },
      status: { type: DataTypes.STRING(100), allowNull: true },
      assigned_to: { type: DataTypes.STRING(1000), allowNull: true },
      created_by: { type: DataTypes.STRING(20), allowNull: true },
      startup_id: { type: DataTypes.STRING(30), allowNull: true },
      rating: { type: DataTypes.STRING(20), allowNull: true },
      comment: { type: DataTypes.STRING(100), allowNull: true },
      images: { type: DataTypes.TEXT("long"), allowNull: true },
      rejected: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "no" },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updatedAt",
    }
  );

  TaskForm.associate = (models) => {
    TaskForm.belongsTo(models.startups, { foreignKey: "startup_id", targetKey: "startup_id", as: "startup" });
    TaskForm.hasMany(models.assignee_table, {
      foreignKey: "task_id",
      sourceKey: "task_id",
      as: "assignees",
      constraints: false,
    });
    TaskForm.hasMany(models.subtasks, { foreignKey: "task_id", sourceKey: "task_id", as: "subtasks", constraints: false });
    TaskForm.hasMany(models.comments, { foreignKey: "task_id", sourceKey: "task_id", as: "taskComments", constraints: false });
  };

  return TaskForm;
};
