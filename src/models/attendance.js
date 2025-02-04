export default (sequelize, DataTypes) => {
  const Attendance = sequelize.define(
    'attendances',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type:  DataTypes.STRING(10),
        allowNull: false,
        references: {
          model: 'users',
          key: 'user_id',
        },
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      sign_in_time: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      sign_out_time: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      expected_sign_in_time: {
        type: DataTypes.TIME,
        allowNull: false,
        defaultValue: '09:00:00',
      },
      expected_sign_out_time: {
        type: DataTypes.TIME,
        allowNull: false,
        defaultValue: '17:00:00',
      },
      status: {
        type: DataTypes.ENUM('present', 'absent', 'late', 'early_departure'),
        allowNull: false,
      },
      network_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true,
      },
    },
    {
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        {
          unique: true,
          fields: ['user_id', 'date'],
        },
        {
          fields: ['status'],
        },
      ],
    }
  );

  Attendance.associate = function (models) {
    Attendance.belongsTo(models.users, {
      foreignKey: 'user_id',
      as: 'users',
    });
  };

  return Attendance;
};
