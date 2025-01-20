export default (sequelize, DataTypes) => {
  const User = sequelize.define(
    "user",
    {
      user_id: {
        type: DataTypes.STRING,
        unique: true,
      },
      fullname: DataTypes.STRING,
      email: {
        type: DataTypes.STRING,
        unique: true,
      },
      phone_no: {
        type: DataTypes.STRING,
        unique: true,
      },
      address: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      password: DataTypes.STRING,
      role: DataTypes.STRING,
      status: DataTypes.STRING,
      startup_id: DataTypes.STRING,
      starting_date: DataTypes.STRING,
      end_date: DataTypes.STRING,
    },
    {}
  );

  User.associate = function (models) {
    // associations go here
  };

  return User;
};
