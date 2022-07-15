const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

require('dotenv').config()

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });

app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));

const userSchema = new mongoose.Schema({
  username: String,
});

const exerciseSchema = new mongoose.Schema({
  username: String,
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: String,
});

const User = mongoose.model('User', userSchema);

const Exercise = mongoose.model('Exercise', exerciseSchema);

const setDateQuery = (from, to) => {
  const query = {};
  if (from) {
    query['$gte'] = from;
  }
  if (to) {
    query['$lte'] = to;
  }
  return query;
}

const setExerciseQuery = (username, from, to, dateQuery) => {
  const query = { username };
  if (from || to) {
    query.date = dateQuery;
  }
  return query;
}

const getExerciseLogByUser = (req, res, id) => {
  User.findById({ _id: mongoose.Types.ObjectId(id) }, (error, data) => {
    if (error) {
      console.log('error finding user by id', error);
    }
    if (data) {
      const { from, to, limit } = req.query;
      const dateQuery = setDateQuery(from, to);
      const exerciseQuery = setExerciseQuery(data.username, from, to, dateQuery);
      const limitQuery = limit || 0;
      Exercise.find(exerciseQuery)
        .select('description duration date -_id')
        .limit(limitQuery)
        .exec((error, exercises) => {
          if (error) {
            console.log('error retrieving exercise logs', error);
          }
          if (exercises) {
            exercises.forEach((exercise) => {
              exercise.date = new Date(exercise.date).toDateString();
            });
            res.json({
              username: data.username,
              _id: data._id, 
              count: exercises.length,
              log: exercises
            });
          }
        });
    }
  });
}

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get('/api/users', (req, res) => {
  User.find({}, (error, data) => {
    if (error) {
      console.log('error getting all users', error);
    }
    if (data) {
      res.json(data)
    }
  });
});

app.get('/api/users/:_id/logs/:from?/:to?/:limit?', (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;
  if (!_id) {
    res.json({
      error: 'Missing user id'
    });
  }
  if (_id) {
    getExerciseLogByUser(req, res, _id);
  }
});

app.get('/api/users/exercises', (req, res) => {
  res.json({
    error: 'Missing user id'
  });
});

app.post('/api/users/:_id/exercises', (req, res) => {
  const { _id } = req.params;
  const { description, duration } = req.body;
  const date = req.body.date ? req.body.date : new Date().toISOString().split('T')[0];
  User.findById({ _id: mongoose.Types.ObjectId(_id) }, (error, data) => {
    if (data) {
      const newExercise = new Exercise({
        username: data.username,
        description: description,
        date: date,
        duration: duration
      });
      newExercise.save((error, exercise) => {
        if (error) {
          console.log('error saving exercise', error);
        }
        res.json({
          username: data.username,
          _id: data._id,
          description: description,
          date: new Date(date).toDateString(),
          duration: +duration
        });
      });
    }
  });
});

app.post('/api/users', (req, res) => {
  const { username } = req.body;
  User.findOne({ username: username }, (error, data) => {
    if (error) {
      console.log('error checking for existing user', error);
    }
    if (!data) {
      const newUser = new User({
        username: username
      });
      newUser.save((error, user) => {
        res.json({
          username: user.username,
          _id: user._id
        });
      });
    }
    if (data) {
      res.json({
        username: username,
        _id: data._id
      });
    }
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
