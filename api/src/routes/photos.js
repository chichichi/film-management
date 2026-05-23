const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const sharp = require('sharp');

function findFile(dir, baseName) {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir);
  const match = files.find(f => path.parse(f).name === baseName);
  return match ? path.join(dir, match) : null;
}

function createRouter(db, convertedDir, scannedDir) {
  const getConverted = () => convertedDir || process.env.CONVERTED_DIR || '/app/converted';
  const getScanned = () => scannedDir || process.env.SCANNED_DIR || '/app/scanned';

  const router = express.Router();

  const rollInfoStmt = db.prepare(`
    SELECT fr.film_roll_num, fr.film_size, c.camera_name, f.film_name, f.film_type
    FROM film_roll fr
    JOIN camera c ON fr.camera_key = c.key
    JOIN film f ON fr.film_key = f.key
    WHERE fr.key = ?
  `);

  const photosStmt = db.prepare(`
    SELECT ctl_num FROM photos WHERE film_roll_key = ? ORDER BY ctl_num
  `);

  router.get('/thumb/:file', async (req, res) => {
    const { file } = req.params;
    const filePath = findFile(getConverted(), file);
    if (!filePath) return res.status(404).json({ error: 'Not found' });

    const ext = path.extname(filePath).toLowerCase();
    if (['.jpg', '.jpeg'].includes(ext)) {
      return res.sendFile(filePath);
    }

    const thumbDir = path.join(os.tmpdir(), 'film-thumbs');
    fs.mkdirSync(thumbDir, { recursive: true });
    const thumbPath = path.join(thumbDir, `${file}.jpg`);

    if (!fs.existsSync(thumbPath)) {
      await sharp(filePath).resize(600).jpeg({ quality: 80 }).toFile(thumbPath);
    }
    return res.sendFile(thumbPath);
  });

  router.get('/full/:file', (req, res) => {
    const filePath = findFile(getConverted(), req.params.file);
    if (!filePath) return res.status(404).json({ error: 'Not found' });
    res.sendFile(filePath);
  });

  router.get('/raw/:file', (req, res) => {
    const filePath = findFile(getScanned(), req.params.file);
    if (!filePath) return res.status(404).json({ error: 'Not found' });
    res.download(filePath);
  });

  router.get('/roll/:rollId', (req, res) => {
    const roll = rollInfoStmt.get(req.params.rollId);
    if (!roll) return res.status(404).json({ error: 'Not found' });

    const photos = photosStmt.all(req.params.rollId);
    const photoList = photos.map(p => ({
      ctlNum: p.ctl_num,
      baseName: `${roll.film_size}_${roll.camera_name}_${roll.film_name}_${roll.film_type}_${roll.film_roll_num}_${p.ctl_num}`,
    }));

    res.json(photoList);
  });

  return router;
}

module.exports = createRouter;
