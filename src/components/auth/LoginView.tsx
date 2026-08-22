import React, { FormEvent, useState } from 'react';
import { AlertCircle, ArrowRight, KeyRound, LockKeyhole, Monitor, ShieldCheck } from 'lucide-react';
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f6f8fc] p-4 sm:p-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-32 top-[-18rem] h-[34rem] w-[34rem] rounded-full bg-indigo-200/35 blur-3xl" />
        <div className="absolute -bottom-40 right-[-9rem] h-[28rem] w-[28rem] rounded-full bg-cyan-200/25 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-600 via-violet-500 to-cyan-500" />
      </div>

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.14)] lg:grid-cols-[1.08fr_0.92fr]">
        <section className="p-6 sm:p-10 lg:p-12">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-700 to-violet-600 text-white shadow-lg shadow-indigo-200">
              <Monitor className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-indigo-600">Secure operations console</p>
              <h1 className="mt-0.5 text-base font-extrabold tracking-tight text-slate-950">PC & Laptop Monitoring</h1>
            </div>
          </div>

          <div className="mt-10 max-w-md">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Sign in to the IT operations workspace.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">Use your authorized account to manage registered assets, investigate evidence, and document maintenance work.</p>
          </div>

          <form onSubmit={submit} className="mt-8 max-w-md space-y-5">
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <label className="block">
              <span className="text-xs font-bold text-slate-700">Username or email</span>
              <span className="relative mt-2 block">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                  placeholder="Enter your username or email"
                />
              </span>
            </label>

            <label className="block">
              <span className="text-xs font-bold text-slate-700">Password</span>
              <span className="relative mt-2 block">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                  placeholder="Enter your password"
                />
              </span>
            </label>

            <button type="submit" disabled={submitting} className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
              <LockKeyhole className="h-4 w-4" />
              {submitting ? 'Signing in securely...' : 'Sign in to console'}
              {!submitting && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
            </button>
          </form>

          <p className="mt-7 max-w-md border-t border-slate-100 pt-4 text-[11px] leading-5 text-slate-500">Access is governed by your role. Actions such as device registration, agent pairing, incident handling, and maintenance verification are protected by server-side authorization.</p>
        </section>

        <aside className="relative hidden overflow-hidden bg-slate-950 p-10 text-white lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.5),transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(6,182,212,0.17),transparent_34%)]" aria-hidden="true" />
          <div className="relative flex h-full flex-col">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.15em] text-indigo-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              IT asset health platform
            </div>
            <div className="mt-10">
              <p className="text-sm font-bold text-indigo-200">Monitor - Detect - Diagnose</p>
              <h3 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight">Evidence-first operations for every managed computer.</h3>
              <p className="mt-4 text-sm leading-6 text-slate-300">The workspace brings together authenticated agent telemetry, explainable diagnostics, incidents, repairs, and maintenance history in one operational record.</p>
            </div>
            <div className="mt-auto space-y-3 pt-12">
              {[
                ['Live telemetry', 'Shown only after an authenticated agent heartbeat.'],
                ['Explainable findings', 'Evidence and recommended next actions stay with the device record.'],
                ['Verified repair history', 'Maintenance remains auditable after work is completed.']
              ].map(([title, detail]) => (
                <div key={title} className="rounded-xl border border-white/10 bg-white/[0.045] p-3.5">
                  <p className="text-xs font-bold text-white">{title}</p>
                  <p className="mt-1 text-[11px] leading-5 text-slate-300">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
};
