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
