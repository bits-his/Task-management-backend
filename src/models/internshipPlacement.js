export default (sequelize, DataTypes) => {
  const InternshipPlacement = sequelize.define(
    "internship_placement",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      person_id: { type: DataTypes.INTEGER, allowNull: false },
      application_id: { type: DataTypes.INTEGER, allowNull: true },
      placement_type: {
        type: DataTypes.ENUM(
          "siwes",
          "internship",
          "nysc",
          "graduate_internship"
        ),
        allowNull: false,
      },
      academic_session: { type: DataTypes.STRING(40), allowNull: true },
      level_at_application: { type: DataTypes.STRING(40), allowNull: true },
      department: { type: DataTypes.STRING(120), allowNull: true },
      dept_id: { type: DataTypes.STRING(50), allowNull: true },
      startup_id: { type: DataTypes.STRING(50), allowNull: true },
      supervisor_id: { type: DataTypes.STRING(10), allowNull: true },
      start_date: { type: DataTypes.DATEONLY, allowNull: true },
      end_date: { type: DataTypes.DATEONLY, allowNull: true },
      office_days: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'JSON array e.g. ["mon","tue","wed"]',
        get() {
          const raw = this.getDataValue("office_days");
          if (!raw) return [];
          try {
            return typeof raw === "string" ? JSON.parse(raw) : raw;
          } catch {
            return [];
          }
        },
        set(value) {
          if (value == null || value === "") {
            this.setDataValue("office_days", null);
            return;
          }
          this.setDataValue(
            "office_days",
            typeof value === "string" ? value : JSON.stringify(value)
          );
        },
      },
      status: {
        type: DataTypes.ENUM("pending", "active", "completed"),
        allowNull: false,
        defaultValue: "pending",
      },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  InternshipPlacement.associate = (models) => {
    InternshipPlacement.belongsTo(models.internship_person, {
      foreignKey: "person_id",
      as: "person",
    });
    InternshipPlacement.belongsTo(models.internship_application, {
      foreignKey: "application_id",
      as: "application",
    });
  };

  return InternshipPlacement;
};
