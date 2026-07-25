import {
  generateInvoice,
  getInvoice,
  getinvoice_by_id,
  getbanks,
  update_status,
  generate,
  generateinvoice,
} from "../controllers/reciept.js";
import db from "../models/index.js";
import Sequelize from "sequelize";
const {  fn, col, literal  } = Sequelize;
export default (app) => {
  app.post("/api/generatemyinvoice", generateInvoice);
  app.get("/api/getallinvoices", getInvoice);
  app.get("/api/getainvoicebyid", getinvoice_by_id);
  app.get("/api/getbanks", getbanks);
  app.post("/api/update_inv_status", update_status);
  app.post("/api/generate-new", generate);
  app.post("/api/generate-new-invoice", generateinvoice);

  app.get("/api/reports/category-summary", async (req, res) => {
    try {
      const rows = await db.invoices.findAll({
        attributes: [
          "inv_category",
          [fn("COUNT", col("id")), "count"],
          [fn("SUM", col("amount")), "total_amount"],
        ],
        group: ["inv_category"],
        raw: true,
      });
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/reports/monthly-revenue/:year", async (req, res) => {
    try {
      const year = req.params.year;
      const rows = await db.invoices.findAll({
        attributes: [
          [fn("MONTH", col("invoice_date")), "month"],
          [fn("SUM", col("amount")), "revenue"],
        ],
        where: literal(`YEAR(invoice_date) = ${parseInt(year, 10)}`),
        group: [fn("MONTH", col("invoice_date"))],
        raw: true,
      });
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/reports/top-clients/:limit", async (req, res) => {
    try {
      const limit = parseInt(req.params.limit, 10) || 10;
      const rows = await db.invoices.findAll({
        attributes: [
          "client_name",
          [fn("SUM", col("amount")), "total_amount"],
          [fn("COUNT", col("id")), "invoice_count"],
        ],
        group: ["client_name"],
        order: [[literal("total_amount"), "DESC"]],
        limit,
        raw: true,
      });
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/reports/item-analysis", async (req, res) => {
    try {
      const rows = await db.invoice_items.findAll({
        attributes: [
          "description",
          [fn("SUM", col("quantity")), "total_qty"],
          [fn("SUM", literal("quantity * price")), "total_sales"],
        ],
        group: ["description"],
        order: [[literal("total_sales"), "DESC"]],
        raw: true,
      });
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
};
