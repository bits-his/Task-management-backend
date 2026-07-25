export default (sequelize, DataTypes) => {
  const ReportItem = sequelize.define(
    "report_items",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      report_id: { type: DataTypes.INTEGER, allowNull: false },
      type: {
        type: DataTypes.ENUM("task", "note", "blocker", "learning", "other"),
        allowNull: false,
        defaultValue: "note",
      },
      task_id: { type: DataTypes.STRING(100), allowNull: true },
      title: { type: DataTypes.STRING(255), allowNull: true },
      body: { type: DataTypes.TEXT, allowNull: true },
      sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["report_id"] },
        { fields: ["task_id"] },
      ],
    }
  );

  ReportItem.associate = (models) => {
    ReportItem.belongsTo(models.weekly_reports, {
      foreignKey: "report_id",
      as: "report",
    });
    if (models.task_form) {
      ReportItem.belongsTo(models.task_form, {
        foreignKey: "task_id",
        targetKey: "task_id",
        as: "task",
        constraints: false,
      });
    }
  };

  return ReportItem;
};
