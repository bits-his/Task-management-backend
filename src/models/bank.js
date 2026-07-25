export default (sequelize, DataTypes) => {
  const Bank = sequelize.define(
    "banks",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      account_id: { type: DataTypes.STRING(100), allowNull: false },
      account_name: { type: DataTypes.STRING(100), allowNull: false },
      account_number: { type: DataTypes.STRING(20), allowNull: false },
      bank_name: { type: DataTypes.STRING(100), allowNull: false },
    },
    {
      freezeTableName: true,
      timestamps: false,
    }
  );

  return Bank;
};
