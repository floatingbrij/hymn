import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { PlayerBar } from '../player/PlayerBar';
import { QueuePanel } from '../queue/QueuePanel';
import { NowPlaying } from '../player/NowPlaying';
import { useState } from 'react';

export function MainLayout() {
  const [queueOpen, setQueueOpen] = useState(false);
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface">
      {/* Sidebar — hidden on mobile */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* pb-32 on mobile for player + nav, pb-20 on desktop for player only */}
        <div className="flex-1 overflow-y-auto px-4 py-4 md:p-6 pb-36 md:pb-24">
          <Outlet />
        </div>
      </main>

      {/* Queue panel */}
      <QueuePanel isOpen={queueOpen} onClose={() => setQueueOpen(false)} />

      {/* Player bar */}
      <PlayerBar
        onQueueToggle={() => setQueueOpen((v) => !v)}
        queueOpen={queueOpen}
        onNowPlayingToggle={() => setNowPlayingOpen((v) => !v)}
      />

      {/* Mobile bottom navigation */}
      <MobileNav />

      {/* Now Playing expanded view */}
      <NowPlaying isOpen={nowPlayingOpen} onClose={() => setNowPlayingOpen(false)} />
    </div>
  );
}
