import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { HomePage } from './pages/Home';
import { SearchPage } from './pages/Search';
import { JamPage } from './pages/Jam';
import { LibraryPage } from './pages/Library';
import { AuthPage } from './components/auth/AuthPage';
import { JamRoom } from './components/jam/JamRoom';
import { useAuthStore } from './stores/authStore';
import { usePlayerStore } from './stores/playerStore';
import { useQueueStore } from './stores/queueStore';

export default function App() {
  const { initialize } = useAuthStore();
  const playerTogglePlay = usePlayerStore((s) => s.togglePlay);
  const playerSetVolume = usePlayerStore((s) => s.setVolume);
  const queueNext = useQueueStore((s) => s.next);
  const queuePrevious = useQueueStore((s) => s.previous);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          playerTogglePlay();
          break;
        case 'ArrowRight':
          if (e.shiftKey) queueNext();
          break;
        case 'ArrowLeft':
          if (e.shiftKey) queuePrevious();
          break;
        case 'ArrowUp':
          if (e.shiftKey) {
            e.preventDefault();
            const vol = Math.min(1, usePlayerStore.getState().volume + 0.1);
            playerSetVolume(vol);
          }
          break;
        case 'ArrowDown':
          if (e.shiftKey) {
            e.preventDefault();
            const vol = Math.max(0, usePlayerStore.getState().volume - 0.1);
            playerSetVolume(vol);
          }
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#262119',
            color: '#e4dcd2',
            border: '1px solid #4a3f33',
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: 'Figtree, system-ui, sans-serif',
          },
        }}
      />
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/jam" element={<JamPage />} />
          <Route path="/jam/:code" element={<JamRoom />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/login" element={<AuthPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
