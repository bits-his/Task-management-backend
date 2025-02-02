import passport from 'passport';
import config from '../config/config';
import { allowOnly } from '../services/routesHelper';
import {
  create, login, findAllUsers,
  findById, update, deleteUser,
  verifyUserToken,
  updateUser,
  UpdateUserStatus,
  updateUserStatus,
  getJoinUser,
  reactivateUser,
  updateUserStartupStatus,
} from '../controllers/user';
import { upload } from '../config/multerConfig';

module.exports = (app) => {
  // create a new user
  // app.post(
  //   '/api/users/create',
  //   // passport.authenticate('jwt', { session: false }),
  //   // allowOnly(config.accessLevels.admin, create)
  //   create
  // );

  app.post('/api/create_user', upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'ninImage', maxCount: 1 }
  ]), create);

  app.put('/api/users/update/:userId', updateUser);

  app.put('/api/users/:userId/reactivate', reactivateUser);

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
  app.post('/api/users/:userId/update',  updateUserStartupStatus) ;

  app.put('/api/users/:userId/status', updateUserStatus);

  app.get('/api/users/join-user', getJoinUser);
  app.get('/join-user', getJoinUser);

};
