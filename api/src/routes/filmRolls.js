const express = require('express');

function createRouter(db) {
  const router = express.Router();

  const listStmt = db.prepare(`
    SELECT fr.key, c.camera_name, f.film_name, f.film_type,
           fr.film_size, fr.film_roll_num, fr.count
    FROM film_roll fr
    JOIN camera c ON fr.camera_key = c.key
    JOIN film f ON fr.film_key = f.key
    ORDER BY fr.film_roll_num
  `);

  const getStmt = db.prepare(`
    SELECT fr.key, c.camera_name, f.film_name, f.film_type,
           fr.film_size, fr.film_roll_num, fr.count
    FROM film_roll fr
    JOIN camera c ON fr.camera_key = c.key
    JOIN film f ON fr.film_key = f.key
    WHERE fr.key = ?
  `);

  const photosStmt = db.prepare(`
    SELECT ctl_num FROM photos WHERE film_roll_key = ? ORDER BY ctl_num
  `);

  router.get('/', (req, res) => {
    res.json(listStmt.all());
  });

  router.get('/:id', (req, res) => {
    const roll = getStmt.get(req.params.id);
    if (!roll) return res.status(404).json({ error: 'Not found' });
    roll.photos = photosStmt.all(req.params.id);
    res.json(roll);
  });

  return router;
}

module.exports = createRouter;
