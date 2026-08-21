import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useMonitoring } from '../../context/MonitoringContext';
import { 
  FlaskConical, 
  Cpu, 
  Activity, 
  HardDrive, 
  Thermometer, 
  BatteryCharging, 
  WifiOff, 
  Send, 
  CheckCircle2, 
  AlertTriangle,
  Play
} from 'lucide-react';
import { StatusBadge } from '../common/Badge';

export const DevTestingAgentModal: React.FC = () => {
  const { 
    isDevTestingModalOpen, 
    setIsDevTestingModalOpen, 
    devices, 
    refreshData 
  } = useMonitoring();

  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(devices[0]?.id || '');
  const [cpuUsage, setCpuUsage] = useState<number>(24);
  const [ramUsage, setRamUsage] = useState<number>(45);
  const [diskFreePercent, setDiskFreePercent] = useState<number>(40);
  const [cpuTemp, setCpuTemp] = useState<number>(48);
  const [batteryPercent, setBatteryPercent] = useState<number>(88);
  const [isCharging, setIsCharging] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const selectedDevice = devices.find(d => d.id === selectedDeviceId) || devices[0];

  const applyPreset = (preset: {
    name: string;
    cpu: number;
    ram: number;
    diskFree: number;
    temp: number;
    bat?: number;
    charging?: boolean;
  }) => {
    setCpuUsage(preset.cpu);
    setRamUsage(preset.ram);
    setDiskFreePercent(preset.diskFree);
    setCpuTemp(preset.temp);
    if (preset.bat !== undefined) setBatteryPercent(preset.bat);
    if (preset.charging !== undefined) setIsCharging(preset.charging);
  };

  const handleSendTelemetry = async (simulateOffline: boolean = false) => {
    if (!selectedDevice) {
      setFeedback({ success: false, message: 'Please register a device first.' });
      return;
    }

    setSending(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/agent/emulator/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: selectedDevice.id,
          cpuUsage,
          ramUsage,
          diskFreePercent,
          cpuTemp,
          batteryPercent,
          isCharging,
          simulateOffline
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch test telemetry.');

      setFeedback({
        success: true,
        message: simulateOffline
          ? `Disconnection trigger sent for ${selectedDevice.deviceName}. Status: Offline.`
          : `Live telemetry ingested for ${selectedDevice.deviceName}! Resulting status: ${data.status}.`
      });

      await refreshData();
    } catch (err: any) {
      setFeedback({ success: false, message: err.message || 'Error sending test telemetry.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      isOpen={isDevTestingModalOpen}
      onClose={() => setIsDevTestingModalOpen(false)}
      title="Development & Testing Agent Telemetry Emulator"
      subtitle="Isolated test harness for validating diagnostic problem detection, automated alerts, and incident workflows."
      maxWidth="3xl"
    >
      <div className="space-y-4">
        
        {/* Isolation Banner */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
          <FlaskConical className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Isolated Test Harness (Dev/Testing Mode)</p>
            <p className="text-[11px] text-amber-800 mt-0.5">
              Use this tool to test how the server-side Diagnostic Engine evaluates real hardware conditions (CPU load spikes, low storage, overheating, disconnection) and triggers tickets/notifications.
            </p>
          </div>
        </div>

        {/* Target Device Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Select Target PC</label>
          <div className="flex items-center gap-2">
            <select
              value={selectedDeviceId}
              onChange={e => setSelectedDeviceId(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              {devices.length === 0 ? (
                <option value="">No devices registered yet - Register a device first</option>
              ) : (
                devices.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.deviceName} ({d.assetId}) • Current: {d.status} • {d.assignedUser}
                  </option>
                ))
              )}
            </select>
            {selectedDevice && <StatusBadge status={selectedDevice.status} size="sm" />}
          </div>
        </div>

        {/* Quick Diagnostic Test Presets */}
        <div>
          <p className="text-xs font-bold text-slate-700 mb-1.5">Quick Diagnostic Presets (Click to Load):</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              onClick={() => applyPreset({ name: 'Healthy', cpu: 18, ram: 42, diskFree: 55, temp: 45 })}
              className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-left hover:bg-emerald-100 transition-colors text-xs"
            >
              <div className="font-bold">1. Healthy Baseline</div>
              <div className="text-[10px] text-emerald-600">CPU 18% • RAM 42% • Temp 45°C</div>
            </button>

            <button
              onClick={() => applyPreset({ name: 'High CPU', cpu: 96, ram: 55, diskFree: 40, temp: 72 })}
              className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-left hover:bg-rose-100 transition-colors text-xs"
            >
              <div className="font-bold">2. High CPU Load</div>
              <div className="text-[10px] text-rose-600">CPU 96% (HeavyCompileWorker)</div>
            </button>

            <button
              onClick={() => applyPreset({ name: 'High RAM', cpu: 35, ram: 94, diskFree: 30, temp: 52 })}
              className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-left hover:bg-amber-100 transition-colors text-xs"
            >
              <div className="font-bold">3. Memory Exhaustion</div>
              <div className="text-[10px] text-amber-600">RAM 94% (Memory Leak)</div>
            </button>

            <button
              onClick={() => applyPreset({ name: 'Low Disk', cpu: 22, ram: 48, diskFree: 4, temp: 48 })}
              className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-left hover:bg-rose-100 transition-colors text-xs"
            >
              <div className="font-bold">4. Critical Low Disk</div>
              <div className="text-[10px] text-rose-600">SSD C: 4% Free (Critical)</div>
            </button>

            <button
              onClick={() => applyPreset({ name: 'Thermal Overheat', cpu: 92, ram: 60, diskFree: 30, temp: 89 })}
              className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-left hover:bg-rose-100 transition-colors text-xs"
            >
              <div className="font-bold">5. Thermal Overheat</div>
              <div className="text-[10px] text-rose-600">CPU Temp 89°C (Throttling)</div>
            </button>

            <button
              onClick={() => applyPreset({ name: 'Low Battery', cpu: 20, ram: 38, diskFree: 50, temp: 42, bat: 8, charging: false })}
              className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-left hover:bg-amber-100 transition-colors text-xs"
            >
              <div className="font-bold">6. Critical Battery</div>
              <div className="text-[10px] text-amber-600">Battery 8% (Discharging)</div>
            </button>
          </div>
        </div>

        {/* Custom Hardware Parameter Sliders */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3.5">
          <p className="text-xs font-bold text-slate-800">Custom Telemetry Metrics:</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* CPU Slider */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="flex items-center gap-1"><Cpu className="w-3.5 h-3.5 text-indigo-600" /> CPU Usage</span>
                <span className={cpuUsage > 85 ? 'text-rose-600 font-extrabold' : 'text-slate-800'}>{cpuUsage}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={cpuUsage}
                onChange={e => setCpuUsage(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* RAM Slider */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5 text-indigo-600" /> RAM Usage</span>
                <span className={ramUsage > 90 ? 'text-rose-600 font-extrabold' : 'text-slate-800'}>{ramUsage}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                value={ramUsage}
                onChange={e => setRamUsage(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* Disk Free % Slider */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="flex items-center gap-1"><HardDrive className="w-3.5 h-3.5 text-indigo-600" /> Disk C: Free Space</span>
                <span className={diskFreePercent < 12 ? 'text-rose-600 font-extrabold' : 'text-slate-800'}>{diskFreePercent}% Free</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={diskFreePercent}
                onChange={e => setDiskFreePercent(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* CPU Temp Slider */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="flex items-center gap-1"><Thermometer className="w-3.5 h-3.5 text-indigo-600" /> CPU Temp</span>
                <span className={cpuTemp > 82 ? 'text-rose-600 font-extrabold' : 'text-slate-800'}>{cpuTemp}°C</span>
              </div>
              <input
                type="range"
                min="30"
                max="100"
                value={cpuTemp}
                onChange={e => setCpuTemp(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* Action Feedback */}
        {feedback && (
          <div className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
            feedback.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            {feedback.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => handleSendTelemetry(true)}
            disabled={sending || !selectedDevice}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            <WifiOff className="w-3.5 h-3.5 text-slate-500" />
            Simulate Sudden Disconnection
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDevTestingModalOpen(false)}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Done
            </button>
            <button
              id="send-test-telemetry-btn"
              onClick={() => handleSendTelemetry(false)}
              disabled={sending || !selectedDevice}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-xs disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {sending ? 'Injecting...' : 'Dispatch Telemetry Payload'}
            </button>
          </div>
        </div>

      </div>
    </Modal>
  );
};
