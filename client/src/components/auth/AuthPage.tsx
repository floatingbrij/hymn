import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import toast from 'react-hot-toast';

function HymnLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      <path d="M10 6 L10 20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M22 6 L22 20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M10 6 Q16 -1, 22 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
      <path d="M16 12 L16 27" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/>
      <circle cx="16" cy="27" r="3" stroke="currentColor" strokeWidth="2" fill="none"/>
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, register, googleSignIn, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let success: boolean;
    if (mode === 'login') {
      success = await login(email, password);
    } else {
      success = await register(email, username, password);
    }

    if (success) {
      toast.success(mode === 'login' ? 'Welcome back!' : 'Account created!');
      navigate('/library');
    }
  };

  const handleGoogle = async () => {
    const success = await googleSignIn();
    if (success) {
      toast.success('Signed in with Google!');
      navigate('/library');
    }
  };

  const switchMode = () => {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    clearError();
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-180px)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 1, 0.5, 1] }}
            className="w-14 h-14 rounded-xl bg-accent flex items-center justify-center mx-auto mb-4"
          >
            <HymnLogo className="w-7 h-7 text-surface" />
          </motion.div>
          <h1 className="font-display text-2xl text-cream">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="text-cream-muted text-sm mt-1">
            {mode === 'login' ? 'Sign in to access your library' : 'Save playlists and liked songs'}
          </p>
        </div>

        <div className="panel rounded-xl p-6 space-y-4">
          {/* Google Sign-In */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg bg-white text-gray-700 font-medium text-sm hover:bg-gray-100 transition-colors duration-200 disabled:opacity-50"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-surface-400/40" />
            <span className="text-xs text-cream-muted uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-surface-400/40" />
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="input-field"
            required
          />

          {mode === 'register' && (
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="input-field"
              minLength={2}
              maxLength={30}
              required
            />
          )}

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="input-field"
            minLength={6}
            required
          />

          {error && (
            <motion.p
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-red-400 text-sm text-center"
            >{error}</motion.p>
          )}

          <button type="submit" disabled={isLoading} className="btn-primary w-full flex items-center justify-center">
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-surface/30 border-t-surface rounded-full animate-spin" />
            ) : mode === 'login' ? (
              'Sign in'
            ) : (
              'Create account'
            )}
          </button>

          <p className="text-center text-sm text-cream-muted">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button type="button" onClick={switchMode} className="text-accent hover:text-accent-light transition-colors">
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
