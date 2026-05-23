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
