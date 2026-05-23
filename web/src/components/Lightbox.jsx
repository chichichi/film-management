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
