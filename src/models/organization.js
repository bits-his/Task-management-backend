export default (sequelize, DataTypes) => {
  const Organization = sequelize.define(
    "organizations",
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      org_id: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      org_name: { type: DataTypes.STRING(255), allowNull: false },
      decription: { type: DataTypes.STRING(255), allowNull: true },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  Organization.associate = (models) => {
    Organization.hasMany(models.startups, { foreignKey: "org_id", sourceKey: "org_id", as: "startups" });
    Organization.hasMany(models.users, { foreignKey: "org_id", sourceKey: "org_id", as: "users" });
  };

  return Organization;
};
