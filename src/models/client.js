export default (sequelize, DataTypes) => {
  const Client = sequelize.define(
    "clients",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      startup_id: { type: DataTypes.STRING(50), allowNull: true },
      name: { type: DataTypes.STRING(255), allowNull: false },
      email: { type: DataTypes.STRING(255), allowNull: false },
      phone: { type: DataTypes.STRING(20), allowNull: false },
      company: { type: DataTypes.STRING(255), allowNull: false },
      status: {
        type: DataTypes.ENUM("Active", "Inactive", "Lead", "Prospect", "Closed"),
        defaultValue: "Active",
      },
      job_title: { type: DataTypes.STRING(36), allowNull: true },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Client;
};
