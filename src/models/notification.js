export default (sequelize, DataTypes) => {
  const Notification = sequelize.define(
    "notification_table",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      notification_type: { type: DataTypes.STRING(200), allowNull: false },
      user_id: { type: DataTypes.STRING(10), allowNull: false },
      title: { type: DataTypes.STRING(200), allowNull: false },
      message: { type: DataTypes.STRING(500), allowNull: false },
      action_url: { type: DataTypes.STRING(500), allowNull: true },
      status: {
        type: DataTypes.ENUM("read", "unread"),
        allowNull: false,
        defaultValue: "unread",
      },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  return Notification;
};
