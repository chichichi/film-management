const express = require('express');

function createRouter(db) {
  const router = express.Router();

  const listStmt = db.prepare(`SELECT * FROM film ORDER BY film_name`);

  const getStmt = db.prepare(`
    SELECT f.*,
      (SELECT COUNT(*) FROM film_roll WHERE film_key = f.key) as roll_count,
      (SELECT COALESCE(SUM(count), 0) FROM film_roll WHERE film_key = f.key) as total_shots
    FROM film f WHERE f.key = ?
  `);

  const rollsStmt = db.prepare(`
    SELECT fr.key, fr.film_roll_num, fr.film_size, fr.count, c.camera_name
    FROM film_roll fr
    JOIN camera c ON fr.camera_key = c.key
    WHERE fr.film_key = ?
    ORDER BY fr.film_roll_num
  `);

  router.get('/', (req, res) => {
    res.json(listStmt.all());
  });

  router.get('/:id', (req, res) => {
    const film = getStmt.get(req.params.id);
    if (!film) return res.status(404).json({ error: 'Not found' });
    film.rolls = rollsStmt.all(req.params.id);
    res.json(film);
  });

  return router;
}

module.exports = createRouter;
