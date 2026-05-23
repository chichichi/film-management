import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  background: '#fff',
  borderRadius: 8,
  overflow: 'hidden',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
};

const tdStyle = {
  padding: '12px 16px',
  borderBottom: '1px solid #f0f0f0',
  fontSize: 14,
};

const COLUMNS = [
  { label: 'Roll #',  key: 'film_roll_num' },
  { label: 'Camera',  key: 'camera_name'   },
  { label: 'Film',    key: 'film_name'     },
  { label: 'Type',    key: 'film_type'     },
  { label: 'Size',    key: 'film_size'     },
  { label: 'Shots',   key: 'count'         },
];

function SortIcon({ dir }) {
  return (
    <span style={{ marginLeft: 4, opacity: 0.7 }}>
      {dir === 'asc' ? '↑' : '↓'}
    </span>
  );
}

export default function FilmRollsTable({ rolls }) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState('film_roll_num');
  const [sortDir, setSortDir] = useState('asc');

  function handleSort(key) {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sorted = useMemo(() => {
    return [...rolls].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rolls, sortKey, sortDir]);

  return (
    <table style={tableStyle}>
      <thead>
        <tr>
          {COLUMNS.map(col => (
            <th
              key={col.key}
              onClick={() => handleSort(col.key)}
              style={{
                textAlign: 'left',
                padding: '10px 16px',
                fontSize: 12,
                fontWeight: 600,
                color: sortKey === col.key ? '#2563eb' : '#666',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                background: '#f9f9f9',
                borderBottom: '1px solid #eee',
                cursor: 'pointer',
                userSelect: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {col.label}
              {sortKey === col.key && <SortIcon dir={sortDir} />}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map(roll => (
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
