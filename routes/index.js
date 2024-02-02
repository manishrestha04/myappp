var express = require('express');
var router = express.Router();
const userModel = require("./users");
const postModel = require("./posts");
const passport = require('passport');
const upload = require('./multer')
const mongoose = require('mongoose');

const localStrategy = require('passport-local');
passport.use(new localStrategy(userModel.authenticate()));


router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/login', function(req, res, next) {
  res.render('login', {error: req.flash('error')});
});


router.post('/upload', isLoggedIn, upload.single("file"), async function(req, res, next){
  if(!req.file) {
    return res.status(404).send("no files were give");
  }
  const user = await userModel.findOne({username: req.session.passport.user});
  const post = await postModel.create({
    image: req.file.filename,
    imageText: req.body.filecaption,
    user: user._id
  })

  user.posts.push(post._id);
  await user.save();
  res.redirect("/profile");
})


router.post('/uploadpp', isLoggedIn, upload.single("image"), async function(req, res, next){
  if(!req.file) {
    return res.status(404).send("no files were give");
  }
  const user = await userModel.findOne({username: req.session.passport.user});
  user.dp = req.file.filename;
  await user.save();
  res.redirect("/profile");
})


router.get('/delete/:postId', isLoggedIn, async function(req, res, next) {
  try {
    const postId = req.params.post._id;


    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).send('Invalid post ID');
    }

    const user = await userModel.findOne({ username: req.session.passport.user });
    const post = await postModel.findById(postId);

    if (!post || !post.user.equals(req.user._id)) {
      return res.status(404).send("Post not found or you don't have permission to delete it");
    }

    user.posts.pull(postId);
    await user.save();

    await post.remove();

    res.redirect("/profile");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});



router.get('/profile', isLoggedIn, async function(req, res, next) {
  const user = await userModel.findOne({
    username: req.session.passport.user
  })
  .populate("posts");
  res.render("profile", {user});
});

router.post('/register',function(req, res){
  const { username, email, fullname} = req.body;
  const userData = new userModel ({username, email, fullname});

  userModel.register(userData, req.body.password)
  .then(function(){
    passport.authenticate("local")(req, res, function(){
      res.redirect("/profile");
    })
  })
})

router.post('/login', passport.authenticate("local", {
  successRedirect: "/profile",
  failureRedirect: "/login",
  failureFlash: true
}), function(req, res) {
})


router.get('/logout', function (req, res, next) {
  req.logout(function(err) {
    if (err) {return next(err);}
    res.redirect("/login");
  });
});

function isLoggedIn(req, res, next){
  if(req.isAuthenticated()) return next();
  res.redirect("/login");
}


module.exports = router;
