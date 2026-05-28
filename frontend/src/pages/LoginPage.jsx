import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Leaf, Shield, BarChart3 } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch {
      setError('Invalid username or password. Try analyst / analyst123');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 text-white flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30">
              <Leaf className="text-emerald-400" size={28} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Breathe ESG</h1>
              <p className="text-sm text-slate-400">Data ingestion platform</p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold leading-tight">
              Ingest, normalize,<br />and review emissions data
            </h2>
            <p className="mt-4 text-slate-300 text-sm leading-relaxed max-w-md">
              Upload SAP, utility, and travel exports. Analysts validate suspicious rows
              and lock approved records for audit.
            </p>
          </div>
          <ul className="space-y-4">
            {[
              { icon: BarChart3, text: 'Scope 1, 2 & 3 dashboards' },
              { icon: Shield, text: 'Immutable raw data + audit trail' },
              { icon: Leaf, text: 'DEFRA-based CO2e normalization' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-slate-300">
                <Icon size={18} className="text-emerald-400 shrink-0" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-slate-500">Enterprise ESG prototype · Breathe ESG assignment</p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="p-2 rounded-lg bg-emerald-600 text-white">
              <Leaf size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Breathe ESG</h1>
              <p className="text-xs text-gray-500">Analyst sign in</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-10">
            <h2 className="text-xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-sm text-gray-500 mt-1 mb-8">
              Sign in to review and approve emission records
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition"
                  placeholder="analyst"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-700 text-white py-2.5 px-4 rounded-lg text-sm font-semibold hover:bg-emerald-800 disabled:opacity-50 transition shadow-sm"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Demo access</p>
              <p className="text-sm text-gray-600">
                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">analyst</span>
                {' / '}
                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">analyst123</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
