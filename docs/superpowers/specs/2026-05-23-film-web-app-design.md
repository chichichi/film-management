# Film Photography Tracker — Web App Design

**Date:** 2026-05-23  
**Phase:** Phase 1 (dashboard + viewer, read-only); Phase 2 (full CRUD management)

## Overview

Convert the existing Python terminal app into a web app hosted on a Synology NAS. The app tracks film photography data (cameras, film stocks, rolls, individual shots) stored in a SQLite database, and serves a photo viewer for scanned/converted negatives. All data lives on the NAS; the web app reads it.

## Architecture

Two Docker containers managed by `docker-compose.yml`, deployed on the Synology NAS:

```
[Browser] → [React SPA : port 3000]
                    ↓
            [Express API : port 4000]
                    ↓
            [film.db (SQLite)]  +  [/volume1/homes/mitchi.eala/film/]
```

- **`api` container** — Node.js + Express. Reads `film.db` via `better-sqlite3`. Serves photo files and generates/caches thumbnails using `sharp`. Mounts the NAS film folder.
- **`web` container** — Vite-built React SPA served by nginx. API calls proxied via nginx to avoid CORS issues. Accessible at `http://nas-ip:3000` from any device on the local network.
- No authentication — local network only.

### NAS Volume Mounts

```
/volume1/homes/mitchi.eala/film/film.db       → database (read-write, for Python ingestion scripts)
/volume1/homes/mitchi.eala/film/scanned/      → RAW negatives (read-only)
/volume1/homes/mitchi.eala/film/converted/    → converted positives (read-only)
```

### docker-compose.yml (on NAS at `/volume1/homes/mitchi.eala/film/`)

```yaml
services:
  api:
    build: ./api
    volumes:
      - ./film.db:/app/film.db
      - ./scanned:/app/scanned:ro
      - ./converted:/app/converted:ro
    ports:
      - "4000:4000"

  web:
    build: ./web
    ports:
      - "3000:3000"
    depends_on:
      - api
```

## Data Layer

The existing SQLite schema (`film.db`) is used as-is. No migration. The Python ingestion scripts (`db_connect.py`, `org_film.py`) continue to populate the DB by scanning the NAS; the web app only reads in Phase 1.

**Tables (existing):** `file`, `film`, `camera`, `photos`, `film_roll`

## API Endpoints

All read-only in Phase 1.

```
GET /api/film-rolls          — all rolls (joined: camera name, film name, type, size, shot count)
GET /api/film-rolls/:id      — single roll + its photos
GET /api/cameras             — all cameras
GET /api/cameras/:id         — single camera + its rolls
GET /api/films               — all film stocks
GET /api/films/:id           — single film stock + its rolls
GET /api/stats               — aggregate data for dashboard charts
                               (rolls + shots by camera, by film type, by film size)

GET /api/photos/:rollId      — list of photo filenames for a roll
GET /api/photos/thumb/:file  — thumbnail: JPEGs from converted/ served directly;
                               TIFFs get a sharp-generated thumb cached in container at /tmp/thumbs/
GET /api/photos/full/:file   — full-res positive from converted/
GET /api/photos/raw/:file    — original RAW negative from scanned/ (download)
```

## Frontend Structure

React SPA with a top navbar. Four main views:

### Dashboard (`/`)
- Summary stat cards: total rolls, total shots, number of cameras, number of film stocks
- Pie charts (Recharts): rolls + shots by camera, by film type (B&W / Color / Reversal), by film size (135 / 120)
- Mirrors what `update_excel.py` currently generates, but interactive

### Film Rolls (`/rolls`)
- Filterable table of all rolls
- Filters: camera, film type, film size
- Click a row to navigate to roll detail

### Roll Detail (`/rolls/:id`)
- Roll metadata: camera, film, size, shot count
- Photo grid of all converted positives for the roll
- Click a photo → full-screen lightbox viewer
- Each photo has a download button for the original RAW negative from `scanned/`

### Cameras (`/cameras`, `/cameras/:id`)
- List of all cameras
- Detail page shows all rolls shot with that camera

### Films (`/films`, `/films/:id`)
- List of all film stocks
- Detail page shows all rolls shot with that film stock

## Project Folder Layout (Development on Mac)

```
/Documents/projects/film/
  film.db                    ← existing (move to NAS for production)
  api/                       ← new: Express backend
    src/
      index.js
      routes/
      db.js
    Dockerfile
    package.json
  web/                       ← new: React frontend
    src/
      pages/
      components/
    nginx.conf
    Dockerfile
    package.json
  docker-compose.yml         ← new
  constants.py               ← existing (ingestion)
  db_connect.py              ← existing (ingestion)
  film_db.py                 ← existing (ingestion)
  org_film.py                ← existing (ingestion)
  update_excel.py            ← existing (ingestion)
```

## Phase 2 (Future)

Add write endpoints and UI for:
- Adding / editing cameras
- Adding / editing film stocks
- Adding / editing film rolls manually (for rolls not yet scanned)
