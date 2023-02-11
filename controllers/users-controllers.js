const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const HttpError = require('../models/http-error');
const User = require('../models/user');


const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, '-password');
  } catch (err) {
    const error = new HttpError('No users found.', 500);
    return next(error);
  }

  res.status(200).json({ users: users.map(user => user.toObject({ getters: true })) });
}

const signUp = async (req, res, next) => {
  console.log('DEBUG - signup')

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new HttpError('Invalid inputs', 422);
    return next(error);
  }

  const { name, email, password } = req.body;

  let existingUser;

  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError('Could not access system. Please try again later.', 500);
    return next(error);
  }
  
  if (existingUser) {
    const error = new HttpError('email already in use. Please login', 422);
    return next(error);
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError('Could not create user, please try again.', 500);
    return next(error);
  }

  const createdUser = new User({
    name,
    email,
    password: hashedPassword,
    image: req.file.path,
    places: [],
  });

  try {
    await createdUser.save();
  } catch (err) {
    const error = new HttpError('Failed to create user.', 500);
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      {userId: createdUser.id, email: createdUser.email}, 
      process.env.JWT_KEY, 
      { expiresIn: '1h'}
    );
  } catch (err) {
    const error = new HttpError('Failed to create user.', 500);
    return next(error);  
  }

  res.status(201).json({userId: createdUser.id, email: createdUser.email, token: token});
}


const loginUser = async (req, res, next) => {
  const { email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError('Could not log in. Please try again.', 500);
    return next(error);
  }

  if (!existingUser) {
    const error = new HttpError("Invalid email or password", 403);
    return next(error);
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    const error = new HttpError('Invalid email or password.', 500);
    return next(error);
  }

  if (!isValidPassword) {
    const error = new HttpError('Invalid email or password.', 403);
    return next(error);
  }
  
  let token;
  try {
    token = jwt.sign(
      {userId: existingUser.id, email: existingUser.email}, 
      process.env.JWT_KEY, 
      { expiresIn: '1h'}
    );
  } catch (err) {
    const error = new HttpError('Could not log in. Please try again.', 500);
    return next(error);
  }
  
  res.status(201).json({ userId: existingUser.id, email: existingUser.email, token: token });
}


module.exports =  {
  getUsers,
  signUp,
  loginUser,
}

// todo: add dotenv for api and server secret keys
// todo: make constants for server URL, port?