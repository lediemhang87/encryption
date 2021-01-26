require('dotenv').config()

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');


const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.set('trust proxy', 1)
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false
  }}))

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb+srv://admin-ashley:behang@cluster0.6ivlj.mongodb.net/userDB?retryWrites=true&w=majority',
{useNewUrlParser: true, useUnifiedTopology: true });
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);

const usersSchema = new mongoose.Schema({
  userName: String,
  password: String,
  googleId: String,
  facebookId: String,
  secrets: [ String ]
})

usersSchema.plugin(passportLocalMongoose);
usersSchema.plugin(findOrCreate);


const User = new mongoose.model("User", usersSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) { done(null, user); });
passport.deserializeUser(function(user, done) { done(null, user); });



passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id, userName: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/callback"
  },
  function(accessToken, refreshToken, profile, cb) {

    User.findOrCreate({facebookId: profile.id, userName: profile.id}, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/' }),
  function(req, res) {
    res.redirect('/secrets');
  });
app.get("/", function(req, res) {
  res.render("home");
});

app.get('/auth/facebook', passport.authenticate('facebook'));

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/' }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect('/secrets');
});

app.get("/login", function(req, res) {
  res.render("login");
});

app.post("/login", function(req, res){
  const user = new User({
    userName : req.body.username,
    password : req.body.password
  })

  req.logIn(user, function(err) {
     if (err) {
       console.log(err);
     } else{
       passport.authenticate("local")(req,res,function(){
         res.redirect("/secrets");
       });
     }
   });
});

app.get("/register", function(req, res) {
  res.render("register");
});

app.post("/register", function(req, res) {
  User.register({username:req.body.username, active: false}, req.body.password, function(err, user) {
  if (err) {
    console.log(err.message);
    res.redirect("/register");
  } else {
    passport.authenticate("local")(req,res,function(){
      res.redirect("/secrets");
    });
  }
})
})

app.get("/secrets", function(req,res){

    User.find({'secrets.0': {$exists: true}}, function(err, foundUsers){
    if (err){
      console.log(err);
    } else {
      if (foundUsers){
        console.log(foundUsers.length)
        res.render("secrets", {userWithSecrets: foundUsers});
      }
    }
  });
  // if (req.isAuthenticated()){
  //   res.render("secrets")
  // } else {
  //   console.log(req.isAuthenticated());
  //   res.redirect("/");
  // }
})

app.get("/submit", function(req,res){
  if (req.isAuthenticated()){
    res.render("submit")
  } else {
    res.redirect("/");
  }
})

app.post("/submit", function(req,res){
  const submittedSecret = req.body.secret;
  console.log(submittedSecret);
  console.log(req.user._id);
  console.log(req.user.userName);

  User.findById(req.user._id, function(err, foundUser){
    if (err){
      console.log(err)
    }else{
      // foundUser.secrets = submittedSecret;
      // foundUser.save(function(){
      //   res.redirect("/secrets");
      // })

      User.findByIdAndUpdate(
         req.user._id,
         {$push: {"secrets": submittedSecret}},
         {safe: true, upsert: true, new : true},
         function(err, model) {
           if (err){
             console.log(err);
           } else {
             res.redirect("/secrets");
           }
         }
     );
    }
  })
  // User.findById(req.user._id, function(err, foundUsser){
  //   if (err){
  //     console.log(err)
  //   }else{
  //     foundUser.secrets.push(submittedSecret);
  //     foundUser.save(function(){
  //       res.redirect("/secrets");
  //     })
  //   }
  // })
})

app.get('/logout', function (req, res){
  req.session.destroy(function (err) {
    res.redirect('/'); //Inside a callback… bulletproof!
  });
});

app.get("/submit", function(req, res) {
  res.render("submit");
});

app.listen(process.env.PORT || 3000, function(req, res) {
  console.log("App is running on port! ");
});
