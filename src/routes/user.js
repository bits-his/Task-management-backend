import passport from 'passport';
import config from '../config/config';
import { allowOnly } from '../services/routesHelper';
import {
  create, login, findAllUsers,
  findById, update, deleteUser,
  verifyUserToken,
  updateUser,
  UpdateUserStatus
} from '../controllers/user';

module.exports = (app) => {
  // create a new user
  app.post(
    '/api/users/create',
    // passport.authenticate('jwt', { session: false }),
    // allowOnly(config.accessLevels.admin, create)
    create
  );

  app.put('/api/users/update/:userId', updateUser);

  // user login
  app.post('/api/users/login', login);

  //retrieve all users
  app.get(
    '/api/users',
    // passport.authenticate('jwt', {
    //   session: false
    // }),
    // allowOnly(config.accessLevels.admin, findAllUsers)
    findAllUsers
  );

  // retrieve user by id
  app.get(
    '/api/users/:userId',
    passport.authenticate('jwt', {
      session: false,
    }),
    allowOnly(config.accessLevels.admin, findById)
  );

  // update a user with id
  app.put(
    '/api/users/:userId',
    passport.authenticate('jwt', {
      session: false,
    }),
    allowOnly(config.accessLevels.user, update)
  );

  // delete a user
  app.delete(
    '/api/users/:userId',
    passport.authenticate('jwt', {
      session: false,
    }),
    allowOnly(config.accessLevels.admin, deleteUser)
  );

    app.get(`/verify-token`, verifyUserToken);

  app.post('/api/users/:userId/approve', UpdateUserStatus);

};
