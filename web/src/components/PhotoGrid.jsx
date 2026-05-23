import React from 'react';
import { thumbUrl } from '../api';

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: 12,
};

const imgWrapStyle = {
  aspectRatio: '3/2',
  overflow: 'hidden',
  borderRadius: 6,
  background: '#ddd',
  cursor: 'pointer',
};

export default function PhotoGrid({ photos, onSelect }) {
  return (
    <div style={gridStyle}>
      {photos.map((photo, i) => (
        <div key={photo.ctlNum} style={imgWrapStyle} onClick={() => onSelect(i)}>
          <img
            src={thumbUrl(photo.baseName)}
            alt={`Photo ${photo.ctlNum}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
}
