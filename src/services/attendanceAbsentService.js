import moment from "moment-timezone";
import Sequelize from "sequelize";
import db from "../models/index.js";
import { getMembersForContext } from "./membershipService.js";

const { Op } = Sequelize;
const TIMEZONE = "Africa/Lagos";
const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function weekdayKey(dateStr) {
  return WEEKDAY_KEYS[moment.tz(dateStr, "YYYY-MM-DD", TIMEZONE).day()];
}

function isMonToFri(dateStr) {
  const day = moment.tz(dateStr, "YYYY-MM-DD", TIMEZONE).day();
  return day >= 1 && day <= 5;
}

function toDateOnly(value) {
  if (!value) return null;
  const m = moment.tz(value, TIMEZONE);
  if (!m.isValid()) {
    const raw = String(value).slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
  }
  return m.format("YYYY-MM-DD");
}

function eachDateInclusive(startDate, endDate) {
  const dates = [];
  const cursor = moment.tz(startDate, "YYYY-MM-DD", TIMEZONE).startOf("day");
  const end = moment.tz(endDate, "YYYY-MM-DD", TIMEZONE).startOf("day");
  if (!cursor.isValid() || !end.isValid() || cursor.isAfter(end)) return dates;

  while (cursor.isSameOrBefore(end)) {
    dates.push(cursor.format("YYYY-MM-DD"));
    cursor.add(1, "day");
  }
  return dates;
}

/**
 * Past dates always; today only after ABSENT_CUTOFF_TIME (default 11:00 Lagos).
 */
export function shouldMarkAbsentForDate(dateStr) {
  const today = moment.tz(TIMEZONE).format("YYYY-MM-DD");
  if (dateStr < today) return true;
  if (dateStr > today) return false;

  const cutoff =
    process.env.ABSENT_CUTOFF_TIME ||
    process.env.EXPECTED_SIGN_IN_TIME ||
    "11:00:00";
  const normalized = cutoff.length === 5 ? `${cutoff}:00` : cutoff;
  const cutoffMoment = moment.tz(
    `${today} ${normalized}`,
    "YYYY-MM-DD HH:mm:ss",
    TIMEZONE
  );
  return moment.tz(TIMEZONE).isSameOrAfter(cutoffMoment);
}

/**
 * When the member became expected for attendance.
 * Prefer starting_date → placement start_date → account createdAt.
 */
function resolveJoinDate(member, placementMeta) {
  return (
    toDateOnly(member.starting_date) ||
    toDateOnly(placementMeta?.start_date) ||
    toDateOnly(member.createdAt) ||
    null
  );
}

async function loadPlacementMetaByUserId(userIds) {
  const map = {};
  if (!userIds.length) return map;

  const persons = await db.internship_person.findAll({
    where: { user_id: { [Op.in]: userIds } },
    attributes: ["id", "user_id"],
    raw: true,
  });
  if (!persons.length) return map;

  const personToUser = Object.fromEntries(
    persons.map((p) => [p.id, p.user_id])
  );
  const personIds = persons.map((p) => p.id);

  const placements = await db.internship_placement.findAll({
    where: {
      person_id: { [Op.in]: personIds },
      status: "active",
    },
    attributes: ["person_id", "office_days", "start_date"],
  });

  for (const placement of placements) {
    const userId = personToUser[placement.person_id];
    if (!userId) continue;
    const days = placement.office_days;
    map[userId] = {
      office_days: Array.isArray(days) ? days : [],
      start_date: placement.start_date || null,
    };
  }

  return map;
}

/**
 * Active context members expected in office on a given date.
 * Uses placement office_days when present; otherwise Mon–Fri.
 * Skips dates before each member's join / start date.
 */
export async function getExpectedUserIdsForDate({
  date,
  org_id = null,
  startup_id = null,
  dept_id = null,
}) {
  const members = await getMembersForContext({
    org_id,
    startup_id,
    dept_id,
  });
  if (!members.length) return [];

  const userIds = members.map((m) => m.user_id).filter(Boolean);
  const placementByUser = await loadPlacementMetaByUserId(userIds);
  const dayKey = weekdayKey(date);
  const expected = [];

  for (const member of members) {
    const uid = member.user_id;
    if (!uid) continue;

    const meta = placementByUser[uid];
    const joinDate = resolveJoinDate(member, meta);
    if (joinDate && date < joinDate) continue;

    if (meta) {
      const days = meta.office_days || [];
      if (!days.length) {
        if (isMonToFri(date)) expected.push(uid);
      } else if (days.includes(dayKey)) {
        expected.push(uid);
      }
    } else if (isMonToFri(date)) {
      expected.push(uid);
    }
  }

  return [...new Set(expected)];
}

/**
 * Create absent attendance rows for expected people who never signed in.
 * Safe to call repeatedly (skips existing rows).
 * Only dates on/after each member's join date are considered.
 */
export async function ensureAbsentRecords({
  start_date,
  end_date,
  org_id = null,
  startup_id = null,
  dept_id = null,
}) {
  const dates = eachDateInclusive(start_date, end_date).filter(
    shouldMarkAbsentForDate
  );
  if (!dates.length) return { created: 0 };

  const expectedSignIn = process.env.EXPECTED_SIGN_IN_TIME || "09:30:00";
  const expectedSignOut = process.env.EXPECTED_SIGN_OUT_TIME || "17:00:00";

  let created = 0;

  for (const date of dates) {
    const expectedIds = await getExpectedUserIdsForDate({
      date,
      org_id,
      startup_id,
      dept_id,
    });
    if (!expectedIds.length) continue;

    const existing = await db.attendances.findAll({
      where: {
        date,
        user_id: { [Op.in]: expectedIds },
      },
      attributes: ["user_id"],
      raw: true,
    });
    const haveRow = new Set(existing.map((r) => r.user_id));
    const missing = expectedIds.filter((id) => !haveRow.has(id));
    if (!missing.length) continue;

    const rows = missing.map((user_id) => ({
      user_id,
      date,
      sign_in_time: null,
      sign_out_time: null,
      expected_sign_in_time: expectedSignIn,
      expected_sign_out_time: expectedSignOut,
      status: "absent",
      created_at: new Date(),
      updated_at: new Date(),
    }));

    await db.attendances.bulkCreate(rows, { ignoreDuplicates: true });
    created += rows.length;
  }

  return { created };
}
