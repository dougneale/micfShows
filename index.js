// an express app that displays shows and allows users to add shows to their list
// reference the model and schema from the copilot-node/micfShows/models/show.js'
// app uses handlebars to render contents

// start express app with port
const express = require("express");
const Show = require("./models/show");

const app = express();
const port = process.env.PORT || 3000;

// track logged in user in session
// const session = require("express-session");
// app.use(
//   session({ secret: "keyboard cat", resave: false, saveUninitialized: true })
// );

// start mongodb
const mongoose = require("mongoose");
mongoose.connect("mongodb://localhost/copilot", { useNewUrlParser: true });

const { engine } = require("express-handlebars");
app.engine(
  "handlebars",
  engine({ extname: "hbs", defaultLayout: "", layoutsDir: "" })
);
app.set("view engine", "handlebars");
app.set("views", "./views");

// start server
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

// use bodyparser
const bodyParser = require("body-parser");
const show = require("./models/show");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// add user to database Doug Neale, dougneale@gmail.com as email, with no watched shows
const User = require("./models/user");
// const user = new User({
//   name: "Doug Neale",
//   email: "dougneale@gmail.com",
//   shows: [],
// });
// user.save();

// homepage endpoint that displays a list of shows and the form to add a show
app.get("/", async (req, res) => {
  // fetch shows
  //debug
  console.log(req.body);

  // include list of show types: standup, improv, sketch, other
  const types = ["standup", "improv", "sketch", "other"];

  // login as dougneale@gmail.com
  // fetch user
  const user = await User.findOne()
    .lean()
    .exec({ email: "dougneale@gmail.com" });
  console.log("logged in as", user.email);

  Show.find()
    .lean()
    .exec((err, shows) => {
      // decorate list of shows where seen shows are marked as seen
      console.log(user.shows);
      const decoratedShows = shows.map((show) => {
        const seen = user.shows
          .map((show) => show.toString())
          .includes(show._id.toString());
        return { ...show, seen };
      });
      if (err) {
        console.log(err);
      } else {
        // render homepage
        res.render("main", {
          shows: decoratedShows,
          types: types,
          user: user,
        });
      }
    });
});

// profile page
app.get("/profile", async (req, res) => {
  // fetch user
  const user = await User.findOne()
    .lean()
    .exec({ email: "dougneale@gmail.com" });
  console.log("logged in as", user.email);

  console.log(user);

  // asynchrnously get userShows data from show ids
  const userShows = await Promise.all(
    user.shows.map(async (showId) => {
      console.log(showId.toString());
      const show = await Show.findById(showId.toString()).lean();
      return show;
    })
  );
  console.log(userShows);
  // render profile page
  res.render("profile", { user: user, userShows: userShows });
});

// JSON endpoint to fetch shows with /api/shows
app.get("/api/shows", (req, res) => {
  Show.find()
    .lean()
    .exec({}, (err, shows) => {
      if (err) {
        console.log(err);
      } else {
        res.json(shows);
      }
    });
});

// POST endpoint for adding a show to the database
app.post("/shows", async (req, res) => {
  // debug
  console.log(req.body);

  const show = new Show({
    name: req.body.name,
    artist: req.body.artist,
    venue: req.body.venue,
    type: req.body.type,
  });
  show.save((err) => {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });
});

// PUT endpoint that lets a user edit a specific show with id in the url and redirects to the homepage
app.post("/shows/update", (req, res) => {
  Show.findByIdAndUpdate(req.body.id, {
    name: req.body.name,
    artist: req.body.artist,
    venue: req.body.venue,
    type: req.body.type,
  })
    .lean()
    .exec({}, (err, show) => {
      if (err) {
        console.log(err);
      } else {
        res.redirect("/");
      }
    });
});

// endpoint that lets a user delete a specific show with id in the url
app.post("/shows/:id/delete", (req, res) => {
  // debug
  console.log(req.params.id);

  Show.findByIdAndDelete(req.params.id, (err) => {
    if (err) {
      console.log(err);
    } else {
      // delete reference to show in user
      User.findOneAndUpdate(
        { email: "dougneale@gmail.com" },
        { $pull: { shows: req.params.id } },
        (err) => {
          if (err) {
            console.log(err);
          } else {
            res.redirect("/");
          }
        }
      );
    }
  });
});

// endpoint to add a show to the user's list of shows as 'id/saw' if that show doesn't already exist
app.post("/shows/:id/saw", async (req, res) => {
  // debug
  console.log(req.params.id);

  // fetch user
  const user = await User.findOne().exec({ email: "dougneale@gmail.com" });

  // fetch show and check for error
  const show = await Show.findById(req.params.id).exec({});

  // check if show already exists in user's list of shows
  const found = await user.shows.find((s) => s.equals(show._id));

  // if show doesn't exist, add it to user's list of shows
  if (!found) {
    await user.shows.push(show._id);
    await user.save();
    res.redirect("/");
  } else {
    res.redirect("/");
  }
});

// endpoint to remove a show to the user's list of shows
app.post("/shows/:id/unsee", async (req, res) => {
  // debug
  console.log(req.params.id);

  // fetch user
  const user = await User.findOne().exec({ email: "dougneale@gmail.com" });

  // fetch show and check for error
  const show = await Show.findById(req.params.id).exec({});

  // check if show already exists in user's list of shows
  const found = await user.shows.find((s) => s.equals(show._id));

  // if show exists, remove it from user's list of shows
  if (found) {
    await user.shows.pull(show._id);
    await user.save();
    res.redirect("/profile");
  }
});

// create login page
app.get("/login", (req, res) => {
  res.render("login");
});

// create register page
app.get("/register", (req, res) => {
  res.render("register");
});

// create new user using secure authentication
app.post("/register", async (req, res) => {
  // debug
  console.log(req.body);

  const user = new User({
    email: req.body.email,
    password: req.body.password,
  });
  user.save((err) => {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });
});

// create user authentication flow using email and password
app.post("/login", async (req, res) => {
  // debug
  console.log(req.body);

  // find user with email
  const user = await User.findOne({ email: req.body.email }).exec({});

  // if user exists, check password
  if (user) {
    // check password
    if (user.password === req.body.password) {
      // if password is correct, redirect to profile page
      res.redirect("/");
    } else {
      // if password is incorrect, redirect to login page
      res.redirect("/login");
    }
  } else {
    // if user doesn't exist, redirect to login page
    res.redirect("/login");
  }
});

// other users page
app.get("/users", async (req, res) => {
  // fetch all users
  const users = await User.find().lean().exec({});
  // render users page
  res.render("users", { users: users });
});
