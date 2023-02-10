const fs = require('fs');
const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const placesRoutes = require('./routes/places-routes');
const usersRoutes = require('./routes/users-routes');
const HttpError = require('./models/http-error');
const { normalize } = require('path');

const app = express();
const PORT = process.env.PORT;

mongoose.set('strictQuery', false); // stop deprecation warning nag
const mongoUri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ncbdyrf.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`

app.use(bodyParser.json());

app.use('/uploads/images', express.static(path.join('uploads', 'images')));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Headers', 
    'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
  next();
});

app.use('/api/places', placesRoutes);
app.use('/api/users', usersRoutes);

// handle unsuccessful http responses
app.use((req, res, next) => {
  const error = new HttpError("Route not found", 404);
  throw error;
})

// handle errors
app.use((error, req, res, next) => {
  // remove uploaded files, if any 
  if (req.file) {
    fs.unlink(req.file.path, err => console.log(err));
  }
  if (res.headerSent) {
    return next(error);
  }
  res.status(error.code || 500);
  res.json({message: error.message || "Unknown error occurred!"});
});

mongoose
  .connect(mongoUri)
  .then(() => {
    app.listen(PORT, () => console.log("listening on port: " + PORT)) 
  })
  .catch((error) => console.log(error));

