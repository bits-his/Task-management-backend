import passportJwt from "passport-jwt";
const JwtStrategy = passportJwt.Strategy;
const ExtractJwt = passportJwt.ExtractJwt;
import models from "../models/index.js";

const Users = models.users;

const opts = {};
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = process.env.JWT_SECRET || "secret";

export default (passport) => {
  passport.use(
    new JwtStrategy(opts, (jwt_payload, done) => {
      Users.findOne({ where: { id: jwt_payload.id } })
        .then((user) => {
          if (user) {
            return done(null, user);
          }
          return done(null, false);
        })
        .catch((err) => console.log(err));
    })
  );
};
