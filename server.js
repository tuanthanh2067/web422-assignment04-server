const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const { ExtractJwt, Strategy } = require("passport-jwt");
const dotenv = require("dotenv");

dotenv.config();

const userService = require("./user-service.js");

const app = express();

const HTTP_PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(cors());

// add middleware for passportJS
app.use(passport.initialize());
passport.use(
  new Strategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    },
    async function verify(payload, done) {
      if (!payload) {
        return done(null, false);
      }
      let user;
      try {
        user = await userService.byId(payload._id);
      } catch (err) {
        console.log(err);
        return done(null, false);
      }
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    }
  )
);

// create token
function createToken(id, username) {
  const payload = {
    _id: id,
    userName: username,
  };
  const secret = process.env.JWT_SECRET;
  const options = { expiresIn: "3d" };

  return jwt.sign(payload, secret, options);
}

/* TODO Add Your Routes Here */

// user route
app.post("/api/user/register", function (req, res) {
  userService
    .registerUser(req.body)
    .then((mes) => {
      res.status(200).json({ message: mes });
    })
    .catch((err) => {
      res.status(422).json({ message: err });
    });
});

app.post("/api/user/login", function (req, res) {
  userService
    .checkUser(req.body)
    .then((user) => {
      console.log(user);

      res.status(200).json({ token: createToken(user._id, user.userName) });
    })
    .catch((err) => {
      res.status(422).json({ message: err });
    });
});

app.get(
  "/api/user/favourites",
  passport.authenticate("jwt", { session: false }),
  function (req, res) {
    console.log(req.user);
    userService
      .getFavourites(req.user._id)
      .then((fav) => {
        res.status(200).json(fav);
      })
      .catch((err) => {
        res.status(403).json({ message: err });
      });
  }
);

app.put(
  "/api/user/favourites/:id",
  passport.authenticate("jwt", { session: false }),
  function (req, res) {
    userService
      .addFavourite(req.user._id, req.params.id)
      .then((fav) => {
        res.status(200).json(fav);
      })
      .catch((err) => {
        res.status(400).json({ message: err });
      });
  }
);

app.delete(
  "/api/user/favourites/:id",
  passport.authenticate("jwt", { session: false }),
  function (req, res) {
    userService
      .removeFavourite()
      .then((fav) => {
        res.status(200).json(fav);
      })
      .catch((err) => {
        res.status(400).json({ message: err });
      });
  }
);

userService
  .connect()
  .then(() => {
    app.listen(HTTP_PORT, () => {
      console.log("API listening on: " + HTTP_PORT);
    });
  })
  .catch((err) => {
    console.log("unable to start the server: " + err);
    process.exit();
  });
