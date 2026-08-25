import crypto from "crypto";
import Sequelize from "sequelize";
import db from "../models/index.js";
import { internshipFilePublicUrl } from "../config/internshipUpload.js";
import { createToken, hashToken, sendMail, sendPlacementWelcomeEmail } from "./mail.js";

const { Op } = Sequelize;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5100";

const STATUS_FLOW = [
  "submitted",
  "under_review",
  "document_verification",
  "interview_scheduled",
  "accepted",
  "rejected",
  "waiting_list",
  "completed",
];

function generateTrackingCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

async function generateApplicationCode() {
  const year = new Date().getFullYear();
  const count = await db.internship_application.count({
    where: {
      application_code: { [Op.like]: `APP-${year}-%` },
    },
  });
  return `APP-${year}-${String(count + 1).padStart(5, "0")}`;
}

async function generatePersonCode() {
  const count = await db.internship_person.count();
  return `PSN-${String(count + 1).padStart(5, "0")}`;
}

async function generateApplicantId() {
  const year = new Date().getFullYear();
  const count = await db.internship_application.count({
    where: { applicant_id: { [Op.like]: `INT-${year}-%` } },
  });
  return `INT-${year}-${String(count + 1).padStart(4, "0")}`;
}

const OFFICE_DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function normalizeOfficeDays(value) {
  if (!value) return [];
  const list = Array.isArray(value)
    ? value
    : String(value)
        .split(",")
        .map((s) => s.trim().toLowerCase());
  return list.filter((d) => OFFICE_DAY_KEYS.includes(d));
}

let officeDaysColumnReady = false;
async function ensureOfficeDaysColumn() {
  if (officeDaysColumnReady) return;
  try {
    await db.sequelize.query(
      "ALTER TABLE internship_placement ADD COLUMN office_days TEXT NULL"
    );
  } catch {
    /* column already exists */
  }
  try {
    await db.sequelize.query(
      "ALTER TABLE internship_placement MODIFY COLUMN application_id INT NULL"
    );
  } catch {
    /* already nullable or unsupported */
  }
  officeDaysColumnReady = true;
}

function roleFromApplicationType(type) {
  if (type === "siwes") return "siwes";
  return "intern";
}

export async function findExistingPerson(criteria = {}) {
  const { email, phone_number, matric_number, nysc_callup_number } = criteria;
  const conditions = [];

  if (email) conditions.push({ email: email.toLowerCase().trim() });
  if (phone_number) conditions.push({ phone_number: phone_number.trim() });
  if (matric_number) conditions.push({ matric_number: matric_number.trim() });
  if (nysc_callup_number) {
    conditions.push({ nysc_callup_number: nysc_callup_number.trim() });
  }

  if (!conditions.length) return null;

  return db.internship_person.findOne({
    where: { [Op.or]: conditions },
  });
}

/** Statuses that reserve a seat on an opportunity (not rejected / waiting / completed). */
const SLOT_OCCUPYING_STATUSES = [
  "submitted",
  "under_review",
  "document_verification",
  "interview_scheduled",
  "accepted",
];

async function occupiedSlotCountByOpportunity(opportunityIds = []) {
  if (!opportunityIds.length) return new Map();
  const rows = await db.internship_application.findAll({
    attributes: [
      "opportunity_id",
      [Sequelize.fn("COUNT", Sequelize.col("id")), "count"],
    ],
    where: {
      opportunity_id: { [Op.in]: opportunityIds },
      status: { [Op.in]: SLOT_OCCUPYING_STATUSES },
    },
    group: ["opportunity_id"],
    raw: true,
  });
  return new Map(
    rows.map((r) => [Number(r.opportunity_id), Number(r.count) || 0])
  );
}

function withSlotStats(opportunity, occupiedCount = 0) {
  if (!opportunity) return opportunity;
  const slots = Number(opportunity.slots) || 0;
  const filled = Number(occupiedCount) || 0;
  const remaining = slots > 0 ? Math.max(0, slots - filled) : null;
  return {
    ...opportunity,
    slots_filled: filled,
    slots_remaining: remaining,
  };
}

export async function listOpenOpportunities() {
  const rows = await db.internship_opportunity.findAll({
    where: {
      status: { [Op.in]: ["open", "closed"] },
    },
    order: [
      [
        db.sequelize.literal(
          "CASE WHEN status = 'open' THEN 0 WHEN status = 'closed' THEN 1 ELSE 2 END"
        ),
        "ASC",
      ],
      ["created_at", "DESC"],
    ],
    raw: true,
  });
  const today = new Date().toISOString().slice(0, 10);
  const visible = rows.filter((row) => {
    if (row.status === "closed") return true;
    if (row.status !== "open") return false;
    if (!row.deadline) return true;
    return row.deadline >= today;
  });
  const counts = await occupiedSlotCountByOpportunity(visible.map((r) => r.id));
  return visible.map((row) => withSlotStats(row, counts.get(row.id) || 0));
}

export async function listAllOpportunities(query = {}) {
  const where = {};
  if (query.status) where.status = query.status;
  if (query.application_type) where.application_type = query.application_type;
  return db.internship_opportunity.findAll({
    where,
    order: [["created_at", "DESC"]],
    raw: true,
  });
}

const OPPORTUNITY_FIELDS = [
  "title",
  "application_type",
  "description",
  "department",
  "dept_id",
  "slots",
  "duration",
  "deadline",
  "requirements",
  "status",
];

function parseOpportunityPayload(body = {}) {
  const payload = {};
  for (const key of OPPORTUNITY_FIELDS) {
    if (body[key] !== undefined) payload[key] = body[key];
  }
  if (payload.slots !== undefined) payload.slots = Number(payload.slots) || 0;
  if (payload.deadline === "") payload.deadline = null;
  return payload;
}

export async function createOpportunity(body = {}) {
  const payload = parseOpportunityPayload(body);
  if (!payload.title?.trim()) throw new Error("Title is required");
  if (!payload.application_type) throw new Error("Application type is required");
  if (!payload.status) payload.status = "open";
  if (payload.slots === undefined) payload.slots = 0;

  const row = await db.internship_opportunity.create(payload);
  return row.get({ plain: true });
}

export async function updateOpportunity(id, body = {}) {
  const row = await db.internship_opportunity.findByPk(id);
  if (!row) throw new Error("Opportunity not found");
  const payload = parseOpportunityPayload(body);
  await row.update(payload);
  return row.get({ plain: true });
}

export async function deleteOpportunity(id) {
  const row = await db.internship_opportunity.findByPk(id);
  if (!row) throw new Error("Opportunity not found");

  const linked = await db.internship_application.count({
    where: { opportunity_id: id },
  });
  if (linked > 0) {
    await row.update({ status: "closed" });
    return {
      deleted: false,
      closed: true,
      message: "Opportunity has applications; it was closed instead of deleted.",
      data: row.get({ plain: true }),
    };
  }

  await row.destroy();
  return { deleted: true, closed: false };
}

export async function getOpportunityById(id) {
  const row = await db.internship_opportunity.findByPk(id, { raw: true });
  if (!row) return null;
  const counts = await occupiedSlotCountByOpportunity([row.id]);
  return withSlotStats(row, counts.get(row.id) || 0);
}

function parseApplicationPayload(body = {}) {
  return {
    application_type: body.application_type,
    opportunity_id: body.opportunity_id ? Number(body.opportunity_id) : null,
    institution: body.institution || null,
    faculty: body.faculty || null,
    department_course: body.department_course || null,
    course: body.course || null,
    academic_session: body.academic_session || null,
    current_level: body.current_level || null,
    expected_graduation_year: body.expected_graduation_year || null,
    course_studied: body.course_studied || null,
    callup_number: body.callup_number || null,
    batch: body.batch || null,
    stream: body.stream || null,
    state_of_deployment: body.state_of_deployment || null,
    highest_qualification: body.highest_qualification || null,
    school: body.school || null,
    school_state: body.school_state || null,
    area_of_interest: body.area_of_interest || null,
    preferred_department: body.preferred_department || null,
    placement_duration: body.placement_duration || body.duration || null,
    expected_start_date: body.expected_start_date || null,
    expected_end_date: body.expected_end_date || null,
  };
}

function parsePersonPayload(body = {}) {
  return {
    fullname: body.fullname?.trim(),
    gender: body.gender || null,
    date_of_birth: body.date_of_birth || null,
    email: body.email?.toLowerCase().trim(),
    phone_number: body.phone_number?.trim(),
    residential_address: body.residential_address || null,
    state: body.state || null,
    emergency_contact_name: body.emergency_contact_name || null,
    emergency_contact_phone: body.emergency_contact_phone || null,
    matric_number: body.matric_number?.trim() || null,
    nysc_callup_number: body.callup_number?.trim() || body.nysc_callup_number?.trim() || null,
    passport_url: body.passport_url || null,
  };
}

export async function submitApplication(body, files = []) {
  const personData = parsePersonPayload(body);
  const appData = parseApplicationPayload(body);

  if (!personData.fullname || !personData.email || !personData.phone_number) {
    throw new Error("Full name, email, and phone number are required");
  }
  if (!appData.application_type) {
    throw new Error("Application type is required");
  }

  if (appData.opportunity_id) {
    const opportunity = await getOpportunityById(appData.opportunity_id);
    if (!opportunity) throw new Error("Opportunity not found");
    if (opportunity.status !== "open") {
      throw new Error("This opportunity is no longer open");
    }
    if (
      opportunity.slots > 0 &&
      opportunity.slots_remaining != null &&
      opportunity.slots_remaining <= 0
    ) {
      throw new Error("No slots remaining for this opportunity");
    }
  }

  let person = await findExistingPerson({
    email: personData.email,
    phone_number: personData.phone_number,
    matric_number: personData.matric_number,
    nysc_callup_number: personData.nysc_callup_number,
  });

  if (person) {
    await person.update({
      fullname: personData.fullname,
      gender: personData.gender,
      date_of_birth: personData.date_of_birth,
      phone_number: personData.phone_number,
      residential_address: personData.residential_address,
      state: personData.state,
      emergency_contact_name: personData.emergency_contact_name,
      emergency_contact_phone: personData.emergency_contact_phone,
      matric_number: personData.matric_number || person.matric_number,
      nysc_callup_number:
        personData.nysc_callup_number || person.nysc_callup_number,
      passport_url: personData.passport_url || person.passport_url,
    });
  } else {
    person = await db.internship_person.create({
      person_code: await generatePersonCode(),
      ...personData,
    });
  }

  const application = await db.internship_application.create({
    application_code: await generateApplicationCode(),
    tracking_code: generateTrackingCode(),
    person_id: person.id,
    ...appData,
    status: "submitted",
    submitted_at: new Date(),
  });

  const docRows = [];
  for (const file of files) {
    const docType = file.fieldname || "document";
    const fileUrl = internshipFilePublicUrl(file);
    docRows.push({
      application_id: application.id,
      document_type: docType,
      file_url: fileUrl,
      file_name: file.originalname,
      is_required: !String(docType).startsWith("optional_"),
    });
    if (docType === "passport" && fileUrl) {
      await person.update({ passport_url: fileUrl });
    }
  }

  if (docRows.length) {
    await db.internship_application_document.bulkCreate(docRows);
  }

  await db.internship_application_log.create({
    application_id: application.id,
    log_type: "audit",
    content: "Application submitted",
    metadata: { status: "submitted" },
  });

  try {
    await sendMail({
      to: person.email,
      subject: "Application received Brainstorm Internship & Placement",
      html: `
      <p>Hi ${person.fullname},</p>
      <p>We received your ${appData.application_type.replace(/_/g, " ")} application.</p>
      <p><strong>Reference number:</strong> ${application.application_code}</p>
      <p><strong>Tracking code:</strong> ${application.tracking_code}</p>
      <p>Track your application at <a href="${FRONTEND_URL}/internship/track">${FRONTEND_URL}/internship/track</a></p>
    `,
    });
  } catch (err) {
    console.error("[internship] application confirmation email failed:", err.message);
  }

  if (appData.opportunity_id) {
    const opportunity = await getOpportunityById(appData.opportunity_id);
    if (
      opportunity &&
      opportunity.slots > 0 &&
      opportunity.slots_remaining != null &&
      opportunity.slots_remaining <= 0 &&
      opportunity.status === "open"
    ) {
      await db.internship_opportunity.update(
        { status: "closed" },
        { where: { id: opportunity.id } }
      );
    }
  }

  return {
    application_code: application.application_code,
    tracking_code: application.tracking_code,
    application_id: application.id,
    person_reused: !!person.created_at && person.created_at < application.created_at,
  };
}

export async function requestTrackOtp({ application_code, email }) {
  const application = await db.internship_application.findOne({
    where: { application_code },
    include: [{ model: db.internship_person, as: "person" }],
  });

  if (!application) throw new Error("Application not found");
  if (
    application.person.email.toLowerCase() !== String(email).toLowerCase().trim()
  ) {
    throw new Error("Email does not match this application");
  }

  const rawOtp = String(Math.floor(100000 + Math.random() * 900000));
  const expires = new Date(Date.now() + 15 * 60 * 1000);

  await db.internship_track_otp.create({
    application_id: application.id,
    email: application.person.email,
    otp_hash: hashToken(rawOtp),
    expires_at: expires,
  });

  try {
    const mailResult = await sendMail({
      to: application.person.email,
      subject: "Your application tracking code",
      html: `
      <p>Hi ${application.person.fullname},</p>
      <p>Your one-time tracking code is: <strong>${rawOtp}</strong></p>
      <p>This code expires in 15 minutes.</p>
    `,
    });
    if (mailResult?.skipped) {
      console.warn(
        `[internship] SMTP not configured. OTP for ${application.person.email}: ${rawOtp}`
      );
    }
  } catch (err) {
    console.error("[internship] tracking OTP email failed:", err.message);
    throw new Error("Could not send verification code. Try again later.");
  }

  return { success: true };
}

function buildStatusTimeline(application, logs = []) {
  const timeline = STATUS_FLOW.filter((s) => {
    if (s === "rejected" && application.status !== "rejected") return false;
    if (s === "waiting_list" && application.status !== "waiting_list") return false;
    return true;
  }).map((status) => {
    const hit = logs.find(
      (l) => l.log_type === "status_change" && l.metadata?.status === status
    );
    return {
      status,
      label: status.replace(/_/g, " "),
      reached: hit || status === application.status || STATUS_FLOW.indexOf(status) <= STATUS_FLOW.indexOf(application.status),
      at: hit?.created_at || null,
    };
  });
  return timeline;
}

export async function verifyTrackOtp({ application_code, email, otp }) {
  const application = await db.internship_application.findOne({
    where: { application_code },
    include: [
      { model: db.internship_person, as: "person" },
      { model: db.internship_application_document, as: "documents" },
      { model: db.internship_application_log, as: "logs" },
      { model: db.internship_opportunity, as: "opportunity" },
    ],
    order: [[{ model: db.internship_application_log, as: "logs" }, "created_at", "ASC"]],
  });

  if (!application) throw new Error("Application not found");
  if (
    application.person.email.toLowerCase() !== String(email).toLowerCase().trim()
  ) {
    throw new Error("Email does not match this application");
  }

  const otpRow = await db.internship_track_otp.findOne({
    where: {
      application_id: application.id,
      expires_at: { [Op.gt]: new Date() },
      verified_at: null,
    },
    order: [["created_at", "DESC"]],
  });

  if (!otpRow || otpRow.otp_hash !== hashToken(String(otp))) {
    throw new Error("Invalid or expired OTP");
  }

  await otpRow.update({ verified_at: new Date() });

  const previousApplications = await db.internship_application.findAll({
    where: {
      person_id: application.person_id,
      id: { [Op.ne]: application.id },
    },
    order: [["created_at", "DESC"]],
    raw: true,
  });

  let placementInfo = {};
  if (["accepted", "completed"].includes(application.status)) {
    const placement = await db.internship_placement.findOne({
      where: { application_id: application.id },
      order: [["id", "DESC"]],
    });
    if (placement) {
      const plain = placement.get({ plain: true });
      placementInfo = {
        office_days: normalizeOfficeDays(plain.office_days),
        placement_start_date: plain.start_date || null,
        placement_end_date: plain.end_date || null,
      };
    }
  }

  const can_resubmit = await computeCanResubmit(
    application.get({ plain: true })
  );

  let resubmit_token = null;
  if (application.status === "rejected" && can_resubmit) {
    resubmit_token = await issueResubmitToken(application, 72);
  }

  return {
    application: {
      application_code: application.application_code,
      application_type: application.application_type,
      status: application.status,
      preferred_department: application.preferred_department,
      expected_start_date: application.expected_start_date,
      expected_end_date: application.expected_end_date,
      interview_scheduled_at: application.interview_scheduled_at,
      rejection_reason: application.rejection_reason,
      can_resubmit,
      ...placementInfo,
    },
    documents: application.documents,
    timeline: buildStatusTimeline(application, application.logs),
    messages: application.logs.filter((l) => l.log_type === "message"),
    previous_applications: previousApplications.map((a) => ({
      application_type: a.application_type,
      academic_session: a.academic_session,
      current_level: a.current_level,
      status: a.status,
      submitted_at: a.submitted_at,
    })),
    resubmit_token,
  };
}

export async function listApplications(filters = {}) {
  const where = {};
  if (filters.status) where.status = filters.status;
  if (filters.application_type) where.application_type = filters.application_type;
  if (filters.search) {
    const q = `%${filters.search}%`;
    where[Op.or] = [
      { application_code: { [Op.like]: q } },
      { preferred_department: { [Op.like]: q } },
      Sequelize.where(Sequelize.col("person.fullname"), { [Op.like]: q }),
      Sequelize.where(Sequelize.col("person.email"), { [Op.like]: q }),
      Sequelize.where(Sequelize.col("person.phone_number"), { [Op.like]: q }),
    ];
  }

  const rows = await db.internship_application.findAll({
    where,
    include: [{ model: db.internship_person, as: "person" }],
    subQuery: false,
    order: [["submitted_at", "DESC"]],
    limit: Math.min(Number(filters.limit) || 50, 100),
    offset: Number(filters.offset) || 0,
  });

  return rows.map((row) => ({
    id: row.id,
    application_code: row.application_code,
    application_type: row.application_type,
    status: row.status,
    preferred_department: row.preferred_department,
    submitted_at: row.submitted_at,
    person: {
      fullname: row.person?.fullname,
      email: row.person?.email,
      phone_number: row.person?.phone_number,
      user_id: row.person?.user_id || null,
    },
  }));
}

/**
 * Resolve application by reference code (preferred) or numeric id (legacy links).
 */
export async function findApplicationByRef(ref, { include = [] } = {}) {
  const key = String(ref || "").trim();
  if (!key) return null;

  const byCode = await db.internship_application.findOne({
    where: { application_code: key },
    include,
  });
  if (byCode) return byCode;

  if (/^\d+$/.test(key)) {
    return db.internship_application.findByPk(Number(key), { include });
  }
  return null;
}

export async function getApplicationDetail(ref) {
  const application = await findApplicationByRef(ref, {
    include: [
      { model: db.internship_person, as: "person" },
      { model: db.internship_application_document, as: "documents" },
      {
        model: db.internship_application_log,
        as: "logs",
        separate: true,
        order: [["created_at", "DESC"]],
      },
      { model: db.internship_opportunity, as: "opportunity" },
      { model: db.internship_placement, as: "placements" },
    ],
  });

  if (!application) return null;

  const plain = application.get({ plain: true });

  const history = await db.internship_application.findAll({
    where: { person_id: plain.person_id },
    order: [["created_at", "DESC"]],
    raw: true,
  });

  return { application: plain, history };
}

export async function updateApplicationStatus(ref, payload, authorUserId) {
  const application = await findApplicationByRef(ref);
  if (!application) throw new Error("Application not found");
  const id = application.id;

  if (payload.status === "accepted" && application.status !== "accepted") {
    throw new Error(
      "Use Approve to accept that creates the account and emails a temporary password."
    );
  }

  const updates = {};
  const allowed = [
    "status",
    "assigned_reviewer_id",
    "assigned_supervisor_id",
    "assigned_dept_id",
    "assigned_startup_id",
    "interview_scheduled_at",
    "rejection_reason",
  ];

  for (const key of allowed) {
    if (payload[key] !== undefined) updates[key] = payload[key];
  }

  await application.update(updates);

  if (payload.status) {
    await db.internship_application_log.create({
      application_id: id,
      author_user_id: authorUserId || null,
      log_type: "status_change",
      content: `Status changed to ${payload.status}`,
      metadata: { status: payload.status },
    });
  }

  if (payload.note) {
    await db.internship_application_log.create({
      application_id: id,
      author_user_id: authorUserId || null,
      log_type: "note",
      content: payload.note,
    });
  }

  return application;
}

export async function approveApplication(ref, payload, authorUserId) {
  await ensureOfficeDaysColumn();
  const application = await findApplicationByRef(ref, {
    include: [{ model: db.internship_person, as: "person" }],
  });
  if (!application) throw new Error("Application not found");

  if (application.status === "accepted") {
    throw new Error("Application is already accepted");
  }

  if (application.opportunity_id) {
    const opportunity = await getOpportunityById(application.opportunity_id);
    // This application may already reserve a seat (submitted / under review / …).
    // Only block when the opportunity is full AND this app is not already counted.
    const alreadyOccupies = SLOT_OCCUPYING_STATUSES.includes(
      application.status
    );
    if (
      opportunity &&
      opportunity.slots > 0 &&
      opportunity.slots_remaining != null &&
      opportunity.slots_remaining <= 0 &&
      !alreadyOccupies
    ) {
      throw new Error("No slots remaining for this opportunity");
    }
  }

  const person = application.person;
  if (!person?.email) throw new Error("Applicant email is missing");

  const id = application.id;
  const applicantId = application.applicant_id || (await generateApplicantId());
  const officeDays = normalizeOfficeDays(payload.office_days);
  const startDate = payload.start_date || application.expected_start_date;
  const endDate = payload.end_date || application.expected_end_date;
  const deptId = payload.dept_id || application.assigned_dept_id || null;
  const startupId = payload.startup_id || application.assigned_startup_id || null;
  const supervisorId =
    payload.supervisor_id || application.assigned_supervisor_id || null;

  const bcrypt = (await import("bcryptjs")).default;
  const { nextUserId } = await import("./numberGenerator.js");
  const { upsertMembership, getRoleAccessPreset } = await import(
    "./membershipService.js"
  );

  const role = roleFromApplicationType(application.application_type);
  const preset = getRoleAccessPreset(role);
  const orgId = "1";

  let userId = person.user_id ? String(person.user_id) : null;
  let temporaryPassword = null;
  let existingPortalAccount = false;

  if (userId) {
    existingPortalAccount = true;
    const linkedUser = await db.users.findOne({ where: { user_id: userId } });
    if (!linkedUser) throw new Error("Linked platform account not found");
    const activePlacement = await db.internship_placement.findOne({
      where: {
        person_id: person.id,
        status: { [Op.in]: ["pending", "active"] },
      },
    });
    if (activePlacement) {
      throw new Error("Applicant already has an active placement");
    }
  } else {
    const existing = await db.users.findOne({
      where: { email: person.email },
    });
    if (existing) {
      userId = String(existing.user_id);
      existingPortalAccount = true;
      await person.update({ user_id: userId });
    }
  }

  let phoneNo = person.phone_number || null;
  if (phoneNo) {
    const phoneTaken = await db.users.findOne({
      where: { phone_no: phoneNo, user_id: { [Op.ne]: userId || "" } },
    });
    if (phoneTaken) phoneNo = null;
  }

  if (!userId) {
    userId = await nextUserId(role === "siwes" ? "SIW" : "INT");
    temporaryPassword = createToken(5);
    const hash = await bcrypt.hash(temporaryPassword, 10);

    await db.users.create({
      user_id: userId,
      fullname: person.fullname,
      email: person.email,
      phone_no: phoneNo,
      address: person.residential_address || "",
      password: hash,
      status: "Approved",
      org_id: orgId,
      starting_date: startDate || null,
      end_date: endDate || null,
      profile: person.passport_url || null,
      email_verified: true,
    });

    await person.update({ user_id: userId });
  } else {
    await db.users.update(
      {
        fullname: person.fullname,
        phone_no: phoneNo,
        address: person.residential_address || "",
        starting_date: startDate || null,
        end_date: endDate || null,
        profile: person.passport_url || null,
      },
      { where: { user_id: userId } }
    );
  }

  await upsertMembership({
    user_id: userId,
    org_id: orgId,
    startup_id: null,
    dept_id: deptId,
    role,
    access_to: preset.access_to,
    functionalities: preset.functionalities,
    is_primary: true,
    status: "active",
  });

  if (startupId) {
    await upsertMembership({
      user_id: userId,
      org_id: orgId,
      startup_id: startupId,
      dept_id: deptId,
      role,
      access_to: preset.access_to,
      functionalities: preset.functionalities,
      is_primary: false,
      status: "active",
    });
  }

  await person.update({ user_id: userId });

  await application.update({
    status: "accepted",
    applicant_id: applicantId,
    assigned_dept_id: deptId,
    assigned_startup_id: startupId,
    assigned_supervisor_id: supervisorId,
    activation_token_hash: null,
    activation_expires_at: null,
  });

  if (payload.roadmap_id) {
    try {
      const { enrollStudent } = await import("./roadmapService.js");
      await enrollStudent({
        roadmap_id: payload.roadmap_id,
        user_id: userId,
        start_date: startDate || new Date().toISOString().slice(0, 10),
        expected_end_date: endDate,
        mentor_user_id: supervisorId || null,
        assigned_by: authorUserId || null,
      });
    } catch (rErr) {
      console.warn("Roadmap auto-enrollment skipped:", rErr.message);
    }
  }

  const placement = await db.internship_placement.create({
    person_id: application.person_id,
    application_id: application.id,
    placement_type: application.application_type,
    academic_session: application.academic_session,
    level_at_application: application.current_level,
    department: application.preferred_department,
    dept_id: deptId,
    startup_id: startupId,
    supervisor_id: supervisorId,
    start_date: startDate || null,
    end_date: endDate || null,
    office_days: officeDays,
    status: "active",
  });

  await db.internship_application_log.create({
    application_id: id,
    author_user_id: authorUserId || null,
    log_type: "status_change",
    content: "Application accepted account created with temporary password",
    metadata: {
      status: "accepted",
      applicant_id: applicantId,
      user_id: userId,
      role,
      office_days: officeDays,
    },
  });

  let emailSent = false;
  let emailError = null;
  try {
    if (existingPortalAccount) {
      await sendMail({
        to: person.email,
        subject: "Your placement has been accepted — Brainstorm",
        html: `
          <p>Hi ${person.fullname},</p>
          <p>Congratulations your application has been accepted.</p>
          <p>Sign in at <a href="${FRONTEND_URL}/login">${FRONTEND_URL}/login</a> with your existing account to access attendance, tasks, and reports.</p>
          ${applicantId ? `<p><strong>Applicant ID:</strong> ${applicantId}</p>` : ""}
        `,
      });
    } else {
      await sendPlacementWelcomeEmail(
        { email: person.email, fullname: person.fullname },
        temporaryPassword,
        {
          application_type: application.application_type,
          applicant_id: applicantId,
        }
      );
    }
    emailSent = true;
  } catch (err) {
    emailError = err.message || "Email failed";
    console.error("[approveApplication] welcome email failed:", emailError);
  }

  // Auto-close opportunity when no seats remain after this acceptance
  if (application.opportunity_id) {
    const opportunity = await getOpportunityById(application.opportunity_id);
    if (
      opportunity &&
      opportunity.slots > 0 &&
      opportunity.slots_remaining != null &&
      opportunity.slots_remaining <= 0 &&
      opportunity.status === "open"
    ) {
      await db.internship_opportunity.update(
        { status: "closed" },
        { where: { id: opportunity.id } }
      );
    }
  }

  return {
    applicant_id: applicantId,
    user_id: userId,
    role,
    placement_id: placement.id,
    email_sent: emailSent,
    email_error: emailError,
    temporary_password: emailSent ? undefined : temporaryPassword,
  };
}

async function maybeReopenOpportunityAfterRejection(opportunityId) {
  if (!opportunityId) return;
  const opportunity = await getOpportunityById(opportunityId);
  if (
    opportunity &&
    opportunity.slots > 0 &&
    opportunity.slots_remaining != null &&
    opportunity.slots_remaining > 0 &&
    opportunity.status === "closed"
  ) {
    await db.internship_opportunity.update(
      { status: "open" },
      { where: { id: opportunity.id } }
    );
  }
}

async function issueResubmitToken(application, hoursValid = 72) {
  const token = createToken(24);
  await application.update({
    resubmit_token_hash: hashToken(token),
    resubmit_token_expires_at: new Date(
      Date.now() + hoursValid * 60 * 60 * 1000
    ),
  });
  return token;
}

async function clearResubmitToken(application) {
  await application.update({
    resubmit_token_hash: null,
    resubmit_token_expires_at: null,
  });
}

async function findApplicationByResubmitToken(token) {
  if (!token) return null;
  return db.internship_application.findOne({
    where: {
      resubmit_token_hash: hashToken(String(token)),
      resubmit_token_expires_at: { [Op.gt]: new Date() },
    },
    include: [
      { model: db.internship_person, as: "person" },
      { model: db.internship_application_document, as: "documents" },
      { model: db.internship_opportunity, as: "opportunity" },
    ],
  });
}

async function computeCanResubmit(application) {
  if (!application || application.status !== "rejected") return false;
  if (!application.opportunity_id) return true;
  const opp = await getOpportunityById(application.opportunity_id);
  if (!opp) return false;
  if (
    opp.slots > 0 &&
    opp.slots_remaining != null &&
    opp.slots_remaining <= 0
  ) {
    return false;
  }
  if (opp.status === "open") return true;
  if (opp.slots > 0 && opp.slots_remaining > 0) return true;
  return false;
}

/** Create or link a platform login so rejected applicants can update and resubmit. */
async function ensureApplicantPortalAccount(person, application) {
  if (!person?.email) return null;
  if (person.user_id) {
    return { user_id: person.user_id, created: false };
  }

  const existing = await db.users.findOne({
    where: { email: person.email },
  });
  if (existing) {
    await person.update({ user_id: existing.user_id });
    return { user_id: existing.user_id, created: false, linked: true };
  }

  const bcrypt = (await import("bcryptjs")).default;
  const { nextUserId } = await import("./numberGenerator.js");
  const { upsertMembership, getRoleAccessPreset } = await import(
    "./membershipService.js"
  );

  const role = roleFromApplicationType(application.application_type);
  const preset = getRoleAccessPreset(role);
  const userId = await nextUserId(role === "siwes" ? "SIW" : "INT");
  const temporaryPassword = createToken(5);
  const hash = await bcrypt.hash(temporaryPassword, 10);
  const orgId = "1";

  let phoneNo = person.phone_number || null;
  if (phoneNo) {
    const phoneTaken = await db.users.findOne({ where: { phone_no: phoneNo } });
    if (phoneTaken) phoneNo = null;
  }

  await db.users.create({
    user_id: userId,
    fullname: person.fullname,
    email: person.email,
    phone_no: phoneNo,
    address: person.residential_address || "",
    password: hash,
    status: "Approved",
    org_id: orgId,
    profile: person.passport_url || null,
    email_verified: true,
  });

  await upsertMembership({
    user_id: userId,
    org_id: orgId,
    startup_id: null,
    dept_id: null,
    role,
    access_to: preset.access_to,
    functionalities: preset.functionalities,
    is_primary: true,
    status: "active",
  });

  await person.update({ user_id: userId });

  let resubmitToken = null;
  try {
    resubmitToken = await issueResubmitToken(application, 168);
  } catch (err) {
    console.error("[internship] resubmit token:", err.message);
  }

  const resubmitUrl = resubmitToken
    ? `${FRONTEND_URL}/internship/resubmit?token=${encodeURIComponent(resubmitToken)}`
    : `${FRONTEND_URL}/internship/track`;

  let emailSent = false;
  try {
    await sendMail({
      to: person.email,
      subject: "Update your application — Brainstorm Internship",
      html: `
        <p>Hi ${person.fullname},</p>
        <p>Your application (${application.application_code}) was not approved in its current form.</p>
        <p>You can review your details and resubmit if a place is still available — no password needed.</p>
        <p><a href="${resubmitUrl}">Update &amp; resubmit your application</a></p>
        <p>This link is private; do not share it. It expires in 7 days.</p>
        <p>Alternatively, track your application at <a href="${FRONTEND_URL}/internship/track">${FRONTEND_URL}/internship/track</a> and verify with your email.</p>
        <p>Optional workspace login: ${person.email}<br/>Temporary password: <strong>${temporaryPassword}</strong></p>
      `,
    });
    emailSent = true;
  } catch (err) {
    console.error("[internship] reject portal email failed:", err.message);
  }

  return {
    user_id: userId,
    created: true,
    email_sent: emailSent,
    temporary_password: emailSent ? undefined : temporaryPassword,
    resubmit_token: resubmitToken,
    resubmit_url: resubmitUrl,
  };
}

/** Admin: ensure rejected applicant has portal login (e.g. legacy rejections). */
export async function grantApplicantPortalAccess(ref) {
  const application = await findApplicationByRef(ref, {
    include: [{ model: db.internship_person, as: "person" }],
  });
  if (!application) throw new Error("Application not found");
  if (application.status !== "rejected") {
    throw new Error("Portal access is only for rejected applications");
  }
  await maybeReopenOpportunityAfterRejection(application.opportunity_id);
  const portal = await ensureApplicantPortalAccount(
    application.person,
    application
  );
  let resubmit_token = portal?.resubmit_token || null;
  if (!resubmit_token) {
    try {
      resubmit_token = await issueResubmitToken(application, 168);
    } catch (err) {
      console.error("[internship] grant resubmit token:", err.message);
    }
  }
  const resubmit_url = resubmit_token
    ? `${FRONTEND_URL}/internship/resubmit?token=${encodeURIComponent(resubmit_token)}`
    : null;
  return { ...portal, resubmit_token, resubmit_url };
}

export async function rejectApplication(ref, reason, authorUserId) {
  const application = await findApplicationByRef(ref, {
    include: [{ model: db.internship_person, as: "person" }],
  });
  if (!application) throw new Error("Application not found");

  const updated = await updateApplicationStatus(
    ref,
    { status: "rejected", rejection_reason: reason },
    authorUserId
  );

  if (application.opportunity_id) {
    await maybeReopenOpportunityAfterRejection(application.opportunity_id);
  }

  let portalAccount = null;
  try {
    portalAccount = await ensureApplicantPortalAccount(
      application.person,
      application
    );
    if (!portalAccount?.resubmit_token) {
      const resubmit_token = await issueResubmitToken(application, 168);
      const resubmit_url = `${FRONTEND_URL}/internship/resubmit?token=${encodeURIComponent(resubmit_token)}`;
      portalAccount = { ...portalAccount, resubmit_token, resubmit_url };
    }
  } catch (err) {
    console.error("[internship] reject portal account:", err.message);
  }

  const plain = updated.get({ plain: true });
  return { ...plain, portal_account: portalAccount };
}

/**
 * Public: activate invited internship account → org member
 * Body: { token, application (code), password }
 */
export async function activateAccount({ token, application: applicationCode, password }) {
  if (!token || !applicationCode || !password) {
    throw new Error("Token, application code, and password are required");
  }
  if (String(password).length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  await ensureOfficeDaysColumn();

  const application = await db.internship_application.findOne({
    where: { application_code: applicationCode },
    include: [{ model: db.internship_person, as: "person" }],
  });
  if (!application) throw new Error("Application not found");
  if (application.status !== "accepted") {
    throw new Error("Application is not accepted");
  }

  const person = application.person;
  if (person?.user_id) {
    throw new Error("Account already activated. Please sign in.");
  }

  if (!application.activation_token_hash) {
    throw new Error("Activation link is invalid");
  }
  if (
    application.activation_expires_at &&
    new Date(application.activation_expires_at) < new Date()
  ) {
    throw new Error("Activation link has expired. Contact your admin.");
  }
  if (hashToken(token) !== application.activation_token_hash) {
    throw new Error("Invalid activation token");
  }

  const existing = await db.users.findOne({
    where: { email: person.email },
  });
  if (existing) {
    throw new Error(
      "An account with this email already exists. Sign in or contact admin."
    );
  }

  const bcrypt = (await import("bcryptjs")).default;
  const { nextUserId } = await import("./numberGenerator.js");
  const { upsertMembership, getRoleAccessPreset } = await import(
    "./membershipService.js"
  );

  const role = roleFromApplicationType(application.application_type);
  const preset = getRoleAccessPreset(role);
  const userId = await nextUserId(role === "siwes" ? "SIW" : "INT");
  const hash = await bcrypt.hash(password, 10);

  const placement = await db.internship_placement.findOne({
    where: { application_id: application.id },
    order: [["id", "DESC"]],
  });

  const orgId = "1";
  const createdUser = await db.users.create({
    user_id: userId,
    fullname: person.fullname,
    email: person.email,
    phone_no: person.phone_number,
    address: person.residential_address || "",
    password: hash,
    status: "Approved",
    org_id: orgId,
    starting_date: placement?.start_date || application.expected_start_date,
    end_date: placement?.end_date || application.expected_end_date,
    profile: person.passport_url || null,
    email_verified: true,
  });

  await upsertMembership({
    user_id: userId,
    org_id: orgId,
    startup_id: null,
    dept_id: placement?.dept_id || application.assigned_dept_id || null,
    role,
    access_to: preset.access_to,
    functionalities: preset.functionalities,
    is_primary: true,
    status: "active",
  });

  const optionalStartup =
    placement?.startup_id || application.assigned_startup_id || null;
  if (optionalStartup) {
    await upsertMembership({
      user_id: userId,
      org_id: orgId,
      startup_id: optionalStartup,
      dept_id: placement?.dept_id || application.assigned_dept_id || null,
      role,
      access_to: preset.access_to,
      functionalities: preset.functionalities,
      is_primary: false,
      status: "active",
    });
  }

  await person.update({ user_id: userId });

  if (placement) {
    await placement.update({ status: "active" });
  }

  await application.update({
    activation_token_hash: null,
    activation_expires_at: null,
  });

  await db.internship_application_log.create({
    application_id: application.id,
    author_user_id: userId,
    log_type: "status_change",
    content: "Account activated org membership created",
    metadata: { user_id: userId, role },
  });

  const safe = createdUser.toJSON();
  delete safe.password;
  return {
    user: safe,
    role,
    office_days: placement?.office_days || [],
  };
}

export async function updatePlacementOfficeDays(placementId, office_days) {
  await ensureOfficeDaysColumn();
  const placement = await db.internship_placement.findByPk(placementId);
  if (!placement) throw new Error("Placement not found");
  const days = normalizeOfficeDays(office_days);
  await placement.update({ office_days: days });
  return placement;
}

/** Latest internship application for a platform user (via person.user_id). */
export async function getApplicationForUser(userId) {
  if (!userId) return null;
  const person = await db.internship_person.findOne({
    where: { user_id: String(userId) },
  });
  if (!person) return null;
  const application = await db.internship_application.findOne({
    where: { person_id: person.id },
    order: [["submitted_at", "DESC"]],
    raw: true,
  });
  if (!application) return null;
  const can_resubmit = await computeCanResubmit(application);

  let placementInfo = {};
  if (["accepted", "completed"].includes(application.status)) {
    const placement = await db.internship_placement.findOne({
      where: { person_id: person.id },
      order: [["id", "DESC"]],
    });
    if (placement) {
      const plain = placement.get({ plain: true });
      placementInfo = {
        office_days: normalizeOfficeDays(plain.office_days),
        placement_start_date: plain.start_date || null,
        placement_end_date: plain.end_date || null,
      };
    }
  }

  return {
    application_code: application.application_code,
    status: application.status,
    application_type: application.application_type,
    preferred_department: application.preferred_department,
    expected_start_date: application.expected_start_date,
    rejection_reason: application.rejection_reason,
    opportunity_id: application.opportunity_id,
    can_resubmit,
    ...placementInfo,
  };
}

/** Full application detail for the logged-in applicant (resubmit form). */
export async function getMyApplicationDetail(userId) {
  if (!userId) return null;
  const person = await db.internship_person.findOne({
    where: { user_id: String(userId) },
  });
  if (!person) return null;

  const application = await db.internship_application.findOne({
    where: { person_id: person.id },
    order: [["submitted_at", "DESC"]],
    include: [
      { model: db.internship_application_document, as: "documents" },
      { model: db.internship_opportunity, as: "opportunity" },
    ],
  });
  if (!application) return null;

  const plain = application.get({ plain: true });
  const can_resubmit = await computeCanResubmit(plain);

  return {
    person: person.get({ plain: true }),
    application: plain,
    can_resubmit,
  };
}

export async function resubmitApplication(userId, body, files = []) {
  const person = await db.internship_person.findOne({
    where: { user_id: String(userId) },
  });
  if (!person) throw new Error("No application linked to your account");

  const application = await db.internship_application.findOne({
    where: { person_id: person.id },
    order: [["submitted_at", "DESC"]],
    include: [{ model: db.internship_application_document, as: "documents" }],
  });
  if (!application) throw new Error("Application not found");

  return performApplicationResubmit(
    application,
    person,
    body,
    files,
    String(userId)
  );
}

async function performApplicationResubmit(
  application,
  person,
  body,
  files = [],
  authorUserId = null
) {
  if (application.status !== "rejected") {
    throw new Error("Only rejected applications can be resubmitted");
  }

  const canResubmit = await computeCanResubmit(application.get({ plain: true }));
  if (!canResubmit) {
    throw new Error("This opportunity is no longer accepting applications");
  }

  const personData = parsePersonPayload(body);
  const appData = parseApplicationPayload(body);

  if (
    personData.email &&
    personData.email !== person.email.toLowerCase()
  ) {
    throw new Error("Email cannot be changed on resubmit");
  }
  if (!personData.fullname || !personData.phone_number) {
    throw new Error("Full name and phone number are required");
  }

  await person.update({
    fullname: personData.fullname,
    gender: personData.gender ?? person.gender,
    date_of_birth: personData.date_of_birth ?? person.date_of_birth,
    phone_number: personData.phone_number,
    residential_address:
      personData.residential_address ?? person.residential_address,
    state: personData.state ?? person.state,
    emergency_contact_name:
      personData.emergency_contact_name ?? person.emergency_contact_name,
    emergency_contact_phone:
      personData.emergency_contact_phone ?? person.emergency_contact_phone,
    matric_number: personData.matric_number || person.matric_number,
    nysc_callup_number:
      personData.nysc_callup_number || person.nysc_callup_number,
  });

  const appUpdates = { ...appData };
  delete appUpdates.opportunity_id;
  delete appUpdates.application_type;

  await application.update({
    ...appUpdates,
    status: "submitted",
    rejection_reason: null,
    submitted_at: new Date(),
    resubmit_token_hash: null,
    resubmit_token_expires_at: null,
  });

  for (const file of files) {
    const docType = file.fieldname || "document";
    const fileUrl = internshipFilePublicUrl(file);
    const existing = (application.documents || []).find(
      (d) => d.document_type === docType
    );
    if (existing) {
      await existing.update({
        file_url: fileUrl,
        file_name: file.originalname,
      });
    } else {
      await db.internship_application_document.create({
        application_id: application.id,
        document_type: docType,
        file_url: fileUrl,
        file_name: file.originalname,
        is_required: !String(docType).startsWith("optional_"),
      });
    }
    if (docType === "passport" && fileUrl) {
      await person.update({ passport_url: fileUrl });
    }
  }

  await db.internship_application_log.create({
    application_id: application.id,
    author_user_id: authorUserId,
    log_type: "audit",
    content: "Application resubmitted after rejection",
    metadata: { status: "submitted" },
  });

  if (application.opportunity_id) {
    const opportunity = await getOpportunityById(application.opportunity_id);
    if (
      opportunity &&
      opportunity.slots > 0 &&
      opportunity.slots_remaining != null &&
      opportunity.slots_remaining <= 0 &&
      opportunity.status === "open"
    ) {
      await db.internship_opportunity.update(
        { status: "closed" },
        { where: { id: opportunity.id } }
      );
    }
  }

  return {
    application_code: application.application_code,
    status: "submitted",
  };
}

/** Public: load resubmit form via verified email link (no password). */
export async function getResubmitApplicationDetail(token) {
  const application = await findApplicationByResubmitToken(token);
  if (!application) {
    throw new Error("This update link is invalid or has expired");
  }
  const plain = application.get({ plain: true });
  const can_resubmit = await computeCanResubmit(plain);
  return {
    person: application.person.get({ plain: true }),
    application: plain,
    can_resubmit,
  };
}

/** Public: resubmit via verified email link (no password). */
export async function resubmitApplicationByToken(token, body, files = []) {
  const application = await findApplicationByResubmitToken(token);
  if (!application) {
    throw new Error("This update link is invalid or has expired");
  }
  return performApplicationResubmit(
    application,
    application.person,
    body,
    files,
    null
  );
}

/** Active placement for a platform user (via internship_person.user_id). */
export async function getPlacementForUser(userId) {
  await ensureOfficeDaysColumn();
  if (!userId) return null;

  const person = await db.internship_person.findOne({
    where: { user_id: String(userId) },
  });
  if (!person) return null;

  const placement = await db.internship_placement.findOne({
    where: {
      person_id: person.id,
      status: { [Op.in]: ["pending", "active"] },
    },
    include: [
      {
        model: db.internship_application,
        as: "application",
        attributes: ["id", "application_code", "status", "application_type"],
      },
    ],
    order: [["id", "DESC"]],
  });

  if (!placement) {
    // Fall back to most recent placement (including completed)
    const latest = await db.internship_placement.findOne({
      where: { person_id: person.id },
      include: [
        {
          model: db.internship_application,
          as: "application",
          attributes: ["id", "application_code", "status", "application_type"],
        },
      ],
      order: [["id", "DESC"]],
    });
    return latest ? latest.get({ plain: true }) : null;
  }

  return placement.get({ plain: true });
}

/** Update or create office schedule for a platform user (placement or signup). */
export async function updatePlacementForUser(userId, body = {}) {
  await ensureOfficeDaysColumn();
  const current = await getPlacementForUser(userId);
  if (current) {
    return updatePlacement(current.id, body);
  }
  return createManualPlacementForUser(userId, body);
}

/**
 * Signup / approved members without an internship application still need
 * office days create person + placement (no application) on first save.
 */
export async function createManualPlacementForUser(userId, body = {}) {
  await ensureOfficeDaysColumn();
  const user = await db.users.findOne({
    where: { user_id: String(userId) },
  });
  if (!user) throw new Error("User not found");

  let person = await db.internship_person.findOne({
    where: { user_id: String(userId) },
  });
  if (!person && user.email) {
    person = await db.internship_person.findOne({
      where: { email: user.email.toLowerCase().trim() },
    });
    if (person) {
      await person.update({ user_id: String(userId) });
    }
  }
  if (!person) {
    person = await db.internship_person.create({
      person_code: await generatePersonCode(),
      fullname: user.fullname || "Member",
      email: (user.email || `${userId}@local`).toLowerCase(),
      phone_number: user.phone_no || "n/a",
      residential_address: user.address || null,
      passport_url: user.profile || null,
      user_id: String(userId),
    });
  }

  const membership =
    (await db.user_memberships.findOne({
      where: { user_id: String(userId), is_primary: true },
    })) ||
    (await db.user_memberships.findOne({
      where: { user_id: String(userId) },
    }));

  const role = String(membership?.role || body.role || "intern").toLowerCase();
  const placementType = role === "siwes" ? "siwes" : "internship";
  const officeDays = normalizeOfficeDays(
    body.office_days || ["mon", "tue", "wed", "thu", "fri"]
  );

  const placement = await db.internship_placement.create({
    person_id: person.id,
    application_id: null,
    placement_type: placementType,
    department: body.department || null,
    dept_id: body.dept_id || membership?.dept_id || null,
    startup_id: body.startup_id || membership?.startup_id || null,
    start_date: body.start_date || user.starting_date || null,
    end_date: body.end_date || user.end_date || null,
    office_days: officeDays,
    status: body.status || "active",
  });

  return placement.get({ plain: true });
}

export async function updatePlacement(placementId, body = {}) {
  await ensureOfficeDaysColumn();
  const placement = await db.internship_placement.findByPk(placementId, {
    include: [
      { model: db.internship_application, as: "application" },
      { model: db.internship_person, as: "person" },
    ],
  });
  if (!placement) throw new Error("Placement not found");

  const updates = {};
  const allowed = [
    "start_date",
    "end_date",
    "dept_id",
    "startup_id",
    "supervisor_id",
    "department",
    "status",
  ];
  for (const key of allowed) {
    if (body[key] !== undefined) {
      updates[key] = body[key] === "" ? null : body[key];
    }
  }
  if (body.office_days !== undefined) {
    updates.office_days = normalizeOfficeDays(body.office_days);
  }

  if (
    updates.status &&
    !["pending", "active", "completed"].includes(updates.status)
  ) {
    throw new Error("Invalid placement status");
  }

  await placement.update(updates);

  if (updates.status === "completed" && placement.application_id) {
    await db.internship_application.update(
      { status: "completed" },
      { where: { id: placement.application_id } }
    );
    await db.internship_application_log.create({
      application_id: placement.application_id,
      log_type: "status_change",
      content: "Placement marked completed",
      metadata: { status: "completed", placement_id: placement.id },
    });
  }

  return placement.get({ plain: true });
}

export async function seedDefaultOpportunities() {
  const count = await db.internship_opportunity.count();
  if (count > 0) return;

  await db.internship_opportunity.bulkCreate([
    {
      title: "SIWES Industrial Training",
      application_type: "siwes",
      description:
        "Structured SIWES placement for students requiring mandatory industrial work experience.",
      department: "Multiple Departments",
      slots: 20,
      duration: "3–6 months",
      requirements: "Valid SIWES letter and introduction letter.",
      status: "open",
    },
    {
      title: "Internship Program",
      application_type: "internship",
      description: "Hands-on internship across technical and business teams.",
      department: "Multiple Departments",
      slots: 10,
      duration: "3–12 months",
      requirements: "CV and passport photograph.",
      status: "open",
    },
    {
      title: "NYSC Placement",
      application_type: "nysc",
      description: "Primary assignment placement for NYSC corps members.",
      department: "Administration",
      slots: 5,
      duration: "12 months",
      requirements: "NYSC call-up letter and passport.",
      status: "open",
    },
    {
      title: "Graduate Internship",
      application_type: "graduate_internship",
      description: "Post-graduation internship for recent graduates.",
      department: "Multiple Departments",
      slots: 8,
      duration: "6 months",
      requirements: "CV, passport, and highest qualification details.",
      status: "open",
    },
  ]);
}
