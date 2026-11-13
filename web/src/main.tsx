import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './lib/session';
import Landing from './pages/Landing';
import Masuk from './pages/Masuk';
import Belajar from './pages/Belajar';
import Pengenalan from './pages/Pengenalan';
// Halaman yang memuat modul kamera/tutor dipisah supaya landing & login ringan di HP.
const Siapkan = lazy(() => import('./pages/Siapkan'));
const Praktik = lazy(() => import('./pages/Praktik'));
import Selesai from './pages/Selesai';
import './styles.css';

function Perlu({ children }: { children: JSX.Element }) {
  const { config } = useApp();
  const loc = useLocation();
  if (!config) return <main className="page"><p className="muted">Memuat…</p></main>;
  if (!config.user) return <Navigate to={`/masuk?lanjut=${encodeURIComponent(loc.pathname)}`} replace />;
  return children;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <BrowserRouter>
        <Suspense fallback={<main className="page"><p className="muted">Memuat…</p></main>}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/masuk" element={<Masuk />} />
          <Route path="/belajar" element={<Perlu><Belajar /></Perlu>} />
          <Route path="/belajar/:id" element={<Perlu><Pengenalan /></Perlu>} />
          <Route path="/belajar/:id/siapkan" element={<Perlu><Siapkan /></Perlu>} />
          <Route path="/belajar/:id/praktik" element={<Perlu><Praktik /></Perlu>} />
          <Route path="/belajar/:id/selesai" element={<Perlu><Selesai /></Perlu>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </AppProvider>
  </StrictMode>,
);
