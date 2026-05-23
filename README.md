# Film Management

A self-hosted web app for browsing and managing a film photography archive. Reads an existing SQLite database and serves scanned/converted film negatives from a Synology NAS.

## Overview

```
[Browser] → [React SPA : port 3000]
                   ↓
           [Express API : port 4000]
                   ↓
           [film.db (SQLite)]  +  [/film/converted/]  +  [/film/scanned/]
```

Two Docker containers run on the NAS via `docker-compose`. The API wraps `film.db` with `better-sqlite3` and serves photo files with thumbnail generation via `sharp`. The React SPA is built with Vite and served by nginx, which proxies `/api/*` to the Express container. Accessible at `http://nas-ip:3000` from any device on the local network.

## Features

- **Dashboard** — stat cards (total rolls, shots, cameras, film stocks) with bar charts by camera and donut charts by film type and size
- **Film Rolls** — filterable table of all rolls by camera, film type, and format size
- **Roll Detail** — metadata card + photo grid; click any photo to open the gallery lightbox
- **Gallery Lightbox** — full-size photo viewer with prev/next navigation (arrow keys or buttons), photo counter, and RAW download
- **Cameras & Films** — list and detail pages for cameras and film stocks, each showing their associated rolls
- **New Photo Detector** — on startup and every 30s, the API scans both `converted/` and `scanned/` for new files and automatically inserts any missing camera, film, roll, and photo records into the database

## Photo Serving

- `converted/` — converted positive TIFFs (color-corrected, ready to view). Supports 32-bit float scRGB (3-channel) and grayscale (1-channel) TIFFs via manual float→uint8 scaling.
- `scanned/` — RAW negative TIFFs. Used as a fallback when a converted file doesn't exist yet; served with automatic inversion so B&W negatives appear as positives.
- Non-JPEG files are converted to JPEG on first request and cached in the container's `/tmp`.

## Filename Format

All files must follow this naming convention (underscore-separated, no extension in the database):

```
{film_size}_{camera_name}_{film_name}_{film_type}_{film_roll_num}_{ctl_num}
```

Example: `135_Canon 7_Lomography Lady Grey 400_B&W_0023_01.tif`

## Project Structure

```
film/
├── api/
│   ├── src/
│   │   ├── index.js          # Express entry point
│   │   ├── db.js             # better-sqlite3 connection factory
│   │   ├── watcher.js        # polls converted/ and scanned/ for new files
│   │   └── routes/
│   │       ├── filmRolls.js
│   │       ├── cameras.js
│   │       ├── films.js
│   │       ├── stats.js
│   │       └── photos.js     # thumbnail generation, scanned fallback
│   ├── tests/
│   │   ├── helpers/testDb.js
│   │   ├── watcher.test.js
│   │   └── *.test.js
│   ├── Dockerfile
│   └── package.json
├── web/
│   ├── src/
│   │   ├── api.js
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── Lightbox.jsx  # gallery navigation, arrow keys
│   │   │   ├── PhotoGrid.jsx
│   │   │   ├── FilmRollsTable.jsx
│   │   │   ├── Navbar.jsx
│   │   │   └── StatCard.jsx
│   │   └── pages/
│   │       ├── Dashboard.jsx
│   │       ├── FilmRolls.jsx
│   │       ├── RollDetail.jsx
│   │       ├── Cameras.jsx / CameraDetail.jsx
│   │       └── Films.jsx / FilmDetail.jsx
│   ├── nginx.conf
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── film.db                   # SQLite database (lives on NAS)
├── converted/                # converted positive TIFFs (lives on NAS)
├── scanned/                  # raw negative TIFFs (lives on NAS)
└── constants.py / db_connect.py / film_db.py / org_film.py  # original Python ingestion scripts
```

## Database Schema

```sql
file       (key, filename)
film       (key, film_name, film_type, film_size, iso, film_manu)
camera     (key, camera_name, film_size, camera_manu)
photos     (key, camera_key, film_key, film_size, film_roll_key, ctl_num)
film_roll  (key, camera_key, film_key, film_size, film_roll_num, count)
```

## API Endpoints

```
GET /api/film-rolls              all rolls (joined with camera + film info)
GET /api/film-rolls/:id          single roll with its photos
GET /api/cameras                 all cameras
GET /api/cameras/:id             camera with roll list and shot totals
GET /api/films                   all film stocks
GET /api/films/:id               film stock with roll list
GET /api/stats                   totals + breakdown by camera, film type, film size
GET /api/photos/roll/:rollId     photo list for a roll (basenames from file table)
GET /api/photos/thumb/:file      600px thumbnail JPEG (cached)
GET /api/photos/full/:file       full-resolution JPEG (cached)
GET /api/photos/raw/:file        original RAW negative download from scanned/
```

## Deployment (Synology NAS)

**Prerequisites:** Docker and Docker Compose installed on the NAS (via the Container Manager package).

**1. Copy the project to the NAS**

```bash
rsync -av --exclude node_modules --exclude .git --exclude '*.pyc' \
  /path/to/film/ \
  mitchi.eala@nas-ip:/volume1/homes/mitchi.eala/film/
```

Or mount the NAS share via SMB and copy directly.

**2. Build and start**

SSH into the NAS:

```bash
ssh mitchi.eala@nas-ip
cd /volume1/homes/mitchi.eala/film
sudo docker compose up -d
```

The app will be available at `http://nas-ip:3000`.

**3. Rebuild after code changes**

```bash
sudo docker compose up -d --build api   # API changes
sudo docker compose up -d --build web   # frontend changes
```

**4. View logs**

```bash
sudo docker logs film-api-1 --tail 50
sudo docker logs film-web-1 --tail 50
```

## Configuration

Environment variables for the `api` container (set in `docker-compose.yml`):

| Variable          | Default         | Description                              |
|-------------------|-----------------|------------------------------------------|
| `DB_PATH`         | `/app/film.db`  | Path to SQLite database                  |
| `CONVERTED_DIR`   | `/app/converted`| Directory of converted positive TIFFs    |
| `SCANNED_DIR`     | `/app/scanned`  | Directory of raw negative TIFFs          |
| `PORT`            | `4000`          | API listen port                          |
| `SCAN_INTERVAL_MS`| `30000`         | How often the watcher polls for new files|

## Development

**API**

```bash
cd api
npm install
DB_PATH=../film.db node src/index.js   # start dev server
npm test                                # run all tests
```

**Web**

```bash
cd web
npm install
npm run dev    # Vite dev server at http://localhost:5173 (proxies /api to localhost:4000)
npm run build  # production build
```

## Tech Stack

- **API**: Node.js 20, Express 4, better-sqlite3, sharp, cors
- **Web**: React 18, React Router 6, Recharts, Vite 5
- **Testing**: Jest, Supertest (API) · Vitest, React Testing Library (web)
- **Infrastructure**: Docker, nginx, docker-compose
