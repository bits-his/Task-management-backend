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
      status: DataTypes.STRING(45),
      /** Home org at registration; active context lives on user_memberships */
      org_id: DataTypes.STRING,
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
      email_verified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      email_verify_token: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },
      email_verify_expires: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      password_reset_token: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },
      password_reset_expires: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      freezeTableName: true,
      timestamps: true,
    }
  );

  User.associate = function (models) {
    User.belongsTo(models.organizations, {
      foreignKey: "org_id",
      targetKey: "org_id",
      as: "organization",
    });
    User.hasMany(models.attendances, {
      foreignKey: "user_id",
      sourceKey: "user_id",
      as: "attendances",
    });
    User.hasMany(models.assignee_table, {
      foreignKey: "user_id",
      sourceKey: "user_id",
      as: "assignments",
      constraints: false,
    });
    User.hasMany(models.comments, {
      foreignKey: "user_id",
      sourceKey: "user_id",
      as: "comments",
      constraints: false,
    });
    if (models.user_sessions) {
      User.hasMany(models.user_sessions, {
        foreignKey: "user_id",
        sourceKey: "user_id",
        as: "sessions",
        constraints: false,
      });
    }
    if (models.user_memberships) {
      User.hasMany(models.user_memberships, {
        foreignKey: "user_id",
        sourceKey: "user_id",
        as: "memberships",
      });
    }
  };

  return User;
};
