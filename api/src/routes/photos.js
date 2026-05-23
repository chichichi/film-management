const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const sharp = require('sharp');

async function sharpToJpeg(filePath, outPath, { width, quality, negate = false }) {
  const meta = await sharp(filePath).metadata();
  const isFloat = meta.depth === 'float';
  const isSingleChannel = meta.channels === 1;

  if (isFloat && isSingleChannel) {
    const { data, info } = await sharp(filePath)
      .raw({ depth: 'float' })
      .toBuffer({ resolveWithObject: true });
    const floats = new Float32Array(data.buffer, data.byteOffset, data.byteLength / 4);
    const uint8 = Buffer.alloc(floats.length);
    for (let i = 0; i < floats.length; i++) {
      const v = negate ? 1.0 - floats[i] : floats[i];
      uint8[i] = Math.min(255, Math.max(0, Math.round(v * 255)));
    }
    let pipeline = sharp(uint8, { raw: { width: info.width, height: info.height, channels: 1 } });
    if (width) pipeline = pipeline.resize(width);
    await pipeline.jpeg({ quality }).toFile(outPath);
  } else {
    let pipeline = sharp(filePath).pipelineColorspace('srgb');
    if (negate) pipeline = pipeline.negate();
    if (width) pipeline = pipeline.resize(width);
    await pipeline.jpeg({ quality }).toFile(outPath);
  }
}

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

  const fileStmt = db.prepare(`
    SELECT filename FROM file WHERE filename LIKE ? ORDER BY filename
  `);

  router.get('/thumb/:file', async (req, res) => {
    try {
      const { file } = req.params;
      let filePath = findFile(getConverted(), file);
      let negate = false;
      if (!filePath) {
        filePath = findFile(getScanned(), file);
        negate = true;
      }
      if (!filePath) return res.status(404).json({ error: 'Not found' });

      const ext = path.extname(filePath).toLowerCase();
      if (['.jpg', '.jpeg'].includes(ext)) {
        return res.sendFile(filePath);
      }

      const thumbDir = path.join(os.tmpdir(), 'film-thumbs');
      fs.mkdirSync(thumbDir, { recursive: true });
      const thumbPath = path.join(thumbDir, `${file}${negate ? '-neg' : ''}.jpg`);

      if (!fs.existsSync(thumbPath)) {
        await sharpToJpeg(filePath, thumbPath, { width: 600, quality: 85, negate });
      }
      return res.sendFile(thumbPath);
    } catch (err) {
      console.error('thumb error:', err.message);
      res.status(500).json({ error: 'Failed to generate thumbnail' });
    }
  });

  router.get('/full/:file', async (req, res) => {
    try {
      const { file } = req.params;
      let filePath = findFile(getConverted(), file);
      let negate = false;
      if (!filePath) {
        filePath = findFile(getScanned(), file);
        negate = true;
      }
      if (!filePath) return res.status(404).json({ error: 'Not found' });

      const ext = path.extname(filePath).toLowerCase();
      if (['.jpg', '.jpeg'].includes(ext)) {
        return res.sendFile(filePath);
      }

      const fullDir = path.join(os.tmpdir(), 'film-full');
      fs.mkdirSync(fullDir, { recursive: true });
      const fullPath = path.join(fullDir, `${file}${negate ? '-neg' : ''}.jpg`);

      if (!fs.existsSync(fullPath)) {
        await sharpToJpeg(filePath, fullPath, { quality: 92, negate });
      }
      res.sendFile(fullPath);
    } catch (err) {
      console.error('full error:', err.message);
      res.status(500).json({ error: 'Failed to serve image' });
    }
  });

  router.get('/raw/:file', (req, res) => {
    const filePath = findFile(getScanned(), req.params.file);
    if (!filePath) return res.status(404).json({ error: 'Not found' });
    res.download(filePath);
  });

  router.get('/roll/:rollId', (req, res) => {
    const roll = rollInfoStmt.get(req.params.rollId);
    if (!roll) return res.status(404).json({ error: 'Not found' });

    const prefix = `${roll.film_size}_${roll.camera_name}_${roll.film_name}_${roll.film_type}_${roll.film_roll_num}_%`;
    const files = fileStmt.all(prefix);
    if (files.length === 0) return res.status(404).json({ error: 'Not found' });

    const photoList = files.map((f, i) => ({
      ctlNum: i + 1,
      baseName: f.filename,
    }));

    res.json(photoList);
  });

  return router;
}

module.exports = createRouter;
