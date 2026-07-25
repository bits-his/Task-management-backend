export default (sequelize, DataTypes) => {
  const Meeting = sequelize.define(
    "meetings",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      meeting_title: { type: DataTypes.STRING(255), allowNull: false },
      meeting_date: { type: DataTypes.DATE, allowNull: false },
      meeting_duration: { type: DataTypes.TIME, allowNull: false },
      meeting_location: { type: DataTypes.STRING(255), allowNull: false },
      LeadID: { type: DataTypes.INTEGER, allowNull: false },
      meeting_agenda: { type: DataTypes.STRING(100), allowNull: false },
      priority_level: { type: DataTypes.STRING(100), allowNull: false },
      reminder_type: { type: DataTypes.STRING(300), allowNull: false },
      notes: { type: DataTypes.TEXT, allowNull: true },
      image_url: { type: DataTypes.TEXT("long"), allowNull: true },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  Meeting.associate = (models) => {
    Meeting.belongsTo(models.clients, { foreignKey: "LeadID", as: "client" });
  };

  return Meeting;
};
