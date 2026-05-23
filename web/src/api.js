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
