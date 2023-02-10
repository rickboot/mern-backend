const express = require('express');
const router = express.Router();
const {check} = require('express-validator');
const usersControllers = require('../controllers/users-controllers');
const fileUpload = require('../middleware/file-upload');

// get users
router.get('/', usersControllers.getUsers);

// sign up new user
router.post(
  '/signup', 
  fileUpload.single('image'),
  [
    check('name').not().isEmpty(), 
    check('email').normalizeEmail().isEmail(),
    check('password').isLength({min: 8}),
  ],
usersControllers.signUp);

// login user
router.post('/login', usersControllers.loginUser);


module.exports = router;
