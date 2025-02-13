import db from "../models";
import moment from "moment";

export const generateInvoice = (req, res) => {
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

  console.log("Received Request:", req.body);

  const itemsJSON = JSON.stringify(items); // Convert items array to JSON
  const formattedDate = moment().format("YYYY-MM-DD HH:mm:ss");

  db.sequelize
    .query(
      `CALL generate_invoice (
        :query_type,
        :user_id,
        :client,
        :email,
        :clientAddress,
        :amount,
        :date,
        :invoice_number,
        :receipt_no,
        :items,
        :note,
        :status,
        :bank_id,
        :inv_category
      )`,
      {
        replacements: {
          query_type: "generate",
          user_id: 0, // Change if necessary
          client,
          email,
          clientAddress,
          amount,
          date: formattedDate,
          invoice_number: 0,
          receipt_no: 0,
          items: itemsJSON,
          note,
          status,
          bank_id,
          inv_category,
        },
      }
    )
    .then((result) => {
      res.status(200).json({ success: true, response: result });
    })
    .catch((error) => {
      console.error("Database Error:", error);
      res.status(500).json({ success: false, response: error });
    });
};
export const getInvoice = (req, res) => {
  const { invoice_id } = req.params;
  db.sequelize
    .query(
      `CALL generate_invoice(:query_type, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)`,
      {
        replacements: {
          query_type: "getallinvoices",
        },
      }
    )
    .then((result) => {
      // Step 1: Group invoices by invoice_id
      const invoiceMap = {};

      result.forEach((row) => {
        const invoiceId = row.invoice_id;

        // If invoice is not already in the map, add it
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
            items: [], // Initialize empty items array
          };
        }

        // Add item details only if there is an item
        if (row.item_id) {
          invoiceMap[invoiceId].items.push({
            item_id: row.item_id,
            description: row.description,
            quantity: row.quantity,
            price: row.price,
            total: row.total,
          });
        }
      });

      // Step 2: Convert invoiceMap to an array
      const invoices = Object.values(invoiceMap);

      res.status(200).json({ success: true, invoices });
    })
    .catch((error) => {
      console.error("Database Error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch invoices", error });
    });
};

export const getinvoice_by_id = (req, res) => {
  console.log("Received Request:", req.body);
  const { invoice_id = "" } = req.query;

  db.sequelize
    .query(
      `CALL generate_invoice (
        :query_type,
        :user_id,
        :client,
        :email,
        :clientAddress,
        :amount,
        :date,
        :invoice_number,
        :receipt_no,
        :items,
        :note,
        :status,
        :bank_id,
        :in_inv_category
      )`,
      {
        replacements: {
          query_type: "getinvoice_by_id",
          user_id: invoice_id,
          client: "",
          email: "",
          clientAddress: "",
          amount: 0.00,
          date: moment().format("YYYY-MM-DD HH:mm:ss"),
          invoice_number: "",
          receipt_no: "",
          items: "",
          note: "",
          status: "",
          bank_id: "",
          in_inv_category:""
        },
      }
    )
    .then((result) => {
      res.status(200).json({ success: true, response: result });
    })
    .catch((error) => {
      console.error("Database Error:", error);
      res.status(500).json({ success: false, response: error });
    });
};

export const getbanks = (req, res) => {
  console.log(req.body);
  db.sequelize
    .query(
      `CALL banks (
        :query_type,
        :id,
        :account_id,
        :account_name,
        :account_number,
        :bank_name
        )`,
      {
        replacements: {
          query_type: "getbanks",
          id: null,
          account_id: null,
          account_name: null,
          account_number: null,
          bank_name: null,
        },
      }
    )
    .then((result) => {
      res.status(200).json({ success: true, response: result });
    })
    .catch((error) => {
      console.log(error),
        res.status(500).json({ success: false, response: error });
    });
};

export const update_status = (req, res) => {
  const { status = "", user_id = "" } = req.body;
  console.log(req.body);
  db.sequelize
    .query(
      `
    CALL generate_invoice(
        :query_type,
        :user_id,
        :client,
        :email,
        :clientAddress,
        :amount,
        :date,
        :invoice_number,
        :receipt_no,
        :items,
        :note,
        :status,
        :bank_id,
        ''
    )`,
      {
        replacements: {
          query_type: "update_inv_status",
          user_id,
          client: "",
          email: "",
          clientAddress: "",
          amount: 0.00,
          date: moment().format("YYYY-MM-DD HH:mm:ss"),
          invoice_number: "",
          receipt_no: "",
          items: "",
          note: "",
          status,
          bank_id: "",
          in_inv_category:""
        },
      }
    )
    .then((result) => {
      res.status(200).json({ success: true, response: result });
    })
    .catch((error) => {
      res.status(500).json({ success: false, response: error });
    });
};


export const generate = (req, res) => {
  const {
    client = "",
    email = "",
    amount = "",
    items = "",
    note = "",
    status = "",
  } = req.body;

  console.log(req.body);

  db.sequelize
    .query(
      ` CALL users (
        :query_type,
        :user_id,
        :client,
        :email,
        :amount,
        :date,
        :invoice_number,
        :reciept_no,
        :items,
        :note,
        :status
        )`,
      {
        replacements: {
          query_type: "generate",
          user_id: 0,
          client,
          email,
          amount,
          date: new Date(),
          invoice_number: 0,
          reciept_no: 0,
          items,
          note,
          status,
        },
      }
    )
    .then((result) => {
      res.status(200).json({ success: true, response: result });
    })
    .catch((error) => {
      console.log(error);
      res.status(500).json({ success: false, response: error });
    });
};

export const generateinvoice = (req, res) => {
  const {
    client = "",
    email = "",
    amount = 0,
    items = [],
    note = "",
    status = "pending",
  } = req.body;

  console.log("Request Body:", req.body);

  // Ensure items are stored as JSON string if needed
  const itemsJSON = JSON.stringify(items);

  // Format the date correctly for MySQL

  db.sequelize
    .query(
      `CALL generate_invoice (
        :query_type,
        :user_id,
        :client,
        :email,
        :amount,
        :date,
        :invoice_number,
        :reciept_number,
        :items,
        :note,
        :status
      )`,
      {
        replacements: {
          query_type: "generate",
          user_id: 0, // Replace with actual user ID if available
          client,
          email,
          amount,
          date: new Date(),
          invoice_number: 0, // Generate a random invoice number
          reciept_number: 0, // Generate a random receipt number
          items: itemsJSON,
          note,
          status,
        },
      }
    )
    .then((result) => {
      res.status(200).json({ success: true, response: result });
    })
    .catch((error) => {
      console.error("Database Error:", error);
      res.status(500).json({ success: false, response: error });
    });
};