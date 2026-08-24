export default (sequelize, DataTypes) => {
  const Invoice = sequelize.define(
    "invoices",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      client_name: { type: DataTypes.STRING(255), allowNull: false },
      client_email: { type: DataTypes.STRING(255), allowNull: false },
      client_address: { type: DataTypes.STRING(200), allowNull: false },
      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      invoice_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      invoice_number: { type: DataTypes.STRING(50), allowNull: false },
      receipt_no: { type: DataTypes.STRING(50), allowNull: false },
      notes: { type: DataTypes.TEXT, allowNull: true },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "pending",
      },
      // Must match banks.id (INTEGER) VARCHAR broke InnoDB FK sync
      bank_id: { type: DataTypes.INTEGER, allowNull: false },
      inv_category: { type: DataTypes.STRING(100), allowNull: false },
    },
    {
      freezeTableName: true,
      timestamps: false,
    }
  );

  Invoice.associate = (models) => {
    Invoice.hasMany(models.invoice_items, {
      foreignKey: "invoice_id",
      as: "items",
    });
    Invoice.belongsTo(models.banks, {
      foreignKey: "bank_id",
      targetKey: "id",
      as: "bank",
      constraints: false,
    });
  };

  return Invoice;
};
