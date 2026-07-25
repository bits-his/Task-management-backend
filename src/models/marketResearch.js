export default (sequelize, DataTypes) => {
  const MarketResearch = sequelize.define(
    "market_research",
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      title: { type: DataTypes.STRING(255), allowNull: false },
      industry: { type: DataTypes.STRING(100), allowNull: false },
      research_date: { type: DataTypes.DATEONLY, allowNull: true },
      summary: { type: DataTypes.TEXT, allowNull: true },
      emerging_trends: { type: DataTypes.TEXT, allowNull: true },
      trend_tools: { type: DataTypes.STRING(255), allowNull: true },
      key_findings: { type: DataTypes.TEXT, allowNull: true },
      competitor_name: { type: DataTypes.STRING(255), allowNull: true },
      competitor_industry: { type: DataTypes.STRING(255), allowNull: true },
      competitor_website: { type: DataTypes.STRING(255), allowNull: true },
      strengths: { type: DataTypes.TEXT, allowNull: true },
      weaknesses: { type: DataTypes.TEXT, allowNull: true },
      opportunities: { type: DataTypes.TEXT, allowNull: true },
      threats: { type: DataTypes.TEXT, allowNull: true },
      pricing_strategy: { type: DataTypes.TEXT, allowNull: true },
      marketing_strategy: { type: DataTypes.TEXT, allowNull: true },
      target_demographics: { type: DataTypes.TEXT, allowNull: true },
      pain_points: { type: DataTypes.TEXT, allowNull: true },
      market_segments: { type: DataTypes.TEXT, allowNull: true },
      segment_prioritization: { type: DataTypes.TEXT, allowNull: true },
      key_insights: { type: DataTypes.TEXT, allowNull: true },
      recommendations: { type: DataTypes.TEXT, allowNull: true },
      conducted_by: { type: DataTypes.STRING(255), allowNull: true },
      comments: { type: DataTypes.TEXT, allowNull: true },
      startup_id: { type: DataTypes.STRING(100), allowNull: false },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  MarketResearch.associate = (models) => {
    MarketResearch.hasMany(models.market_research_files, {
      foreignKey: "research_id",
      as: "files",
      constraints: false,
    });
  };

  return MarketResearch;
};
