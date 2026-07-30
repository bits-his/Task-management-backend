export default (sequelize, DataTypes) => {
  const Asset = sequelize.define(
    "assets",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      asset_id: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      org_id: { type: DataTypes.STRING(50), allowNull: false },
      startup_id: { type: DataTypes.STRING(50), allowNull: true },
      /** Frontend taxonomy slug, e.g. laptop, air-conditioner */
      category: { type: DataTypes.STRING(80), allowNull: true },
      name: { type: DataTypes.STRING(200), allowNull: false },
      asset_type: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "physical",
      },
      brand: { type: DataTypes.STRING(120), allowNull: true },
      model: { type: DataTypes.STRING(120), allowNull: true },
      serial_number: { type: DataTypes.STRING(120), allowNull: true },
      purchase_date: { type: DataTypes.DATEONLY, allowNull: true },
      purchase_cost: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
      supplier: { type: DataTypes.STRING(200), allowNull: true },
      warranty_expiry: { type: DataTypes.DATEONLY, allowNull: true },
      status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "available",
      },
      current_location: { type: DataTypes.STRING(200), allowNull: true },
      current_assignee_user_id: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      notes: { type: DataTypes.TEXT("long"), allowNull: true },
      image: { type: DataTypes.STRING(500), allowNull: true },
      created_by: { type: DataTypes.STRING(20), allowNull: true },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  Asset.associate = (models) => {
    Asset.belongsTo(models.users, {
      foreignKey: "current_assignee_user_id",
      targetKey: "user_id",
      as: "assignee",
    });
    Asset.belongsTo(models.users, {
      foreignKey: "created_by",
      targetKey: "user_id",
      as: "creator",
    });
    Asset.hasMany(models.asset_assignments, {
      foreignKey: "asset_id",
      sourceKey: "asset_id",
      as: "assignments",
    });
    Asset.hasMany(models.asset_maintenance, {
      foreignKey: "asset_id",
      sourceKey: "asset_id",
      as: "maintenance",
    });
    Asset.hasMany(models.asset_status_history, {
      foreignKey: "asset_id",
      sourceKey: "asset_id",
      as: "status_history",
    });
  };

  return Asset;
};
