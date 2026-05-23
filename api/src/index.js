const express = require('express');
const cors = require('cors');
const path = require('path');
const openDb = require('./db');

const createFilmRollsRouter = require('./routes/filmRolls');
const createCamerasRouter = require('./routes/cameras');
const createFilmsRouter = require('./routes/films');
const createStatsRouter = require('./routes/stats');
const createPhotosRouter = require('./routes/photos');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../film.db');
const CONVERTED_DIR = process.env.CONVERTED_DIR || path.join(__dirname, '../../converted');
const SCANNED_DIR = process.env.SCANNED_DIR || path.join(__dirname, '../../scanned');

const db = openDb(DB_PATH);

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/film-rolls', createFilmRollsRouter(db));
app.use('/api/cameras', createCamerasRouter(db));
app.use('/api/films', createFilmsRouter(db));
app.use('/api/stats', createStatsRouter(db));
app.use('/api/photos', createPhotosRouter(db, CONVERTED_DIR, SCANNED_DIR));

if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`API listening on port ${PORT}`));
}

module.exports = app;
