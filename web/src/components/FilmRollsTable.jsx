import React from 'react';
import { useNavigate } from 'react-router-dom';

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  background: '#fff',
  borderRadius: 8,
  overflow: 'hidden',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
};

const thStyle = {
  textAlign: 'left',
  padding: '10px 16px',
  fontSize: 12,
  fontWeight: 600,
  color: '#666',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  background: '#f9f9f9',
  borderBottom: '1px solid #eee',
};

const tdStyle = {
  padding: '12px 16px',
  borderBottom: '1px solid #f0f0f0',
  fontSize: 14,
};

export default function FilmRollsTable({ rolls }) {
  const navigate = useNavigate();
  return (
    <table style={tableStyle}>
      <thead>
        <tr>
          <th style={thStyle}>Roll #</th>
          <th style={thStyle}>Camera</th>
          <th style={thStyle}>Film</th>
          <th style={thStyle}>Type</th>
          <th style={thStyle}>Size</th>
          <th style={thStyle}>Shots</th>
        </tr>
      </thead>
      <tbody>
        {rolls.map(roll => (
          <tr
            key={roll.key}
            onClick={() => navigate(`/rolls/${roll.key}`)}
            style={{ cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f5f8ff'}
            onMouseLeave={e => e.currentTarget.style.background = ''}
          >
            <td style={tdStyle}>{roll.film_roll_num}</td>
            <td style={tdStyle}>{roll.camera_name}</td>
            <td style={tdStyle}>{roll.film_name}</td>
            <td style={tdStyle}>{roll.film_type}</td>
            <td style={tdStyle}>{roll.film_size}</td>
            <td style={tdStyle}>{roll.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
