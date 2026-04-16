import { NavLink } from 'react-router-dom';
import { IoHomeOutline, IoHome, IoSearchOutline, IoSearch, IoLibraryOutline, IoLibrary, IoMusicalNotesOutline, IoMusicalNotes } from 'react-icons/io5';
import { useJamStore } from '../../stores/jamStore';

const navItems = [
  { to: '/', icon: IoHomeOutline, activeIcon: IoHome, label: 'Home' },
  { to: '/search', icon: IoSearchOutline, activeIcon: IoSearch, label: 'Search' },
  { to: '/library', icon: IoLibraryOutline, activeIcon: IoLibrary, label: 'Library' },
];

export function MobileNav() {
  const { isInJam, jamId } = useJamStore();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-50 border-t border-surface-400/40 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-14">
        {navItems.map(({ to, icon: Icon, activeIcon: ActiveIcon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1.5 min-w-[64px] transition-colors ${
                isActive ? 'text-accent' : 'text-cream-muted active:text-cream'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive ? <ActiveIcon className="text-xl" /> : <Icon className="text-xl" />}
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}

        <NavLink
          to={isInJam ? `/jam/${jamId}` : '/jam'}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1.5 min-w-[64px] transition-colors ${
              isActive ? 'text-accent' : isInJam ? 'text-accent-cyan' : 'text-cream-muted active:text-cream'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive ? <IoMusicalNotes className="text-xl" /> : <IoMusicalNotesOutline className={`text-xl ${isInJam ? 'animate-pulse' : ''}`} />}
              <span className="text-[10px] font-medium">{isInJam ? 'Jam' : 'Jam'}</span>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
}
