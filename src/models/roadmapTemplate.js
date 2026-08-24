export default (sequelize, DataTypes) => {
  const RoadmapTemplate = sequelize.define(
    "roadmap_templates",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      roadmap_id: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      org_id: { type: DataTypes.STRING(50), allowNull: false, defaultValue: "1" },
      title: { type: DataTypes.STRING(255), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      total_weeks: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
      status: {
        type: DataTypes.ENUM("draft", "published"),
        allowNull: false,
        defaultValue: "draft",
      },
      created_by: { type: DataTypes.STRING(100), allowNull: true },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  RoadmapTemplate.associate = (models) => {
    RoadmapTemplate.hasMany(models.roadmap_phases, {
      foreignKey: "roadmap_id",
      sourceKey: "roadmap_id",
      as: "phases",
    });
    RoadmapTemplate.hasMany(models.roadmap_enrollments, {
      foreignKey: "roadmap_id",
      sourceKey: "roadmap_id",
      as: "enrollments",
    });
  };

  return RoadmapTemplate;
};
