const Database = require('better-sqlite3');
const { parseFilename, startWatcher } = require('../src/watcher');

function createEmptyDb() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE file (key INTEGER PRIMARY KEY, filename TEXT);
    CREATE TABLE film (key INTEGER PRIMARY KEY, film_name TEXT, film_type TEXT, film_size INT, iso INT, film_manu TEXT);
    CREATE TABLE camera (key INTEGER PRIMARY KEY, camera_name TEXT, film_size INT, camera_manu TEXT);
    CREATE TABLE photos (key INTEGER PRIMARY KEY, camera_key INT, film_key INT, film_size INT, film_roll_key INT, ctl_num INT);
    CREATE TABLE film_roll (key INTEGER PRIMARY KEY, camera_key INT, film_key INT, film_size INT, film_roll_num TEXT NOT NULL, count INT);
  `);
  return db;
}

describe('parseFilename', () => {
  test('parses standard 6-part filename', () => {
    const result = parseFilename('135_Canon 7_Lomography Lady Grey 400_B&W_0023_01');
    expect(result).toEqual({
      film_size: 135,
      camera_name: 'Canon 7',
      film_name: 'Lomography Lady Grey 400',
      film_type: 'B&W',
      film_roll_num: '0023',
      ctl_num: 1,
    });
  });

  test('returns null for too-short filenames', () => {
    expect(parseFilename('135_Canon 7_Film_B&W_001')).toBeNull();
  });

  test('returns null for non-numeric film size', () => {
    expect(parseFilename('abc_Canon 7_Film_B&W_001_01')).toBeNull();
  });
});

describe('startWatcher', () => {
  const os = require('os');
  const fs = require('fs');
  const path = require('path');

  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'watcher-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  function writeFile(dir, name) {
    fs.writeFileSync(path.join(dir, name), '');
  }

  test('inserts camera, film, roll, file, and photo for a new file', () => {
    writeFile(tmpDir, '135_Canon 7_Lomography Lady Grey 400_B&W_0023_01.tif');
    const db = createEmptyDb();
    startWatcher(db, tmpDir, null);

    expect(db.prepare('SELECT * FROM camera WHERE camera_name = ?').get('Canon 7')).toBeTruthy();
    expect(db.prepare('SELECT * FROM film WHERE film_name = ?').get('Lomography Lady Grey 400')).toBeTruthy();
    expect(db.prepare('SELECT * FROM film_roll WHERE film_roll_num = ?').get('0023')).toBeTruthy();
    expect(db.prepare('SELECT * FROM file WHERE filename = ?').get('135_Canon 7_Lomography Lady Grey 400_B&W_0023_01')).toBeTruthy();
    expect(db.prepare('SELECT COUNT(*) as n FROM photos').get().n).toBe(1);
  });

  test('does not duplicate records on repeated scan', () => {
    writeFile(tmpDir, '135_Canon 7_Kodak Gold 200_Color_0010_01.tif');
    writeFile(tmpDir, '135_Canon 7_Kodak Gold 200_Color_0010_02.tif');
    const db = createEmptyDb();
    startWatcher(db, tmpDir, null);
    startWatcher(db, tmpDir, null);

    expect(db.prepare('SELECT COUNT(*) as n FROM camera').get().n).toBe(1);
    expect(db.prepare('SELECT COUNT(*) as n FROM film').get().n).toBe(1);
    expect(db.prepare('SELECT COUNT(*) as n FROM film_roll').get().n).toBe(1);
    expect(db.prepare('SELECT COUNT(*) as n FROM photos').get().n).toBe(2);
    expect(db.prepare('SELECT count FROM film_roll').get().count).toBe(2);
  });

  test('updates roll count correctly', () => {
    writeFile(tmpDir, '120_Hasselblad 500CM_Kodak Ektar 100_Color_F001_01.tif');
    writeFile(tmpDir, '120_Hasselblad 500CM_Kodak Ektar 100_Color_F001_02.tif');
    writeFile(tmpDir, '120_Hasselblad 500CM_Kodak Ektar 100_Color_F001_03.tif');
    const db = createEmptyDb();
    startWatcher(db, tmpDir, null);

    expect(db.prepare('SELECT count FROM film_roll').get().count).toBe(3);
  });

  test('skips files that do not match the naming format', () => {
    writeFile(tmpDir, '.DS_Store');
    writeFile(tmpDir, 'random-file.jpg');
    const db = createEmptyDb();
    startWatcher(db, tmpDir, null);

    expect(db.prepare('SELECT COUNT(*) as n FROM file').get().n).toBe(0);
  });

  test('scans both converted and scanned dirs without duplication', () => {
    const scannedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'watcher-scanned-'));
    try {
      writeFile(tmpDir, '135_Nikon FE_Kodak Tri-X 400_B&W_0005_01.tif');
      writeFile(scannedDir, '135_Nikon FE_Kodak Tri-X 400_B&W_0005_01.tif');
      const db = createEmptyDb();
      startWatcher(db, tmpDir, scannedDir);

      expect(db.prepare('SELECT COUNT(*) as n FROM file').get().n).toBe(1);
      expect(db.prepare('SELECT COUNT(*) as n FROM photos').get().n).toBe(1);
    } finally {
      fs.rmSync(scannedDir, { recursive: true });
    }
  });
});
