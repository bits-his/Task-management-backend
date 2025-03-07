export default (sequelize, DataTypes) => {
  const User = sequelize.define(
    "users",
    {
      id: {
        type: DataTypes.INTEGER(11),
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.STRING(10),
        allowNull: false,
        unique: true,
      },
      fullname: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: true,
      },
      phone_no: {
        type: DataTypes.STRING(20),
        allowNull: true,
        unique: true,
      },
      address: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      password: DataTypes.STRING,
      role: DataTypes.STRING,
      status: DataTypes.STRING(45),
      startup_id: DataTypes.STRING,
      org_id: DataTypes.STRING,
      dept_id: DataTypes.STRING,
      starting_date: DataTypes.STRING,
      end_date: DataTypes.STRING,
      nin: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },
      profile: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },
      guardian_number: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      linkedin_link: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      github_link: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      access_to: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },
      functionalities: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },
    },
    {
      timestamps: true, // This will handle createdAt and updatedAt
    }
  );

  User.associate = function (models) {
    // Define associations here
  };

  return User;
};