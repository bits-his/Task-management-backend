import db from "../models";
import moment from "moment";
let today = moment().format('YYYY-MM-DD');
export const insertMarketResearch = async (req, res) => {
    const {
        title = "",
        industry="",
        research_date=today,
        summary="",
        emergingTrends="",
        trendTools="",
        keyFindings="",
        competitorName="",
        competitorIndustry="",
        competitorWebsite="",
        strengths="",
        weaknesses="",
        opportunities="",   
        threats="",
        pricingStrategy="",
        marketingStrategy="",
        targetDemographics="",
        painPoints="",
        marketSegments="",
        segmentPrioritization="",
        keyInsights="",
        recommendations="",
        conductedBy="",
        comments="",
        date=today,
        startup_id=""
    } = req.body;
console.log(req.body);
    try {
        // Insert into `market_research` using stored procedure
        const result = await db.sequelize.query(
            `CALL insert_market_research(
                :title, :industry, :research_date, :summary, :emergingTrends, :trendTools, :keyFindings,
                :competitorName, :competitorIndustry, :competitorWebsite, :strengths, :weaknesses,
                :opportunities, :threats, :pricingStrategy, :marketingStrategy, :targetDemographics,
                :painPoints, :marketSegments, :segmentPrioritization, :keyInsights, :recommendations,
                :conductedBy, :comments,:startup_id
            )`,
            {
                replacements: {
                    title, industry, research_date:date, summary, emergingTrends, trendTools, keyFindings,
                    competitorName, competitorIndustry, competitorWebsite, strengths, weaknesses,
                    opportunities, threats, pricingStrategy, marketingStrategy, targetDemographics,
                    painPoints, marketSegments, segmentPrioritization, keyInsights, recommendations,
                    conductedBy, comments,startup_id
                },
            }
        );

        // Get the inserted research ID
        const researchIdResult = await db.sequelize.query("SELECT LAST_INSERT_ID() as research_id;");
        const research_id = researchIdResult[0][0].research_id;
  let images = [];
  if (req.files) {
    images = req.files.map(image => image.path);
  }
        // Handle file upload
        if (req.files) {
            

            await db.sequelize.query(
                `INSERT INTO market_research_files (research_id, file_name, file_path) VALUES (:research_id, :file_name, :file_path)`,
                {
                    replacements: { research_id, file_name:"", file_path:`${images}` },
                }
            );
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



export const getMarketResearch =  (req, res) => {
 const {startup_id="",query_type=""}=req.query;

    db.sequelize.query(`CALL getResearch(:query_type,:startup_id)`,{
        replacements: {
            startup_id,
            query_type
        }
    })
    .then((resp) => {
        res.json({ success: true, data: resp });
      })
      .catch((err) => {
        res.json({ success: false, message: err });
      });
}
