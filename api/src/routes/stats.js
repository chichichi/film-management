const express = require('express');

function createRouter(db) {
  const router = express.Router();

  const totalsStmt = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM film_roll) as rolls,
      (SELECT COALESCE(SUM(count), 0) FROM film_roll) as shots,
      (SELECT COUNT(*) FROM camera) as cameras,
      (SELECT COUNT(*) FROM film) as films
  `);

  const byCameraStmt = db.prepare(`
    SELECT c.camera_name, COUNT(*) as roll_count, COALESCE(SUM(fr.count), 0) as shot_count
    FROM film_roll fr
    JOIN camera c ON fr.camera_key = c.key
    GROUP BY c.key
    ORDER BY roll_count DESC
  `);

  const byFilmTypeStmt = db.prepare(`
    SELECT f.film_type, COUNT(*) as roll_count, COALESCE(SUM(fr.count), 0) as shot_count
    FROM film_roll fr
    JOIN film f ON fr.film_key = f.key
    GROUP BY f.film_type
    ORDER BY roll_count DESC
  `);

  const byFilmSizeStmt = db.prepare(`
    SELECT fr.film_size, COUNT(*) as roll_count, COALESCE(SUM(fr.count), 0) as shot_count
    FROM film_roll fr
    GROUP BY fr.film_size
    ORDER BY roll_count DESC
  `);

  router.get('/', (req, res) => {
    res.json({
      totals: totalsStmt.get(),
      byCamera: byCameraStmt.all(),
      byFilmType: byFilmTypeStmt.all(),
      byFilmSize: byFilmSizeStmt.all(),
    });
  });

  return router;
}

module.exports = createRouter;
