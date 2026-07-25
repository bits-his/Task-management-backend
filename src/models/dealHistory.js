export default (sequelize, DataTypes) => {
  const DealHistory = sequelize.define(
    "deal_history",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      deal_id: { type: DataTypes.INTEGER, allowNull: false },
      stages: { type: DataTypes.STRING(50), allowNull: true },
      updated_by: { type: DataTypes.STRING(50), allowNull: true },
    },
    {
      freezeTableName: true,
      timestamps: false,
    }
  );

  DealHistory.associate = (models) => {
    DealHistory.belongsTo(models.deals, { foreignKey: "deal_id", as: "deal" });
  };

  return DealHistory;
};
