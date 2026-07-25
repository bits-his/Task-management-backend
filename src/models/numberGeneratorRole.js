export default (sequelize, DataTypes) => {
  const NumberGeneratorRole = sequelize.define(
    "NumberGenerator",
    {
      role: { type: DataTypes.STRING(50), primaryKey: true },
      last_number: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      freezeTableName: true,
      timestamps: false,
    }
  );

  return NumberGeneratorRole;
};
