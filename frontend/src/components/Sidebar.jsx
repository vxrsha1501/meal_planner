import { NavLink } from 'react-router-dom';
import useAuthStore from '../store/authStore';

/**
 * Sidebar — Left navigation with profile info and nav links.
 */
export default function Sidebar({ onLogout }) {
  const user = useAuthStore((state) => state.user);

  const navItems = [
    { to: '/dashboard', icon: '📊', label: 'Dashboard' },
    { to: '/profile', icon: '👤', label: 'Profile' },
    { to: '/weekly-report', icon: '📈', label: 'Weekly Report' },
  ];

  return (
    <aside className="sidebar">
      {/* Profile Section */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-lg font-bold text-white">
            {user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {user?.name || 'User'}
            </p>
            <p className="text-xs text-slate-500 truncate">
              @{user?.username || 'user'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-3 px-1">
          Navigation
        </p>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `sidebar-nav-link ${isActive ? 'active' : ''}`
            }
            id={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logo + Logout */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-2 mb-4 px-1">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-xs">
            🧠
          </div>
          <span className="text-xs font-bold gradient-text">Lifestyle Planner</span>
        </div>
        <button
          onClick={onLogout}
          className="btn-secondary w-full text-center text-xs"
          id="btn-logout"
        >
          🚪 Sign Out
        </button>
      </div>
    </aside>
  );
}
