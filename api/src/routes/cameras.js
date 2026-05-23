const express = require('express');

function createRouter(db) {
  const router = express.Router();

  const listStmt = db.prepare(`SELECT * FROM camera ORDER BY camera_name`);

  const getStmt = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM film_roll WHERE camera_key = c.key) as roll_count,
      (SELECT COALESCE(SUM(count), 0) FROM film_roll WHERE camera_key = c.key) as total_shots
    FROM camera c WHERE c.key = ?
  `);

  const rollsStmt = db.prepare(`
    SELECT fr.key, fr.film_roll_num, fr.film_size, fr.count, f.film_name, f.film_type
    FROM film_roll fr
    JOIN film f ON fr.film_key = f.key
    WHERE fr.camera_key = ?
    ORDER BY fr.film_roll_num
  `);

  router.get('/', (req, res) => {
    res.json(listStmt.all());
  });

  router.get('/:id', (req, res) => {
    const camera = getStmt.get(req.params.id);
    if (!camera) return res.status(404).json({ error: 'Not found' });
    camera.rolls = rollsStmt.all(req.params.id);
    res.json(camera);
  });

  return router;
}

module.exports = createRouter;
