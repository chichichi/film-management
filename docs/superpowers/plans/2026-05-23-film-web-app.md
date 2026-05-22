# Film Photography Web App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Node.js/React web app that reads the existing `film.db` SQLite database and serves scanned film photo files, hosted on a Synology NAS via Docker.

**Architecture:** Express REST API wraps `film.db` via `better-sqlite3` and serves photos from NAS-mounted directories. React SPA built with Vite is served by nginx which proxies `/api/*` to the Express container. Both containers are managed by `docker-compose.yml` on the NAS.

**Tech Stack:** Node.js 20, Express 4, better-sqlite3, sharp, cors — React 18, React Router 6, Recharts, Vite 5 — Jest, Supertest, Vitest, React Testing Library — Docker, nginx

---

## Existing SQLite Schema (reference — do not modify)

```
file       (key, filename)
film       (key, film_name, film_type, film_size, iso, film_manu)
camera     (key, camera_name, film_size, camera_manu)
photos     (key, camera_key, film_key, film_size, film_roll_key, ctl_num)
film_roll  (key, camera_key, film_key, film_size, film_roll_num, count)
```

Photo filename format (base, no extension): `{film_size}_{camera_name}_{film_name}_{film_type}_{film_roll_num}_{ctl_num}`

Example: `135_PentaxK1000_Kodak400_Color_R001_1`

---

## File Structure

```
film/
├── api/
│   ├── src/
│   │   ├── index.js                # Express app, middleware, route wiring
│   │   ├── db.js                   # better-sqlite3 connection factory
│   │   └── routes/
│   │       ├── filmRolls.js        # GET /api/film-rolls, /api/film-rolls/:id
│   │       ├── cameras.js          # GET /api/cameras, /api/cameras/:id
│   │       ├── films.js            # GET /api/films, /api/films/:id
│   │       ├── stats.js            # GET /api/stats
│   │       └── photos.js           # GET /api/photos/roll/:rollId, /thumb/:file, /full/:file, /raw/:file
│   ├── tests/
│   │   ├── helpers/
│   │   │   └── testDb.js           # in-memory SQLite with seeded test data
│   │   ├── filmRolls.test.js
│   │   ├── cameras.test.js
│   │   ├── films.test.js
│   │   ├── stats.test.js
│   │   └── photos.test.js
│   ├── package.json
│   └── Dockerfile
├── web/
│   ├── src/
│   │   ├── main.jsx                # React entry, mounts App
│   │   ├── App.jsx                 # BrowserRouter + route definitions
│   │   ├── api.js                  # fetch helpers for all endpoints
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── StatCard.jsx
│   │   │   ├── FilmRollsTable.jsx
│   │   │   ├── PhotoGrid.jsx
│   │   │   └── Lightbox.jsx
│   │   └── pages/
│   │       ├── Dashboard.jsx
│   │       ├── FilmRolls.jsx
│   │       ├── RollDetail.jsx
│   │       ├── Cameras.jsx
│   │       ├── CameraDetail.jsx
│   │       ├── Films.jsx
│   │       └── FilmDetail.jsx
│   ├── nginx.conf
│   ├── vite.config.js
│   ├── package.json
│   └── Dockerfile
└── docker-compose.yml
```

---

## Task 1: API project scaffold

**Files:**
- Create: `api/package.json`
- Create: `api/src/index.js` (empty entry point placeholder — wired fully in Task 8)

- [ ] **Step 1: Create the api/ directory and package.json**

```bash
mkdir -p api/src/routes api/tests/helpers
```

Create `api/package.json`:

```json
{
  "name": "film-api",
  "version": "1.0.0",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "test": "jest --runInBand"
  },
  "dependencies": {
    "better-sqlite3": "^9.6.0",
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "sharp": "^0.33.4"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^7.0.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
cd api && npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 3: Create stub entry point**

Create `api/src/index.js`:

```js
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API listening on port ${PORT}`));

module.exports = app;
```

- [ ] **Step 4: Verify it starts**

```bash
cd api && node src/index.js
```

Expected: `API listening on port 4000` — then Ctrl-C.

- [ ] **Step 5: Commit**

```bash
git add api/package.json api/package-lock.json api/src/index.js
git commit -m "feat: scaffold api package"
```

---

## Task 2: DB connection module

**Files:**
- Create: `api/src/db.js`

- [ ] **Step 1: Create db.js**

Create `api/src/db.js`:

```js
const Database = require('better-sqlite3');

function openDb(path) {
  return new Database(path, { readonly: false });
}

module.exports = openDb;
```

- [ ] **Step 2: Create the test helper with seeded in-memory DB**

Create `api/tests/helpers/testDb.js`:

```js
const Database = require('better-sqlite3');

function createTestDb() {
  const db = new Database(':memory:');

  db.exec(`
    CREATE TABLE file (key INTEGER PRIMARY KEY, filename TEXT);
    CREATE TABLE film (key INTEGER PRIMARY KEY, film_name TEXT, film_type TEXT, film_size INT, iso INT, film_manu TEXT);
    CREATE TABLE camera (key INTEGER PRIMARY KEY, camera_name TEXT, film_size INT, camera_manu TEXT);
    CREATE TABLE photos (key INTEGER PRIMARY KEY, camera_key INT, film_key INT, film_size INT, film_roll_key INT, ctl_num INT,
      FOREIGN KEY(camera_key) REFERENCES camera(key),
      FOREIGN KEY(film_key) REFERENCES film(key),
      FOREIGN KEY(film_roll_key) REFERENCES film_roll(key));
    CREATE TABLE film_roll (key INTEGER PRIMARY KEY, camera_key INT, film_key INT, film_size INT, film_roll_num TEXT NOT NULL, count INT,
      FOREIGN KEY(camera_key) REFERENCES camera(key),
      FOREIGN KEY(film_key) REFERENCES film(key));
  `);

  db.exec(`
    INSERT INTO camera VALUES (1, 'PentaxK1000', 135, 'Pentax');
    INSERT INTO camera VALUES (2, 'RolleiflexT', 120, 'Rollei');
    INSERT INTO film VALUES (1, 'Kodak400', 'Color', 135, 400, 'Kodak');
    INSERT INTO film VALUES (2, 'IlfordHP5', 'B&W', 135, 400, 'Ilford');
    INSERT INTO film VALUES (3, 'FujiPro400H', 'Color', 120, 400, 'Fuji');
    INSERT INTO film_roll VALUES (1, 1, 1, 135, 'R001', 2);
    INSERT INTO film_roll VALUES (2, 1, 2, 135, 'R002', 1);
    INSERT INTO film_roll VALUES (3, 2, 3, 120, 'R003', 1);
    INSERT INTO photos VALUES (1, 1, 1, 135, 1, 1);
    INSERT INTO photos VALUES (2, 1, 1, 135, 1, 2);
    INSERT INTO photos VALUES (3, 1, 2, 135, 2, 1);
    INSERT INTO photos VALUES (4, 2, 3, 120, 3, 1);
    INSERT INTO file VALUES (1, '135_PentaxK1000_Kodak400_Color_R001_1');
    INSERT INTO file VALUES (2, '135_PentaxK1000_Kodak400_Color_R001_2');
    INSERT INTO file VALUES (3, '135_PentaxK1000_IlfordHP5_B&W_R002_1');
    INSERT INTO file VALUES (4, '120_RolleiflexT_FujiPro400H_Color_R003_1');
  `);

  return db;
}

module.exports = { createTestDb };
```

- [ ] **Step 3: Commit**

```bash
git add api/src/db.js api/tests/helpers/testDb.js
git commit -m "feat: add db connection module and test helper"
```

---

## Task 3: Film rolls route

**Files:**
- Create: `api/src/routes/filmRolls.js`
- Create: `api/tests/filmRolls.test.js`

- [ ] **Step 1: Write the failing tests**

Create `api/tests/filmRolls.test.js`:

```js
const express = require('express');
const request = require('supertest');
const { createTestDb } = require('./helpers/testDb');
const createFilmRollsRouter = require('../src/routes/filmRolls');

let app;
beforeAll(() => {
  const db = createTestDb();
  app = express();
  app.use(express.json());
  app.use('/api/film-rolls', createFilmRollsRouter(db));
});

test('GET /api/film-rolls returns all rolls with joined camera and film info', async () => {
  const res = await request(app).get('/api/film-rolls');
  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(3);
  expect(res.body[0]).toMatchObject({
    key: expect.any(Number),
    camera_name: expect.any(String),
    film_name: expect.any(String),
    film_type: expect.any(String),
    film_size: expect.any(Number),
    film_roll_num: expect.any(String),
    count: expect.any(Number),
  });
});

test('GET /api/film-rolls/:id returns single roll', async () => {
  const res = await request(app).get('/api/film-rolls/1');
  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({
    key: 1,
    camera_name: 'PentaxK1000',
    film_name: 'Kodak400',
    film_type: 'Color',
    film_size: 135,
    film_roll_num: 'R001',
    count: 2,
    photos: expect.arrayContaining([{ ctl_num: 1 }, { ctl_num: 2 }]),
  });
});

test('GET /api/film-rolls/:id returns 404 for unknown id', async () => {
  const res = await request(app).get('/api/film-rolls/999');
  expect(res.status).toBe(404);
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd api && npm test -- --testPathPattern=filmRolls
```

Expected: FAIL — `Cannot find module '../src/routes/filmRolls'`

- [ ] **Step 3: Implement filmRolls.js**

Create `api/src/routes/filmRolls.js`:

```js
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd api && npm test -- --testPathPattern=filmRolls
```

Expected: PASS — 3 tests passed.

- [ ] **Step 5: Commit**

```bash
git add api/src/routes/filmRolls.js api/tests/filmRolls.test.js
git commit -m "feat: add film-rolls API route"
```

---

## Task 4: Cameras route

**Files:**
- Create: `api/src/routes/cameras.js`
- Create: `api/tests/cameras.test.js`

- [ ] **Step 1: Write failing tests**

Create `api/tests/cameras.test.js`:

```js
const express = require('express');
const request = require('supertest');
const { createTestDb } = require('./helpers/testDb');
const createCamerasRouter = require('../src/routes/cameras');

let app;
beforeAll(() => {
  const db = createTestDb();
  app = express();
  app.use(express.json());
  app.use('/api/cameras', createCamerasRouter(db));
});

test('GET /api/cameras returns all cameras', async () => {
  const res = await request(app).get('/api/cameras');
  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(2);
  expect(res.body[0]).toMatchObject({
    key: expect.any(Number),
    camera_name: expect.any(String),
    film_size: expect.any(Number),
    camera_manu: expect.any(String),
  });
});

test('GET /api/cameras/:id returns camera with its rolls', async () => {
  const res = await request(app).get('/api/cameras/1');
  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({
    key: 1,
    camera_name: 'PentaxK1000',
    film_size: 135,
    roll_count: 2,
    total_shots: 3,
    rolls: expect.arrayContaining([
      expect.objectContaining({ film_roll_num: 'R001' }),
    ]),
  });
});

test('GET /api/cameras/:id returns 404 for unknown id', async () => {
  const res = await request(app).get('/api/cameras/999');
  expect(res.status).toBe(404);
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd api && npm test -- --testPathPattern=cameras
```

Expected: FAIL — `Cannot find module '../src/routes/cameras'`

- [ ] **Step 3: Implement cameras.js**

Create `api/src/routes/cameras.js`:

```js
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
```

- [ ] **Step 4: Run tests**

```bash
cd api && npm test -- --testPathPattern=cameras
```

Expected: PASS — 3 tests passed.

- [ ] **Step 5: Commit**

```bash
git add api/src/routes/cameras.js api/tests/cameras.test.js
git commit -m "feat: add cameras API route"
```

---

## Task 5: Films route

**Files:**
- Create: `api/src/routes/films.js`
- Create: `api/tests/films.test.js`

- [ ] **Step 1: Write failing tests**

Create `api/tests/films.test.js`:

```js
const express = require('express');
const request = require('supertest');
const { createTestDb } = require('./helpers/testDb');
const createFilmsRouter = require('../src/routes/films');

let app;
beforeAll(() => {
  const db = createTestDb();
  app = express();
  app.use(express.json());
  app.use('/api/films', createFilmsRouter(db));
});

test('GET /api/films returns all film stocks', async () => {
  const res = await request(app).get('/api/films');
  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(3);
  expect(res.body[0]).toMatchObject({
    key: expect.any(Number),
    film_name: expect.any(String),
    film_type: expect.any(String),
    film_size: expect.any(Number),
    iso: expect.any(Number),
    film_manu: expect.any(String),
  });
});

test('GET /api/films/:id returns film stock with its rolls', async () => {
  const res = await request(app).get('/api/films/1');
  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({
    key: 1,
    film_name: 'Kodak400',
    film_type: 'Color',
    roll_count: 1,
    total_shots: 2,
    rolls: expect.arrayContaining([
      expect.objectContaining({ film_roll_num: 'R001', camera_name: 'PentaxK1000' }),
    ]),
  });
});

test('GET /api/films/:id returns 404 for unknown id', async () => {
  const res = await request(app).get('/api/films/999');
  expect(res.status).toBe(404);
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd api && npm test -- --testPathPattern=films
```

Expected: FAIL — `Cannot find module '../src/routes/films'`

- [ ] **Step 3: Implement films.js**

Create `api/src/routes/films.js`:

```js
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
```

- [ ] **Step 4: Run tests**

```bash
cd api && npm test -- --testPathPattern=films
```

Expected: PASS — 3 tests passed.

- [ ] **Step 5: Commit**

```bash
git add api/src/routes/films.js api/tests/films.test.js
git commit -m "feat: add films API route"
```

---

## Task 6: Stats route

**Files:**
- Create: `api/src/routes/stats.js`
- Create: `api/tests/stats.test.js`

- [ ] **Step 1: Write failing tests**

Create `api/tests/stats.test.js`:

```js
const express = require('express');
const request = require('supertest');
const { createTestDb } = require('./helpers/testDb');
const createStatsRouter = require('../src/routes/stats');

let app;
beforeAll(() => {
  const db = createTestDb();
  app = express();
  app.use(express.json());
  app.use('/api/stats', createStatsRouter(db));
});

test('GET /api/stats returns aggregate totals and breakdowns', async () => {
  const res = await request(app).get('/api/stats');
  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({
    totals: {
      rolls: 3,
      shots: 4,
      cameras: 2,
      films: 3,
    },
    byCamera: expect.arrayContaining([
      expect.objectContaining({ camera_name: 'PentaxK1000', roll_count: 2, shot_count: 3 }),
    ]),
    byFilmType: expect.arrayContaining([
      expect.objectContaining({ film_type: 'Color', roll_count: 2 }),
      expect.objectContaining({ film_type: 'B&W', roll_count: 1 }),
    ]),
    byFilmSize: expect.arrayContaining([
      expect.objectContaining({ film_size: 135, roll_count: 2 }),
      expect.objectContaining({ film_size: 120, roll_count: 1 }),
    ]),
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd api && npm test -- --testPathPattern=stats
```

Expected: FAIL — `Cannot find module '../src/routes/stats'`

- [ ] **Step 3: Implement stats.js**

Create `api/src/routes/stats.js`:

```js
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
```

- [ ] **Step 4: Run tests**

```bash
cd api && npm test -- --testPathPattern=stats
```

Expected: PASS — 1 test passed.

- [ ] **Step 5: Commit**

```bash
git add api/src/routes/stats.js api/tests/stats.test.js
git commit -m "feat: add stats API route"
```

---

## Task 7: Photos route

**Files:**
- Create: `api/src/routes/photos.js`
- Create: `api/tests/photos.test.js`

- [ ] **Step 1: Write failing tests**

Create `api/tests/photos.test.js`:

```js
const express = require('express');
const request = require('supertest');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { createTestDb } = require('./helpers/testDb');
const createPhotosRouter = require('../src/routes/photos');

let app;
let convertedDir;
let scannedDir;

beforeAll(() => {
  // Create temp dirs with dummy image files
  convertedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'converted-'));
  scannedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scanned-'));

  // Write minimal valid JPEG (smallest possible: 1x1 pixel)
  const jpegBytes = Buffer.from(
    'ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffc0000b08000100010101110003ffc4001f0000010501010101010100000000000000000102030405060708090a0bffda00080101000005021268ffd9',
    'hex'
  );
  fs.writeFileSync(path.join(convertedDir, '135_PentaxK1000_Kodak400_Color_R001_1.jpg'), jpegBytes);
  fs.writeFileSync(path.join(convertedDir, '135_PentaxK1000_Kodak400_Color_R001_2.jpg'), jpegBytes);
  fs.writeFileSync(path.join(scannedDir, '135_PentaxK1000_Kodak400_Color_R001_1.dng'), Buffer.from('RAW'));

  const db = createTestDb();
  app = express();
  app.use(express.json());
  app.use('/api/photos', createPhotosRouter(db, convertedDir, scannedDir));
});

afterAll(() => {
  fs.rmSync(convertedDir, { recursive: true });
  fs.rmSync(scannedDir, { recursive: true });
});

test('GET /api/photos/roll/:rollId returns photo list for a roll', async () => {
  const res = await request(app).get('/api/photos/roll/1');
  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(2);
  expect(res.body[0]).toMatchObject({
    ctlNum: 1,
    baseName: '135_PentaxK1000_Kodak400_Color_R001_1',
  });
});

test('GET /api/photos/roll/:rollId returns 404 for unknown roll', async () => {
  const res = await request(app).get('/api/photos/roll/999');
  expect(res.status).toBe(404);
});

test('GET /api/photos/thumb/:file serves JPEG from converted dir', async () => {
  const res = await request(app).get('/api/photos/thumb/135_PentaxK1000_Kodak400_Color_R001_1');
  expect(res.status).toBe(200);
  expect(res.headers['content-type']).toMatch(/image/);
});

test('GET /api/photos/thumb/:file returns 404 for unknown file', async () => {
  const res = await request(app).get('/api/photos/thumb/does_not_exist');
  expect(res.status).toBe(404);
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd api && npm test -- --testPathPattern=photos
```

Expected: FAIL — `Cannot find module '../src/routes/photos'`

- [ ] **Step 3: Implement photos.js**

Create `api/src/routes/photos.js`:

```js
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
  // Allow env var overrides for Docker; fall back to constructor args
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

  // Specific paths must come before /:rollId
  router.get('/thumb/:file', async (req, res) => {
    const { file } = req.params;
    const filePath = findFile(getConverted(), file);
    if (!filePath) return res.status(404).json({ error: 'Not found' });

    const ext = path.extname(filePath).toLowerCase();
    if (['.jpg', '.jpeg'].includes(ext)) {
      return res.sendFile(filePath);
    }

    // Non-JPEG: generate cached thumbnail with sharp
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
```

- [ ] **Step 4: Run tests**

```bash
cd api && npm test -- --testPathPattern=photos
```

Expected: PASS — 4 tests passed.

- [ ] **Step 5: Commit**

```bash
git add api/src/routes/photos.js api/tests/photos.test.js
git commit -m "feat: add photos API route with thumbnail generation"
```

---

## Task 8: Wire up Express entry point

**Files:**
- Modify: `api/src/index.js`

- [ ] **Step 1: Update index.js to wire all routes**

Replace the contents of `api/src/index.js`:

```js
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
```

- [ ] **Step 2: Verify the API starts and routes respond**

```bash
cd api && DB_PATH=../film.db node src/index.js &
sleep 1
curl http://localhost:4000/api/film-rolls
curl http://localhost:4000/api/stats
kill %1
```

Expected: JSON arrays returned from both endpoints.

- [ ] **Step 3: Run all tests to confirm nothing broke**

```bash
cd api && npm test
```

Expected: PASS — all tests pass.

- [ ] **Step 4: Commit**

```bash
git add api/src/index.js
git commit -m "feat: wire all routes into express entry point"
```

---

## Task 9: Web app scaffold

**Files:**
- Create: `web/package.json`
- Create: `web/vite.config.js`
- Create: `web/index.html`
- Create: `web/src/main.jsx`
- Create: `web/src/App.jsx`
- Create: `web/src/api.js`
- Create: `web/src/components/Navbar.jsx`

- [ ] **Step 1: Create web/package.json**

```bash
mkdir -p web/src/components web/src/pages
```

Create `web/package.json`:

```json
{
  "name": "film-web",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.23.1",
    "recharts": "^2.12.7"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.6",
    "@testing-library/react": "^16.0.0",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^24.1.0",
    "vite": "^5.3.1",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
cd web && npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 3: Create vite.config.js**

Create `web/vite.config.js`:

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.js'],
  },
});
```

- [ ] **Step 4: Create test setup file**

Create `web/src/test-setup.js`:

```js
import '@testing-library/jest-dom';
```

- [ ] **Step 5: Create index.html**

Create `web/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Film Tracker</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: system-ui, -apple-system, sans-serif; background: #f5f5f5; color: #1a1a1a; }
      a { color: inherit; text-decoration: none; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create main.jsx**

Create `web/src/main.jsx`:

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 7: Create App.jsx with all routes**

Create `web/src/App.jsx`:

```jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import FilmRolls from './pages/FilmRolls';
import RollDetail from './pages/RollDetail';
import Cameras from './pages/Cameras';
import CameraDetail from './pages/CameraDetail';
import Films from './pages/Films';
import FilmDetail from './pages/FilmDetail';

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/rolls" element={<FilmRolls />} />
          <Route path="/rolls/:id" element={<RollDetail />} />
          <Route path="/cameras" element={<Cameras />} />
          <Route path="/cameras/:id" element={<CameraDetail />} />
          <Route path="/films" element={<Films />} />
          <Route path="/films/:id" element={<FilmDetail />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
```

- [ ] **Step 8: Create api.js fetch helpers**

Create `web/src/api.js`:

```js
const BASE = '/api';

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

export const getFilmRolls = () => get('/film-rolls');
export const getFilmRoll = (id) => get(`/film-rolls/${id}`);
export const getCameras = () => get('/cameras');
export const getCamera = (id) => get(`/cameras/${id}`);
export const getFilms = () => get('/films');
export const getFilm = (id) => get(`/films/${id}`);
export const getStats = () => get('/stats');
export const getRollPhotos = (rollId) => get(`/photos/roll/${rollId}`);

export const thumbUrl = (baseName) => `${BASE}/photos/thumb/${baseName}`;
export const fullUrl = (baseName) => `${BASE}/photos/full/${baseName}`;
export const rawUrl = (baseName) => `${BASE}/photos/raw/${baseName}`;
```

- [ ] **Step 9: Create Navbar**

Create `web/src/components/Navbar.jsx`:

```jsx
import React from 'react';
import { NavLink } from 'react-router-dom';

const navStyle = {
  background: '#1a1a1a',
  padding: '0 24px',
  display: 'flex',
  alignItems: 'center',
  gap: 24,
  height: 52,
};

const linkStyle = ({ isActive }) => ({
  color: isActive ? '#fff' : '#aaa',
  fontWeight: isActive ? 600 : 400,
  fontSize: 14,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
});

export default function Navbar() {
  return (
    <nav style={navStyle}>
      <span style={{ color: '#fff', fontWeight: 700, marginRight: 16 }}>Film</span>
      <NavLink to="/" end style={linkStyle}>Dashboard</NavLink>
      <NavLink to="/rolls" style={linkStyle}>Rolls</NavLink>
      <NavLink to="/cameras" style={linkStyle}>Cameras</NavLink>
      <NavLink to="/films" style={linkStyle}>Films</NavLink>
    </nav>
  );
}
```

- [ ] **Step 10: Verify dev server starts**

Make sure the API is running (`cd api && DB_PATH=../film.db node src/index.js &`), then:

```bash
cd web && npm run dev
```

Expected: Vite dev server starts at `http://localhost:5173`. Open it — should see the dark navbar with no page content yet (pages are stubs).

- [ ] **Step 11: Commit**

```bash
git add web/
git commit -m "feat: scaffold react web app with routing and api helpers"
```

---

## Task 10: Dashboard page

**Files:**
- Create: `web/src/components/StatCard.jsx`
- Create: `web/src/pages/Dashboard.jsx`

- [ ] **Step 1: Create StatCard component**

Create `web/src/components/StatCard.jsx`:

```jsx
import React from 'react';

const cardStyle = {
  background: '#fff',
  borderRadius: 8,
  padding: '20px 24px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  minWidth: 140,
};

export default function StatCard({ label, value }) {
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 32, fontWeight: 700, color: '#1a1a1a' }}>{value ?? '—'}</div>
      <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{label}</div>
    </div>
  );
}
```

- [ ] **Step 2: Create Dashboard page**

Create `web/src/pages/Dashboard.jsx`:

```jsx
import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import StatCard from '../components/StatCard';
import { getStats } from '../api';

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2'];

function FilmPieChart({ data, dataKey, nameKey, title }) {
  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#555' }}>{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey={dataKey} nameKey={nameKey} cx="50%" cy="50%" outerRadius={80} label>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getStats().then(setStats).catch(setError);
  }, []);

  if (error) return <p style={{ color: 'red' }}>Failed to load stats.</p>;
  if (!stats) return <p>Loading…</p>;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Dashboard</h1>

      <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
        <StatCard label="Total Rolls" value={stats.totals.rolls} />
        <StatCard label="Total Shots" value={stats.totals.shots} />
        <StatCard label="Cameras" value={stats.totals.cameras} />
        <StatCard label="Film Stocks" value={stats.totals.films} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        <FilmPieChart data={stats.byCamera} dataKey="roll_count" nameKey="camera_name" title="Rolls by Camera" />
        <FilmPieChart data={stats.byCamera} dataKey="shot_count" nameKey="camera_name" title="Shots by Camera" />
        <FilmPieChart data={stats.byFilmType} dataKey="roll_count" nameKey="film_type" title="Rolls by Film Type" />
        <FilmPieChart data={stats.byFilmType} dataKey="shot_count" nameKey="film_type" title="Shots by Film Type" />
        <FilmPieChart data={stats.byFilmSize} dataKey="roll_count" nameKey="film_size" title="Rolls by Film Size" />
        <FilmPieChart data={stats.byFilmSize} dataKey="shot_count" nameKey="film_size" title="Shots by Film Size" />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

With the API running and `npm run dev` running:
- Open `http://localhost:5173`
- Should see 4 stat cards and 6 pie charts populated with your film data.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/StatCard.jsx web/src/pages/Dashboard.jsx
git commit -m "feat: add dashboard with stat cards and pie charts"
```

---

## Task 11: Film Rolls list page

**Files:**
- Create: `web/src/components/FilmRollsTable.jsx`
- Create: `web/src/pages/FilmRolls.jsx`

- [ ] **Step 1: Create FilmRollsTable component**

Create `web/src/components/FilmRollsTable.jsx`:

```jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  background: '#fff',
  borderRadius: 8,
  overflow: 'hidden',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
};

const thStyle = {
  textAlign: 'left',
  padding: '10px 16px',
  fontSize: 12,
  fontWeight: 600,
  color: '#666',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  background: '#f9f9f9',
  borderBottom: '1px solid #eee',
};

const tdStyle = {
  padding: '12px 16px',
  borderBottom: '1px solid #f0f0f0',
  fontSize: 14,
};

export default function FilmRollsTable({ rolls }) {
  const navigate = useNavigate();
  return (
    <table style={tableStyle}>
      <thead>
        <tr>
          <th style={thStyle}>Roll #</th>
          <th style={thStyle}>Camera</th>
          <th style={thStyle}>Film</th>
          <th style={thStyle}>Type</th>
          <th style={thStyle}>Size</th>
          <th style={thStyle}>Shots</th>
        </tr>
      </thead>
      <tbody>
        {rolls.map(roll => (
          <tr
            key={roll.key}
            onClick={() => navigate(`/rolls/${roll.key}`)}
            style={{ cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f5f8ff'}
            onMouseLeave={e => e.currentTarget.style.background = ''}
          >
            <td style={tdStyle}>{roll.film_roll_num}</td>
            <td style={tdStyle}>{roll.camera_name}</td>
            <td style={tdStyle}>{roll.film_name}</td>
            <td style={tdStyle}>{roll.film_type}</td>
            <td style={tdStyle}>{roll.film_size}</td>
            <td style={tdStyle}>{roll.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 2: Create FilmRolls page with filters**

Create `web/src/pages/FilmRolls.jsx`:

```jsx
import React, { useEffect, useState, useMemo } from 'react';
import FilmRollsTable from '../components/FilmRollsTable';
import { getFilmRolls } from '../api';

const selectStyle = {
  padding: '6px 10px',
  border: '1px solid #ddd',
  borderRadius: 6,
  fontSize: 14,
  background: '#fff',
};

export default function FilmRolls() {
  const [rolls, setRolls] = useState([]);
  const [error, setError] = useState(null);
  const [cameraFilter, setCameraFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');

  useEffect(() => {
    getFilmRolls().then(setRolls).catch(setError);
  }, []);

  const cameras = useMemo(() => [...new Set(rolls.map(r => r.camera_name))].sort(), [rolls]);
  const types = useMemo(() => [...new Set(rolls.map(r => r.film_type))].sort(), [rolls]);
  const sizes = useMemo(() => [...new Set(rolls.map(r => r.film_size))].sort(), [rolls]);

  const filtered = useMemo(() => rolls.filter(r =>
    (!cameraFilter || r.camera_name === cameraFilter) &&
    (!typeFilter || r.film_type === typeFilter) &&
    (!sizeFilter || String(r.film_size) === sizeFilter)
  ), [rolls, cameraFilter, typeFilter, sizeFilter]);

  if (error) return <p style={{ color: 'red' }}>Failed to load rolls.</p>;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>Film Rolls</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select style={selectStyle} value={cameraFilter} onChange={e => setCameraFilter(e.target.value)}>
          <option value="">All Cameras</option>
          {cameras.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select style={selectStyle} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select style={selectStyle} value={sizeFilter} onChange={e => setSizeFilter(e.target.value)}>
          <option value="">All Sizes</option>
          {sizes.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(cameraFilter || typeFilter || sizeFilter) && (
          <button onClick={() => { setCameraFilter(''); setTypeFilter(''); setSizeFilter(''); }}
            style={{ ...selectStyle, cursor: 'pointer', color: '#666' }}>
            Clear
          </button>
        )}
      </div>

      <FilmRollsTable rolls={filtered} />
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

Open `http://localhost:5173/rolls` — should see a table of all film rolls with working filter dropdowns.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/FilmRollsTable.jsx web/src/pages/FilmRolls.jsx
git commit -m "feat: add film rolls list page with filters"
```

---

## Task 12: Roll Detail page and Photo Grid

**Files:**
- Create: `web/src/components/PhotoGrid.jsx`
- Create: `web/src/pages/RollDetail.jsx`

- [ ] **Step 1: Create PhotoGrid component**

Create `web/src/components/PhotoGrid.jsx`:

```jsx
import React from 'react';
import { thumbUrl } from '../api';

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: 12,
};

const imgWrapStyle = {
  aspectRatio: '3/2',
  overflow: 'hidden',
  borderRadius: 6,
  background: '#ddd',
  cursor: 'pointer',
};

export default function PhotoGrid({ photos, onSelect }) {
  return (
    <div style={gridStyle}>
      {photos.map(photo => (
        <div key={photo.ctlNum} style={imgWrapStyle} onClick={() => onSelect(photo)}>
          <img
            src={thumbUrl(photo.baseName)}
            alt={`Photo ${photo.ctlNum}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create RollDetail page**

Create `web/src/pages/RollDetail.jsx`:

```jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import PhotoGrid from '../components/PhotoGrid';
import Lightbox from '../components/Lightbox';
import { getFilmRoll, getRollPhotos } from '../api';

const metaStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
  gap: 12,
  background: '#fff',
  borderRadius: 8,
  padding: 20,
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  marginBottom: 24,
};

const metaItemStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
};

export default function RollDetail() {
  const { id } = useParams();
  const [roll, setRoll] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([getFilmRoll(id), getRollPhotos(id)])
      .then(([r, p]) => { setRoll(r); setPhotos(p); })
      .catch(setError);
  }, [id]);

  if (error) return <p style={{ color: 'red' }}>Failed to load roll.</p>;
  if (!roll) return <p>Loading…</p>;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Link to="/rolls" style={{ color: '#2563eb', fontSize: 14 }}>← All Rolls</Link>
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>Roll {roll.film_roll_num}</h1>

      <div style={metaStyle}>
        {[
          ['Camera', roll.camera_name],
          ['Film', roll.film_name],
          ['Type', roll.film_type],
          ['Size', `${roll.film_size}mm`],
          ['Shots', roll.count],
        ].map(([label, value]) => (
          <div key={label} style={metaItemStyle}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase' }}>{label}</span>
            <span style={{ fontSize: 15 }}>{value}</span>
          </div>
        ))}
      </div>

      {photos.length === 0
        ? <p style={{ color: '#888' }}>No converted photos found for this roll.</p>
        : <PhotoGrid photos={photos} onSelect={setSelected} />
      }

      {selected && (
        <Lightbox photo={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

Click any roll from `/rolls` — should see the roll metadata card and a photo grid. Photos should load as thumbnails. (If the converted/ directory path isn't set up locally, images will show broken — that's expected until Docker mounts are set up.)

- [ ] **Step 4: Commit**

```bash
git add web/src/components/PhotoGrid.jsx web/src/pages/RollDetail.jsx
git commit -m "feat: add roll detail page with photo grid"
```

---

## Task 13: Lightbox component

**Files:**
- Create: `web/src/components/Lightbox.jsx`

- [ ] **Step 1: Create Lightbox**

Create `web/src/components/Lightbox.jsx`:

```jsx
import React, { useEffect } from 'react';
import { fullUrl, rawUrl } from '../api';

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.9)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const contentStyle = {
  position: 'relative',
  maxWidth: '90vw',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 12,
};

const btnStyle = {
  padding: '6px 14px',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
};

export default function Lightbox({ photo, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={contentStyle} onClick={e => e.stopPropagation()}>
        <img
          src={fullUrl(photo.baseName)}
          alt={`Photo ${photo.ctlNum}`}
          style={{ maxWidth: '85vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 4 }}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <a href={rawUrl(photo.baseName)} download>
            <button style={{ ...btnStyle, background: '#2563eb', color: '#fff' }}>
              Download RAW
            </button>
          </a>
          <button style={{ ...btnStyle, background: '#555', color: '#fff' }} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

On a roll detail page, click a photo thumbnail — should open the lightbox with the full-size image, a Download RAW button, and Escape-to-close.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/Lightbox.jsx
git commit -m "feat: add lightbox with full-size view and raw download"
```

---

## Task 14: Cameras and Films pages

**Files:**
- Create: `web/src/pages/Cameras.jsx`
- Create: `web/src/pages/CameraDetail.jsx`
- Create: `web/src/pages/Films.jsx`
- Create: `web/src/pages/FilmDetail.jsx`

- [ ] **Step 1: Create Cameras list page**

Create `web/src/pages/Cameras.jsx`:

```jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCameras } from '../api';

const cardStyle = {
  background: '#fff',
  borderRadius: 8,
  padding: '16px 20px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  cursor: 'pointer',
  transition: 'box-shadow 0.15s',
};

export default function Cameras() {
  const [cameras, setCameras] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { getCameras().then(setCameras).catch(setError); }, []);

  if (error) return <p style={{ color: 'red' }}>Failed to load cameras.</p>;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>Cameras</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {cameras.map(c => (
          <div key={c.key} style={cardStyle} onClick={() => navigate(`/cameras/${c.key}`)}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{c.camera_name}</div>
            <div style={{ fontSize: 13, color: '#666' }}>{c.film_size}mm · {c.camera_manu}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create CameraDetail page**

Create `web/src/pages/CameraDetail.jsx`:

```jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getCamera } from '../api';

export default function CameraDetail() {
  const { id } = useParams();
  const [camera, setCamera] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { getCamera(id).then(setCamera).catch(setError); }, [id]);

  if (error) return <p style={{ color: 'red' }}>Failed to load camera.</p>;
  if (!camera) return <p>Loading…</p>;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Link to="/cameras" style={{ color: '#2563eb', fontSize: 14 }}>← All Cameras</Link>
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{camera.camera_name}</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>{camera.film_size}mm · {camera.camera_manu} · {camera.roll_count} rolls · {camera.total_shots} shots</p>

      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Rolls</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {camera.rolls.map(roll => (
          <div key={roll.key}
            onClick={() => navigate(`/rolls/${roll.key}`)}
            style={{ background: '#fff', borderRadius: 6, padding: '12px 16px', cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 500 }}>{roll.film_roll_num}</span>
            <span style={{ color: '#666', fontSize: 13 }}>{roll.film_name} · {roll.film_type} · {roll.count} shots</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create Films list page**

Create `web/src/pages/Films.jsx`:

```jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFilms } from '../api';

export default function Films() {
  const [films, setFilms] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { getFilms().then(setFilms).catch(setError); }, []);

  if (error) return <p style={{ color: 'red' }}>Failed to load films.</p>;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>Film Stocks</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {films.map(f => (
          <div key={f.key}
            style={{ background: '#fff', borderRadius: 8, padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)', cursor: 'pointer' }}
            onClick={() => navigate(`/films/${f.key}`)}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{f.film_name}</div>
            <div style={{ fontSize: 13, color: '#666' }}>{f.film_type} · ISO {f.iso} · {f.film_size}mm · {f.film_manu}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create FilmDetail page**

Create `web/src/pages/FilmDetail.jsx`:

```jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getFilm } from '../api';

export default function FilmDetail() {
  const { id } = useParams();
  const [film, setFilm] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { getFilm(id).then(setFilm).catch(setError); }, [id]);

  if (error) return <p style={{ color: 'red' }}>Failed to load film.</p>;
  if (!film) return <p>Loading…</p>;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Link to="/films" style={{ color: '#2563eb', fontSize: 14 }}>← All Films</Link>
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{film.film_name}</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>{film.film_type} · ISO {film.iso} · {film.film_size}mm · {film.film_manu} · {film.roll_count} rolls · {film.total_shots} shots</p>

      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Rolls</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {film.rolls.map(roll => (
          <div key={roll.key}
            onClick={() => navigate(`/rolls/${roll.key}`)}
            style={{ background: '#fff', borderRadius: 6, padding: '12px 16px', cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 500 }}>{roll.film_roll_num}</span>
            <span style={{ color: '#666', fontSize: 13 }}>{roll.camera_name} · {roll.count} shots</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify all pages in browser**

- `http://localhost:5173/cameras` — grid of camera cards
- Click a camera → detail with rolls list, click a roll → roll detail with photos
- `http://localhost:5173/films` — grid of film stock cards
- Click a film → detail with rolls list

- [ ] **Step 6: Commit**

```bash
git add web/src/pages/Cameras.jsx web/src/pages/CameraDetail.jsx web/src/pages/Films.jsx web/src/pages/FilmDetail.jsx
git commit -m "feat: add cameras and films list and detail pages"
```

---

## Task 15: API Dockerfile

**Files:**
- Create: `api/Dockerfile`

- [ ] **Step 1: Create api/Dockerfile**

Create `api/Dockerfile`:

```dockerfile
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

EXPOSE 4000

CMD ["node", "src/index.js"]
```

- [ ] **Step 2: Build and verify**

```bash
cd api && docker build -t film-api .
docker run --rm \
  -e DB_PATH=/app/film.db \
  -v $(pwd)/../film.db:/app/film.db:ro \
  -p 4000:4000 \
  film-api
```

Expected: `API listening on port 4000`. Ctrl-C to stop.

- [ ] **Step 3: Commit**

```bash
git add api/Dockerfile
git commit -m "feat: add api Dockerfile"
```

---

## Task 16: Web Dockerfile and nginx config

**Files:**
- Create: `web/nginx.conf`
- Create: `web/Dockerfile`

- [ ] **Step 1: Create nginx.conf**

Create `web/nginx.conf`:

```nginx
server {
    listen 3000;

    location /api/ {
        proxy_pass http://api:4000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 2: Create web/Dockerfile**

Create `web/Dockerfile`:

```dockerfile
FROM node:20-slim AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 3: Build and verify**

```bash
cd web && docker build -t film-web .
```

Expected: Build completes with no errors.

- [ ] **Step 4: Commit**

```bash
git add web/Dockerfile web/nginx.conf
git commit -m "feat: add web Dockerfile and nginx config"
```

---

## Task 17: docker-compose.yml

**Files:**
- Create: `docker-compose.yml`

- [ ] **Step 1: Create docker-compose.yml**

Create `docker-compose.yml` at the project root (`film/`):

```yaml
services:
  api:
    build: ./api
    restart: unless-stopped
    volumes:
      - ./film.db:/app/film.db
      - ./scanned:/app/scanned:ro
      - ./converted:/app/converted:ro
    environment:
      - DB_PATH=/app/film.db
      - CONVERTED_DIR=/app/converted
      - SCANNED_DIR=/app/scanned
      - PORT=4000
    expose:
      - "4000"

  web:
    build: ./web
    restart: unless-stopped
    ports:
      - "3000:3000"
    depends_on:
      - api
```

- [ ] **Step 2: Build and run the full stack**

From the `film/` directory:

```bash
docker compose build
docker compose up
```

Expected: both containers start, `http://localhost:3000` loads the dashboard.

- [ ] **Step 3: Verify all routes work end-to-end**

With `docker compose up` running:
- `http://localhost:3000` → Dashboard with charts
- `http://localhost:3000/rolls` → Filterable rolls table
- `http://localhost:3000/rolls/1` → Roll detail with photo grid
- `http://localhost:3000/cameras` → Cameras list
- `http://localhost:3000/films` → Films list

- [ ] **Step 4: Deploy to NAS**

Copy the project to the NAS (adjust path as needed):

```bash
rsync -av --exclude node_modules --exclude .git \
  /Users/mitchi.eala/Documents/projects/film/ \
  mitchi.eala@<nas-ip>:/volume1/homes/mitchi.eala/film/
```

SSH into the NAS and start:

```bash
ssh mitchi.eala@<nas-ip>
cd /volume1/homes/mitchi.eala/film
docker compose up -d
```

Expected: App available at `http://<nas-ip>:3000` from any device on your local network.

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: add docker-compose for NAS deployment"
```

---

## Self-Review

**Spec coverage:**
- ✅ Express + React + SQLite (approach A)
- ✅ All API endpoints: `/film-rolls`, `/film-rolls/:id`, `/cameras`, `/cameras/:id`, `/films`, `/films/:id`, `/stats`, `/photos/roll/:rollId`, `/photos/thumb/:file`, `/photos/full/:file`, `/photos/raw/:file`
- ✅ Dashboard with stat cards and 6 pie charts (by camera, film type, film size for both rolls and shots)
- ✅ Film Rolls filterable table
- ✅ Roll Detail with photo grid and lightbox
- ✅ Cameras list + detail
- ✅ Films list + detail
- ✅ Photo viewer: converted positives as thumbnails, full-size in lightbox, RAW download
- ✅ NAS volume mounts: `film.db`, `converted/`, `scanned/`
- ✅ Docker Compose for NAS deployment
- ✅ nginx proxy so frontend and API appear on same origin

**No placeholders found.**

**Type consistency:** `baseName` used consistently in `PhotoGrid`, `Lightbox`, and `api.js` — matches what `photos.js` route returns. `ctlNum` consistent throughout.
