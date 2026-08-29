import React, { useState, useEffect } from 'react';
import { Sliders, Save, CheckCircle2, RefreshCw, ShieldAlert, Bell, Cpu } from 'lucide-react';
import { SystemSettings } from '../../types/index';
import { useMonitoring } from '../../context/MonitoringContext';
import { useAuth } from '../../context/AuthContext';

export const SettingsView: React.FC = () => {
  const { refreshData } = useMonitoring();
  const { user } = useAuth();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('The monitoring settings could not be loaded.');
      setSettings(await res.json());
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'The monitoring settings could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    if (user?.role !== 'super_admin') {
      setError('Only the Super Admin can change monitoring settings.');
      return;
    }
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setSaved(true);
        await refreshData();
        setTimeout(() => setSaved(false), 2500);
      } else {
        const result = await res.json().catch(() => ({}));
        setError(result.error || 'Settings could not be saved.');
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Settings could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400 text-xs">Loading settings...</div>;
  }
  if (!settings) {
    return <div className="max-w-xl rounded-xl border border-rose-200 bg-rose-50 p-5 text-center"><p role="alert" className="text-sm font-bold text-rose-800">{error || 'Monitoring settings are unavailable.'}</p><button type="button" onClick={() => void fetchSettings()} className="mt-3 rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-800">Retry</button></div>;
  }
  const canManage = user?.role === 'super_admin';

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900">System Monitoring & Heartbeat Configuration</h2>
        <p className="text-xs text-slate-500">
          Configure telemetry transmission frequency, offline detection timeout thresholds, and automated ticketing rules.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5">
        {!canManage && <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">Read-only access: only the Super Admin can change monitoring and network diagnostic settings.</div>}
        <fieldset disabled={!canManage} className="space-y-5 disabled:cursor-not-allowed disabled:opacity-60">
        {/* Heartbeat & Offline Timing */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4" /> Heartbeat & Network Timers
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Agent Heartbeat Transmission Interval (Seconds)
              </label>
              <input
                type="number"
                min="2"
                max="60"
                value={settings.heartbeatIntervalSec}
                onChange={e => setSettings({ ...settings, heartbeatIntervalSec: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Default: 30 seconds. Keep the offline timeout above this interval.</span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Offline Detection Threshold (Seconds)
              </label>
              <input
                type="number"
                min="10"
                max="300"
                value={settings.offlineThresholdSec}
                onChange={e => setSettings({ ...settings, offlineThresholdSec: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Mark PC as Offline if no heartbeat received after this timeout.</span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Wi-Fi Diagnostic Test Interval (Seconds)
              </label>
              <input
                type="number"
                min="10"
                max="900"
                value={settings.networkDiagnosticIntervalSec}
                onChange={e => setSettings({ ...settings, networkDiagnosticIntervalSec: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Runs real gateway, DNS, and internet probes on connected Windows Wi-Fi devices. Changes are collected by updated agents on their next telemetry response.</span>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-100">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4" /> Wi-Fi Diagnostic Thresholds
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Weak signal at or below (%)</label>
              <input type="number" min="1" max="100" value={settings.networkWeakSignalThresholdPercent} onChange={e => setSettings({ ...settings, networkWeakSignalThresholdPercent: Number(e.target.value) })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800" />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">High latency at or above (ms)</label>
              <input type="number" min="1" max="5000" value={settings.networkHighLatencyMs} onChange={e => setSettings({ ...settings, networkHighLatencyMs: Number(e.target.value) })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800" />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Packet loss at or above (%)</label>
              <input type="number" min="1" max="100" value={settings.networkPacketLossThresholdPercent} onChange={e => setSettings({ ...settings, networkPacketLossThresholdPercent: Number(e.target.value) })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800" />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Incident cooldown (seconds)</label>
              <input type="number" min="30" max="86400" value={settings.networkIncidentCooldownSec} onChange={e => setSettings({ ...settings, networkIncidentCooldownSec: Number(e.target.value) })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400">The Worker creates or reopens one evidence-based network finding per device and fault type during this cooldown; it does not generate duplicate outage tickets on every heartbeat.</p>
        </div>

        {/* Telemetry Storage */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
            <Cpu className="w-4 h-4" /> Telemetry Data Retention
          </h3>

          <div>
            <label className="block font-bold text-slate-700 mb-1 text-xs">
              Historical Telemetry Points Retained Per Computer
            </label>
            <input
              type="number"
              min="20"
              max="500"
              value={settings.telemetryRetentionPoints}
              onChange={e => setSettings({ ...settings, telemetryRetentionPoints: Number(e.target.value) })}
              className="w-48 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">Rolling history points preserved for live trend graph analysis.</span>
          </div>
        </div>

        {/* Automated Dispatch & Alerts */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
            <Bell className="w-4 h-4" /> Incident Automation & Alerts
          </h3>

          <div className="space-y-2 text-xs">
            <label className="flex items-center gap-2.5 cursor-pointer font-bold text-slate-800">
              <input
                type="checkbox"
                checked={settings.autoCreateTicketOnCritical}
                onChange={e => setSettings({ ...settings, autoCreateTicketOnCritical: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <span>Automatically dispatch Repair Ticket when Critical hardware conditions are detected</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer font-bold text-slate-800">
              <input
                type="checkbox"
                checked={settings.enableSoundAlerts}
                onChange={e => setSettings({ ...settings, enableSoundAlerts: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <span>Enable audio notification chimes on critical telemetry alerts</span>
            </label>
          </div>
        </div>

        </fieldset>

        {/* Save Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          {saved ? (
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Global Settings Updated!
            </span>
          ) : (
            <span className="text-[11px] text-slate-400">Settings take effect immediately across all background workers.</span>
          )}

          <button
            type="submit"
            disabled={saving || !canManage}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-xs disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : canManage ? 'Save Settings' : 'Read only'}
          </button>
        </div>
        {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p>}
      </form>
    </div>
  );
};
