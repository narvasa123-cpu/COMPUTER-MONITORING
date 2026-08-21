import React, { useState, useEffect } from 'react';
import { Sliders, Save, CheckCircle2, RefreshCw, ShieldAlert, Bell, Cpu } from 'lucide-react';
import { SystemSettings } from '../../types/index';
import { useMonitoring } from '../../context/MonitoringContext';

export const SettingsView: React.FC = () => {
  const { refreshData } = useMonitoring();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) setSettings(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setSaved(false);
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
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return <div className="p-8 text-center text-slate-400 text-xs">Loading settings...</div>;
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900">System Monitoring & Heartbeat Configuration</h2>
        <p className="text-xs text-slate-500">
          Configure telemetry transmission frequency, offline detection timeout thresholds, and automated ticketing rules.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5">
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
              <span className="text-[11px] text-slate-400 mt-1 block">Default: 5 seconds (Recommended for live lab monitoring).</span>
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
          </div>
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
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-xs disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};
