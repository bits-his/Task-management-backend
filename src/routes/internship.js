import passport from "passport";
import { internshipUpload } from "../config/internshipUpload.js";
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
  getMyApplication,
  resubmitMyApplication,
  adminGrantPortalAccess,
  getResubmitApplication,
  postResubmitApplication,
} from "../controllers/internship.js";

const jwt = passport.authenticate("jwt", { session: false });

export default (app) => {
  app.get("/api/internship/opportunities", getOpportunities);
  app.get("/api/internship/opportunities/:id", getOpportunity);

  app.post(
    "/api/internship/applications",
    (req, res, next) => {
      internshipUpload.any()(req, res, (err) => {
        if (err) {
          return res.status(400).json({
            success: false,
            message:
              err.message ||
              "File upload failed. Use JPG, PNG, or PDF files under 10MB.",
          });
        }
        next();
      });
    },
    createApplication
  );

  app.post("/api/internship/track/request-otp", trackRequestOtp);
  app.post("/api/internship/track/verify", trackVerifyOtp);
  app.post("/api/internship/activate-account", activateInternshipAccount);

  app.get("/api/internship/resubmit/:token", getResubmitApplication);
  app.post(
    "/api/internship/resubmit/:token",
    (req, res, next) => {
      internshipUpload.any()(req, res, (err) => {
        if (err) {
          return res.status(400).json({
            success: false,
            message:
              err.message ||
              "File upload failed. Use JPG, PNG, or PDF files under 10MB.",
          });
        }
        next();
      });
    },
    postResubmitApplication
  );

  app.get("/api/internship/me/application", jwt, getMyApplication);
  app.post(
    "/api/internship/me/application/resubmit",
    jwt,
    (req, res, next) => {
      internshipUpload.any()(req, res, (err) => {
        if (err) {
          return res.status(400).json({
            success: false,
            message:
              err.message ||
              "File upload failed. Use JPG, PNG, or PDF files under 10MB.",
          });
        }
        next();
      });
    },
    resubmitMyApplication
  );

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
  app.post(
    "/api/internship/applications/:id/portal-access",
    jwt,
    adminGrantPortalAccess
  );

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
