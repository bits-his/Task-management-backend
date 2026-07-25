export default (sequelize, DataTypes) => {
  const UserMembership = sequelize.define(
    "user_memberships",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.STRING(10),
        allowNull: false,
      },
      org_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      startup_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      dept_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      role: {
        type: DataTypes.STRING(50),
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
      is_primary: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      status: {
        type: DataTypes.ENUM("active", "inactive"),
        allowNull: false,
        defaultValue: "active",
      },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  UserMembership.associate = (models) => {
    UserMembership.belongsTo(models.users, {
      foreignKey: "user_id",
      targetKey: "user_id",
      as: "user",
    });
    UserMembership.belongsTo(models.startups, {
      foreignKey: "startup_id",
      targetKey: "startup_id",
      as: "startup",
    });
    UserMembership.belongsTo(models.departments, {
      foreignKey: "dept_id",
      targetKey: "dept_id",
      as: "department",
    });
  };

  return UserMembership;
};
