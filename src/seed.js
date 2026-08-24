/**
 * Seed organization, startups, and one Approved user per role.
 *
 * Usage (from backend/):
 *   npm run seed
 *   node src/seed.js
 *
 * Default password for every seeded account: Seed@12345
 * Re-running is safe existing emails / startup_ids are skipped.
 */
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import db from "./models/index.js";
import { ROLE_IDS, getRoleAccessPreset, roleLabel } from "./constants/roles.js";
import { upsertMembership } from "./services/membershipService.js";
import { nextUserId } from "./services/numberGenerator.js";

dotenv.config();

const SEED_PASSWORD =  "123456";
const ORG_ID = process.env.SEED_ORG_ID || "1";
const ORG_NAME = process.env.SEED_ORG_NAME || "Brainstorm Innovation Hub";

const STARTUPS = [
  {
    startup_id: "01",
    name: "Brainstorm Core",
    description: "Primary product and engineering subsidiary",
  },
  {
    startup_id: "02",
    name: "Brainstorm Labs",
    description: "R&D and experimental products",
  },
];

/** One demo user per canonical role */
const ROLE_USERS = [
  {
    role: "admin",
    fullname: "Seed Admin",
    email: "admin@brainstorm.ng",
    phone_no: "08000000001",
    // Org-wide primary; no startup required
    startup_id: null,
  },
  {
    role: "manager",
    fullname: "Seed Manager",
    email: "manager@brainstorm.ng",
    phone_no: "08000000002",
    startup_id: null,
  },
  {
    role: "accountant",
    fullname: "Seed Accountant",
    email: "accountant@brainstorm.ng",
    phone_no: "08000000003",
    startup_id: "01",
  },
  {
    role: "ceos",
    fullname: "Seed CEO",
    email: "ceo@brainstorm.ng",
    phone_no: "08000000004",
    startup_id: "01",
  },
  {
    role: "senior_devs",
    fullname: "Seed Senior Dev",
    email: "senior@brainstorm.ng",
    phone_no: "08000000005",
    startup_id: "01",
  },
  {
    role: "team_lead",
    fullname: "Seed Team Lead",
    email: "lead@brainstorm.ng",
    phone_no: "08000000006",
    startup_id: "01",
  },
  {
    role: "member",
    fullname: "Seed Org Member",
    email: "member@brainstorm.ng",
    phone_no: "08000000007",
    startup_id: "01",
  },
  {
    role: "siwes",
    fullname: "Seed SIWES",
    email: "siwes@brainstorm.ng",
    phone_no: "08000000008",
    startup_id: "02",
  },
  {
    role: "intern",
    fullname: "Seed Intern",
    email: "intern@brainstorm.ng",
    phone_no: "08000000009",
    startup_id: "02",
  },
];

async function ensureOrganization() {
  const existing = await db.organizations.findOne({
    where: { org_id: ORG_ID },
  });
  if (existing) {
    console.log(`✓ Organization ${ORG_ID} already exists`);
    return existing;
  }

  const created = await db.organizations.create({
    org_id: ORG_ID,
    org_name: ORG_NAME,
    decription: "Seeded organization",
  });
  console.log(`+ Created organization ${ORG_ID} (${ORG_NAME})`);
  return created;
}

async function ensureStartups(createdByUserId) {
  const results = [];
  for (const s of STARTUPS) {
    const existing = await db.startups.findOne({
      where: { startup_id: s.startup_id },
    });
    if (existing) {
      console.log(`✓ Startup ${s.startup_id} (${s.name}) already exists`);
      results.push(existing);
      continue;
    }

    const created = await db.startups.create({
      startup_id: s.startup_id,
      org_id: ORG_ID,
      name: s.name,
      description: s.description,
      logo: null,
      created_by: createdByUserId || "USR00001",
    });
    console.log(`+ Created startup ${s.startup_id} (${s.name})`);
    results.push(created);
  }
  return results;
}

async function ensureDepartment() {
  const deptId = "01";
  const existing = await db.departments.findOne({ where: { dept_id: deptId } });
  if (existing) {
    console.log(`✓ Department ${deptId} already exists`);
    return existing;
  }

  const payload = {
    dept_id: deptId,
    dept_name: "General",
    group_code: ORG_ID,
  };
  // Some dumps include optional columns
  try {
    const created = await db.departments.create(payload);
    console.log(`+ Created department ${deptId} (General)`);
    return created;
  } catch (err) {
    console.warn(`Department seed skipped: ${err.message}`);
    return null;
  }
}

async function ensureUser(spec, passwordHash, deptId = null) {
  const existing = await db.users.findOne({ where: { email: spec.email } });
  if (existing) {
    console.log(
      `✓ User ${spec.email} (${roleLabel(spec.role)}) already exists → ${existing.user_id}`
    );
    return existing;
  }

  const preset = getRoleAccessPreset(spec.role);
  const userId = await nextUserId("USR");

  const created = await db.users.create({
    user_id: userId,
    fullname: spec.fullname,
    email: spec.email,
    phone_no: spec.phone_no || null,
    address: "Seed address",
    password: passwordHash,
    status: "Approved",
    org_id: ORG_ID,
    email_verified: true,
    email_verify_token: null,
    email_verify_expires: null,
  });

  await upsertMembership({
    user_id: userId,
    org_id: ORG_ID,
    startup_id: null,
    dept_id: deptId || null,
    role: spec.role,
    access_to: preset.access_to,
    functionalities: preset.functionalities,
    is_primary: !spec.startup_id,
    status: "active",
  });

  if (spec.startup_id) {
    await upsertMembership({
      user_id: userId,
      org_id: ORG_ID,
      startup_id: spec.startup_id,
      dept_id: deptId || null,
      role: spec.role,
      access_to: preset.access_to,
      functionalities: preset.functionalities,
      is_primary: true,
      status: "active",
    });
  }

  console.log(
    `+ Created ${roleLabel(spec.role)} ${spec.email} → ${userId}` +
      (spec.startup_id ? ` @ startup ${spec.startup_id}` : " @ organization")
  );
  return created;
}

async function seed() {
  console.log("\n── Brainstorm seed ─────────────────────────────");
  console.log(`Org: ${ORG_ID} · Password for all seeded users: ${SEED_PASSWORD}`);
  console.log(`Roles: ${ROLE_IDS.join(", ")}\n`);

  await db.sequelize.authenticate();

  await ensureOrganization();
  const department = await ensureDepartment();
  const deptId = department?.dept_id || null;

  // Create startups first (created_by may be placeholder until admin exists)
  await ensureStartups("USR00001");

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  // Prefer seeding admin first so startups.created_by can be updated
  const ordered = [
    ...ROLE_USERS.filter((u) => u.role === "admin"),
    ...ROLE_USERS.filter((u) => u.role !== "admin"),
  ];

  let adminUser = null;
  for (const spec of ordered) {
    const user = await ensureUser(spec, passwordHash, deptId);
    if (spec.role === "admin") adminUser = user;
  }

  if (adminUser?.user_id) {
    for (const s of STARTUPS) {
      await db.startups.update(
        { created_by: adminUser.user_id },
        { where: { startup_id: s.startup_id, created_by: "USR00001" } }
      );
    }
  }

  console.log("\n── Login accounts ──────────────────────────────");
  for (const u of ROLE_USERS) {
    console.log(
      `  ${roleLabel(u.role).padEnd(18)} ${u.email.padEnd(28)} ${SEED_PASSWORD}`
    );
  }
  console.log("\nSeed complete.\n");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\nSeed failed:", err.message);
    console.error(err);
    process.exit(1);
  });
