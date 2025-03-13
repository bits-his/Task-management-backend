export default (sequelize, DataTypes) => {
  const Comments = sequelize.define(
    'comments',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: 'users',
          key: 'user_id',
        },
      },
      task_id: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      timestamps: true,
    }
  );

  Comments.associate = (models) => {
    Comments.belongsTo(models.users, {
      foreignKey: 'user_id',
      targetKey: 'user_id',
      as: 'users',
    });
  };

  return Comments;
};