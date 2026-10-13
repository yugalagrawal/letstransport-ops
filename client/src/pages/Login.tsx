import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setUser } from '../hooks/useAuth';
import ltLogo from '../assets/lt-logo.jpeg';

const DEMO_USERS = [
  { email: 'sales1@letstransport.in', role: 'All roles' },
  { email: 'sales2@letstransport.in', role: 'Sales only' },
  { email: 'fo1@letstransport.in', role: 'Field Ops' },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed'); return; }
      setUser(data);
      navigate('/');
    } catch {
      setError('Unable to reach server. Make sure it is running.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand-navy flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <img src={ltLogo} alt="LT" className="w-10 h-10 rounded-xl object-cover" />
          <div>
            <div className="font-bold text-brand-navy text-lg leading-tight">letstransport</div>
            <div className="text-xs text-slate-500">Ops Console</div>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-brand-navy mb-1">Sign in</h2>
        <p className="text-sm text-slate-500 mb-6">Enter your work email to continue</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Work Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="you@letstransport.in"
              autoFocus
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition"
            />
          </div>

          <div>
            <div className="text-xs font-medium text-slate-600 mb-1.5">Prototype access</div>
            <div className="space-y-1.5">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.email}
                  type="button"
                  onClick={() => { setEmail(u.email); setError(''); }}
                  className={`w-full text-left border rounded-lg px-3 py-2 text-xs transition ${
                    email === u.email
                      ? 'border-brand-orange bg-brand-orange/5'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="font-medium text-brand-navy">{u.email}</span>
                  <span className="text-slate-500"> · {u.role}</span>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-orange hover:bg-brand-orange-dark disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? 'Signing in…' : 'Continue →'}
          </button>
        </form>
      </div>
    </div>
  );
}
