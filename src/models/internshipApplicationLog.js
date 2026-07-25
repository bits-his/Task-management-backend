export default (sequelize, DataTypes) => {
  const InternshipApplicationLog = sequelize.define(
    "internship_application_log",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      application_id: { type: DataTypes.INTEGER, allowNull: false },
      author_user_id: { type: DataTypes.STRING(10), allowNull: true },
      log_type: {
        type: DataTypes.ENUM("note", "audit", "status_change", "message"),
        allowNull: false,
        defaultValue: "note",
      },
      content: { type: DataTypes.TEXT, allowNull: false },
      metadata: { type: DataTypes.JSON, allowNull: true },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  InternshipApplicationLog.associate = (models) => {
    InternshipApplicationLog.belongsTo(models.internship_application, {
      foreignKey: "application_id",
      as: "application",
    });
  };

  return InternshipApplicationLog;
};
