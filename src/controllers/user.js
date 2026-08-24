import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import passport from "passport";
import moment from "moment-timezone";

import db from "../models/index.js";
const User = db.users;
const Attendance = db.attendances;
// const { attendance : Attendance } = models;

const LAGOS_TZ = "Africa/Lagos";
function todayLagos() {
  return moment.tz(LAGOS_TZ).format("YYYY-MM-DD");
}

// load input validation
import validateRegisterForm from "../validation/register.js";
import validateLoginForm from "../validation/login.js";
import { nextUserId } from "../services/numberGenerator.js";
import {
  createToken,
  hashToken,
  sendVerificationEmail,
  sendAdminInviteEmail,
} from "../services/mail.js";
import crypto from "crypto";
import { createUserSession } from "./auth.js";
import {
  buildAuthContext,
  upsertMembership,
  getDepartmentAccessTemplate,
  getRoleAccessPreset,
  normalizeRole,
  enrichUserWithPrimaryContext,
  getPrimaryMembershipMap,
} from "../services/membershipService.js";
import { ROLE_IDS } from "../constants/roles.js";

async function resolveStartupName(startup_id, role) {
  if (
    role === "admin" ||
    startup_id == null ||
    startup_id === "" ||
    startup_id === "Not Assigned"
  ) {
    return "";
  }
  const startup = await db.startups.findOne({
    where: { startup_id },
    attributes: ["name"],
    raw: true,
  });
  return startup?.name || "";
}

async function buildUserAuthPayload(userRecord, attendance) {
  const plain = userRecord.dataValues || userRecord;
  const {
    user_id,
    fullname,
    email,
    phone_no,
    address,
    status,
    org_id,
    id,
    linkedin_link,
    github_link,
    nin,
    profile,
    guardian_number,
    createdAt,
    email_verified,
  } = plain;

  const { memberships, activeContext } = await buildAuthContext(plain);
  const ctx = activeContext || {};

  return {
    user_id,
    fullname,
    email,
    phone_no,
    address,
    startup_id: ctx.startup_id ?? null,
    role: ctx.role || null,
    nin,
    profile,
    linkedin_link,
    github_link,
    access_to: ctx.access_to || "",
    functionalities: ctx.functionalities || "",
    guardian_number,
    createdAt,
    status,
    dept_id: ctx.dept_id ?? null,
    org_id: ctx.org_id || org_id || "1",
    id,
    email_verified: !!email_verified,
    startup_name: ctx.label || null,
    sign:
      attendance && attendance.dataValues?.sign_in_time !== null ? true : false,
    signout:
      attendance && attendance.dataValues?.sign_out_time ? true : false,
    memberships,
    activeContext: ctx,
  };
}

// create user
const create = async (req, res) => {
  try {
    const {
      fullname,
      email,
      phone_no,
      address,
      password,
      role,
      status = "Pending",
      startup_id,
      starting_date,
      end_date,
      linkedin_link,
      github_link,
      guardian_number,
      guidance_phone,
    } = req.body;

    if (!email || !fullname) {
      return res.status(400).json({
        success: false,
        message: "Full name and email are required",
      });
    }

    if (!password || String(password).length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    const profileImage = req.files?.profileImage
      ? req.files.profileImage[0].path
      : null;
    const ninImage = req.files?.ninImage
      ? req.files.ninImage[0].path
      : null;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, email: "Email already exists!" });
    }

    const userId = await nextUserId("USR");
    const verifyRaw = createToken();
    const hash = await bcrypt.hash(password, 10);

    // Account identity only role/context is assigned on admin approve via user_memberships
    const createdUser = await User.create({
      user_id: userId,
      fullname,
      email,
      phone_no,
      address,
      password: hash,
      status: status || "Pending",
      org_id: req.body.org_id || "1",
      starting_date: starting_date || null,
      end_date: end_date || null,
      nin: ninImage,
      profile: profileImage,
      linkedin_link: linkedin_link || null,
      github_link: github_link || null,
      guardian_number: guardian_number || guidance_phone || null,
      email_verified: false,
      email_verify_token: hashToken(verifyRaw),
      email_verify_expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    try {
      await sendVerificationEmail(createdUser, verifyRaw);
    } catch (mailErr) {
      console.error("Verification email failed:", mailErr.message);
    }

    const safeUser = createdUser.toJSON();
    delete safeUser.password;
    delete safeUser.email_verify_token;
    delete safeUser.password_reset_token;

    return res.json({
      success: true,
      user: safeUser,
      message:
        "Account created. Please verify your email, then wait for admin approval.",
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "An error occurred." });
  }
};

/**
 * Admin creates a member directly (Approved), seeds memberships,
 * and emails temporary login credentials.
 */
const createByAdmin = async (req, res) => {
  try {
    const {
      fullname,
      email,
      phone_no,
      address,
      role,
      startup_id,
      dept_id,
      starting_date,
      end_date,
      org_id,
    } = req.body;

    if (!email || !fullname) {
      return res.status(400).json({
        success: false,
        message: "Full name and email are required",
      });
    }

    const canonicalRole = normalizeRole(role || "member");
    if (!ROLE_IDS.includes(canonicalRole)) {
      return res.status(400).json({
        success: false,
        message: "Select a valid role",
      });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        email: "Email already exists. Use Org Members to manage this person.",
      });
    }

    const temporaryPassword = crypto.randomBytes(9).toString("base64url");
    const hash = await bcrypt.hash(temporaryPassword, 10);
    const userId = await nextUserId("USR");
    const resolvedOrg = org_id || req.user?.org_id || "1";
    const optionalStartup =
      startup_id && startup_id !== "org" && startup_id !== "none"
        ? startup_id
        : null;
    const resolvedDept = dept_id || null;

    const preset = getRoleAccessPreset(canonicalRole);
    let access_to = preset.access_to;
    let functionalities = preset.functionalities;

    if (resolvedDept) {
      const template = await getDepartmentAccessTemplate(resolvedDept);
      if (template) {
        access_to = template.access_to || preset.access_to;
        functionalities =
          template.functionalities || preset.functionalities;
      }
    }

    const createdUser = await User.create({
      user_id: userId,
      fullname,
      email,
      phone_no: phone_no || null,
      address: address || null,
      password: hash,
      status: "Approved",
      org_id: resolvedOrg,
      starting_date: starting_date || null,
      end_date: end_date || null,
      email_verified: true,
      email_verify_token: null,
      email_verify_expires: null,
    });

    await upsertMembership({
      user_id: userId,
      org_id: resolvedOrg,
      startup_id: null,
      dept_id: resolvedDept,
      role: canonicalRole,
      access_to: access_to || "",
      functionalities: functionalities || "",
      is_primary: true,
      status: "active",
    });

    if (optionalStartup) {
      await upsertMembership({
        user_id: userId,
        org_id: resolvedOrg,
        startup_id: optionalStartup,
        dept_id: resolvedDept,
        role: canonicalRole,
        access_to: access_to || "",
        functionalities: functionalities || "",
        is_primary: false,
        status: "active",
      });
    }

    let emailSent = true;
    try {
      await sendAdminInviteEmail(createdUser, temporaryPassword);
    } catch (mailErr) {
      emailSent = false;
      console.error("Admin invite email failed:", mailErr.message);
    }

    const safeUser = createdUser.toJSON();
    delete safeUser.password;
    delete safeUser.email_verify_token;
    delete safeUser.password_reset_token;

    return res.json({
      success: true,
      user: safeUser,
      emailSent,
      message: emailSent
        ? "Member created. Login instructions were emailed."
        : "Member created, but the invite email failed. Share login details manually.",
      // Only returned when mail fails so admin can still onboard the person
      ...(emailSent ? {} : { temporaryPassword }),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to create member",
    });
  }
};

// const login = async (req, res) => {
//   const { errors, isValid } = validateLoginForm(req.body);

//   // Check validation
//   if (!isValid) {
//     return res.status(400).json(errors);
//   }

//   const { email, password } = req.body;

//   User.findOne({
//     where: { email },
//   })
//     .then((user) => {
//       if (!user) {
//         return res
//           .status(404)
//           .json({ success: false, error: "User not found!" });
//       }

//       if (user.status !== 'Approved') {
//         return res
//           .status(404)
//           .json({ success: false, error: "User is not approved!" });
//       }

//       // Check for password match
//       bcrypt.compare(password, user.password).then((isMatch) => {
//         if (isMatch) {
//           // Generate JWT token
//           const { id, user_id, fullname, role, phone_no, address, } = user;
//           const payload = { id, user_id, fullname, role };
//            const date = new Date().toISOString().split("T")[0];
//     let attendance = await Attendance.findOne({
//       where: { user_id, date },
//     });
//     console.log(attendance)
//           jwt.sign(payload, "secret", { expiresIn: 3600 }, (err, token) => {
//             if (err) {
//               return res.status(500).json({ error: "Token generation failed" });
//             }
//             return res.status(200).json({
//               success: true,
//               token: `Bearer ${token}`,
//               user: {
//                 user_id,
//                 fullname,
//                 email: user.email,
//                 phone_no,
//                 address,
//                 password: user.password,
//                 startup_id:user.startup_id,
//                 role,
//                 sign:true,
//               },
//             });
//           });
//         } else {
//           return res
//             .status(400)
//             .json({ success: false, error: "Incorrect password" });
//         }
//       });
//     })
//     .catch((err) => res.status(500).json({ error: "Server error" }));
// };

// fetch all users

const login = async (req, res) => {
  const { errors, isValid } = validateLoginForm(req.body);

  if (!isValid) {
    return res.status(400).json(errors);
  }

  const { email, password } = req.body;

  try {
    // Find the user by email
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found!" });
    }

    if (user.status !== "Approved") {
      return res
        .status(403)
        .json({ success: false, error: "User is not approved!" });
    }

    if (user.email_verified === false) {
      return res.status(403).json({
        success: false,
        error: "Please verify your email before signing in.",
        code: "EMAIL_NOT_VERIFIED",
      });
    }

    // Check for password match
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, error: "Incorrect password" });
    }

    // Get today's date for attendance (Africa/Lagos)
    const date = todayLagos();
    const attendance = await Attendance.findOne({
      where: { user_id: user.user_id, date },
    });

    const userPayload = await buildUserAuthPayload(user, attendance);
    const payload = {
      id: user.id,
      user_id: user.user_id,
      fullname: user.fullname,
      role: userPayload.role,
    };

    // Generate JWT token
    jwt.sign(
      payload,
      process.env.JWT_SECRET || "secret",
      { expiresIn: 7200 },
      async (err, token) => {
        if (err) {
          return res.status(500).json({ error: "Token generation failed" });
        }

        try {
          await createUserSession(user, req, token);
        } catch (sessionErr) {
          console.error("Session create failed:", sessionErr.message);
        }

        return res.status(200).json({
          success: true,
          token: `Bearer ${token}`,
          user: userPayload,
          memberships: userPayload.memberships,
          activeContext: userPayload.activeContext,
        });
      }
    );
  } catch (err) {
    console.error(err); // Log the error for debugging
    return res.status(500).json({ error: "Server error" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { user_id } = req.params;

    console.log("Received user ID:", user_id); // Debugging

    const {
      fullname,
      email,
      phone_no,
      address,
      linkedin_link,
      github_link,
      nin,
    } = req.body;
    console.log("Received file:", req.file ? req.file.path : "No file"); // Debugging

    // Ensure the user_id is valid
    if (!user_id) {
      return res.status(400).json({ error: "User ID is missing" });
    }

    // Find user based on the user_id (not using PK)
    const user = await User.findOne({ where: { user_id } });

    if (!user) {
      console.error(`User with ID ${user_id} not found`);
      return res.status(404).json({ error: "User not found" });
    }

    // Get profile picture if uploaded
    const profilePicture = req.file ? req.file.path : user.profilePicture;
    console.log(profilePicture)

    // Update user details using the correct field
    await user.update(
      {
        fullname,
        email,
        address,
        linkedin_link,
        github_link,
        phone_no,
        nin,
        profile: profilePicture,
      },
      { where: { user_id } }
    );

    res.status(200).json({ message: "Profile updated successfully", user });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
};

const findAllUsers = (req, res) => {
  User.findAll()
    .then((user) => {
      res.json({ user });
    })
    .catch((err) => res.status(500).json({ err }));
};

// fetch user by userId
const findById = (req, res) => {
  const id = req.params.userId;

  User.findAll({ where: { user_id : id } })
    .then((user) => {
      if (!user.length) {
        return res.json({ msg: "user not found" });
      }
      res.json({ success : true ,user });
    })
    .catch((err) => res.status(500).json({ err }));
};

// update a user's info
const update = (req, res) => {
  let { firstname, lastname } = req.body;
  const id = req.params.userId;

  User.update(
    {
      firstname,
      lastname,
    },
    { where: { id } }
  )
    .then((user) => res.status(200).json({ user }))
    .catch((err) => res.status(500).json({ err }));
};
const updatedept = async (req, res) => {
  let { dept_id, role } = req.body;
  const id = req.params.userId;

  try {
    const user = await User.findOne({ where: { id }, raw: true });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    await upsertMembership({
      user_id: user.user_id,
      org_id: user.org_id || "1",
      startup_id: null,
      dept_id: dept_id || null,
      role: role ? normalizeRole(role) : null,
      is_primary: true,
      status: "active",
    });
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ err });
  }
};

// delete a user
const deleteUser = (req, res) => {
  const id = req.params.userId;

  User.destroy({ where: { id } })
    .then(() => res.status.json({ msg: "User has been deleted successfully!" }))
    .catch((err) => res.status(500).json({ msg: "Failed to delete!" }));
};

const verifyUserToken = async (req, res) => {
  const authHeader = (req.headers["authorization"] || "").trim();
  if (!authHeader) {
    return res.json({ success: false, message: "No token provided" });
  }
  const token = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : authHeader;
  if (!token) {
    return res.json({ success: false, message: "No token provided" });
  }
  let decoded;
  try {
    decoded = await jwt.verify(token, "secret");
  } catch (error) {
    console.log(error);
    return res.json({
      success: false,
      message: "Failed to authenticate token.",
      error,
    });
  }
  try {
    const { id } = decoded;
    const user = await User.findOne({ where: { id } });

    if (!user) {
      return res.json({ success: false, message: "user not found" });
    }
    //  Get today's date for attendance (Africa/Lagos)
    const date = todayLagos();
    const attendance = await Attendance.findOne({
      where: { user_id: user.user_id, date },
    });

    const userPayload = await buildUserAuthPayload(user, attendance);

    res.json({
      success: true,
      user: userPayload,
      memberships: userPayload.memberships,
      activeContext: userPayload.activeContext,
    });
  } catch (error) {
    console.log(error)
    res
      .status(500)
      .json({ success: false, message: "An error occured", error });
  }

  // .catch((err) => {
  //   console.log(err);
  //   res
  //     .status(500)
  //     .json({ success: false, message: "An error occured", err });
  // });
  // });

  // jwt.verify(token, "secret", (err, decoded) => {
  //   // console.log(decoded)
  //   if (err) {
  //     return res.json({
  //       success: false,
  //       message: "Failed to authenticate token.",
  //       err,
  //     });
  //   }
  //   const { id } = decoded;
  //   User.findAll({
  //     where: { id },
  //   })
  //     .then((user) => {
  //       if (!user.length) {
  //         return res.json({ success: false, message: "user not found" });
  //       }
  //       res.json({
  //         success: true,
  //         user: { ...user[0], sign: !attendance },
  //       });
  //     })
  //     .catch((err) => {
  //       console.log(err);
  //       res
  //         .status(500)
  //         .json({ success: false, message: "An error occured", err });
  //     });
  // });
};

const updateUser = (req, res) => {
  const id = req.params.userId;
  const {
    role: _role,
    startup_id: _startup,
    dept_id: _dept,
    access_to: _access,
    functionalities: _funcs,
    password: _password,
    ...safeBody
  } = req.body || {};

  User.update(safeBody, { where: { user_id: id } })
    .then(() =>
      res.status(200).json({success: true, msg: "User has been updated successfully!" })
    )
    .catch((err) => res.status(500).json({success: false , msg: "Failed to update!" }));
};

const UpdateUserStatus = async (req, res) => {
  const { userId } = req.params;
  const { status, remarks } = req.body;

  try {
    // Find the user first to make sure they exist

    const user = await User.findOne({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update the user's status

    await User.update(
      {
        status,
        remarks,
        updated_at: new Date(),
      },
      { where: { id: userId } }
    );

    // Fetch the updated user

    const updatedUser = await User.findOne({ where: { id: userId } });

    return res.status(200).json({
      success: true,
      message: "User status updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update user status",
      error: error.message,
    });
  }
};

const updateUserStatus = async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;

  const validStatuses = ["Approved", "Deactivated", "Suspended"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid status value. Use Approved, Deactivated, or Suspended.",
    });
  }

  try {
    const user = await User.findOne({ where: { user_id: userId } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const current = String(user.status || "").toLowerCase();
    const allowedFrom = ["approved", "deactivated", "suspended", "active"];
    if (!allowedFrom.includes(current) && status !== "Approved") {
      return res.status(403).json({
        success: false,
        message: "Cannot update status. User must be Approved first",
      });
    }

    await User.update(
      {
        status,
        updated_at: new Date(),
      },
      { where: { user_id: userId } }
    );

    if (status === "Deactivated" || status === "Suspended") {
      await db.user_memberships.update(
        { status: "inactive" },
        { where: { user_id: userId } }
      );
    } else if (status === "Approved") {
      await db.user_memberships.update(
        { status: "active" },
        { where: { user_id: userId } }
      );
    }

    const updatedUser = await User.findOne({ where: { user_id: userId } });

    return res.status(200).json({
      success: true,
      message: `User has been ${status.toLowerCase()} successfully`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update user status",
      error: error.message,
    });
  }
};

const updateUserStartupStatus = async (req, res) => {
  const { userId } = req.params;
  const {
    role,
    startup,
    status,
    dept_id,
    starting_date,
    end_date,
    access_to: bodyAccess,
    functionalities: bodyFuncs,
  } = req.body;

  try {
    const user = await User.findOne({ where: { user_id: userId } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Role is required to approve a user",
      });
    }

    const canonicalRole = normalizeRole(role);
    if (!ROLE_IDS.includes(canonicalRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    const preset = getRoleAccessPreset(canonicalRole);
    const resolvedDept = dept_id || null;
    let access_to = bodyAccess || "";
    let functionalities = bodyFuncs || "";

    if (!access_to) {
      if (resolvedDept) {
        const template = await getDepartmentAccessTemplate(resolvedDept);
        access_to = template.access_to || preset.access_to;
        functionalities =
          template.functionalities || preset.functionalities;
      } else {
        access_to = preset.access_to;
        functionalities = preset.functionalities;
      }
    }

    const optionalStartup = startup || null;
    const nextStatus = status || "Approved";

    // Account lifecycle on users; role/context live on user_memberships
    await User.update(
      {
        status: nextStatus,
        ...(starting_date ? { starting_date } : {}),
        ...(end_date ? { end_date } : {}),
        updated_at: new Date(),
      },
      { where: { user_id: userId } }
    );

    // Always create / refresh org-level membership first
    await upsertMembership({
      user_id: userId,
      org_id: user.org_id || "1",
      startup_id: null,
      dept_id: resolvedDept,
      role: canonicalRole,
      access_to: access_to || "",
      functionalities: functionalities || "",
      is_primary: true,
      status: "active",
    });

    // Optional startup membership (person remains in org)
    if (optionalStartup) {
      await upsertMembership({
        user_id: userId,
        org_id: user.org_id || "1",
        startup_id: optionalStartup,
        dept_id: resolvedDept,
        role: canonicalRole,
        access_to: access_to || "",
        functionalities: functionalities || "",
        is_primary: false,
        status: "active",
      });
    }

    const updatedUser = await User.findOne({
      where: { user_id: userId },
      raw: true,
    });
    const auth = await buildAuthContext(updatedUser);
    const enriched = await enrichUserWithPrimaryContext(updatedUser);

    return res.status(200).json({
      success: true,
      message: "User approved and org membership created",
      data: enriched,
      memberships: auth.memberships,
      activeContext: auth.activeContext,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update user status and membership",
      error: error.message,
    });
  }
};

export const getJoinUser = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: [
        "user_id",
        "fullname",
        "email",
        "profile",
        "phone_no",
        "address",
        "status",
        "starting_date",
        "end_date",
        "nin",
        "org_id",
        "createdAt",
        "updatedAt",
      ],
      raw: true,
    });

    const primaryMap = await getPrimaryMembershipMap(
      users.map((u) => u.user_id)
    );

    const data = users.map((u) => {
      const ctx = primaryMap[u.user_id] || {};
      return {
        user_id: u.user_id,
        fullname: u.fullname,
        email: u.email,
        profile: u.profile,
        phone_no: u.phone_no,
        address: u.address,
        role: ctx.role || null,
        status: u.status,
        user_startup_id: ctx.startup_id || null,
        starting_date: u.starting_date,
        end_date: u.end_date,
        nin: u.nin,
        startup_table_id: ctx.startup_id || null,
        startup_name: ctx.label || null,
        startup_description: null,
        startup_id: ctx.startup_id || null,
        dept_id: ctx.dept_id || null,
        org_id: ctx.org_id || u.org_id || "1",
        access_to: ctx.access_to || "",
        functionalities: ctx.functionalities || "",
        activeContext: ctx.id ? ctx : null,
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
};
const reactivateUser = async (req, res) => {
  const userId = req.params.userId;
  const { status } = req.body;

  try {
    const user = await User.findOne({ where: { user_id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    const current = String(user.status || "").toLowerCase();
    // Only reactivate deactivated / suspended pending must go through approve with role
    if (!["deactivated", "suspended"].includes(current)) {
      return res.status(400).json({
        success: false,
        msg: "Use the Approve flow for pending users. Reactivate is only for Deactivated or Suspended accounts.",
      });
    }

    const nextStatus = status === "Approved" || !status ? "Approved" : status;
    await User.update(
      { status: nextStatus, updated_at: new Date() },
      { where: { user_id: userId } }
    );
    await db.user_memberships.update(
      { status: "active" },
      { where: { user_id: userId } }
    );

    return res.status(200).json({
      success: true,
      msg: "User has been reactivated successfully!",
    });
  } catch (err) {
    return res.status(500).json({ success: false, msg: "Failed to update!" });
  }
};

export {
  create,
  createByAdmin,
  login,
  findAllUsers,
  findById,
  update,
  updateUser,
  deleteUser,
  verifyUserToken,
  UpdateUserStatus,
  updateUserStatus,
  reactivateUser,
  updateUserStartupStatus,
  updateProfile,
  updatedept,
};
