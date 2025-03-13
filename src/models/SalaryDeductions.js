module.exports = (sequelize, DataTypes) => {
  const SalaryDeduction = sequelize.define('SalaryDeduction', {
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    reason: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    amount_deducted: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY, 
      allowNull: false,
    },
  }, {
    timestamps: true, 
  });

  return SalaryDeduction;
};
