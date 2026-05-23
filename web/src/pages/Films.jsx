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
