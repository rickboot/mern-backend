const fs = require('fs');
const { validationResult } = require('express-validator');
const HttpError = require('../models/http-error');
const getCoordsForAddress = require('../util/location');
const Place = require('../models/place');
const User = require('../models/user');
const mongoose = require('mongoose');


const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError('Could not find place.', 500);
    return next(error);
  }

  if (!place) {
    const error = new HttpError('Could not find a place for provided place id.', 404);
    return next(error);
  }

  res.status(200).json({ place: place.toObject( { getters: true } ) });
}


const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  let places;
  try {
    places = await Place.find({ creator: userId });
  } catch (err) {
    const error = new HttpError('Could not find places for provided user id.', 500);
    return next(error);
  }

  if (!places || places.length === 0) {
    const error = new HttpError('Could not find places for provided user id.', 404);
    return next(error);
  }

  res.status(200).json({ places: places.map(place => place.toObject({ getters: true })) });
}


const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError('Invalid inputs', 422));
  }

  const { title, description, address } = req.body;

  let coordinates;
  try {
    coordinates = await getCoordsForAddress(address);
  } catch (error) {
    return next(error); // return only for exiting function
  }

  const createdPlace = new Place({
    title,
    description,
    image: req.file.path, // provide by file-upload (multer) middleware
    address,
    location: coordinates,
    creator: req.userData.userId,
  });

  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (err) {
    const error = new HttpError('Could not find user.', 500);
    return next(error);
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();

    await createdPlace.save({ session: sess });
    user.places.push(createdPlace);
    await user.save({ session: sess });

    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError('Failed to create place.', 500);
    return next(error);
  }


  if (!user) {
    const error = new HttpError('Could not find user for specified id.', 404);
    return next(error);  
  }

  try {
    await createdPlace.save();
  } catch (err) {
    const error = new HttpError('Failed to create place.s', 500);
    return next(error);
  }

  res.status(201).json({ place: createdPlace.toObject({ getters: true }) });
}


const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new HttpError('Invalid inputs.', 422);
    return next(error);
  }

  const { title, description } = req.body;
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError('Failed to find place.', 500);
    return next(error);
  }

  // creator is an mongoose object so we need to convert to string
  if (place.creator.toString() !== req.userData.userId) {
    const error = new HttpError('You are not allowed to modify this place.', 401);
    return next(error);
  }

  place.title = title;
  place.description = description;
  
  try {
    place.save();
  } catch (err) {
    const error = new HttpError('Failed to update place.', 500);
    return next(error);
  }

  res.status(201).json({ place: place.toObject({ getter: true }) });
}


const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId).populate('creator');
  } catch (err) {
    const error = new HttpError('Place not found for that ID.', 500);
    return next(error);
  }

  if (!place) {
    const error = new HttpError('Could not find place for provided user id.', 404);
    return next(error);
  }

  // creator is a fully populated user object so id is accessible as a string
  if (place.creator.id !== req.userData.userId) {
    const error = new HttpError('You are not allowed to delete this place.', 401);
    return next(error);
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();

    await place.remove({ session: sess });
    place.creator.places.pull(place);
    await place.creator.save({ session: sess });
    sess.commitTransaction();
  } catch (err) {
    const error = new HttpError('Failed to delete place.', 500);
    return next(error);
  }
  
  fs.unlink(place.image, err => console.log(err));
  res.status(200).json({ message: 'Place deleted' });
}


module.exports = {
  getPlaceById,
  getPlacesByUserId,
  createPlace,
  updatePlace,
  deletePlace,
};
