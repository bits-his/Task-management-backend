export default (sequelize, DataTypes) => {
  const Ticket = sequelize.define(
    "tickets",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      ticket_id: { type: DataTypes.STRING(1000), allowNull: false },
      ticket_name: { type: DataTypes.STRING(100), allowNull: false },
      description: { type: DataTypes.TEXT("long"), allowNull: false },
      department: { type: DataTypes.STRING(50), allowNull: false },
      priority: { type: DataTypes.ENUM("low", "medium", "high"), allowNull: false },
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "open" },
      user_id: { type: DataTypes.STRING(20), allowNull: true },
      assigned_to: { type: DataTypes.STRING(50), allowNull: true },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  Ticket.associate = (models) => {
    Ticket.belongsTo(models.users, { foreignKey: "user_id", targetKey: "user_id", as: "creator" });
  };

  return Ticket;
};
