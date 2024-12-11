export default (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
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
      address: DataTypes.STRING,
      password: DataTypes.STRING,
      role: DataTypes.STRING,
      status: DataTypes.STRING,
      startups: DataTypes.STRING,
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
