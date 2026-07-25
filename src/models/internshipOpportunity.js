export default (sequelize, DataTypes) => {
  const InternshipOpportunity = sequelize.define(
    "internship_opportunity",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      title: { type: DataTypes.STRING(200), allowNull: false },
      application_type: {
        type: DataTypes.ENUM(
          "siwes",
          "internship",
          "nysc",
          "graduate_internship"
        ),
        allowNull: false,
      },
      description: { type: DataTypes.TEXT, allowNull: true },
      department: { type: DataTypes.STRING(120), allowNull: true },
      dept_id: { type: DataTypes.STRING(50), allowNull: true },
      slots: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      duration: { type: DataTypes.STRING(80), allowNull: true },
      deadline: { type: DataTypes.DATEONLY, allowNull: true },
      requirements: { type: DataTypes.TEXT, allowNull: true },
      status: {
        type: DataTypes.ENUM("draft", "open", "closed"),
        allowNull: false,
        defaultValue: "open",
      },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  InternshipOpportunity.associate = (models) => {
    InternshipOpportunity.hasMany(models.internship_application, {
      foreignKey: "opportunity_id",
      as: "applications",
    });
  };

  return InternshipOpportunity;
};
