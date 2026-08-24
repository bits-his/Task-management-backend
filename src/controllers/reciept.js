import db from "../models/index.js";
import moment from "moment";
import Sequelize from "sequelize";
const {  Op, fn, col, literal  } = Sequelize;

async function nextInvoiceCodes(transaction) {
  const last = await db.invoices.findOne({
    order: [["id", "DESC"]],
    transaction,
    raw: true,
  });
  const next = (last?.id || 0) + 1;
  const padded = String(next).padStart(10, "0");
  return {
    invoice_number: `INV/${padded}`,
    receipt_no: `RCP/${padded}`,
  };
}

function groupInvoices(rows) {
  const invoiceMap = {};
  rows.forEach((row) => {
    const invoiceId = row.invoice_id;
    if (!invoiceMap[invoiceId]) {
      invoiceMap[invoiceId] = {
        invoice_id: row.invoice_id,
        client_name: row.client_name,
        client_email: row.client_email,
        client_address: row.client_address,
        amount: row.amount,
        inv_category: row.inv_category,
        invoice_date: row.invoice_date,
        invoice_number: row.invoice_number,
        receipt_no: row.receipt_no,
        notes: row.notes,
        status: row.status,
        items: [],
      };
    }
    if (row.items_id || row.item_id || row.description) {
      invoiceMap[invoiceId].items.push({
        item_id: row.items_id || row.item_id,
        description: row.description,
        quantity: row.quantity,
        price: row.price,
        total: row.total,
      });
    }
  });
  return Object.values(invoiceMap);
}

export const generateInvoice = async (req, res) => {
  try {
    const {
      client = "",
      email = "",
      clientAddress = "",
      amount = 0,
      items = [],
      note = "",
      status = "pending",
      bank_id = "",
      inv_category = "",
    } = req.body;

    const itemsJSON = Array.isArray(items)
      ? items.map((item) => ({
          description: String(item.description || "").trim(),
          quantity: Number(item.quantity || 0),
          price: Number(item.price || 0),
        }))
      : [];

    const calculatedAmount =
      itemsJSON.length > 0
        ? itemsJSON.reduce(
            (total, item) => total + item.quantity * item.price,
            0
          )
        : amount;

    const invoice = await db.sequelize.transaction(async (transaction) => {
      const codes = await nextInvoiceCodes(transaction);
      const row = await db.invoices.create(
        {
          client_name: client,
          client_email: email,
          client_address: clientAddress,
          amount: parseFloat(calculatedAmount),
          invoice_date: moment().format("YYYY-MM-DD HH:mm:ss"),
          invoice_number: codes.invoice_number,
          receipt_no: codes.receipt_no,
          notes: note,
          status,
          bank_id,
          inv_category,
        },
        { transaction }
      );

      for (const item of itemsJSON) {
        await db.invoice_items.create(
          {
            invoice_id: row.id,
            description: item.description,
            quantity: item.quantity,
            price: item.price,
          },
          { transaction }
        );
      }
      return row;
    });

    res.status(200).json({
      success: true,
      invoiceId: invoice.id,
      message: "Invoice generated successfully",
    });
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate invoice",
      error: { message: error.message, details: error.toString() },
    });
  }
};

export const getInvoice = async (req, res) => {
  try {
    const invoices = await db.invoices.findAll({
      include: [{ model: db.invoice_items, as: "items" }],
      order: [["invoice_date", "DESC"]],
    });

    const mapped = invoices.map((inv) => {
      const plain = inv.get({ plain: true });
      return {
        invoice_id: plain.id,
        client_name: plain.client_name,
        client_email: plain.client_email,
        client_address: plain.client_address,
        amount: plain.amount,
        inv_category: plain.inv_category,
        invoice_date: plain.invoice_date,
        invoice_number: plain.invoice_number,
        receipt_no: plain.receipt_no,
        notes: plain.notes,
        status: plain.status,
        items: (plain.items || []).map((it) => ({
          item_id: it.id,
          description: it.description,
          quantity: it.quantity,
          price: it.price,
          total: it.quantity * it.price,
        })),
      };
    });

    res.status(200).json({ success: true, invoices: mapped });
  } catch (error) {
    console.error("Database Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch invoices", error });
  }
};

export const getinvoice_by_id = async (req, res) => {
  try {
    const { invoice_id = "" } = req.query;
    const invoice = await db.invoices.findOne({
      where: { id: invoice_id },
      include: [
        { model: db.invoice_items, as: "items" },
        { model: db.banks, as: "bank" },
      ],
    });
    if (!invoice) {
      return res.status(404).json({ success: false, response: [] });
    }
    const plain = invoice.get({ plain: true });
    const response = (plain.items || []).map((it) => ({
      invoice_id: plain.id,
      client_name: plain.client_name,
      client_email: plain.client_email,
      client_address: plain.client_address,
      amount: plain.amount,
      invoice_date: plain.invoice_date,
      invoice_number: plain.invoice_number,
      receipt_no: plain.receipt_no,
      notes: plain.notes,
      status: plain.status,
      inv_category: plain.inv_category,
      description: it.description,
      quantity: it.quantity,
      price: it.price,
      total: it.quantity * it.price,
      bank_id: plain.bank?.id,
      bank_name: plain.bank?.bank_name,
      account_number: plain.bank?.account_number,
      account_name: plain.bank?.account_name,
    }));
    if (!response.length) {
      response.push({
        invoice_id: plain.id,
        client_name: plain.client_name,
        client_email: plain.client_email,
        client_address: plain.client_address,
        amount: plain.amount,
        invoice_date: plain.invoice_date,
        invoice_number: plain.invoice_number,
        receipt_no: plain.receipt_no,
        notes: plain.notes,
        status: plain.status,
        inv_category: plain.inv_category,
        bank_id: plain.bank?.id,
        bank_name: plain.bank?.bank_name,
        account_number: plain.bank?.account_number,
        account_name: plain.bank?.account_name,
      });
    }
    res.status(200).json({ success: true, response });
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).json({ success: false, response: error });
  }
};

export const getbanks = async (req, res) => {
  try {
    const result = await db.banks.findAll({ raw: true });
    res.status(200).json({ success: true, response: result });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, response: error });
  }
};

export const update_status = async (req, res) => {
  try {
    const { status = "", user_id = "" } = req.body;
    await db.invoices.update({ status }, { where: { id: user_id } });
    res.status(200).json({ success: true, response: [{ id: user_id, status }] });
  } catch (error) {
    res.status(500).json({ success: false, response: error });
  }
};

export const generate = async (req, res) => {
  // Legacy alias same as generateInvoice
  return generateInvoice(req, res);
};

export const generateinvoice = async (req, res) => {
  return generateInvoice(req, res);
};
