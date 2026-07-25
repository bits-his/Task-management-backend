export default (sequelize, DataTypes) => {
  const WeeklyReport = sequelize.define(
    "weekly_reports",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: DataTypes.STRING(100), allowNull: true },
      report_date: { type: DataTypes.DATEONLY, allowNull: true },
      week_start: { type: DataTypes.DATEONLY, allowNull: true },
      content: { type: DataTypes.TEXT, allowNull: true },
      status: {
        type: DataTypes.ENUM("pending", "submitted", "excused"),
        defaultValue: "pending",
      },
      last_edited: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      freezeTableName: true,
      timestamps: false,
      indexes: [
        {
          unique: true,
          fields: ["user_id", "report_date"],
          name: "weekly_reports_user_date_unique",
        },
      ],
    }
  );

  WeeklyReport.associate = (models) => {
    WeeklyReport.belongsTo(models.users, {
      foreignKey: "user_id",
      targetKey: "user_id",
      as: "user",
    });
    if (models.report_items) {
      WeeklyReport.hasMany(models.report_items, {
        foreignKey: "report_id",
        as: "items",
        onDelete: "CASCADE",
      });
    }
  };

  return WeeklyReport;
};
