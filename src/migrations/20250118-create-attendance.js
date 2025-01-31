export default {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Attendances', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      sign_in_time: {
        type: Sequelize.DATE,
        allowNull: true
      },
      sign_out_time: {
        type: Sequelize.DATE,
        allowNull: true
      },
      expected_sign_in_time: {
        type: Sequelize.TIME,
        allowNull: false,
        defaultValue: '09:00:00'
      },
      expected_sign_out_time: {
        type: Sequelize.TIME,
        allowNull: false,
        defaultValue: '17:00:00'
      },
      status: {
        type: Sequelize.ENUM('present', 'absent', 'late', 'early_departure'),
        allowNull: false
      },
      network_name: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    }).then(() => {
      // Add indexes
      return Promise.all([
        queryInterface.addIndex('Attendances', ['user_id', 'date'], {
          unique: true,
          name: 'idx_attendance_user_date'
        }),
        queryInterface.addIndex('Attendances', ['status'], {
          name: 'idx_attendance_status'
        })
      ]);
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Attendances');
  }
};
