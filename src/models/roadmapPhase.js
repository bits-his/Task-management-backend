export default (sequelize, DataTypes) => {
  const RoadmapPhase = sequelize.define(
    "roadmap_phases",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      phase_id: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      roadmap_id: { type: DataTypes.STRING(50), allowNull: false },
      title: { type: DataTypes.STRING(255), allowNull: false },
      sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      duration_weeks: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2 },
      duration_days: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 14 },
      learning_goals: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  RoadmapPhase.associate = (models) => {
    RoadmapPhase.belongsTo(models.roadmap_templates, {
      foreignKey: "roadmap_id",
      targetKey: "roadmap_id",
      as: "template",
    });
    RoadmapPhase.hasMany(models.roadmap_items, {
      foreignKey: "phase_id",
      sourceKey: "phase_id",
      as: "items",
    });
  };

  return RoadmapPhase;
};
