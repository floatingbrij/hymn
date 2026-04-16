import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  IoAddOutline,
  IoMusicalNotesOutline,
  IoHeartOutline,
  IoTrashOutline,
  IoLogOutOutline,
  IoPlaySharp,
} from 'react-icons/io5';
import { useAuthStore } from '../stores/authStore';
import { useQueueStore } from '../stores/queueStore';
import * as api from '../services/api';
import type { Playlist } from '../types';
import { formatDuration } from '../utils/format';
import toast from 'react-hot-toast';

export function LibraryPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [likedTracks, setLikedTracks] = useState<any[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState<'playlists' | 'liked'>('playlists');
  const [playlistTracks, setPlaylistTracks] = useState<any[]>([]);
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [p, l] = await Promise.all([api.getPlaylists(), api.getLikedTracks()]);
      setPlaylists(p);
      setLikedTracks(l);
    } catch {
      // Not logged in or error
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    try {
      await api.createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setShowCreate(false);
      loadData();
      toast.success('Playlist created');
    } catch {
      toast.error('Failed to create playlist');
    }
  };

  const handleDeletePlaylist = async (id: number) => {
    try {
      await api.deletePlaylist(id);
      loadData();
      if (activePlaylist?.id === id) {
        setActivePlaylist(null);
        setPlaylistTracks([]);
      }
      toast.success('Playlist deleted');
    } catch {
      toast.error('Failed to delete playlist');
    }
  };

  const openPlaylist = async (playlist: Playlist) => {
    setActivePlaylist(playlist);
    try {
      const tracks = await api.getPlaylistTracks(playlist.id);
      setPlaylistTracks(tracks);
    } catch {
      toast.error('Failed to load playlist');
    }
  };

  const playPlaylist = () => {
    if (playlistTracks.length === 0) return;
    const tracks = playlistTracks.map((t: any) => ({
      id: String(t.id),
      videoId: t.video_id,
      title: t.title,
      artist: t.artist,
      thumbnail: t.thumbnail,
      duration: t.duration,
    }));
    useQueueStore.getState().setTracks(tracks);
  };

  const playLikedTrack = (track: any) => {
    useQueueStore.getState().addAndPlay({
      videoId: track.video_id,
      title: track.title,
      artist: track.artist,
      thumbnail: track.thumbnail,
      duration: track.duration,
    });
  };

  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
        className="flex flex-col items-center justify-center min-h-[calc(100vh-180px)] gap-4 text-center px-4"
      >
        <div className="w-20 h-20 rounded-xl bg-surface-200 flex items-center justify-center mb-2">
          <IoMusicalNotesOutline className="text-4xl text-cream-muted" />
        </div>
        <h2 className="font-display text-2xl text-cream">Your Library</h2>
        <p className="text-cream-muted text-sm max-w-xs">Create playlists, like songs, and build your collection. Sign in to get started.</p>
        <button onClick={() => navigate('/login')} className="btn-primary mt-2">
          Sign in
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-cream">Your Library</h1>
          <p className="text-cream-muted text-sm">Signed in as {user.username}</p>
        </div>
        <button onClick={() => { logout(); navigate('/'); }} className="btn-ghost text-sm flex items-center gap-2 text-cream-muted">
          <IoLogOutOutline /> Sign out
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => { setActiveTab('playlists'); setActivePlaylist(null); }}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === 'playlists' ? 'bg-accent text-surface shadow-sm shadow-accent/20' : 'bg-surface-200/60 text-cream-dim hover:text-cream hover:bg-surface-300/60'
          }`}
        >
          Playlists
        </button>
        <button
          onClick={() => { setActiveTab('liked'); setActivePlaylist(null); }}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === 'liked' ? 'bg-accent text-surface shadow-sm shadow-accent/20' : 'bg-surface-200/60 text-cream-dim hover:text-cream hover:bg-surface-300/60'
          }`}
        >
          <IoHeartOutline className="inline mr-1" />
          Liked Songs
        </button>
      </div>

      {/* Content */}
      {activeTab === 'playlists' && !activePlaylist && (
        <div className="space-y-3">
          {/* Create playlist */}
          {showCreate ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Playlist name"
                className="input-field flex-1"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
              />
              <button onClick={handleCreatePlaylist} className="btn-primary">Create</button>
              <button onClick={() => setShowCreate(false)} className="btn-ghost">Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full panel panel-hover rounded-xl p-4 flex items-center gap-3 text-cream-dim"
            >
              <div className="w-12 h-12 rounded-lg bg-surface-300/60 flex items-center justify-center">
                <IoAddOutline className="text-2xl" />
              </div>
              <span className="font-medium">Create new playlist</span>
            </button>
          )}

          {/* Playlist list */}
          {playlists.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05, ease: [0.25, 1, 0.5, 1] }}
              onClick={() => openPlaylist(p)}
              className="panel panel-hover rounded-xl p-4 flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-lg bg-accent/15 flex items-center justify-center">
                <IoMusicalNotesOutline className="text-xl text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-cream font-medium truncate">{p.name}</p>
                <p className="text-cream-muted text-xs">{p.track_count} tracks</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeletePlaylist(p.id); }}
                className="opacity-0 group-hover:opacity-100 text-cream-muted hover:text-red-400 transition-all p-2"
              >
                <IoTrashOutline />
              </button>
            </motion.div>
          ))}

          {playlists.length === 0 && (
            <p className="text-cream-muted text-sm text-center py-8">No playlists yet</p>
          )}
        </div>
      )}

      {/* Active playlist detail */}
      {activeTab === 'playlists' && activePlaylist && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setActivePlaylist(null)} className="text-cream-muted hover:text-cream text-sm">
              ← Back
            </button>
            <h2 className="font-display text-lg text-cream">{activePlaylist.name}</h2>
            {playlistTracks.length > 0 && (
              <button onClick={playPlaylist} className="btn-primary text-sm flex items-center gap-1">
                <IoPlaySharp /> Play all
              </button>
            )}
          </div>
          {playlistTracks.length === 0 ? (
            <p className="text-cream-muted text-sm text-center py-8">No tracks in this playlist</p>
          ) : (
            playlistTracks.map((t: any) => (
              <div
                key={t.id}
                onClick={() => playLikedTrack(t)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-200/80 cursor-pointer group"
              >
                <img src={t.thumbnail} alt={t.title} className="w-11 h-11 rounded object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-cream truncate">{t.title}</p>
                  <p className="text-xs text-cream-muted truncate">{t.artist}</p>
                </div>
                <span className="text-xs text-cream-muted tabular-nums">{formatDuration(t.duration)}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Liked tracks */}
      {activeTab === 'liked' && (
        <div className="space-y-0.5">
          {likedTracks.length === 0 ? (
            <p className="text-cream-muted text-sm text-center py-8">No liked songs yet. Click the heart icon on any song.</p>
          ) : (
            likedTracks.map((t: any) => (
              <div
                key={t.id}
                onClick={() => playLikedTrack(t)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-200/80 cursor-pointer group"
              >
                <img src={t.thumbnail} alt={t.title} className="w-11 h-11 rounded object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-cream truncate">{t.title}</p>
                  <p className="text-xs text-cream-muted truncate">{t.artist}</p>
                </div>
                <span className="text-xs text-cream-muted tabular-nums">{formatDuration(t.duration)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </motion.div>
  );
}
