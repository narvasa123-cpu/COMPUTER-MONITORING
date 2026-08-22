import { Router } from 'express';
import { db } from '../db';
import { DashboardSummary } from '../../src/types/index';
import { calculateDeviceHealth } from '../health';

const router = Router();

router.get('/summary', (req, res) => {
  const data = db.get();
  const devices = data.devices;
  const issues = data.diagnosticIssues.filter(i => i.status === 'Active');
  const tickets = data.repairTickets;
  const scoredDevices = devices.map(device => calculateDeviceHealth(device, data.latestTelemetry[device.id], data.diagnosticIssues.filter(i => i.deviceId === device.id), data.maintenanceRecords.filter(m => m.deviceId === device.id)).score).filter((score): score is number => score !== null);

  let online = 0;
  let offline = 0;
  let warning = 0;
  let critical = 0;
  let maintenance = 0;
  let waiting = 0;

  let highCpu = 0;
  let highRam = 0;
  let lowDisk = 0;
  let highTemp = 0;

  devices.forEach(d => {
    if (d.status === 'Online') online++;
    else if (d.status === 'Offline') offline++;
    else if (d.status === 'Warning') warning++;
    else if (d.status === 'Critical') critical++;
    else if (d.status === 'Maintenance') maintenance++;
    else if (d.status === 'Waiting for Agent Connection') waiting++;

    const tel = data.latestTelemetry[d.id];
    if (tel) {
      if (tel.cpuUsagePercent >= 80) highCpu++;
      if (tel.ramUsagePercent >= 85) highRam++;
      if (tel.storage?.some(s => s.capacityBytes > 0 && (s.freeBytes / s.capacityBytes) <= 0.15)) lowDisk++;
      if (tel.cpuTempC && tel.cpuTempC >= 80) highTemp++;
    }
  });

  const openTickets = tickets.filter(t => t.status === 'Open' || t.status === 'Assigned' || t.status === 'Diagnosing' || t.status === 'In Repair').length;
  const resolvedTickets = tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length;

  const summary: DashboardSummary = {
    overallHealthScore: scoredDevices.length ? Math.round(scoredDevices.reduce((sum, score) => sum + score, 0) / scoredDevices.length) : null,
    totalDevices: devices.length,
    onlineDevices: online,
    offlineDevices: offline,
    warningDevices: warning,
    criticalDevices: critical,
    maintenanceDevices: maintenance,
    waitingDevices: waiting,
    openTickets,
    resolvedTickets,
    activeIssues: issues.length,
    criticalIssues: issues.filter(i => i.severity === 'Critical').length,
    devicesWithLowStorage: lowDisk,
    devicesWithHighCpu: highCpu,
    devicesWithHighMemory: highRam,
    devicesWithHighTemp: highTemp,
    statusDistribution: [
      { status: 'Online', count: online, color: '#10B981' },
      { status: 'Warning', count: warning, color: '#F59E0B' },
      { status: 'Critical', count: critical, color: '#EF4444' },
      { status: 'Offline', count: offline, color: '#6B7280' },
      { status: 'Maintenance', count: maintenance, color: '#8B5CF6' },
      { status: 'Waiting Agent', count: waiting, color: '#3B82F6' }
    ],
    problemsByType: [
      { type: 'High CPU', count: issues.filter(i => i.ruleCode === 'HIGH_CPU_USAGE').length },
      { type: 'High RAM', count: issues.filter(i => i.ruleCode === 'HIGH_RAM_USAGE').length },
      { type: 'Low Storage', count: issues.filter(i => i.ruleCode === 'LOW_DISK_SPACE').length },
      { type: 'Overheating', count: issues.filter(i => i.ruleCode === 'HIGH_CPU_TEMP' || i.ruleCode === 'HIGH_GPU_TEMP').length },
      { type: 'Offline Timeout', count: issues.filter(i => i.ruleCode === 'DEVICE_OFFLINE').length },
      { type: 'Battery / Other', count: issues.filter(i => i.ruleCode === 'LOW_BATTERY' || i.ruleCode === 'BATTERY_DEGRADED' || i.ruleCode === 'DISK_SMART_WARNING').length }
    ],
    problemsBySeverity: [
      { severity: 'Critical', count: issues.filter(i => i.severity === 'Critical').length },
      { severity: 'High', count: issues.filter(i => i.severity === 'High').length },
      { severity: 'Medium', count: issues.filter(i => i.severity === 'Medium').length },
      { severity: 'Low', count: issues.filter(i => i.severity === 'Low').length },
      { severity: 'Informational', count: issues.filter(i => i.severity === 'Informational').length }
    ],
    recentAlerts: data.notifications.slice(0, 10),
    recentTickets: tickets.slice(0, 8)
  };

  return res.json(summary);
});

// CSV / Report Exports
router.get('/export/:type', (req, res) => {
  const { type } = req.params;
  const data = db.get();

  let csvContent = '';
  let filename = 'export.csv';

  if (type === 'devices') {
    filename = `devices-inventory-${new Date().toISOString().split('T')[0]}.csv`;
    csvContent = 'Asset ID,Device Name,Device Type,Assigned User,Department,Location,Status,IP Address,Operating System,Last Heartbeat\n';
    
    data.devices.forEach(d => {
      const dept = data.departments.find(dep => dep.id === d.departmentId)?.name || 'N/A';
      const loc = data.locations.find(l => l.id === d.locationId)?.name || 'N/A';
      csvContent += `"${d.assetId}","${d.deviceName}","${d.deviceType}","${d.assignedUser}","${dept}","${loc}","${d.status}","${d.ipAddress || 'N/A'}","${d.operatingSystem}","${d.lastHeartbeatAt || 'Never'}"\n`;
    });
  } else if (type === 'issues') {
    filename = `diagnostic-issues-${new Date().toISOString().split('T')[0]}.csv`;
    csvContent = 'Issue ID,Device,Asset ID,Severity,Status,Rule,Metric Value,Threshold,Detected At,Resolved At\n';
    
    data.diagnosticIssues.forEach(i => {
      csvContent += `"${i.id}","${i.deviceName}","${i.assetId}","${i.severity}","${i.status}","${i.title}","${i.evidence.currentValue}","${i.evidence.thresholdValue}","${i.detectedAt}","${i.resolvedAt || 'Active'}"\n`;
    });
  } else if (type === 'tickets') {
    filename = `repair-tickets-${new Date().toISOString().split('T')[0]}.csv`;
    csvContent = 'Ticket Number,Device,Asset ID,Severity,Priority,Status,Technician,Detected Date,Resolved Date,Resolution\n';
    
    data.repairTickets.forEach(t => {
      csvContent += `"${t.ticketNumber}","${t.deviceName}","${t.assetId}","${t.severity}","${t.priority}","${t.status}","${t.assignedTechnicianName || 'Unassigned'}","${t.detectedDate}","${t.resolvedDate || 'Pending'}","${(t.resolution || '').replace(/"/g, '""')}"\n`;
    });
  } else if (type === 'maintenance') {
    filename = `maintenance-history-${new Date().toISOString().split('T')[0]}.csv`;
    csvContent = 'Record Number,Device,Asset ID,Date,Technician,Problem,Diagnosis,Action Performed,Result,Parts Replaced\n';
    
    data.maintenanceRecords.forEach(m => {
      csvContent += `"${m.recordNumber}","${m.deviceName}","${m.assetId}","${m.date}","${m.technicianName}","${m.problem.replace(/"/g, '""')}","${m.diagnosis.replace(/"/g, '""')}","${m.actionPerformed.replace(/"/g, '""')}","${m.result}","${m.partsReplaced || 'None'}"\n`;
    });
  } else {
    return res.status(400).json({ error: 'Valid export types: devices, issues, tickets, maintenance' });
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(csvContent);
});

export default router;
