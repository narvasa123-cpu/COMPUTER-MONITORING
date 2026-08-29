import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Monitor, Building2, Trash2 } from 'lucide-react';
import { Location } from '../../types/index';
import { useMonitoring } from '../../context/MonitoringContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';

export const LocationsView: React.FC = () => {
  const { devices, setActiveTab } = useMonitoring();
  const { user } = useAuth();

  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [building, setBuilding] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [type, setType] = useState('Laboratory');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/org/locations');
      if (res.ok) setLocations(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !roomNumber) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/org/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, building, roomNumber, type })
      });
      if (res.ok) {
        await fetchLocations();
        setIsModalOpen(false);
        setName('');
        setBuilding('');
        setRoomNumber('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Laboratories & Campus Locations</h2>
          <p className="text-xs text-slate-500">Computer labs, research rooms, testing suites, and departmental offices.</p>
        </div>
        {user?.role === 'super_admin' ? (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Laboratory / Room</span>
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map(loc => {
          const locDevices = devices.filter(d => d.locationId === loc.id);
          const onlineCount = locDevices.filter(d => d.status === 'Online').length;
          const warningCount = locDevices.filter(d => d.status === 'Warning' || d.status === 'Critical').length;

          return (
            <div key={loc.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{loc.name}</h3>
                    <p className="text-[11px] text-slate-500">{loc.building} • Room {loc.roomNumber}</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                  {loc.type}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">Total PCs</span>
                  <span className="font-extrabold text-slate-800">{locDevices.length}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">Online</span>
                  <span className="font-extrabold text-emerald-600">{onlineCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">Alerts</span>
                  <span className={`font-extrabold ${warningCount > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                    {warningCount}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('devices')}
                className="w-full py-1.5 text-center text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50/60 hover:bg-indigo-100 rounded-lg transition-colors"
              >
                View Devices in Room
              </button>
            </div>
          );
        })}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Laboratory or Office Location"
        subtitle="Specify building and room details."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Laboratory / Room Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Computer Science Lab 4"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Building</label>
              <input
                type="text"
                value={building}
                onChange={e => setBuilding(e.target.value)}
                placeholder="e.g. Technology Hall"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Room Number *</label>
              <input
                type="text"
                required
                value={roomNumber}
                onChange={e => setRoomNumber(e.target.value)}
                placeholder="e.g. TH-301"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700"
            >
              {submitting ? 'Creating...' : 'Create Location'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
