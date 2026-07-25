export default (sequelize, DataTypes) => {
  const Comments = sequelize.define(
    "comments",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.STRING(10),
        allowNull: false,
      },
      task_id: {
        type: DataTypes.STRING(30),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      freezeTableName: true,
      timestamps: true,
    }
  );

  Comments.associate = (models) => {
    Comments.belongsTo(models.users, {
      foreignKey: "user_id",
      targetKey: "user_id",
      as: "users",
      constraints: false,
    });
  };

  return Comments;
};
