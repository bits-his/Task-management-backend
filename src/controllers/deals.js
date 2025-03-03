import db from "../models";

const deals = (req, res) => {
  const {
    query_type = "create",
    deal_id = null,
    deal_name = null,
    deal_value = null,
    expected_revenue = null,
    expected_close_date = null,
    priority = "Medium",
    stage = "Prospecting",
    payment_status = "Pending",
    final_remarks = null,
    client = null,
    assigned_to = [],
    contract_files = [],
    updated_by = null,
    startup_id = "",
  } = req.body;

  const processedAssignedTo = Array.isArray(assigned_to)
    ? assigned_to.filter(Boolean).join(",")
    : assigned_to
    ? assigned_to
    : null;

  const processedContractFiles = Array.isArray(contract_files)
    ? contract_files.filter(Boolean).join(",")
    : contract_files
    ? contract_files
    : null;

  db.sequelize
    .query(
      `CALL deals(:query_type, :deal_id, :deal_name, :deal_value, :expected_revenue, :expected_close_date, :priority, :stage, :payment_status, :final_remarks, :client, :assigned_to, :contract_files,:updated_by,:startup_id)`,
      {
        replacements: {
          query_type,
          deal_id,
          deal_name,
          deal_value,
          expected_revenue,
          expected_close_date,
          priority,
          stage,
          payment_status,
          final_remarks,
          client,
          assigned_to: processedAssignedTo,
          contract_files: processedContractFiles,
          updated_by,
          startup_id,
        },
      }
    )
    .then((data) => res.json({ success: true, data }))
    .catch((err) => {
      console.error("Error managing deals:", err);
      res.status(500).json({ success: false, error: err.message });
    });
};
const get_deals = (req, res) => {
  const {
    query_type = "select",
    deal_id = null,
    deal_name = null,
    deal_value = null,
    expected_revenue = null,
    expected_close_date = null,
    priority = "Medium",
    stage = "Prospecting",
    payment_status = "Pending",
    final_remarks = null,
    client = null,
    assigned_to = [],
    contract_files = [],
    updated_by = null,

  } = req.body;

  const { startup_id = "" } = req.params;
  const processedAssignedTo = Array.isArray(assigned_to)
    ? assigned_to.filter(Boolean).join(",")
    : assigned_to
    ? assigned_to
    : null;

  const processedContractFiles = Array.isArray(contract_files)
    ? contract_files.filter(Boolean).join(",")
    : contract_files
    ? contract_files
    : null;

  db.sequelize
    .query(
      `CALL deals(:query_type, :deal_id, :deal_name, :deal_value, :expected_revenue, :expected_close_date, :priority, :stage, :payment_status, :final_remarks, :client, :assigned_to, :contract_files,:updated_by,:startup_id)`,
      {
        replacements: {
          query_type,
          deal_id,
          deal_name,
          deal_value,
          expected_revenue,
          expected_close_date,
          priority,
          stage,
          payment_status,
          final_remarks,
          client,
          assigned_to: processedAssignedTo,
          contract_files: processedContractFiles,
          updated_by,
          startup_id
        },
      }
    )
    .then((data) => res.json({ success: true, data }))
    .catch((err) => {
      console.error("Error managing deals:", err);
      res.status(500).json({ success: false, error: err.message });
    });
};

export { deals, get_deals };
