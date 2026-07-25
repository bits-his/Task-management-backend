import PDFDocument from "pdfkit";
import db from "../models/index.js";

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return String(value);
  }
}

function streamToBuffer(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

/**
 * Build an acceptance / placement letter PDF for an application.
 * @param {string|number} applicationRef application_code or numeric id
 */
export async function buildAcceptanceLetterPdf(applicationRef) {
  const { findApplicationByRef } = await import("./internshipService.js");
  const application = await findApplicationByRef(applicationRef, {
    include: [
      { model: db.internship_person, as: "person" },
      { model: db.internship_placement, as: "placements" },
    ],
  });
  if (!application) throw new Error("Application not found");

  const plain = application.get({ plain: true });
  const person = plain.person || {};
  const placement = (plain.placements || [])[0] || {};

  let startupName = null;
  const startupId = placement.startup_id || plain.assigned_startup_id;
  if (startupId) {
    const s = await db.startups.findOne({
      where: { startup_id: startupId },
      attributes: ["name"],
      raw: true,
    });
    startupName = s?.name || null;
  }

  let deptName = null;
  const deptId = placement.dept_id || plain.assigned_dept_id;
  if (deptId) {
    const d = await db.departments.findOne({
      where: { dept_id: deptId },
      attributes: ["dept_name"],
      raw: true,
    });
    deptName = d?.dept_name || null;
  }

  const officeDays = Array.isArray(placement.office_days)
    ? placement.office_days
    : [];

  const doc = new PDFDocument({ size: "A4", margin: 56 });
  const done = streamToBuffer(doc);

  doc
    .fontSize(16)
    .fillColor("#0f172a")
    .text("Brainstorm Innovation Hub", { align: "left" });
  doc
    .fontSize(10)
    .fillColor("#64748b")
    .text("Internship & Placement Unit", { align: "left" });
  doc.moveDown(0.5);
  doc
    .moveTo(56, doc.y)
    .lineTo(539, doc.y)
    .strokeColor("#e2e8f0")
    .stroke();
  doc.moveDown(1.2);

  doc
    .fontSize(14)
    .fillColor("#0f172a")
    .text("ACCEPTANCE / PLACEMENT LETTER", { align: "center" });
  doc.moveDown(1);

  doc
    .fontSize(10)
    .fillColor("#334155")
    .text(`Date: ${formatDate(new Date())}`)
    .moveDown(1);

  const fullName =
    [person.first_name, person.last_name].filter(Boolean).join(" ") ||
    person.fullname ||
    "Applicant";

  doc.text(`Dear ${fullName},`).moveDown(0.8);
  doc.text(
    "We are pleased to confirm your acceptance for a placement with Brainstorm Innovation Hub. The details of your placement are as follows:",
    { align: "justify" }
  );
  doc.moveDown(0.8);

  const lines = [
    ["Application ID", String(plain.id)],
    ["Placement type", placement.placement_type || plain.application_type || "—"],
    ["Department", deptName || placement.department || "—"],
    ["Startup / unit", startupName || "—"],
    ["Start date", formatDate(placement.start_date || plain.expected_start_date)],
    ["End date", formatDate(placement.end_date || plain.expected_end_date)],
    [
      "Office days",
      officeDays.length
        ? officeDays.map((d) => String(d).toUpperCase()).join(", ")
        : "As agreed with supervisor",
    ],
    ["Status", placement.status || plain.status || "—"],
  ];

  lines.forEach(([label, value]) => {
    doc.font("Helvetica-Bold").text(`${label}: `, { continued: true });
    doc.font("Helvetica").text(String(value));
  });

  doc.moveDown(1);
  doc.text(
    "Please activate your account using the invitation email (if not already done), complete attendance as required, and submit weekly progress reports during your placement.",
    { align: "justify" }
  );
  doc.moveDown(1);
  doc.text(
    "This letter may be presented to your institution or NYSC as confirmation of placement.",
    { align: "justify" }
  );
  doc.moveDown(1.5);
  doc.text("Yours faithfully,");
  doc.moveDown(2);
  doc.font("Helvetica-Bold").text("Internship & Placement Unit");
  doc.font("Helvetica").fillColor("#64748b").text("Brainstorm Innovation Hub");

  doc.end();
  const buffer = await done;
  const safeName = fullName.replace(/[^\w\-]+/g, "_").slice(0, 40);
  return {
    buffer,
    filename: `acceptance-letter-${safeName}-${plain.id}.pdf`,
  };
}
