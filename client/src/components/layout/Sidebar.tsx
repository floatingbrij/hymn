import { NavLink, useNavigate } from 'react-router-dom';
import { IoHomeOutline, IoSearchOutline, IoLibraryOutline, IoPersonOutline } from 'react-icons/io5';
import { IoMusicalNotesOutline } from 'react-icons/io5';
import { useJamStore } from '../../stores/jamStore';
import { useAuthStore } from '../../stores/authStore';

function HymnLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      {/* Tuning fork / musical note hybrid — clean line art */}
      <path d="M10 6 L10 20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M22 6 L22 20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M10 6 Q16 -1, 22 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
      <path d="M16 12 L16 27" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/>
      <circle cx="16" cy="27" r="3" stroke="currentColor" strokeWidth="2" fill="none"/>
    </svg>
  );
}

const navItems = [
  { to: '/', icon: IoHomeOutline, label: 'Home' },
  { to: '/search', icon: IoSearchOutline, label: 'Search' },
  { to: '/library', icon: IoLibraryOutline, label: 'Library' },
];

export function Sidebar() {
  const { isInJam, jamId } = useJamStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  return (
    <aside className="w-56 bg-surface-50 flex flex-col border-r border-surface-400/40 shrink-0">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5">
        <button onClick={() => navigate('/')} className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center transition-transform duration-200 group-hover:scale-110 group-active:scale-95">
            <HymnLogo className="w-5 h-5 text-surface" />
          </div>
          <span className="text-xl font-display text-cream tracking-tight transition-colors duration-200 group-hover:text-accent-light">
            hymn
          </span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-surface-300/60 text-cream shadow-sm shadow-black/10'
                  : 'text-cream-dim hover:text-cream hover:bg-surface-200/60 hover:translate-x-0.5'
              }`
            }
          >
            <Icon className="text-lg" />
            {label}
          </NavLink>
        ))}

        {/* Jam link */}
        <NavLink
          to={isInJam ? `/jam/${jamId}` : '/jam'}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              isActive
                ? 'bg-surface-300/60 text-cream shadow-sm shadow-black/10'
                : isInJam
                ? 'text-accent-cyan hover:bg-surface-200/60'
                : 'text-cream-dim hover:text-cream hover:bg-surface-200/60 hover:translate-x-0.5'
            }`
          }
        >
          <IoMusicalNotesOutline className={`text-lg ${isInJam ? 'animate-pulse' : ''}`} />
          {isInJam ? `Jam: ${jamId}` : 'Start a Jam'}
        </NavLink>
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-surface-400/40">
        {user ? (
          <button
            onClick={() => navigate('/library')}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-cream-dim hover:text-cream hover:bg-surface-200/60 transition-all duration-200 hover:translate-x-0.5"
          >
            <div className="w-7 h-7 rounded-full bg-accent/80 flex items-center justify-center text-xs font-bold text-surface transition-transform duration-200 group-hover:scale-110">
              {user.username[0].toUpperCase()}
            </div>
            <span className="truncate">{user.username}</span>
          </button>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-cream-muted hover:text-cream hover:bg-surface-200/60 transition-colors"
          >
            <IoPersonOutline className="text-lg" />
            Sign in
          </button>
        )}
      </div>
    </aside>
  );
}
