import { Device, DiagnosticIssue, MaintenanceRecord, TelemetryPayload } from '../src/types/index';

export interface DeviceHealth {
  score: number | null;
  level: 'Excellent' | 'Good' | 'Attention Required' | 'Warning' | 'Critical' | 'Unavailable';
  reasons: string[];
  recommendations: string[];
  calculatedAt: string;
}

/**
 * Deterministic health score. A device without agent evidence is deliberately
 * marked Unavailable rather than being assigned a reassuring synthetic score.
 */
export function calculateDeviceHealth(device: Device, telemetry: TelemetryPayload | undefined, issues: DiagnosticIssue[], maintenance: MaintenanceRecord[]): DeviceHealth {
  const calculatedAt = new Date().toISOString();
  if (!telemetry) return { score: null, level: 'Unavailable', reasons: ['No agent telemetry has been received.'], recommendations: ['Install or reconnect the monitoring agent before assessing device health.'], calculatedAt };

  let score = 100;
  const reasons: string[] = [];
  const recommendations: string[] = [];
  const reduce = (points: number, reason: string, recommendation: string) => { score -= points; reasons.push(reason); recommendations.push(recommendation); };

  if (device.connectionState !== 'connected') reduce(25, 'Agent connection is stale or disconnected.', 'Restore agent connectivity and verify network access.');
  if (telemetry.cpuUsagePercent >= 90) reduce(12, `CPU utilization is ${telemetry.cpuUsagePercent}%.`, 'Inspect sustained CPU consumers and scheduled workloads.');
  else if (telemetry.cpuUsagePercent >= 80) reduce(6, `CPU utilization is elevated at ${telemetry.cpuUsagePercent}%.`, 'Review the highest CPU-consuming processes.');
  if (telemetry.ramUsagePercent >= 90) reduce(12, `Memory utilization is ${telemetry.ramUsagePercent}%.`, 'Close unnecessary workloads and evaluate memory capacity.');
  else if (telemetry.ramUsagePercent >= 80) reduce(6, `Memory utilization is elevated at ${telemetry.ramUsagePercent}%.`, 'Review concurrent applications and memory demand.');
  const lowestFree = telemetry.storage?.reduce((lowest, disk) => Math.min(lowest, disk.capacityBytes ? (disk.freeBytes / disk.capacityBytes) * 100 : 100), 100);
  if (lowestFree !== undefined && lowestFree < 5) reduce(22, `Storage free space is ${lowestFree.toFixed(1)}%.`, 'Free storage immediately or move data to approved storage.');
  else if (lowestFree !== undefined && lowestFree < 12) reduce(12, `Storage free space is ${lowestFree.toFixed(1)}%.`, 'Free at least 15% of the primary storage capacity.');
  if (telemetry.cpuTempC !== undefined && telemetry.cpuTempC >= 82) reduce(18, `CPU temperature is ${telemetry.cpuTempC}°C.`, 'Inspect cooling, airflow, dust buildup, and thermal compound.');
  const active = issues.filter(i => i.status === 'Active');
  active.forEach(issue => reduce(issue.severity === 'Critical' ? 12 : issue.severity === 'High' ? 7 : 3, `Active finding: ${issue.title}.`, issue.recommendedActions[0] || 'Review the diagnostic evidence.'));
  const recentSameIssue = issues.filter(i => new Date(i.detectedAt).getTime() > Date.now() - 30 * 86400000).reduce<Record<string, number>>((count, issue) => ({ ...count, [issue.ruleCode]: (count[issue.ruleCode] || 0) + 1 }), {});
  Object.entries(recentSameIssue).filter(([, count]) => count >= 3).forEach(([code, count]) => reduce(8, `Recurring problem detected: ${code} occurred ${count} times in 30 days.`, 'Perform a root-cause review rather than repeating symptom-only remediation.'));
  const lastMaintenance = maintenance.reduce<number | undefined>((latest, item) => Math.max(latest || 0, new Date(item.date).getTime()), undefined);
  if (lastMaintenance && Date.now() - lastMaintenance > 90 * 86400000) reduce(8, 'Preventive maintenance is overdue by more than 90 days.', 'Schedule preventive maintenance and post-maintenance verification.');
  score = Math.max(0, Math.round(score));
  const level = score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 60 ? 'Attention Required' : score >= 40 ? 'Warning' : 'Critical';
  return { score, level, reasons, recommendations: [...new Set(recommendations)], calculatedAt };
}
