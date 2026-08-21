import React, { FormEvent, useState } from 'react';
import { AlertCircle, LockKeyhole, Monitor } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await login(username.trim(), password);
    if (!result.success) setError(result.error || 'Unable to sign in.');
    setSubmitting(false);
  };

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-5">
      <form onSubmit={submit} className="w-full max-w-sm bg-white border border-slate-200 shadow-lg rounded-lg p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 text-indigo-300 rounded-lg grid place-items-center">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">Monitoring Console</h1>
            <p className="text-xs text-slate-500">Sign in to manage your devices.</p>
          </div>
        </div>

        {error && (
          <div className="flex gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <label className="block text-xs font-semibold text-slate-700">
          Username or email
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
        </label>
        <label className="block text-xs font-semibold text-slate-700">
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
        </label>
        <button disabled={submitting} className="w-full flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
          <LockKeyhole className="w-4 h-4" />
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </main>
  );
};
