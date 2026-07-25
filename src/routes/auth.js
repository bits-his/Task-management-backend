import {
  requestPasswordReset,
  resetPassword,
  verifyEmail,
  resendVerification,
  listSessions,
  revokeSession,
  revokeOtherSessions,
} from "../controllers/auth.js";
import passport from "passport";

export default (app) => {
  app.post("/api/auth/forgot-password", requestPasswordReset);
  app.post("/api/users/initiate-password-reset", requestPasswordReset);
  app.post("/api/auth/reset-password", resetPassword);
  app.post("/api/auth/verify-email", verifyEmail);
  app.get("/api/auth/verify-email", verifyEmail);
  app.post("/api/auth/resend-verification", resendVerification);

  app.get(
    "/api/auth/sessions",
    passport.authenticate("jwt", { session: false }),
    listSessions
  );
  app.delete(
    "/api/auth/sessions/:sessionId",
    passport.authenticate("jwt", { session: false }),
    revokeSession
  );
  app.post(
    "/api/auth/sessions/revoke-others",
    passport.authenticate("jwt", { session: false }),
    revokeOtherSessions
  );

  // Fallback when JWT middleware user is not populated yet
  app.get("/api/auth/sessions-by-user", listSessions);
  app.post("/api/auth/sessions/:sessionId/revoke", revokeSession);
};
