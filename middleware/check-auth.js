const HttpError = require("../models/http-error");
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  // pass thru pre-flight options requests that browsers send before other http method requests
  if (req.method === 'OPTIONS') return next(); 

  try { // in case no authorization in header
    const token = req.headers.authorization.split(' ')[1]; // authorization: 'Bearer token'

    if (!token) {
      throw new Error('Authentication failed.');
    }

    const decodedToken = jwt.verify(token, process.env.JWT_KEY);
    req.userData = { userId: decodedToken.userId };
    next();
  // if no token in header
  } catch (err) {
    const error = new HttpError('Authentication failed.', 401);
    return next(error);
  }
}

// * tokens can be sent in req body, but not all CRUD operations have a req body
// * other options including query params (someurl?token=fadfasdfasdf) or passing 
// * token in the header