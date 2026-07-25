export default (sequelize, DataTypes) => {
  const InvoiceItem = sequelize.define(
    "invoice_items",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      invoice_id: { type: DataTypes.INTEGER, allowNull: false },
      description: { type: DataTypes.STRING(255), allowNull: false },
      quantity: { type: DataTypes.INTEGER, allowNull: false },
      price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      total: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    },
    {
      freezeTableName: true,
      timestamps: false,
    }
  );

  InvoiceItem.associate = (models) => {
    InvoiceItem.belongsTo(models.invoices, { foreignKey: "invoice_id", as: "invoice" });
  };

  return InvoiceItem;
};
