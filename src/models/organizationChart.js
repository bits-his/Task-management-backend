export default (sequelize, DataTypes) => {
  const OrganizationChart = sequelize.define(
    "organization_chart",
    {
      head: { type: DataTypes.STRING(7), primaryKey: true },
      subhead: { type: DataTypes.STRING(7), allowNull: false },
      description: { type: DataTypes.STRING(100), allowNull: false },
      group_code: { type: DataTypes.STRING(1), allowNull: false },
      startup_code: { type: DataTypes.STRING(2), allowNull: false },
      department_code: { type: DataTypes.STRING(2), allowNull: false },
      unit_code: { type: DataTypes.STRING(2), allowNull: false },
    },
    {
      freezeTableName: true,
      timestamps: false,
    }
  );

  return OrganizationChart;
};
