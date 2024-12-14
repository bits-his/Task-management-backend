import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'passport';

import db from '../models';
const User = db.User;

// load input validation
import validateRegisterForm from '../validation/register';
import validateLoginForm from '../validation/login';

// create user
const create = async (req, res) => {
  const { errors, isValid } = validateRegisterForm(req.body);
  let {
    fullname,
    email,
    phone_no,
    address,
    password = "123456",
    role,
    status,
    startup_id,
    starting_date,
    end_date
  } = req.body;

  // check validation
  if (!isValid) {
    return res.status(400).json(errors);
  }

  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ email: 'Email already exists!' });
    }

    let userId;
    const rolePrefix = role.slice(0, 3).toUpperCase();

    const latestUser = await User.findOne({
      where: { role },
      order: [["createdAt", 'DESC']],
    })
    console.log(latestUser)

    if (latestUser && String(latestUser.id).startsWith(rolePrefix)) {
      const latestIdNum = parseInt(String(latestUser.id).slice(3)) + 1;
      userId = `${rolePrefix}${latestIdNum.toString().padStart(5, "0")}`;
    } else {
      userId = `${rolePrefix}00001`;
    }
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
      end_date
    };
    bcrypt.genSalt(10, async (err, salt) => {
      if (err) throw err;

      bcrypt.hash(newUser.password, salt, async (err, hash) => {
        if (err) throw err;

        // Replace the plain password with the hashed password
        newUser.password = hash;

        try {
          // Create the new user in the database
          const createdUser = await User.create(newUser);
          return res.json({ user: createdUser });
        } catch (error) {
          console.error(error);
          return res.status(500).json({ success: false, message: "An error occurred while creating the user." });
        }
      });
    });
  }
  catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "An error occurred." });
  }
};

const login = (req, res) => {
  const { errors, isValid } = validateLoginForm(req.body);

  // Check validation
  if (!isValid) {
    return res.status(400).json(errors);
  }

  const { email, password } = req.body;

  User.findOne({
    where: { email },
  })
    .then((user) => {
      if (!user) {
        return res.status(404).json({ email: "User not found!" });
      }

      // Check for password match
      bcrypt.compare(password, user.password).then((isMatch) => {
        if (isMatch) {
          // Generate JWT token
          const { id, user_id, fullname, role, phone_no, address, } = user;
          const payload = { id, user_id, fullname, role };

          jwt.sign(payload, "secret", { expiresIn: 3600 }, (err, token) => {
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
                startup_id:user.startup_id,
                role,
              },
            });
          });
        } else {
          return res.status(400).json({ password: "Incorrect password" });
        }
      });
    })
    .catch((err) => res.status(500).json({ error: "Server error" }));
};

// fetch all users
const findAllUsers = (req, res) => {
  User.findAll()
    .then(user => {
      res.json({ user });
    })
    .catch(err => res.status(500).json({ err }));
};

// fetch user by userId
const findById = (req, res) => {
  const id = req.params.userId;

  User.findAll({ where: { id } })
    .then(user => {
      if (!user.length) {
        return res.json({ msg: 'user not found' })
      }
      res.json({ user })
    })
    .catch(err => res.status(500).json({ err }));
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
    .then(user => res.status(200).json({ user }))
    .catch(err => res.status(500).json({ err }));
};

// delete a user
const deleteUser = (req, res) => {
  const id = req.params.userId;

  User.destroy({ where: { id } })
    .then(() => res.status.json({ msg: 'User has been deleted successfully!' }))
    .catch(err => res.status(500).json({ msg: 'Failed to delete!' }));
};

const verifyUserToken = (req, res) => {
  const authToken = req.headers["authorization"];
  const token = authToken.split(" ")[1];
  // console.log(token)
  jwt.verify(token, "secret", (err, decoded) => {
    // console.log(decoded)
    if (err) {
      return res.json({
        success: false,
        message: "Failed to authenticate token.",
        err,
      });
    }
    const { id } = decoded;
    User.findAll({
      where: { id },
    })
      .then((user) => {
        if (!user.length) {
          return res.json({ success: false, message: "user not found" });
        }
        res.json({
          success: true,
          user: user[0],
        });
      })
      .catch((err) => {
        console.log(err);
        res
          .status(500)
          .json({ success: false, message: "An error occured", err });
      });
  });
};

export {
  create,
  login,
  findAllUsers,
  findById,
  update,
  deleteUser,verifyUserToken
}