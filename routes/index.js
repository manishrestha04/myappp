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


//Upload Post from user
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


//Upload Profile Picture
router.post('/uploadpp', isLoggedIn, upload.single("image"), async function(req, res, next){
  if(!req.file) {
    return res.status(404).send("no files were give");
  }
  const user = await userModel.findOne({username: req.session.passport.user});
  user.dp = req.file.filename;
  await user.save();
  res.redirect("/profile");
})


//Delete Post
router.get('/delete/:postId', isLoggedIn, async function(req, res, next) {

  const postId = req.params.postId;

  try {

      await postModel.deleteOne({ _id: postId, user:req.user._id})

      req.flash('success', 'Post deleted successfully');

      res.redirect("/profile");

  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});


//Edit Post
router.get("/editpost/:postId", isLoggedIn, async function(req,res){
  const postId = req.params.postId;

  try {

    const post = await postModel.findOne({_id: postId, user: req.user._id})

    if (!post) {
      // Post not found, you might want to handle this case
      return res.status(404).send("Post not found");
    }

    res.render('editpost', {post});
  } catch(error) {
    console.error(error);
    res.sendStatus(500).send("Internal Server Error");
  }
});


//Update Post
router.post('/updatepost/:postId', isLoggedIn, async function(req, res, next) {
  const postId = req.params.postId;
  const updatedContent = req.body.imageText;

  try {
    
    const post = await postModel.findOne({ _id: postId, user: req.user._id });

    if (!post) {
      return res.status(404).send("Post not found");
    }

    post.imageText = updatedContent;
    await post.save();


    req.flash('success', 'Your Post has been updated sucessfully');

    res.redirect("/profile");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});


//Display profile data
router.get('/profile', isLoggedIn, async function(req, res, next) {
  const successMessage = req.flash('success');
  const errorMessage = req.flash('error');
  
  const user = await userModel.findOne({
    username: req.session.passport.user
  })
  .populate("posts");
  res.render("profile",{ success: successMessage, error: errorMessage, user});
});


//Register 
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
