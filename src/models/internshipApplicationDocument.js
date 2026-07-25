export default (sequelize, DataTypes) => {
  const InternshipApplicationDocument = sequelize.define(
    "internship_application_document",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      application_id: { type: DataTypes.INTEGER, allowNull: false },
      document_type: { type: DataTypes.STRING(60), allowNull: false },
      file_url: { type: DataTypes.TEXT, allowNull: false },
      file_name: { type: DataTypes.STRING(255), allowNull: true },
      is_required: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: "uploaded_at",
      updatedAt: false,
    }
  );

  InternshipApplicationDocument.associate = (models) => {
    InternshipApplicationDocument.belongsTo(models.internship_application, {
      foreignKey: "application_id",
      as: "application",
    });
  };

  return InternshipApplicationDocument;
};
