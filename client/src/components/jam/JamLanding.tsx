import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { IoMusicalNotesOutline, IoLinkOutline, IoEnterOutline } from 'react-icons/io5';
import { useJamStore } from '../../stores/jamStore';
import toast from 'react-hot-toast';

export function JamLanding() {
  const [nickname, setNickname] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { createJam, joinJam } = useJamStore();

  const handleCreate = async () => {
    if (!nickname.trim()) {
      toast.error('Enter a nickname');
      return;
    }
    setLoading(true);
    const jamId = await createJam(nickname.trim());
    setLoading(false);
    if (jamId) {
      navigate(`/jam/${jamId}`);
    } else {
      toast.error('Failed to create jam');
    }
  };

  const handleJoin = async () => {
    if (!nickname.trim()) {
      toast.error('Enter a nickname');
      return;
    }
    if (!joinCode.trim()) {
      toast.error('Enter a jam code');
      return;
    }
    setLoading(true);
    const success = await joinJam(joinCode.trim(), nickname.trim());
    setLoading(false);
    if (success) {
      navigate(`/jam/${joinCode.trim().toUpperCase()}`);
    } else {
      toast.error('Jam not found or failed to join');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-180px)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 1, 0.5, 1] }}
            className="w-16 h-16 rounded-xl bg-accent flex items-center justify-center mx-auto mb-4"
          >
            <IoMusicalNotesOutline className="text-3xl text-surface" />
          </motion.div>
          <h1 className="font-display text-3xl text-cream mb-2">Start a Jam</h1>
          <p className="text-cream-dim text-sm">Listen together with friends in real-time</p>
        </div>

        {mode === 'choose' ? (
          <div className="space-y-3">
            <button
              onClick={() => setMode('create')}
              className="w-full panel panel-hover rounded-xl p-5 flex items-center gap-4 text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center">
                <IoMusicalNotesOutline className="text-xl text-accent" />
              </div>
              <div>
                <p className="text-cream font-medium">Create a Jam</p>
                <p className="text-cream-muted text-sm">Start a new session and invite friends</p>
              </div>
            </button>
            <button
              onClick={() => setMode('join')}
              className="w-full panel panel-hover rounded-xl p-5 flex items-center gap-4 text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-accent-cyan/15 flex items-center justify-center">
                <IoEnterOutline className="text-xl text-accent-cyan" />
              </div>
              <div>
                <p className="text-cream font-medium">Join a Jam</p>
                <p className="text-cream-muted text-sm">Enter a code to join an existing session</p>
              </div>
            </button>
          </div>
        ) : (
          <div className="panel rounded-xl p-6 space-y-4">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Your nickname"
              className="input-field"
              maxLength={20}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && (mode === 'create' ? handleCreate() : mode === 'join' ? handleJoin() : null)}
            />

            {mode === 'join' && (
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Jam code (e.g. ABC123)"
                className="input-field text-center text-lg tracking-widest"
                maxLength={6}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              />
            )}

            <div className="flex gap-3">
              <button onClick={() => setMode('choose')} className="btn-ghost flex-1">
                Back
              </button>
              <button
                onClick={mode === 'create' ? handleCreate : handleJoin}
                disabled={loading}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-surface/30 border-t-surface rounded-full animate-spin" />
                ) : mode === 'create' ? (
                  'Create'
                ) : (
                  'Join'
                )}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
