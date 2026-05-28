import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { BarChart3, Upload, ClipboardCheck, LogOut, Leaf } from 'lucide-react';

const NAV = [
  { to: '/', label: 'Dashboard', icon: BarChart3 },
  { to: '/upload', label: 'Upload', icon: Upload },
  { to: '/review', label: 'Review', icon: ClipboardCheck },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen flex bg-slate-100">
      <aside className="w-60 bg-slate-900 text-slate-200 flex flex-col shrink-0">
        <div className="px-5 py-6 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-600/90">
              <Leaf size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white">Breathe ESG</h1>
              <p className="text-[11px] text-slate-400">Ingestion platform</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-5 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  active
                    ? 'bg-emerald-600/20 text-white border border-emerald-500/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-5 border-t border-slate-800">
          <p className="text-sm font-medium text-slate-300 truncate">{user?.username}</p>
          <p className="text-xs text-slate-500 truncate mt-0.5">{user?.tenant?.name}</p>
          <button
            onClick={logout}
            className="mt-3 flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
