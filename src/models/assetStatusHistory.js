export default (sequelize, DataTypes) => {
  const AssetStatusHistory = sequelize.define(
    "asset_status_history",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      asset_id: { type: DataTypes.STRING(30), allowNull: false },
      from_status: { type: DataTypes.STRING(30), allowNull: true },
      to_status: { type: DataTypes.STRING(30), allowNull: false },
      changed_by: { type: DataTypes.STRING(20), allowNull: true },
      reason: { type: DataTypes.STRING(500), allowNull: true },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  AssetStatusHistory.associate = (models) => {
    AssetStatusHistory.belongsTo(models.assets, {
      foreignKey: "asset_id",
      targetKey: "asset_id",
      as: "asset",
    });
  };

  return AssetStatusHistory;
};
