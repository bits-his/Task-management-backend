export default (sequelize, DataTypes) => {
  const Excuse = sequelize.define(
    "excuses",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      create_by: { type: DataTypes.STRING(50), allowNull: false },
      excuses_type: { type: DataTypes.STRING(100), allowNull: false },
      excuse_day: { type: DataTypes.DATEONLY, allowNull: false },
      status: { type: DataTypes.STRING(100), allowNull: false, defaultValue: "under review" },
      excuse_description: { type: DataTypes.STRING(1000), allowNull: false },
      approved_by: { type: DataTypes.STRING(100), allowNull: true },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  return Excuse;
};
