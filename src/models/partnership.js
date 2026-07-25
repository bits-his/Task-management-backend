export default (sequelize, DataTypes) => {
  const Partnership = sequelize.define(
    "Partnerships",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      LeadID: { type: DataTypes.INTEGER, allowNull: false },
      status: { type: DataTypes.STRING(50), allowNull: false },
      start_date: { type: DataTypes.DATEONLY, allowNull: false },
      end_date: { type: DataTypes.DATEONLY, allowNull: false },
      terms: { type: DataTypes.TEXT, allowNull: true },
      files: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Partnership;
};
