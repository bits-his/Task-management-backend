export default (sequelize, DataTypes) => {
  const Assignee = sequelize.define(
    "assignee_table",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      // Match users.user_id (VARCHAR(10)) and task_form.task_id (VARCHAR(30))
      user_id: { type: DataTypes.STRING(10), allowNull: false },
      task_id: { type: DataTypes.STRING(30), allowNull: false },
      status: { type: DataTypes.STRING(50), allowNull: false },
      rating: {
        type: DataTypes.ENUM("excellent", "very_good", "good", "fair", "poor"),
        allowNull: true,
      },
      submitted_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  Assignee.associate = (models) => {
    // constraints: false — task_form.task_id is not UNIQUE/PK, so InnoDB rejects FKs
    Assignee.belongsTo(models.users, {
      foreignKey: "user_id",
      targetKey: "user_id",
      as: "user",
      constraints: false,
    });
    Assignee.belongsTo(models.task_form, {
      foreignKey: "task_id",
      targetKey: "task_id",
      as: "task",
      constraints: false,
    });
  };

  return Assignee;
};
