import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import StatCard from '../components/StatCard';
import { getStats } from '../api';

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2'];

function FilmPieChart({ data, dataKey, nameKey, title }) {
  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#555' }}>{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey={dataKey} nameKey={nameKey} cx="50%" cy="50%" outerRadius={80} label>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getStats().then(setStats).catch(setError);
  }, []);

  if (error) return <p style={{ color: 'red' }}>Failed to load stats.</p>;
  if (!stats) return <p>Loading…</p>;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Dashboard</h1>

      <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
        <StatCard label="Total Rolls" value={stats.totals.rolls} />
        <StatCard label="Total Shots" value={stats.totals.shots} />
        <StatCard label="Cameras" value={stats.totals.cameras} />
        <StatCard label="Film Stocks" value={stats.totals.films} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        <FilmPieChart data={stats.byCamera} dataKey="roll_count" nameKey="camera_name" title="Rolls by Camera" />
        <FilmPieChart data={stats.byCamera} dataKey="shot_count" nameKey="camera_name" title="Shots by Camera" />
        <FilmPieChart data={stats.byFilmType} dataKey="roll_count" nameKey="film_type" title="Rolls by Film Type" />
        <FilmPieChart data={stats.byFilmType} dataKey="shot_count" nameKey="film_type" title="Shots by Film Type" />
        <FilmPieChart data={stats.byFilmSize} dataKey="roll_count" nameKey="film_size" title="Rolls by Film Size" />
        <FilmPieChart data={stats.byFilmSize} dataKey="shot_count" nameKey="film_size" title="Shots by Film Size" />
      </div>
    </div>
  );
}
