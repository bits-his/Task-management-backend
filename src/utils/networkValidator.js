import { isIP } from "net";

/**
 * Normalize IPv4-mapped IPv6 (e.g. ::ffff:192.168.1.10) to IPv4.
 */
function normalizeIp(ipAddress) {
  if (!ipAddress || typeof ipAddress !== "string") return "";
  let ip = ipAddress.trim();
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  if (ip === "::1") ip = "127.0.0.1";
  return ip;
}

function ip2long(ip) {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let long = 0;
  for (let i = 0; i < 4; i++) {
    const n = parseInt(parts[i], 10);
    if (Number.isNaN(n) || n < 0 || n > 255) return null;
    long = (long << 8) + n;
  }
  return long >>> 0;
}

function ipInCidr(ip, cidr) {
  if (!cidr) return false;

  if (!cidr.includes("/")) {
    return normalizeIp(cidr) === ip;
  }

  const [rangeIP, maskStr] = cidr.split("/");
  const maskBits = parseInt(maskStr, 10);
  if (Number.isNaN(maskBits) || maskBits < 0 || maskBits > 32) return false;

  const ipLong = ip2long(ip);
  const rangeLong = ip2long(normalizeIp(rangeIP));
  if (ipLong == null || rangeLong == null) return false;

  const maskLong = maskBits === 0 ? 0 : (0xffffffff << (32 - maskBits)) >>> 0;
  return (ipLong & maskLong) === (rangeLong & maskLong);
}

const validateNetwork = (ipAddress) => {
  const ip = normalizeIp(ipAddress);
  if (!ip || !isIP(ip)) return false;

  const publicIps = String(process.env.OFFICE_PUBLIC_IPS || "")
    .split(",")
    .map((s) => normalizeIp(s))
    .filter(Boolean);

  if (publicIps.includes(ip)) return true;

  const cidr = String(process.env.OFFICE_IP_RANGE || "").trim();
  if (cidr && ipInCidr(ip, cidr)) return true;

  return false;
};

function getClientIp(req) {
  const forwarded = req?.headers?.["x-forwarded-for"];
  if (forwarded) {
    const first = String(forwarded).split(",")[0].trim();
    if (first) return normalizeIp(first);
  }
  const realIp = req?.headers?.["x-real-ip"];
  if (realIp) return normalizeIp(String(realIp));
  return normalizeIp(req?.ip || req?.socket?.remoteAddress || "");
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function distanceMetres(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Server-side geofence using OFFICE_LAT / OFFICE_LNG / OFFICE_RADIUS_M.
 */
function validateGeofence(lat, lng) {
  const officeLat = Number(process.env.OFFICE_LAT);
  const officeLng = Number(process.env.OFFICE_LNG);
  const radiusM = Number(process.env.OFFICE_RADIUS_M || 250);

  if (!Number.isFinite(officeLat) || !Number.isFinite(officeLng)) {
    return { ok: false, reason: "Office geofence is not configured on the server." };
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, reason: "Location was not provided." };
  }

  const d = distanceMetres(lat, lng, officeLat, officeLng);
  const max = Number.isFinite(radiusM) && radiusM > 0 ? radiusM : 250;
  if (d <= max) return { ok: true, distanceM: d };
  return {
    ok: false,
    distanceM: d,
    reason: "You appear to be outside the office area.",
  };
}

/**
 * Decide whether a sign-in request proves office presence.
 * Modes: geofence_ip (default) | geofence | ip_allowlist | open | lan_probe
 *
 * geofence_ip: pass if GPS is inside the office radius OR client IP is allowlisted.
 */
function assertOfficePresence(req, body = {}) {
  const mode = String(
    process.env.ATTENDANCE_NETWORK_MODE || "geofence_ip"
  ).toLowerCase();
  const clientIp = getClientIp(req);

  if (mode === "open") {
    return { ok: true, mode, clientIp, method: "open" };
  }

  if (mode === "ip_allowlist") {
    return {
      ok: validateNetwork(clientIp),
      mode,
      clientIp,
      method: "ip",
      message: "You must sign in from the office network",
    };
  }

  if (mode === "lan_probe") {
    const lanOk = body.office_lan_ok === true || body.office_lan_ok === "true";
    return {
      ok: lanOk,
      mode,
      clientIp,
      method: "lan_probe",
      message: "Connect to the office Wi‑Fi and try again",
    };
  }

  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const geo = validateGeofence(lat, lng);
  const ipOk = validateNetwork(clientIp);

  if (mode === "geofence") {
    return {
      ok: geo.ok,
      mode,
      clientIp,
      method: "geofence",
      distanceM: geo.distanceM,
      message: geo.reason || "Could not verify you are at the office",
    };
  }

  // geofence_ip (default): either check is enough
  if (geo.ok) {
    return {
      ok: true,
      mode,
      clientIp,
      method: "geofence",
      distanceM: geo.distanceM,
    };
  }
  if (ipOk) {
    return { ok: true, mode, clientIp, method: "ip" };
  }

  return {
    ok: false,
    mode,
    clientIp,
    method: "geofence_ip",
    message:
      geo.reason && geo.reason !== "Location was not provided."
        ? `${geo.reason} Office network IP also did not match.`
        : "Allow location at the office, or connect via the office network, then try again.",
  };
}

export {
  validateNetwork,
  getClientIp,
  normalizeIp,
  validateGeofence,
  assertOfficePresence,
};
