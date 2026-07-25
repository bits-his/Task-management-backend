import passport from "passport";
import { ROLES, ROLE_IDS, ROLE_LABELS } from "../constants/roles.js";
import { normalizeRolesInDb } from "../services/membershipService.js";

const jwt = passport.authenticate("jwt", { session: false });

export default (app) => {
  /** Canonical org-wide roles — single source of truth for forms & departments */
  app.get("/api/roles", (_req, res) => {
    res.json({
      success: true,
      data: ROLES,
      ids: ROLE_IDS,
      labels: ROLE_LABELS,
    });
  });

  /** Rewrite legacy role strings in users + memberships */
  app.post("/api/roles/normalize", jwt, async (_req, res) => {
    try {
      const result = await normalizeRolesInDb();
      res.json({
        success: true,
        message: "Roles normalized to canonical ids",
        ...result,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
};
