export default (sequelize, DataTypes) => {
  const InternshipTrackOtp = sequelize.define(
    "internship_track_otp",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      application_id: { type: DataTypes.INTEGER, allowNull: false },
      email: { type: DataTypes.STRING(120), allowNull: false },
      otp_hash: { type: DataTypes.STRING(128), allowNull: false },
      expires_at: { type: DataTypes.DATE, allowNull: false },
      verified_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  InternshipTrackOtp.associate = (models) => {
    InternshipTrackOtp.belongsTo(models.internship_application, {
      foreignKey: "application_id",
      as: "application",
    });
  };

  return InternshipTrackOtp;
};
