export default (sequelize, DataTypes) => {
  const User = sequelize.define(
    'users',
    {
      id: {
        type: DataTypes.INTEGER(11),
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: DataTypes.STRING(10),
        allowNull: false,
        unique: true
      },
      fullname: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      email: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: true
      },
      phone_no: {
        type: DataTypes.STRING(20),
        allowNull: true,
        unique: true
      },
      address: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      password: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      role: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      status: {
        type: DataTypes.STRING(45),
        allowNull: true
      },
      startup_id: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      starting_date: {
        type: DataTypes.STRING(20),
        allowNull: true
      },
      end_date: {
        type: DataTypes.STRING(20),
        allowNull: true
      }
    },
    {
      timestamps: true // This will handle createdAt and updatedAt
    }
  );

  User.associate = function (models) {
    // associations go here
  };

  return User;
};
