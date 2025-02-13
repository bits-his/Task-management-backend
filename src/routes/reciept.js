const {
  generateInvoice,
  getInvoice,
  getinvoice_by_id,
  getbanks,
  update_status,
  generate,
  generateinvoice,
} = require("../controllers/reciept");

module.exports = (app) => {
  app.post("/api/generatemyinvoice", generateInvoice);
  app.get("/api/getallinvoices", getInvoice);
  app.get("/api/getainvoicebyid", getinvoice_by_id);
  app.get("/api/getbanks", getbanks);
  app.post("/api/update_inv_status", update_status);
  app.post("/api/generate-new", generate)
    app.post("/api/generate-new-invoice", generateinvoice);
};