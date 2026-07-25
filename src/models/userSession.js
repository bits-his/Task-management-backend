export default (sequelize, DataTypes) => {
  const UserSession = sequelize.define(
    "user_sessions",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      session_token: {
        type: DataTypes.STRING(128),
        allowNull: false,
        unique: true,
      },
      device_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      user_agent: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      ip_address: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      last_active: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      revoked_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  UserSession.associate = (models) => {
    UserSession.belongsTo(models.users, {
      foreignKey: "user_id",
      targetKey: "user_id",
      as: "user",
    });
  };

  return UserSession;
};
