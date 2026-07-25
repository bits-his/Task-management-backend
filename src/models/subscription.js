export default (sequelize, DataTypes) => {
  const Subscription = sequelize.define(
    "subscriptions",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      endpoint: { type: DataTypes.STRING(255), allowNull: false },
      data_keys: { type: DataTypes.TEXT("long"), allowNull: false },
      user_id: { type: DataTypes.STRING(20), allowNull: false },
    },
    {
      freezeTableName: true,
      timestamps: false,
    }
  );

  return Subscription;
};
