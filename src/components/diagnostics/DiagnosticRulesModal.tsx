import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useMonitoring } from '../../context/MonitoringContext';
import { DiagnosticRule, Severity } from '../../types/index';
import { Sliders, Save, CheckCircle2, RotateCcw } from 'lucide-react';
import { SeverityBadge } from '../common/Badge';

export const DiagnosticRulesModal: React.FC = () => {
  const { isRulesModalOpen, setIsRulesModalOpen, refreshData } = useMonitoring();
  const [rules, setRules] = useState<DiagnosticRule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);

  useEffect(() => {
    if (isRulesModalOpen) {
      fetch('/api/diagnostics/rules')
        .then(res => res.json())
        .then(data => {
          setRules(data);
          setLoading(false);
        })
        .catch(console.error);
    }
  }, [isRulesModalOpen]);

  const handleToggleRule = (index: number) => {
    const updated = [...rules];
    updated[index].enabled = !updated[index].enabled;
    setRules(updated);
  };

  const handleUpdateThreshold = (index: number, val: number) => {
    const updated = [...rules];
    updated[index].thresholdValue = val;
    setRules(updated);
  };

  const handleUpdateAutoTicket = (index: number) => {
    const updated = [...rules];
    updated[index].autoCreateTicket = !updated[index].autoCreateTicket;
    setRules(updated);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await Promise.all(rules.map(rule => 
        fetch(`/api/diagnostics/rules/${rule.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rule)
        })
      ));
      setSaved(true);
      await refreshData();
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isRulesModalOpen}
      onClose={() => setIsRulesModalOpen(false)}
      title="Diagnostic Thresholds & Rule Engine Settings"
      subtitle="Customize telemetry trigger rules, severity levels, and automated ticket creation criteria."
      maxWidth="4xl"
    >
      <div className="space-y-4">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Loading rules...</div>
        ) : (
          <div className="divide-y divide-slate-200 max-h-[60vh] overflow-y-auto">
            {rules.map((rule, idx) => (
              <div key={rule.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() => handleToggleRule(idx)}
                      className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                    />
                    <h4 className="text-xs font-bold text-slate-900">{rule.name}</h4>
                    <SeverityBadge severity={rule.severity} size="sm" />
                    <span className="text-[10px] font-mono text-slate-400">[{rule.code}]</span>
                  </div>
                  <p className="text-[11px] text-slate-500 pl-6">{rule.description}</p>
                </div>

                <div className="flex items-center gap-4 pl-6 sm:pl-0">
                  {/* Threshold value input */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500 font-medium">Threshold:</span>
                    <input
                      type="number"
                      value={rule.thresholdValue}
                      onChange={e => handleUpdateThreshold(idx, Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-800 text-center"
                    />
                    <span className="text-xs text-slate-500">{rule.unit}</span>
                  </div>

                  {/* Auto ticket toggle */}
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rule.autoCreateTicket}
                      onChange={() => handleUpdateAutoTicket(idx)}
                      className="w-3.5 h-3.5 text-indigo-600 rounded"
                    />
                    <span className="text-[11px]">Auto Ticket</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Save button */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          {saved ? (
            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Rules saved successfully!
            </span>
          ) : (
            <span className="text-[11px] text-slate-400">Changes apply to all future incoming telemetry packets.</span>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRulesModalOpen(false)}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Close
            </button>
            <button
              id="save-diagnostic-rules-btn"
              onClick={handleSaveAll}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-xs disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save Rule Changes'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
