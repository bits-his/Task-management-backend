export default (sequelize, DataTypes) => {
  const RoadmapItem = sequelize.define(
    "roadmap_items",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      item_id: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      phase_id: { type: DataTypes.STRING(50), allowNull: false },
      title: { type: DataTypes.STRING(255), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      offset_days: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      due_offset_days: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 7 },
      type: {
        type: DataTypes.ENUM("lesson", "exercise", "project", "quiz"),
        allowNull: false,
        defaultValue: "lesson",
      },
      resource_url: { type: DataTypes.STRING(500), allowNull: true },
      checklist: { type: DataTypes.JSON, allowNull: true },
      requires_submission: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  RoadmapItem.associate = (models) => {
    RoadmapItem.belongsTo(models.roadmap_phases, {
      foreignKey: "phase_id",
      targetKey: "phase_id",
      as: "phase",
    });
    RoadmapItem.hasMany(models.roadmap_progress, {
      foreignKey: "item_id",
      sourceKey: "item_id",
      as: "progress_entries",
    });
  };

  return RoadmapItem;
};
