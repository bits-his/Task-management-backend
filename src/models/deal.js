export default (sequelize, DataTypes) => {
  const Deal = sequelize.define(
    "deals",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      startup_id: { type: DataTypes.STRING(50), allowNull: true },
      deal_name: { type: DataTypes.STRING(255), allowNull: false },
      deal_value: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      expected_revenue: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      expected_close_date: { type: DataTypes.DATEONLY, allowNull: false },
      priority: {
        type: DataTypes.ENUM("Low", "Medium", "High", "Critical"),
        defaultValue: "Medium",
      },
      stage: {
        type: DataTypes.ENUM(
          "Prospecting",
          "Negotiation",
          "Closed",
          "Lost",
          "Proposal Sent",
          "Contract Signed"
        ),
        defaultValue: "Prospecting",
      },
      payment_status: {
        type: DataTypes.ENUM("Pending", "Partial", "Completed"),
        defaultValue: "Pending",
      },
      final_remarks: { type: DataTypes.TEXT, allowNull: true },
      client: { type: DataTypes.STRING(255), allowNull: false },
      assigned_to: { type: DataTypes.TEXT, allowNull: true },
      contract_files: { type: DataTypes.TEXT, allowNull: true },
      updated_by: { type: DataTypes.STRING(50), allowNull: true },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  Deal.associate = (models) => {
    Deal.hasMany(models.deal_history, { foreignKey: "deal_id", as: "history" });
  };

  return Deal;
};
