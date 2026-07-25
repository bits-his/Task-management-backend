import db from "../models/index.js";
import moment from "moment";

let today = moment().format("YYYY-MM-DD");

export const insertMarketResearch = async (req, res) => {
  const {
    title = "",
    industry = "",
    research_date = today,
    summary = "",
    emergingTrends = "",
    trendTools = "",
    keyFindings = "",
    competitorName = "",
    competitorIndustry = "",
    competitorWebsite = "",
    strengths = "",
    weaknesses = "",
    opportunities = "",
    threats = "",
    pricingStrategy = "",
    marketingStrategy = "",
    targetDemographics = "",
    painPoints = "",
    marketSegments = "",
    segmentPrioritization = "",
    keyInsights = "",
    recommendations = "",
    conductedBy = "",
    comments = "",
    date = today,
    startup_id = "",
  } = req.body;

  try {
    const row = await db.market_research.create({
      title,
      industry,
      research_date: date || research_date,
      summary,
      emerging_trends: emergingTrends,
      trend_tools: trendTools,
      key_findings: keyFindings,
      competitor_name: competitorName,
      competitor_industry: competitorIndustry,
      competitor_website: competitorWebsite,
      strengths,
      weaknesses,
      opportunities,
      threats,
      pricing_strategy: pricingStrategy,
      marketing_strategy: marketingStrategy,
      target_demographics: targetDemographics,
      pain_points: painPoints,
      market_segments: marketSegments,
      segment_prioritization: segmentPrioritization,
      key_insights: keyInsights,
      recommendations,
      conducted_by: conductedBy,
      comments,
      startup_id,
    });

    const research_id = row.id;
    let images = [];
    if (req.files) {
      images = req.files.map((image) => image.path);
      await db.market_research_files.create({
        research_id,
        file_name: "",
        file_path: images.join(","),
      });
    }

    res.json({
      success: true,
      message: "Market research inserted successfully!",
      research_id,
    });
  } catch (error) {
    console.error("Error inserting market research:", error);
    res.status(500).json({
      success: false,
      message: "Error inserting market research",
      error: error.message,
    });
  }
};

export const getMarketResearch = async (req, res) => {
  try {
    const { startup_id = "", query_type = "" } = req.query;
    const where = {};
    if (startup_id) where.startup_id = startup_id;

    let data;
    if (query_type === "with_files") {
      data = await db.market_research.findAll({
        where,
        include: [{ model: db.market_research_files, as: "files" }],
      });
      data = data.map((r) => r.get({ plain: true }));
    } else {
      data = await db.market_research.findAll({ where, raw: true });
    }

    res.json({ success: true, data });
  } catch (err) {
    res.json({ success: false, message: err.message || err });
  }
};
