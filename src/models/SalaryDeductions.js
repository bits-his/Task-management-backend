export default (sequelize, DataTypes) => {
  const SalaryDeduction = sequelize.define(
    "SalaryDeductions",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: DataTypes.STRING(255), allowNull: false },
      reason: { type: DataTypes.STRING(255), allowNull: false },
      amount_deducted: { type: DataTypes.FLOAT, allowNull: false },
      date: { type: DataTypes.DATEONLY, allowNull: false },
    },
    {
      freezeTableName: true,
      timestamps: true,
    }
  );

  SalaryDeduction.associate = (models) => {
    SalaryDeduction.belongsTo(models.users, {
      foreignKey: "user_id",
      targetKey: "user_id",
      as: "user",
    });
  };

  return SalaryDeduction;
};
