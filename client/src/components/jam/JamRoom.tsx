import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IoExitOutline,
  IoCopyOutline,
  IoCheckmarkOutline,
  IoSearchOutline,
  IoQrCodeOutline,
  IoWifiOutline,
} from 'react-icons/io5';
import { QRCodeSVG } from 'qrcode.react';
import { useJamStore } from '../../stores/jamStore';
import { getSocket } from '../../services/socket';
import { SearchBar } from '../search/SearchBar';
import { TrackCard } from '../search/TrackCard';
import { searchTracks } from '../../services/api';
import type { SearchResult } from '../../types';
import toast from 'react-hot-toast';

export function JamRoom() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { isInJam, jamId, participants, isHost, leaveJam, joinJam } = useJamStore();
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [connected, setConnected] = useState(true);

  // Track socket connection status
  useEffect(() => {
    const socket = getSocket();
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    setConnected(socket.connected);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  // Auto-join state (for shared link flow)
  const [showJoinPrompt, setShowJoinPrompt] = useState(false);
  const [joinNickname, setJoinNickname] = useState('');
  const [joining, setJoining] = useState(false);

  // Search within jam
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!isInJam || jamId !== code) {
      // Instead of redirecting, show auto-join prompt if we have a code
      if (code) {
        setShowJoinPrompt(true);
      } else {
        navigate('/jam');
      }
    } else {
      setShowJoinPrompt(false);
    }
  }, [isInJam, jamId, code, navigate]);

  const handleAutoJoin = async () => {
    if (!joinNickname.trim()) {
      toast.error('Enter a nickname');
      return;
    }
    if (!code) return;
    setJoining(true);
    const success = await joinJam(code, joinNickname.trim());
    setJoining(false);
    if (!success) {
      toast.error('Jam not found or failed to join');
      navigate('/jam');
    }
  };

  const shareUrl = `${window.location.origin}/jam/${jamId || code}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = () => {
    leaveJam();
    navigate('/');
    toast('Left the jam');
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const results = await searchTracks(query);
      setSearchResults(results);
    } catch {
      toast.error('Search failed');
    }
    setSearching(false);
  };

  // Show auto-join prompt for shared links
  if (showJoinPrompt) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-180px)]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
          className="w-full max-w-sm"
        >
          <div className="text-center mb-6">
            <h1 className="font-display text-2xl text-cream mb-2">Join Jam</h1>
            <p className="text-cream-dim text-sm">
              Enter a nickname to join session <span className="font-mono font-bold text-accent tracking-wider">{code}</span>
            </p>
          </div>
          <div className="panel rounded-xl p-6 space-y-4">
            <input
              type="text"
              value={joinNickname}
              onChange={(e) => setJoinNickname(e.target.value)}
              placeholder="Your nickname"
              className="input-field"
              maxLength={20}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleAutoJoin()}
            />
            <div className="flex gap-3">
              <button onClick={() => navigate('/jam')} className="btn-ghost flex-1">Back</button>
              <button
                onClick={handleAutoJoin}
                disabled={joining}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {joining ? (
                  <div className="w-4 h-4 border-2 border-surface/30 border-t-surface rounded-full animate-spin" />
                ) : 'Join'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!isInJam) return null;

  return (
    <div className="space-y-6">
      {/* Reconnecting banner */}
      <AnimatePresence>
        {!connected && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-yellow-900/50 border border-yellow-700/40 text-yellow-200 text-sm"
          >
            <IoWifiOutline className="text-base animate-pulse" />
            Reconnecting to jam...
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="font-display text-xl md:text-2xl text-cream">Jam Session</h1>
            <span className="px-3 py-1 rounded-lg bg-surface-300/60 text-accent text-sm font-mono font-bold tracking-wider">
              {jamId}
            </span>
          </div>
          <p className="text-cream-muted text-sm">
            {participants.length} {participants.length === 1 ? 'listener' : 'listeners'} · {isHost ? 'You are the host' : 'Listening along'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowQR(!showQR)} className="btn-ghost text-sm flex items-center gap-2">
            <IoQrCodeOutline /> QR
          </button>
          <button onClick={handleCopy} className="btn-ghost text-sm flex items-center gap-2">
            {copied ? <IoCheckmarkOutline className="text-accent-cyan" /> : <IoCopyOutline />}
            {copied ? 'Copied' : 'Share'}
          </button>
          <button onClick={handleLeave} className="btn-ghost text-sm text-red-400 hover:text-red-300 flex items-center gap-2">
            <IoExitOutline /> Leave
          </button>
        </div>
      </div>

      {/* QR Code */}
      <AnimatePresence>
        {showQR && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, height: 0 }}
            animate={{ opacity: 1, scale: 1, height: 'auto' }}
            exit={{ opacity: 0, scale: 0.95, height: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
            className="panel rounded-xl p-6 flex flex-col items-center gap-3 w-fit overflow-hidden"
          >
            <QRCodeSVG value={shareUrl} size={160} bgColor="transparent" fgColor="#e4dcd2" />
            <p className="text-xs text-cream-muted">Scan to join this jam</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Participants */}
      <div className="flex items-center gap-2 flex-wrap">
        {participants.map((p, i) => (
          <motion.div
            key={p.socketId}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, delay: i * 0.05, ease: [0.25, 1, 0.5, 1] }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
              p.isHost ? 'bg-accent/15 text-accent' : 'bg-surface-200/60 text-cream-dim'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${p.isHost ? 'bg-accent' : 'bg-accent-cyan'}`} />
            {p.nickname}
            {p.isHost && <span className="text-xs opacity-60">(host)</span>}
          </motion.div>
        ))}
      </div>

      {/* Search for songs to add */}
      <div className="space-y-4">
        <h2 className="font-display text-lg text-cream flex items-center gap-2">
          <IoSearchOutline className="text-cream-muted" />
          Add songs to the jam
        </h2>
        <SearchBar value={searchQuery} onChange={setSearchQuery} onSearch={handleSearch} />

        {searching && (
          <div className="flex items-center gap-2 text-cream-muted text-sm">
            <div className="w-4 h-4 border-2 border-surface-400 border-t-cream-dim rounded-full animate-spin" />
            Searching...
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="space-y-0.5">
            {searchResults.map((track) => (
              <TrackCard key={track.videoId} track={track} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
