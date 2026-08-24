import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import db from "../models/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.join(__dirname, "../assets/logo-brainstorm.png");

const MARGIN = 56;
const FOOTER_LINES = [
  "Floor 1 African Alliance Building, No. 1 Sani Abacha way Kano.",
  "08065284720, 09032818956",
  "www.brainstorm.ng",
];

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatLetterDate(value = new Date()) {
  const d = new Date(value);
  return `${ordinal(d.getDate())} ${d.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  })}`;
}

function pronouns(gender) {
  const g = String(gender || "").toLowerCase();
  if (g === "male" || g === "m") {
    return { possessive: "his" };
  }
  if (g === "female" || g === "f") {
    return { possessive: "her" };
  }
  return { possessive: "their" };
}

function streamToBuffer(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

function contentWidth(doc) {
  return doc.page.width - MARGIN * 2;
}

function drawLetterhead(doc) {
  const top = 48;
  const textWidth = contentWidth(doc);
  const logoHeight = 42;
  const afterLogoGap = 16;
  const afterDateGap = 22;

  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, MARGIN, top, { fit: [140, logoHeight] });
  } else {
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#0f172a")
      .text("Brainstorm IT Solutions", MARGIN, top);
  }

  const dateY = top + logoHeight + afterLogoGap;
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#334155")
    .text(formatLetterDate(new Date()), MARGIN, dateY, {
      align: "right",
      width: textWidth,
    });

  doc.x = MARGIN;
  doc.y = dateY + afterDateGap;
}

function writeRichParagraph(doc, parts, options = {}) {
  const width = contentWidth(doc);
  parts.forEach((part, index) => {
    const isLast = index === parts.length - 1;
    doc
      .font(part.bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(11)
      .fillColor("#1e293b")
      .text(part.text, {
        align: "justify",
        width,
        lineGap: 2,
        continued: !isLast,
        ...options,
      });
  });
  doc.moveDown(0.15);
}

function writeSiwesAcceptanceBody(doc, fullName, matric, possessive) {
  const name = fullName.toUpperCase();
  writeRichParagraph(doc, [
    {
      text: "Following the request for SIWES placement forwarded to our office, we are pleased to inform you that we have accepted your student, ",
    },
    { text: name, bold: true },
    { text: ", bearing registration number " },
    { text: matric, bold: true },
    {
      text: `, for ${possessive} Industrial Training (IT) with us.`,
    },
  ]);
}

function drawFooter(doc) {
  const footerHeight = 32;
  const footerTop =
    doc.page.height - doc.page.margins.bottom - footerHeight;
  doc
    .font("Helvetica-Oblique")
    .fontSize(8)
    .fillColor("#475569")
    .text(FOOTER_LINES.join("\n"), MARGIN, footerTop, {
      align: "center",
      width: contentWidth(doc),
      lineGap: 0,
    });
}

function finalizeLetter(doc) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    if (i === range.start) drawFooter(doc);
  }
}

function writeParagraph(doc, text, options = {}) {
  doc.font("Helvetica").fontSize(11).fillColor("#1e293b").text(text, {
    align: "justify",
    width: contentWidth(doc),
    lineGap: 2,
    ...options,
  });
}

/**
 * Official SIWES acceptance letter (to institution coordinator), matching company format.
 */
export async function buildAcceptanceLetterPdf(applicationRef) {
  const { findApplicationByRef } = await import("./internshipService.js");
  const application = await findApplicationByRef(applicationRef, {
    include: [{ model: db.internship_person, as: "person" }],
  });
  if (!application) throw new Error("Application not found");

  const plain = application.get({ plain: true });
  const person = plain.person || {};
  const fullName = person.fullname || "Student";
  const matric = person.matric_number || "—";
  const school = plain.school || plain.institution || "your institution";
  const schoolState = plain.school_state || "";
  const { possessive } = pronouns(person.gender);
  const isSiwes = plain.application_type === "siwes";

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: MARGIN, bottom: 70, left: MARGIN, right: MARGIN },
    bufferPages: true,
  });
  const done = streamToBuffer(doc);

  drawLetterhead(doc);

  if (isSiwes) {
    doc.font("Helvetica").fontSize(11).fillColor("#0f172a");
    doc.text("The SIWES Coordinator,", { width: contentWidth(doc) });
    doc.text(`${school},`);
    const course = plain.course || plain.department_course;
    if (course) doc.text(`Department of ${course},`);
    doc.text(schoolState ? `${schoolState}.` : ".");

    doc.moveDown(0.8);
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("Acceptance Letter", { align: "center", width: contentWidth(doc), underline: true });

    doc.moveDown(0.8);
    writeSiwesAcceptanceBody(doc, fullName, matric, possessive);
    doc.moveDown(0.35);
    writeParagraph(
      doc,
      `Throughout ${possessive} stay with us, we anticipate ${possessive} adherence to our organizational policies, eagerness to acquire relevant skills pertinent to ${possessive} field of study, and willingness to contribute towards the advancement of our organization.`
    );
  } else {
    doc.font("Helvetica").fontSize(11).fillColor("#0f172a");
    doc.text(`Dear ${fullName},`, { width: contentWidth(doc) });
    doc.moveDown(0.6);
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("Acceptance Letter", { align: "center", width: contentWidth(doc), underline: true });
    doc.moveDown(0.6);
    writeParagraph(
      doc,
      `We are pleased to confirm your acceptance for a ${plain.application_type?.replace(/_/g, " ") || "placement"} with Brainstorm IT Solutions Ltd.`
    );
    doc.moveDown(0.4);
    doc.font("Helvetica").fontSize(11).fillColor("#1e293b");
    doc.text(`Reference: ${plain.application_code || plain.id}`);
    if (plain.preferred_department) doc.text(`Department: ${plain.preferred_department}`);
    if (plain.placement_duration) doc.text(`Duration: ${plain.placement_duration}`);
    doc.moveDown(0.5);
    writeParagraph(
      doc,
      "Please visit our office to collect your signed acceptance letter for your records or institution."
    );
  }

  doc.moveDown(1);
  doc.font("Helvetica").fontSize(11).fillColor("#0f172a").text("Best regards,");
  doc.moveDown(1.2);
  doc.font("Helvetica-Bold").text("Mary Dania,");
  doc.font("Helvetica").text("For: Brainstorm IT Solutions Ltd.");

  finalizeLetter(doc);

  doc.end();
  const buffer = await done;
  const safeName = fullName.replace(/[^\w\-]+/g, "_").slice(0, 40);
  return {
    buffer,
    filename: `acceptance-letter-${safeName}-${plain.application_code || plain.id}.pdf`,
  };
}
