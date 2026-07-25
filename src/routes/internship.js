import passport from "passport";
import { upload } from "../config/multerConfig.js";
import {
  getOpportunities,
  getOpportunity,
  createApplication,
  trackRequestOtp,
  trackVerifyOtp,
  adminListApplications,
  adminGetApplication,
  adminUpdateApplication,
  adminApproveApplication,
  adminRejectApplication,
  activateInternshipAccount,
  adminUpdatePlacementOfficeDays,
  adminGetUserPlacement,
  adminUpdateUserPlacement,
  adminListOpportunities,
  adminCreateOpportunity,
  adminUpdateOpportunity,
  adminDeleteOpportunity,
  bootstrapInternship,
  downloadAcceptanceLetter,
} from "../controllers/internship.js";

const jwt = passport.authenticate("jwt", { session: false });

export default (app) => {
  app.get("/api/internship/opportunities", getOpportunities);
  app.get("/api/internship/opportunities/:id", getOpportunity);

  app.post(
    "/api/internship/applications",
    upload.any(),
    createApplication
  );

  app.post("/api/internship/track/request-otp", trackRequestOtp);
  app.post("/api/internship/track/verify", trackVerifyOtp);
  app.post("/api/internship/activate-account", activateInternshipAccount);

  app.get("/api/internship/applications", jwt, adminListApplications);
  app.get("/api/internship/applications/:id", jwt, adminGetApplication);
  app.get(
    "/api/internship/applications/:id/acceptance-letter.pdf",
    jwt,
    downloadAcceptanceLetter
  );
  app.patch("/api/internship/applications/:id", jwt, adminUpdateApplication);
  app.post("/api/internship/applications/:id/approve", jwt, adminApproveApplication);
  app.post("/api/internship/applications/:id/reject", jwt, adminRejectApplication);

  app.get(
    "/api/internship/users/:userId/placement",
    jwt,
    adminGetUserPlacement
  );
  app.patch(
    "/api/internship/users/:userId/placement",
    jwt,
    adminUpdateUserPlacement
  );
  app.patch(
    "/api/internship/placements/:id/office-days",
    jwt,
    adminUpdatePlacementOfficeDays
  );

  app.get("/api/internship/admin/opportunities", jwt, adminListOpportunities);
  app.post("/api/internship/admin/opportunities", jwt, adminCreateOpportunity);
  app.patch("/api/internship/admin/opportunities/:id", jwt, adminUpdateOpportunity);
  app.delete("/api/internship/admin/opportunities/:id", jwt, adminDeleteOpportunity);

  app.post("/api/internship/bootstrap", jwt, bootstrapInternship);
};
