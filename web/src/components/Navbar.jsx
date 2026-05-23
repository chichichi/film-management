import React from 'react';
import { NavLink } from 'react-router-dom';

const navStyle = {
  background: '#1a1a1a',
  padding: '0 24px',
  display: 'flex',
  alignItems: 'center',
  gap: 24,
  height: 52,
};

const linkStyle = ({ isActive }) => ({
  color: isActive ? '#fff' : '#aaa',
  fontWeight: isActive ? 600 : 400,
  fontSize: 14,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
});

export default function Navbar() {
  return (
    <nav style={navStyle}>
      <span style={{ color: '#fff', fontWeight: 700, marginRight: 16 }}>Film</span>
      <NavLink to="/" end style={linkStyle}>Dashboard</NavLink>
      <NavLink to="/rolls" style={linkStyle}>Rolls</NavLink>
      <NavLink to="/cameras" style={linkStyle}>Cameras</NavLink>
      <NavLink to="/films" style={linkStyle}>Films</NavLink>
    </nav>
  );
}
