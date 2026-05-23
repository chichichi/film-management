import React, { useEffect, useCallback } from 'react';
import { fullUrl, rawUrl } from '../api';

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.92)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const navBtnStyle = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'rgba(255,255,255,0.12)',
  border: 'none',
  color: '#fff',
  fontSize: 28,
  width: 52,
  height: 52,
  borderRadius: '50%',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.15s',
  userSelect: 'none',
};

const actionBtnStyle = {
  padding: '6px 14px',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
};

export default function Lightbox({ photos, index, onClose, onNavigate }) {
  const photo = photos[index];
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  const prev = useCallback(() => { if (hasPrev) onNavigate(index - 1); }, [hasPrev, index, onNavigate]);
  const next = useCallback(() => { if (hasNext) onNavigate(index + 1); }, [hasNext, index, onNavigate]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, prev, next]);

  return (
    <div style={overlayStyle} onClick={onClose}>
      {hasPrev && (
        <button
          style={{ ...navBtnStyle, left: 16 }}
          onClick={e => { e.stopPropagation(); prev(); }}
          aria-label="Previous photo"
        >
          ‹
        </button>
      )}

      <div
        style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
        onClick={e => e.stopPropagation()}
      >
        <img
          key={photo.baseName}
          src={fullUrl(photo.baseName)}
          alt={`Photo ${photo.ctlNum}`}
          style={{ maxWidth: '85vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 4 }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#aaa', fontSize: 13 }}>
            {index + 1} / {photos.length}
          </span>
          <a href={rawUrl(photo.baseName)} download>
            <button style={{ ...actionBtnStyle, background: '#2563eb', color: '#fff' }}>
              Download RAW
            </button>
          </a>
          <button style={{ ...actionBtnStyle, background: '#555', color: '#fff' }} onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {hasNext && (
        <button
          style={{ ...navBtnStyle, right: 16 }}
          onClick={e => { e.stopPropagation(); next(); }}
          aria-label="Next photo"
        >
          ›
        </button>
      )}
    </div>
  );
}
