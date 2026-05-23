import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import FilmRolls from './pages/FilmRolls';
import RollDetail from './pages/RollDetail';
import Cameras from './pages/Cameras';
import CameraDetail from './pages/CameraDetail';
import Films from './pages/Films';
import FilmDetail from './pages/FilmDetail';

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/rolls" element={<FilmRolls />} />
          <Route path="/rolls/:id" element={<RollDetail />} />
          <Route path="/cameras" element={<Cameras />} />
          <Route path="/cameras/:id" element={<CameraDetail />} />
          <Route path="/films" element={<Films />} />
          <Route path="/films/:id" element={<FilmDetail />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
