import db from "../models/index.js";

const runDeals = async (params) => {
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
    assigned_to = null,
    contract_files = null,
    updated_by = null,
    startup_id = null,
  } = params;

  if (query_type === "create") {
    const row = await db.deals.create({
      deal_name,
      deal_value,
      expected_revenue,
      expected_close_date,
      priority,
      stage,
      payment_status,
      final_remarks,
      client,
      assigned_to,
      contract_files,
      updated_by,
      startup_id: startup_id || null,
    });
    return [row.get({ plain: true })];
  }

  if (query_type === "update") {
    const patch = {
      deal_name,
      deal_value,
      expected_revenue,
      expected_close_date,
      priority,
      stage,
      payment_status,
      final_remarks,
      client,
      assigned_to,
      contract_files,
    };
    if (startup_id != null && startup_id !== "") patch.startup_id = startup_id;
    await db.deals.update(patch, { where: { id: deal_id } });
    return [{ id: deal_id }];
  }

  if (query_type === "update_deal_stage") {
    await db.sequelize.transaction(async (transaction) => {
      await db.deals.update(
        { stage },
        { where: { id: deal_id }, transaction }
      );
      await db.deal_history.create(
        { deal_id, stages: stage, updated_by },
        { transaction }
      );
    });
    return [{ id: deal_id, stage }];
  }

  if (query_type === "delete") {
    await db.deals.destroy({ where: { id: deal_id } });
    return [{ id: deal_id }];
  }

  if (query_type === "select") {
    const where = {};
    if (deal_id != null && deal_id !== "") where.id = deal_id;
    if (startup_id != null && startup_id !== "" && startup_id !== "Not Assigned") {
      where.startup_id = startup_id;
    }
    return db.deals.findAll({ where, raw: true });
  }

  return [];
};

const normalize = (assigned_to, contract_files) => {
  const processedAssignedTo = Array.isArray(assigned_to)
    ? assigned_to.filter(Boolean).join(",")
    : assigned_to || null;
  const processedContractFiles = Array.isArray(contract_files)
    ? contract_files.filter(Boolean).join(",")
    : contract_files || null;
  return { processedAssignedTo, processedContractFiles };
};

const deals = async (req, res) => {
  try {
    const body = { ...req.query, ...req.body };
    const { processedAssignedTo, processedContractFiles } = normalize(
      body.assigned_to,
      body.contract_files
    );
    const data = await runDeals({
      ...body,
      query_type: body.query_type || "create",
      assigned_to: processedAssignedTo,
      contract_files: processedContractFiles,
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error("Error managing deals:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

const get_deals = async (req, res) => {
  try {
    const body = { ...req.query, ...req.body };
    const { processedAssignedTo, processedContractFiles } = normalize(
      body.assigned_to,
      body.contract_files
    );
    const data = await runDeals({
      ...body,
      query_type: body.query_type || "select",
      assigned_to: processedAssignedTo,
      contract_files: processedContractFiles,
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error("Error managing deals:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export { deals, get_deals };
