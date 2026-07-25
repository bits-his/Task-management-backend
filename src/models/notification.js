export default (sequelize, DataTypes) => {
  const Notification = sequelize.define(
    "notification_table",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      notification_type: { type: DataTypes.STRING(200), allowNull: false },
      // Align with users.user_id
      user_id: { type: DataTypes.STRING(10), allowNull: false },
      title: { type: DataTypes.STRING(200), allowNull: false },
      message: { type: DataTypes.STRING(500), allowNull: false },
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
