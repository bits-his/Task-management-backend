export default (sequelize, DataTypes) => {
  const RoadmapProgress = sequelize.define(
    "roadmap_progress",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      enrollment_id: { type: DataTypes.STRING(50), allowNull: false },
      item_id: { type: DataTypes.STRING(50), allowNull: false },
      status: {
        type: DataTypes.ENUM("not_started", "in_progress", "submitted", "completed", "overdue"),
        allowNull: false,
        defaultValue: "not_started",
      },
      started_at: { type: DataTypes.DATE, allowNull: true },
      completed_at: { type: DataTypes.DATE, allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      submission_url: { type: DataTypes.STRING(500), allowNull: true },
      checklist_progress: { type: DataTypes.JSON, allowNull: true },
      task_id: { type: DataTypes.STRING(100), allowNull: true },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  RoadmapProgress.associate = (models) => {
    RoadmapProgress.belongsTo(models.roadmap_enrollments, {
      foreignKey: "enrollment_id",
      targetKey: "enrollment_id",
      as: "enrollment",
    });
    RoadmapProgress.belongsTo(models.roadmap_items, {
      foreignKey: "item_id",
      targetKey: "item_id",
      as: "item",
    });
  };

  return RoadmapProgress;
};
