'use strict';
const fs = require('fs');
const path = require('path');

function parseFilename(basename) {
  const parts = basename.split('_');
  if (parts.length < 6) return null;
  const filmSize = parseInt(parts[0], 10);
  if (isNaN(filmSize)) return null;
  return {
    film_size: filmSize,
    camera_name: parts[1],
    film_name: parts[2],
    film_type: parts[3],
    film_roll_num: parts[4],
    ctl_num: parseInt(parts[5], 10),
  };
}

function prepareStatements(db) {
  return {
    fileExists:      db.prepare('SELECT 1 FROM file WHERE filename = ?'),
    cameraByName:    db.prepare('SELECT key FROM camera WHERE camera_name = ?'),
    insertCamera:    db.prepare('INSERT INTO camera (camera_name, film_size, camera_manu) VALUES (?, ?, ?)'),
    filmByName:      db.prepare('SELECT key FROM film WHERE film_name = ?'),
    insertFilm:      db.prepare('INSERT INTO film (film_name, film_type, film_size, iso, film_manu) VALUES (?, ?, ?, ?, ?)'),
    rollByNum:       db.prepare('SELECT key FROM film_roll WHERE film_roll_num = ? AND camera_key = ? AND film_key = ?'),
    insertRoll:      db.prepare('INSERT INTO film_roll (camera_key, film_key, film_size, film_roll_num, count) VALUES (?, ?, ?, ?, 0)'),
    insertFile:      db.prepare('INSERT INTO file (filename) VALUES (?)'),
    photoExists:     db.prepare('SELECT 1 FROM photos WHERE film_roll_key = ? AND ctl_num = ?'),
    insertPhoto:     db.prepare('INSERT INTO photos (camera_key, film_key, film_size, film_roll_key, ctl_num) VALUES (?, ?, ?, ?, ?)'),
    updateRollCount: db.prepare('UPDATE film_roll SET count = (SELECT COUNT(*) FROM photos WHERE film_roll_key = film_roll.key) WHERE key = ?'),
  };
}

function syncFile(db, stmts, basename) {
  if (stmts.fileExists.get(basename)) return false;

  const parsed = parseFilename(basename);
  if (!parsed) return false;

  db.transaction(() => {
    let camera = stmts.cameraByName.get(parsed.camera_name);
    if (!camera) {
      stmts.insertCamera.run(parsed.camera_name, parsed.film_size, parsed.camera_name.split(' ')[0]);
      camera = stmts.cameraByName.get(parsed.camera_name);
    }

    let film = stmts.filmByName.get(parsed.film_name);
    if (!film) {
      const nameParts = parsed.film_name.split(' ');
      const iso = parseInt(nameParts[nameParts.length - 1], 10) || 0;
      stmts.insertFilm.run(parsed.film_name, parsed.film_type, parsed.film_size, iso, nameParts[0]);
      film = stmts.filmByName.get(parsed.film_name);
    }

    let roll = stmts.rollByNum.get(parsed.film_roll_num, camera.key, film.key);
    if (!roll) {
      stmts.insertRoll.run(camera.key, film.key, parsed.film_size, parsed.film_roll_num);
      roll = stmts.rollByNum.get(parsed.film_roll_num, camera.key, film.key);
    }

    stmts.insertFile.run(basename);

    if (!stmts.photoExists.get(roll.key, parsed.ctl_num)) {
      stmts.insertPhoto.run(camera.key, film.key, parsed.film_size, roll.key, parsed.ctl_num);
    }

    stmts.updateRollCount.run(roll.key);
  })();

  return true;
}

function scanDir(db, stmts, dir) {
  if (!fs.existsSync(dir)) return 0;
  let added = 0;
  for (const file of fs.readdirSync(dir)) {
    if (file.startsWith('.')) continue;
    const basename = path.parse(file).name;
    try {
      if (syncFile(db, stmts, basename)) {
        console.log(`[watcher] added: ${basename}`);
        added++;
      }
    } catch (err) {
      console.error(`[watcher] error processing ${basename}:`, err.message);
    }
  }
  return added;
}

function startWatcher(db, convertedDir, scannedDir) {
  const intervalMs = parseInt(process.env.SCAN_INTERVAL_MS, 10) || 30_000;
  const stmts = prepareStatements(db);
  const dirs = [convertedDir, scannedDir].filter(Boolean);

  function scan() {
    let total = 0;
    for (const dir of dirs) total += scanDir(db, stmts, dir);
    if (total > 0) console.log(`[watcher] synced ${total} new file(s)`);
  }

  scan();
  setInterval(scan, intervalMs).unref();
}

module.exports = { startWatcher, parseFilename };
