require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

const app = express();

 app.use(express.static("public"));
 app.set('view engine', 'ejs');
 app.use(bodyParser.urlencoded({extended: true}));



mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlParser: true, useUnifiedTopology: true });

const usersSchema = new mongoose.Schema( {
  userName: String,
  password: String
})

usersSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });
const User = new mongoose.model("User", usersSchema);

 app.get("/", function(req,res){
   res.render("home");
 });

 app.get("/login", function(req,res){
   res.render("login");
 });

 app.post("/login", function(req, res){
   User.findOne({userName: req.body.username}, function(err, foundUser){
     if (err) {
       console.log(err);
     }
     else{
       if (foundUser){
         if (req.body.password === foundUser.password){
           res.render("secrets");
         }
         else{
           res.send("Wrong password or username");
         }
       }
       else{
         res.send("Wrong password or username")
       }
     }
   })
 })

 app.get("/register", function(req,res){
   res.render("register");
 });

 app.post("/register", function(req, res){
   const newUser = new User({
     userName: req.body.username,
     password: req.body.password
   })

   User.findOne({userName: req.body.username}, function(err, foundUser){
     if (err) {
       console.log(err);
     } else {
       if (foundUser){
         res.send("You have previously register for this")
         console.log("You have previously register for this")
       }
       else{
        console.log("Saving info")
         newUser.save(function(err){
           if (!err){
             res.render("secrets");
           }
         });
       }
     }
   })
 })

 app.get("/secrets", function(req,res){
   res.render("secrets");
 });

 app.get("/submit", function(req,res){
   res.render("submit");
 });

 app.listen(3000, function(req, res){
   console.log("App is running on port! ");
 });
