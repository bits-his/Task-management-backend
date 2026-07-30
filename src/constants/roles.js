/**
 * Single source of truth for organization roles (backend).
 * Keep in sync with frontend/src/lib/roles.js
 */

export const ROLES = [
  { id: "admin", label: "Admin" },
  { id: "manager", label: "Manager" },
  { id: "accountant", label: "Accountant" },
  { id: "ceos", label: "CEO" },
  { id: "senior_devs", label: "Senior Developer" },
  { id: "team_lead", label: "Team Lead" },
  { id: "siwes", label: "SIWES" },
  { id: "intern", label: "Intern" },
  { id: "member", label: "Member" },
];

export const ROLE_IDS = ROLES.map((r) => r.id);

export const ROLE_LABELS = Object.fromEntries(
  ROLES.map((r) => [r.id, r.label])
);

/** Legacy / variant values stored in DB → canonical id */
export const ROLE_ALIASES = {
  Admin: "admin",
  ADMIN: "admin",
  admins: "admin",
  Manager: "manager",
  MANAGER: "manager",
  CEO: "ceos",
  CTO: "ceos",
  cto: "ceos",
  Ceos: "ceos",
  SIWES: "siwes",
  Sewis: "siwes",
  "Intern/sewis": "siwes",
  Senior: "senior_devs",
  "Senior Developer": "senior_devs",
  "Team Lead": "team_lead",
  teamlead: "team_lead",
};

export function normalizeRole(role) {
  if (role == null || role === "") return "member";
  const raw = String(role).trim();
  if (ROLE_IDS.includes(raw)) return raw;
  if (ROLE_ALIASES[raw]) return ROLE_ALIASES[raw];
  const lower = raw.toLowerCase();
  const byLower = ROLE_IDS.find((id) => id.toLowerCase() === lower);
  if (byLower) return byLower;
  if (ROLE_ALIASES[lower]) return ROLE_ALIASES[lower];
  return "member";
}

export function roleLabel(role) {
  const id = normalizeRole(role);
  return ROLE_LABELS[id] || id.replace(/_/g, " ");
}

export function isValidRole(role) {
  return ROLE_IDS.includes(normalizeRole(role));
}

/** Org-wide roles string for department UIs (same for every department) */
export function orgWideRolesCsv() {
  return ROLE_IDS.join(", ");
}

export const ORG_ATTENDANCE_ROLES = [
  "admin",
  "manager",
  "accountant",
  "ceos",
];

export const EXECUTIVE_ROLES = new Set(["ceos"]);
export const TEAM_LEAD_ROLES = new Set(["senior_devs", "team_lead"]);
export const SIWES_ROLES = new Set(["siwes", "intern"]);
export const ORG_OPS_ROLES = new Set(["admin", "manager"]);

export function isOrgOpsRole(role) {
  return ORG_OPS_ROLES.has(normalizeRole(role));
}

export function isManagerRole(role) {
  return normalizeRole(role) === "manager";
}

export function isSiwesRole(role) {
  return SIWES_ROLES.has(normalizeRole(role));
}

export function isOrgAttendanceRole(role) {
  return ORG_ATTENDANCE_ROLES.includes(normalizeRole(role));
}

/** Nav group titles — must match frontend sidrbarModules.jsx */
export const NAV = {
  DASHBOARD: "Dashboard",
  ATTENDANCE: "Attendance",
  WORK: "Work",
  USER_MANAGEMENT: "User Management",
  APPLICATION_MANAGEMENT: "Application Management",
  PROJECTS: "Projects",
  OPERATIONS: "Operations",
  EXCUSES: "Excuses",
  POSTS: "Posts",
  TICKET: "Ticket",
};

const WORK_FUNCS = "Members,Tasks,Reports";
const USER_FUNCS =
  "Org Members,Add User,Departments,Startups,Organization Chart";
const APP_FUNCS = "Applications,Opportunities";
const OPS_FUNCS =
  "Clients,Market Research,Outreach,Schedule Meeting,PartnerShip,Deals,Sales Performance,Invoice Processing,Payroll Management,Finance Dashboard,Content Development,Assets";

const ADMIN_ACCESS = [
  NAV.DASHBOARD,
  NAV.ATTENDANCE,
  NAV.WORK,
  NAV.PROJECTS,
  NAV.USER_MANAGEMENT,
  NAV.APPLICATION_MANAGEMENT,
  NAV.OPERATIONS,
  NAV.EXCUSES,
  NAV.POSTS,
  NAV.TICKET,
].join(",");

const ADMIN_FUNCS = [WORK_FUNCS, USER_FUNCS, APP_FUNCS, OPS_FUNCS].join(",");
const MEMBER_ACCESS = [
  NAV.DASHBOARD,
  NAV.ATTENDANCE,
  NAV.WORK,
  NAV.PROJECTS,
  NAV.TICKET,
].join(",");

export const ROLE_ACCESS_PRESETS = {
  admin: { access_to: ADMIN_ACCESS, functionalities: ADMIN_FUNCS },
  manager: { access_to: ADMIN_ACCESS, functionalities: ADMIN_FUNCS },
  accountant: {
    access_to: [
      NAV.DASHBOARD,
      NAV.ATTENDANCE,
      NAV.WORK,
      NAV.PROJECTS,
      NAV.OPERATIONS,
      NAV.TICKET,
    ].join(","),
    functionalities: `${WORK_FUNCS},Invoice Processing,Payroll Management,Finance Dashboard,Assets`,
  },
  ceos: {
    access_to: [
      NAV.DASHBOARD,
      NAV.ATTENDANCE,
      NAV.WORK,
      NAV.PROJECTS,
      NAV.OPERATIONS,
      NAV.EXCUSES,
      NAV.POSTS,
      NAV.TICKET,
    ].join(","),
    functionalities: ADMIN_FUNCS,
  },
  senior_devs: {
    access_to: MEMBER_ACCESS,
    functionalities: WORK_FUNCS,
  },
  team_lead: {
    access_to: MEMBER_ACCESS,
    functionalities: WORK_FUNCS,
  },
  siwes: {
    access_to: MEMBER_ACCESS,
    functionalities: WORK_FUNCS,
  },
  intern: {
    access_to: MEMBER_ACCESS,
    functionalities: WORK_FUNCS,
  },
  member: {
    access_to: MEMBER_ACCESS,
    functionalities: WORK_FUNCS,
  },
};

export function getRoleAccessPreset(role = "") {
  const id = normalizeRole(role);
  return (
    ROLE_ACCESS_PRESETS[id] ||
    ROLE_ACCESS_PRESETS.member
  );
}
