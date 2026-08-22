import React, { useState } from 'react';
import { FileText, Download, FileSpreadsheet, CheckCircle2, Monitor, AlertTriangle, Wrench, History } from 'lucide-react';
import { useMonitoring } from '../../context/MonitoringContext';

export const ReportsView: React.FC = () => {
  const { summary } = useMonitoring();
  const [downloading, setDownloading] = useState<string | null>(null);

  const reportTypes = [
    {
      id: 'devices',
      title: 'Full Hardware & Computer Inventory Report',
      desc: 'Complete export of all registered PCs, serial tags, assigned personnel, laboratories, IP/MAC addresses, and online status.',
      icon: Monitor,
      filename: 'devices-inventory.csv'
    },
    {
      id: 'issues',
      title: 'Diagnostic Findings & Telemetry Violations Report',
      desc: 'All active and resolved diagnostic issues, triggered telemetry evidence (CPU, RAM, Disk %, Temp), and threshold rules.',
      icon: AlertTriangle,
      filename: 'diagnostic-issues.csv'
    },
    {
      id: 'tickets',
      title: 'IT Incident & Repair Tickets Log',
      desc: 'Complete repair ticket history, dispatch technician logs, priority ratings, problem descriptions, and resolution statuses.',
      icon: Wrench,
      filename: 'repair-tickets.csv'
    },
    {
      id: 'maintenance',
      title: 'Official Maintenance & Service History Audit',
      desc: 'Formal maintenance records including actions performed, parts replaced, component costs, and technician certifications.',
      icon: History,
      filename: 'maintenance-history.csv'
    }
  ];

  const handleExport = async (typeId: string, filename: string) => {
    setDownloading(typeId);
    try {
      const response = await fetch(`/api/reports/export/${typeId}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Unable to generate the report.');
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to generate the report.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900">System Reports & CSV Export</h2>
        <p className="text-xs text-slate-500">
          Generate and download operational reports for institutional audits, hardware lifecycle tracking, and maintenance logs.
        </p>
      </div>

      {/* Live System Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] text-slate-400 font-bold uppercase">Total Monitored PCs</p>
          <p className="text-xl font-black text-slate-900 mt-1">{summary?.totalDevices || 0}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] text-slate-400 font-bold uppercase">Active Diagnostic Issues</p>
          <p className="text-xl font-black text-rose-600 mt-1">{summary?.activeIssues || 0}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] text-slate-400 font-bold uppercase">Open Repair Tickets</p>
          <p className="text-xl font-black text-indigo-600 mt-1">{summary?.openTickets || 0}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] text-slate-400 font-bold uppercase">Resolved Incidents</p>
          <p className="text-xl font-black text-emerald-600 mt-1">{summary?.resolvedTickets || 0}</p>
        </div>
      </div>

      {/* Exportable Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportTypes.map(rep => {
          const Icon = rep.icon;
          return (
            <div key={rep.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{rep.title}</h3>
                    <span className="text-[11px] font-mono text-slate-400">{rep.filename}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{rep.desc}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Export (CSV)
                </span>
                <button
                  onClick={() => handleExport(rep.id, rep.filename)}
                  disabled={downloading === rep.id}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{downloading === rep.id ? 'Preparing…' : 'Download CSV'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
