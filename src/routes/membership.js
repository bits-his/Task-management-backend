import passport from "passport";
import {
  getAuthContext,
  getMyMemberships,
  getUserMemberships,
  removeMembership,
  saveMembership,
} from "../controllers/membership.js";

export default (app) => {
  app.get(
    "/api/memberships/me",
    passport.authenticate("jwt", { session: false }),
    getMyMemberships
  );

  app.get(
    "/api/memberships/context",
    passport.authenticate("jwt", { session: false }),
    getAuthContext
  );

  app.get(
    "/api/memberships/user/:userId",
    passport.authenticate("jwt", { session: false }),
    getUserMemberships
  );

  app.post(
    "/api/memberships/user/:userId",
    passport.authenticate("jwt", { session: false }),
    saveMembership
  );

  app.put(
    "/api/memberships/user/:userId",
    passport.authenticate("jwt", { session: false }),
    saveMembership
  );

  app.delete(
    "/api/memberships/user/:userId/:membershipId",
    passport.authenticate("jwt", { session: false }),
    removeMembership
  );
};
