export default (sequelize, DataTypes) => {
  const RoadmapEnrollment = sequelize.define(
    "roadmap_enrollments",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      enrollment_id: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      roadmap_id: { type: DataTypes.STRING(50), allowNull: false },
      user_id: { type: DataTypes.STRING(100), allowNull: false },
      start_date: { type: DataTypes.DATEONLY, allowNull: false },
      expected_end_date: { type: DataTypes.DATEONLY, allowNull: false },
      assigned_by: { type: DataTypes.STRING(100), allowNull: true },
      mentor_user_id: { type: DataTypes.STRING(100), allowNull: true },
      custom_duration_overrides: { type: DataTypes.JSON, allowNull: true },
      status: {
        type: DataTypes.ENUM("active", "completed", "paused"),
        allowNull: false,
        defaultValue: "active",
      },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  RoadmapEnrollment.associate = (models) => {
    RoadmapEnrollment.belongsTo(models.roadmap_templates, {
      foreignKey: "roadmap_id",
      targetKey: "roadmap_id",
      as: "template",
    });
    RoadmapEnrollment.belongsTo(models.users, {
      foreignKey: "user_id",
      targetKey: "user_id",
      as: "student",
    });
    RoadmapEnrollment.belongsTo(models.users, {
      foreignKey: "mentor_user_id",
      targetKey: "user_id",
      as: "mentor",
    });
    RoadmapEnrollment.hasMany(models.roadmap_progress, {
      foreignKey: "enrollment_id",
      sourceKey: "enrollment_id",
      as: "progress_list",
    });
  };

  return RoadmapEnrollment;
};
