export default (sequelize, DataTypes) => {
  const InternshipApplication = sequelize.define(
    "internship_application",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      application_code: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true,
      },
      tracking_code: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
      },
      person_id: { type: DataTypes.INTEGER, allowNull: false },
      opportunity_id: { type: DataTypes.INTEGER, allowNull: true },
      application_type: {
        type: DataTypes.ENUM(
          "siwes",
          "internship",
          "nysc",
          "graduate_internship"
        ),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(
          "submitted",
          "under_review",
          "document_verification",
          "interview_scheduled",
          "accepted",
          "rejected",
          "waiting_list",
          "completed"
        ),
        allowNull: false,
        defaultValue: "submitted",
      },
      institution: { type: DataTypes.STRING(200), allowNull: true },
      faculty: { type: DataTypes.STRING(120), allowNull: true },
      department_course: { type: DataTypes.STRING(120), allowNull: true },
      course: { type: DataTypes.STRING(120), allowNull: true },
      academic_session: { type: DataTypes.STRING(40), allowNull: true },
      current_level: { type: DataTypes.STRING(40), allowNull: true },
      expected_graduation_year: { type: DataTypes.STRING(10), allowNull: true },
      course_studied: { type: DataTypes.STRING(120), allowNull: true },
      callup_number: { type: DataTypes.STRING(60), allowNull: true },
      batch: { type: DataTypes.STRING(40), allowNull: true },
      stream: { type: DataTypes.STRING(40), allowNull: true },
      state_of_deployment: { type: DataTypes.STRING(80), allowNull: true },
      highest_qualification: { type: DataTypes.STRING(120), allowNull: true },
      school: { type: DataTypes.STRING(200), allowNull: true },
      area_of_interest: { type: DataTypes.STRING(200), allowNull: true },
      preferred_department: { type: DataTypes.STRING(120), allowNull: true },
      placement_duration: { type: DataTypes.STRING(80), allowNull: true },
      expected_start_date: { type: DataTypes.DATEONLY, allowNull: true },
      expected_end_date: { type: DataTypes.DATEONLY, allowNull: true },
      assigned_reviewer_id: { type: DataTypes.STRING(10), allowNull: true },
      assigned_supervisor_id: { type: DataTypes.STRING(10), allowNull: true },
      assigned_dept_id: { type: DataTypes.STRING(50), allowNull: true },
      assigned_startup_id: { type: DataTypes.STRING(50), allowNull: true },
      interview_scheduled_at: { type: DataTypes.DATE, allowNull: true },
      rejection_reason: { type: DataTypes.TEXT, allowNull: true },
      applicant_id: { type: DataTypes.STRING(20), allowNull: true },
      activation_token_hash: { type: DataTypes.STRING(128), allowNull: true },
      activation_expires_at: { type: DataTypes.DATE, allowNull: true },
      submitted_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  InternshipApplication.associate = (models) => {
    InternshipApplication.belongsTo(models.internship_person, {
      foreignKey: "person_id",
      as: "person",
    });
    InternshipApplication.belongsTo(models.internship_opportunity, {
      foreignKey: "opportunity_id",
      as: "opportunity",
    });
    InternshipApplication.hasMany(models.internship_application_document, {
      foreignKey: "application_id",
      as: "documents",
    });
    InternshipApplication.hasMany(models.internship_application_log, {
      foreignKey: "application_id",
      as: "logs",
    });
    InternshipApplication.hasMany(models.internship_placement, {
      foreignKey: "application_id",
      as: "placements",
    });
  };

  return InternshipApplication;
};
