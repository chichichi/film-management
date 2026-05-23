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
