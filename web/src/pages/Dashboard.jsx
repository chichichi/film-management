import React, { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import StatCard from '../components/StatCard';
import { getStats } from '../api';

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2'];

const card = {
  background: '#fff',
  borderRadius: 8,
  padding: '20px 24px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
};

function SectionTitle({ children }) {
  return (
    <h2 style={{ fontSize: 13, fontWeight: 600, color: '#888', textTransform: 'uppercase',
      letterSpacing: '0.06em', marginBottom: 16 }}>
      {children}
    </h2>
  );
}

function CameraBar({ data, dataKey, title }) {
  return (
    <div style={card}>
      <SectionTitle>{title}</SectionTitle>
      <ResponsiveContainer width="100%" height={data.length * 32 + 20}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 32, top: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis type="category" dataKey="camera_name" width={150} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey={dataKey} fill="#2563eb" radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function FilmPie({ data, dataKey, nameKey, title }) {
  return (
    <div style={card}>
      <SectionTitle>{title}</SectionTitle>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} dataKey={dataKey} nameKey={nameKey}
            cx="50%" cy="50%" outerRadius={72} innerRadius={36}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip />
          <Legend iconType="circle" iconSize={10} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { getStats().then(setStats).catch(setError); }, []);

  if (error) return <p style={{ color: 'red' }}>Failed to load stats.</p>;
  if (!stats) return <p>Loading…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Dashboard</h1>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <StatCard label="Total Rolls" value={stats.totals.rolls} />
        <StatCard label="Total Shots" value={stats.totals.shots} />
        <StatCard label="Cameras" value={stats.totals.cameras} />
        <StatCard label="Film Stocks" value={stats.totals.films} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <FilmPie data={stats.byFilmType} dataKey="roll_count" nameKey="film_type" title="Rolls by Film Type" />
        <FilmPie data={stats.byFilmType} dataKey="shot_count" nameKey="film_type" title="Shots by Film Type" />
        <FilmPie data={stats.byFilmSize} dataKey="roll_count" nameKey="film_size" title="Rolls by Film Size" />
        <FilmPie data={stats.byFilmSize} dataKey="shot_count" nameKey="film_size" title="Shots by Film Size" />
      </div>

      <CameraBar data={stats.byCamera} dataKey="roll_count" title="Rolls by Camera" />
      <CameraBar data={stats.byCamera} dataKey="shot_count" title="Shots by Camera" />
    </div>
  );
}
