export default (sequelize, DataTypes) => {
  const AssetMaintenance = sequelize.define(
    "asset_maintenance",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      asset_id: { type: DataTypes.STRING(30), allowNull: false },
      maintenance_date: { type: DataTypes.DATEONLY, allowNull: false },
      technician: { type: DataTypes.STRING(120), allowNull: true },
      cost: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: false },
      created_by: { type: DataTypes.STRING(20), allowNull: true },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  AssetMaintenance.associate = (models) => {
    AssetMaintenance.belongsTo(models.assets, {
      foreignKey: "asset_id",
      targetKey: "asset_id",
      as: "asset",
    });
  };

  return AssetMaintenance;
};
