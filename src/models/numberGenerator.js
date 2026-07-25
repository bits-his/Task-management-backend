export default (sequelize, DataTypes) => {
  const NumberGenerator = sequelize.define(
    "number_generator",
    {
      prefix: { type: DataTypes.STRING(50), allowNull: false },
      code: { type: DataTypes.DOUBLE, primaryKey: true },
      last_code: { type: DataTypes.INTEGER, allowNull: false },
      description: { type: DataTypes.STRING(100), allowNull: false },
      level: { type: DataTypes.STRING(5), allowNull: false },
      max_code: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      freezeTableName: true,
      timestamps: false,
    }
  );

  return NumberGenerator;
};
