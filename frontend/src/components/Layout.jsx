import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { BarChart3, Upload, ClipboardCheck, LogOut } from 'lucide-react';

const NAV = [
  { to: '/', label: 'Dashboard', icon: BarChart3 },
  { to: '/upload', label: 'Upload', icon: Upload },
  { to: '/review', label: 'Review', icon: ClipboardCheck },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-gray-900 text-gray-200 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-800">
          <h1 className="text-lg font-bold tracking-tight text-white">Breathe ESG</h1>
          <p className="text-xs text-gray-400 mt-0.5">Data Ingestion Platform</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition ${
                  active
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-4 border-t border-gray-800">
          <p className="text-sm text-gray-400 truncate">{user?.username}</p>
          <p className="text-xs text-gray-500 truncate">{user?.tenant?.name}</p>
          <button
            onClick={logout}
            className="mt-2 flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
