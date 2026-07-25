export default (sequelize, DataTypes) => {
  const InternshipPerson = sequelize.define(
    "internship_person",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      person_code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      fullname: { type: DataTypes.STRING(120), allowNull: false },
      gender: { type: DataTypes.STRING(20), allowNull: true },
      date_of_birth: { type: DataTypes.DATEONLY, allowNull: true },
      email: { type: DataTypes.STRING(120), allowNull: false },
      phone_number: { type: DataTypes.STRING(30), allowNull: false },
      residential_address: { type: DataTypes.TEXT, allowNull: true },
      state: { type: DataTypes.STRING(80), allowNull: true },
      emergency_contact_name: { type: DataTypes.STRING(120), allowNull: true },
      emergency_contact_phone: { type: DataTypes.STRING(30), allowNull: true },
      matric_number: { type: DataTypes.STRING(60), allowNull: true },
      nysc_callup_number: { type: DataTypes.STRING(60), allowNull: true },
      passport_url: { type: DataTypes.TEXT, allowNull: true },
      user_id: { type: DataTypes.STRING(10), allowNull: true },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  InternshipPerson.associate = (models) => {
    InternshipPerson.hasMany(models.internship_application, {
      foreignKey: "person_id",
      as: "applications",
    });
    InternshipPerson.hasMany(models.internship_placement, {
      foreignKey: "person_id",
      as: "placements",
    });
    InternshipPerson.belongsTo(models.users, {
      foreignKey: "user_id",
      targetKey: "user_id",
      as: "user",
    });
  };

  return InternshipPerson;
};
