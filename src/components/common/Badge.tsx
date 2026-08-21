import React from 'react';
import { DeviceStatus, Severity, TicketStatus, IssueStatus } from '../../types/index';

interface StatusBadgeProps {
  status: DeviceStatus | TicketStatus | IssueStatus | string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm'
  }[size];

  switch (status) {
    case 'Online':
    case 'Resolved':
    case 'Closed':
    case 'Healthy':
      return (
        <span className={`inline-flex items-center gap-1.5 font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {status}
        </span>
      );

    case 'Warning':
    case 'Medium':
    case 'Diagnosing':
    case 'In Repair':
    case 'Investigating':
      return (
        <span className={`inline-flex items-center gap-1.5 font-medium rounded-md bg-amber-50 text-amber-700 border border-amber-200 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          {status}
        </span>
      );

    case 'Critical':
    case 'High':
    case 'Urgent':
    case 'Active':
    case 'Failing':
      return (
        <span className={`inline-flex items-center gap-1.5 font-medium rounded-md bg-rose-50 text-rose-700 border border-rose-200 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
          {status}
        </span>
      );

    case 'Offline':
      return (
        <span className={`inline-flex items-center gap-1.5 font-medium rounded-md bg-slate-100 text-slate-700 border border-slate-300 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          Offline
        </span>
      );

    case 'Maintenance':
      return (
        <span className={`inline-flex items-center gap-1.5 font-medium rounded-md bg-purple-50 text-purple-700 border border-purple-200 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
          Maintenance
        </span>
      );

    case 'Waiting for Agent Connection':
      return (
        <span className={`inline-flex items-center gap-1.5 font-medium rounded-md bg-sky-50 text-sky-700 border border-sky-200 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
          Waiting for Agent
        </span>
      );

    case 'Open':
    case 'Assigned':
      return (
        <span className={`inline-flex items-center gap-1.5 font-medium rounded-md bg-blue-50 text-blue-700 border border-blue-200 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          {status}
        </span>
      );

    default:
      return (
        <span className={`inline-flex items-center gap-1 font-medium rounded-md bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses}`}>
          {status}
        </span>
      );
  }
};

export const SeverityBadge: React.FC<{ severity: Severity; size?: 'sm' | 'md' }> = ({ severity, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';
  const colors: Record<Severity, string> = {
    Critical: 'bg-rose-100 text-rose-800 border-rose-200',
    High: 'bg-orange-100 text-orange-800 border-orange-200',
    Medium: 'bg-amber-100 text-amber-800 border-amber-200',
    Low: 'bg-blue-100 text-blue-800 border-blue-200',
    Informational: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  return (
    <span className={`inline-flex items-center font-semibold rounded border ${colors[severity] || colors.Informational} ${sizeClasses}`}>
      {severity}
    </span>
  );
};
