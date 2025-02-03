import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import passport from "passport";

import db from '../models';
const models = require("../models");
const { users: User } = db;
const { Attendance } = models;

// load input validation
import validateRegisterForm from "../validation/register";
import validateLoginForm from "../validation/login";


// create user
const create = async (req, res) => {
  try {
    const {
      fullname,
      email,
      phone_no,
      address,
      password = "123456",
      role,
      status,
      startup_id,
      starting_date,
      end_date,
      linkedin_link,
      github_link,
    } = req.body;

    const profileImage = req.files["profileImage"]
      ? req.files["profileImage"][0].path
      : null;
    const ninImage = req.files["ninImage"]
      ? req.files["ninImage"][0].path
      : null;

    const existingUser = await db.User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ email: "Email already exists!" });
    }

    let rolePrefix = "USR";

    const result = await db.sequelize.query(
      "CALL GenerateUserId(:rolePrefix)",
      {
        replacements: { rolePrefix },
      }
    );

    let userId = result[0].userId;

    let newUser = {
      user_id: userId,
      fullname,
      email,
      phone_no,
      address,
      password,
      role,
      status,
      startup_id,
      starting_date,
      end_date,
      nin: ninImage,
      profile: profileImage,
      linkedin_link,
      github_link,
    };

    bcrypt.genSalt(10, async (err, salt) => {
      if (err) throw err;

      bcrypt.hash(newUser.password, salt, async (err, hash) => {
        if (err) throw err;

        newUser.password = hash;

        try {
          const createdUser = await db.User.create(newUser);
          return res.json({ success: true, user: createdUser });
        } catch (error) {
          console.error(error);
          return res.status(500).json({
            success: false,
            message: "An error occurred while creating the user.",
          });
        }
      });
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "An error occurred." });
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
        .status(404)
        .json({ success: false, error: "User is not approved!" });
    }

    // Check for password match
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, error: "Incorrect password" });
    }

    // Generate JWT token
    const {
      id,
      user_id,
      fullname,
      role,
      phone_no,
      address,
      startup_id,
      linkedin_link,
      github_link,
      nin,
      profile,
    } = user;
    const payload = { id, user_id, fullname, role };

    // Get today's date for attendance
    const date = new Date().toISOString().split("T")[0];

    const attendance = await Attendance.findOne({
      where: { user_id, date },
    });
    // Generate JWT token
    jwt.sign(payload, "secret", { expiresIn: 7200 }, (err, token) => {
      if (err) {
        return res.status(500).json({ error: "Token generation failed" });
      }
      return res.status(200).json({
        success: true,
        token: `Bearer ${token}`,
        user: {
          user_id,
          fullname,
          email: user.email,
          phone_no,
          address,
          password: user.password,
          startup_id,
          role,
          nin,
          profile,
          linkedin_link,
          github_link,
          sign: !attendance,
        },
      });
    });
  } catch (err) {
    console.error(err); // Log the error for debugging
    return res.status(500).json({ error: "Server error" });
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

  User.findAll({ where: { id } })
    .then((user) => {
      if (!user.length) {
        return res.json({ msg: "user not found" });
      }
      res.json({ user });
    })
    .catch((err) => res.status(500).json({ err }));
};

// update a user's info
const update = (req, res) => {
  let { firstname, lastname, HospitalId, role, image } = req.body;
  const id = req.params.userId;

  User.update(
    {
      firstname,
      lastname,
      role,
    },
    { where: { id } }
  )
    .then((user) => res.status(200).json({ user }))
    .catch((err) => res.status(500).json({ err }));
};

// delete a user
const deleteUser = (req, res) => {
  const id = req.params.userId;

  User.destroy({ where: { id } })
    .then(() => res.status.json({ msg: "User has been deleted successfully!" }))
    .catch((err) => res.status(500).json({ msg: "Failed to delete!" }));
};

const verifyUserToken = async (req, res) => {
  const authToken = req.headers["authorization"];
  const token = authToken.split(" ")[1];
  // console.log(token)
  let decoded
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
      const user = await User.findOne({where: { id },})
    
  if (!user) {
    return res.json({ success: false, message: "user not found" });
     }
      //  Get today's date for attendance
  const date = new Date().toISOString().split("T")[0];
const {
  user_id,
  fullname,
  email,
  phone_no,
  address,
  password,
  role,
  status,
  startup_id,
  linkedin_link,
  github_link,
  nin,
  profile,
} = user.dataValues;

  const attendance = await Attendance.findOne({
    where: { user_id, date },
  });
  
  const payload = {
    user_id,
    fullname,
    email,
    phone_no,
    address,
    password,
    role,
    status,
    startup_id,
    id,
    linkedin_link,
    github_link,
    nin,
    profile,
    sign: !attendance,
  };

  res.json({
    success: true,
    user: payload,
  });
  } catch (error) {
       res
          .status(500)
          .json({ success: false, message: "An error occured", error });
      };
  
 
    
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
  User.update(req.body, { where: { id } })
    .then(() =>
      res.status(200).json({ msg: "User has been updated successfully!" })
    )
    .catch((err) => res.status(500).json({ msg: "Failed to update!" }));
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

  // Validate status
  const validStatuses = ["Active", "Deactivated", "Suspended"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid status value",
    });
  }

  try {
    // Find the user first
    const user = await User.findOne({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user's status is Approved before allowing status update
    if (user.status !== "Approved") {
      return res.status(403).json({
        success: false,
        message: "Cannot update status. User must be Approved first",
      });
    }

    // Update user status
    await User.update(
      {
        status,
        updated_at: new Date(),
      },
      { where: { id: userId } }
    );

    // Fetch updated user
    const updatedUser = await User.findOne({ where: { id: userId } });

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
  const { role, startup, status } = req.body;

  console.log(req.body);
  console.log(userId);

  try {
    // Find the user first to make sure they exist
    const user = await User.findOne({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update the user's information
    await User.update(
      {
        role,
        startup_id: startup,
        status,
        updated_at: new Date(),
      },
      { where: { id: userId } }
    );

    // Fetch the updated user
    const updatedUser = await User.findOne({ where: { id: userId } });

    return res.status(200).json({
      success: true,
      message: "User status and startup updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update user status and startup",
      error: error.message,
    });
  }
};

export const getJoinUser = (req, res) => {
  db.sequelize
    .query(`CALL select_user()`)
    .then((data) => res.json({ success: true, data }))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ success: false });
    });
};
const reactivateUser = (req, res) => {
  const id = req.params.userId;
  User.update(req.body, { where: { id } })
    .then(() =>
      res.status(200).json({ msg: "User has been updated successfully!" })
    )
    .catch((err) => res.status(500).json({ msg: "Failed to update!" }));
};

export {
  create,
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
};
