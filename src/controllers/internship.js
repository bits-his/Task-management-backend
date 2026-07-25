import {
  listOpenOpportunities,
  listAllOpportunities,
  getOpportunityById,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  submitApplication,
  requestTrackOtp,
  verifyTrackOtp,
  listApplications,
  getApplicationDetail,
  updateApplicationStatus,
  approveApplication,
  rejectApplication,
  activateAccount,
  updatePlacementOfficeDays,
  getPlacementForUser,
  updatePlacementForUser,
  updatePlacement,
  seedDefaultOpportunities,
} from "../services/internshipService.js";

export async function getOpportunities(req, res) {
  try {
    const data = await listOpenOpportunities();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getOpportunity(req, res) {
  try {
    const data = await getOpportunityById(req.params.id);
    if (!data) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function adminListOpportunities(req, res) {
  try {
    const data = await listAllOpportunities(req.query);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function adminCreateOpportunity(req, res) {
  try {
    const data = await createOpportunity(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function adminUpdateOpportunity(req, res) {
  try {
    const data = await updateOpportunity(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function adminDeleteOpportunity(req, res) {
  try {
    const result = await deleteOpportunity(req.params.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function createApplication(req, res) {
  try {
    const data = await submitApplication(req.body, req.files || []);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function trackRequestOtp(req, res) {
  try {
    const { application_code, email } = req.body;
    await requestTrackOtp({ application_code, email });
    res.json({ success: true, message: "OTP sent to your email" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function trackVerifyOtp(req, res) {
  try {
    const { application_code, email, otp } = req.body;
    const data = await verifyTrackOtp({ application_code, email, otp });
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function adminListApplications(req, res) {
  try {
    const data = await listApplications(req.query);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function adminGetApplication(req, res) {
  try {
    const data = await getApplicationDetail(req.params.id);
    if (!data) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function adminUpdateApplication(req, res) {
  try {
    const userId = req.user?.user_id || req.user?.dataValues?.user_id;
    const data = await updateApplicationStatus(
      req.params.id,
      req.body,
      userId
    );
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function adminApproveApplication(req, res) {
  try {
    const userId = req.user?.user_id || req.user?.dataValues?.user_id;
    const data = await approveApplication(req.params.id, req.body, userId);
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function downloadAcceptanceLetter(req, res) {
  try {
    const { buildAcceptanceLetterPdf } = await import(
      "../services/internshipLetterPdf.js"
    );
    const { buffer, filename } = await buildAcceptanceLetterPdf(req.params.id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );
    res.send(buffer);
  } catch (err) {
    const status = err.message === "Application not found" ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
}

export async function adminRejectApplication(req, res) {
  try {
    const userId = req.user?.user_id || req.user?.dataValues?.user_id;
    const data = await rejectApplication(
      req.params.id,
      req.body.reason,
      userId
    );
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function activateInternshipAccount(req, res) {
  try {
    const data = await activateAccount(req.body);
    res.json({ success: true, data, message: "Account activated. You can sign in." });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function adminUpdatePlacementOfficeDays(req, res) {
  try {
    const data = await updatePlacementOfficeDays(
      req.params.id,
      req.body.office_days
    );
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function adminGetUserPlacement(req, res) {
  try {
    const data = await getPlacementForUser(req.params.userId);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function adminUpdateUserPlacement(req, res) {
  try {
    const data = await updatePlacementForUser(req.params.userId, req.body);
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function bootstrapInternship(req, res) {
  try {
    await seedDefaultOpportunities();
    res.json({ success: true, message: "Internship module seeded" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}
