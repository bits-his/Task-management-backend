const {
  generateInvoice,
  getInvoice,
  getinvoice_by_id,
  getbanks,
  update_status,
  generate,
  generateinvoice,
} = require("../controllers/reciept");
const db = require("../models");

module.exports = (app) => {
  // Route to generate invoice
  app.post("/api/generatemyinvoice", generateInvoice);
  
  // Route to get all invoices
  app.get("/api/getallinvoices", getInvoice);
  
  // Route to get invoice by ID
  app.get("/api/getainvoicebyid", getinvoice_by_id);
  
  // Route to get banks
  app.get("/api/getbanks", getbanks);
  
  // Route to update invoice status
  app.post("/api/update_inv_status", update_status);
  
  // Route to generate a new resource (could be an invoice or other)
  app.post("/api/generate-new", generate);
  
  // Route to generate a new invoice
  app.post("/api/generate-new-invoice", generateinvoice);
  
  // Report: Category summary
  app.get('/api/reports/category-summary', async (req, res) => {
    try {
      const [rows] = await db.sequelize.query('CALL GetInvoiceCategorySummary()', {
        type: db.Sequelize.QueryTypes.SELECT
      });
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Report: Monthly revenue by year
  app.get('/api/reports/monthly-revenue/:year', async (req, res) => {
    try {
      // Using `replacements` to securely pass the `year` parameter
      const [rows] = await db.sequelize.query('CALL GetMonthlyRevenue(:year)', {
        replacements: { year: req.params.year },
        type: db.Sequelize.QueryTypes.SELECT
      });
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Report: Top clients
  app.get('/api/reports/top-clients/:limit', async (req, res) => {
    try {
      const [rows] = await db.sequelize.query(`CALL GetTopClients(:limit_param)`, {
        replacements: { limit_param: req.params.limit },
        type: db.Sequelize.QueryTypes.SELECT
      });
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Report: Item sales analysis
  app.get('/api/reports/item-analysis', async (req, res) => {
    try {
      const [rows] = await db.sequelize.query('CALL GetItemSalesAnalysis()', {
        type: db.Sequelize.QueryTypes.SELECT
      });
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
};
