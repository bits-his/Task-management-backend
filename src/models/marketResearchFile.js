export default (sequelize, DataTypes) => {
  const MarketResearchFile = sequelize.define(
    "market_research_files",
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      // Must match market_research.id (BIGINT UNSIGNED)
      research_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      file_name: { type: DataTypes.STRING(255), allowNull: false },
      file_path: { type: DataTypes.STRING(255), allowNull: false },
      uploaded_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      freezeTableName: true,
      timestamps: false,
    }
  );

  MarketResearchFile.associate = (models) => {
    MarketResearchFile.belongsTo(models.market_research, {
      foreignKey: "research_id",
      as: "research",
      constraints: false,
    });
  };

  return MarketResearchFile;
};
