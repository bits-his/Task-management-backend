export default (sequelize, DataTypes) => {
  const Outreach = sequelize.define(
    "Outreach",
    {
      OutreachID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      LeadID: { type: DataTypes.INTEGER, allowNull: true },
      Type: { type: DataTypes.STRING(50), allowNull: true },
      Date: { type: DataTypes.DATEONLY, allowNull: true },
      Outcome: { type: DataTypes.STRING(100), allowNull: true },
      Notes: { type: DataTypes.TEXT, allowNull: true },
      FollowUpDate: { type: DataTypes.DATEONLY, allowNull: true },
      CreatedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      freezeTableName: true,
      timestamps: false,
    }
  );

  return Outreach;
};
