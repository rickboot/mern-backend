const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const placesControllers = require('../controllers/places-controllers');
const fileUpload = require('../middleware/file-upload');
const checkAuth = require('../middleware/check-auth');

// router.get('/:pid', (req, res, next) => placesControllers.getPlaceById(req, res, next));

// getPlaceById
router.get('/:pid', placesControllers.getPlaceById);

// getPlacesByUserId
router.get('/user/:uid', placesControllers.getPlacesByUserId);

// check authorization token 
router.use(checkAuth);

// createPlace
router.post(
  '/',
  fileUpload.single('image'),
  [ check('title').not().isEmpty(),
    check('description').isLength({ min: 5 }),
    check('address').not().isEmpty() ],
  placesControllers.createPlace
);

//updatePlace
router.patch(
  '/:pid',
  [ check('title').not().isEmpty(),
    check('description').isLength({ min: 5 })],
  placesControllers.updatePlace
);

// deletePlace
router.delete('/:pid', placesControllers.deletePlace);


module.exports = router;
