import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [rolls, setRolls] = useState([]);
  const [error, setError] = useState(null);
  const [cameraFilter, setCameraFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');

  const sortKey = searchParams.get('sort') || 'film_roll_num';
  const sortDir = searchParams.get('dir') || 'asc';

  function handleSort(key) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (key === sortKey) {
        next.set('dir', sortDir === 'asc' ? 'desc' : 'asc');
      } else {
        next.set('sort', key);
        next.set('dir', 'asc');
      }
      return next;
    }, { replace: true });
  }

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

      <FilmRollsTable rolls={filtered} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
    </div>
  );
}
