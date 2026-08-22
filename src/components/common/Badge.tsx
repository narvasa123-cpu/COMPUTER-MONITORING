import React from 'react';
import { DeviceStatus, Severity, TicketStatus, IssueStatus } from '../../types/index';

interface StatusBadgeProps {
  status: DeviceStatus | TicketStatus | IssueStatus | string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: 'gap-1 px-2 py-0.5 text-[10px]',
  md: 'gap-1.5 px-2.5 py-1 text-[11px]',
  lg: 'gap-1.5 px-3 py-1.5 text-xs'
};

const toneForStatus = (status: string) => {
  if (['Online', 'Resolved', 'Closed', 'Healthy', 'Verified', 'Passed'].includes(status)) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800 ring-emerald-100';
  }
  if (['Warning', 'Medium', 'Diagnosing', 'In Repair', 'Investigating', 'Acknowledged', 'Waiting for Parts'].includes(status)) {
    return 'border-amber-200 bg-amber-50 text-amber-800 ring-amber-100';
  }
  if (['Critical', 'High', 'Urgent', 'Active', 'Failing', 'Failed', 'Reopened'].includes(status)) {
    return 'border-rose-200 bg-rose-50 text-rose-800 ring-rose-100';
  }
  if (status === 'Offline') return 'border-slate-300 bg-slate-100 text-slate-700 ring-slate-100';
  if (status === 'Maintenance') return 'border-violet-200 bg-violet-50 text-violet-800 ring-violet-100';
  if (status === 'Waiting for Agent Connection') return 'border-sky-200 bg-sky-50 text-sky-800 ring-sky-100';
  if (['Open', 'Assigned'].includes(status)) return 'border-blue-200 bg-blue-50 text-blue-800 ring-blue-100';
  return 'border-slate-200 bg-slate-50 text-slate-700 ring-slate-100';
};

const dotForStatus = (status: string) => {
  if (['Online', 'Resolved', 'Closed', 'Healthy', 'Verified', 'Passed'].includes(status)) return 'bg-emerald-500';
  if (['Warning', 'Medium', 'Diagnosing', 'In Repair', 'Investigating', 'Acknowledged', 'Waiting for Parts'].includes(status)) return 'bg-amber-500';
  if (['Critical', 'High', 'Urgent', 'Active', 'Failing', 'Failed', 'Reopened'].includes(status)) return 'bg-rose-500';
  if (status === 'Offline') return 'bg-slate-400';
  if (status === 'Maintenance') return 'bg-violet-500';
  if (status === 'Waiting for Agent Connection') return 'bg-sky-500';
  if (['Open', 'Assigned'].includes(status)) return 'bg-blue-500';
  return 'bg-slate-400';
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => (
  <span className={`inline-flex max-w-full items-center whitespace-nowrap rounded-full border font-bold leading-none shadow-[0_1px_1px_rgba(15,23,42,0.03)] ring-1 ${toneForStatus(status)} ${sizes[size]}`}>
    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotForStatus(status)}`} />
    <span className="truncate">{status === 'Waiting for Agent Connection' ? 'Waiting for agent' : status}</span>
  </span>
);

export const SeverityBadge: React.FC<{ severity: Severity; size?: 'sm' | 'md' }> = ({ severity, size = 'md' }) => {
  const colors: Record<Severity, string> = {
    Critical: 'border-rose-200 bg-rose-50 text-rose-800',
    High: 'border-orange-200 bg-orange-50 text-orange-800',
    Medium: 'border-amber-200 bg-amber-50 text-amber-800',
    Low: 'border-blue-200 bg-blue-50 text-blue-800',
    Informational: 'border-slate-200 bg-slate-50 text-slate-700'
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide shadow-[0_1px_1px_rgba(15,23,42,0.03)] ${size === 'sm' ? 'px-2 py-0.5 text-[9px]' : ''} ${colors[severity] || colors.Informational}`}>
      {severity}
    </span>
  );
};
