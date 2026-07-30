export default (sequelize, DataTypes) => {
  const AssetAssignment = sequelize.define(
    "asset_assignments",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      asset_id: { type: DataTypes.STRING(30), allowNull: false },
      user_id: { type: DataTypes.STRING(20), allowNull: false },
      dept_id: { type: DataTypes.STRING(50), allowNull: true },
      startup_id: { type: DataTypes.STRING(50), allowNull: true },
      assigned_at: { type: DataTypes.DATE, allowNull: false },
      expected_return: { type: DataTypes.DATEONLY, allowNull: true },
      returned_at: { type: DataTypes.DATE, allowNull: true },
      condition_out: { type: DataTypes.STRING(40), allowNull: true },
      condition_in: { type: DataTypes.STRING(40), allowNull: true },
      assigned_by: { type: DataTypes.STRING(20), allowNull: true },
      returned_by: { type: DataTypes.STRING(20), allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      return_notes: { type: DataTypes.TEXT, allowNull: true },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "active",
      },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  AssetAssignment.associate = (models) => {
    AssetAssignment.belongsTo(models.assets, {
      foreignKey: "asset_id",
      targetKey: "asset_id",
      as: "asset",
    });
    AssetAssignment.belongsTo(models.users, {
      foreignKey: "user_id",
      targetKey: "user_id",
      as: "user",
    });
  };

  return AssetAssignment;
};
