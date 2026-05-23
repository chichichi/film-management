import React from 'react';

const cardStyle = {
  background: '#fff',
  borderRadius: 8,
  padding: '20px 24px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  minWidth: 140,
};

export default function StatCard({ label, value }) {
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 32, fontWeight: 700, color: '#1a1a1a' }}>{value ?? '—'}</div>
      <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{label}</div>
    </div>
  );
}
