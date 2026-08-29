import { db } from './db';
import { 
  Device, 
  TelemetryPayload, 
  DiagnosticIssue, 
  DiagnosticRuleCode, 
  Severity,
  RepairTicket 
} from '../src/types/index';

export class DiagnosticEngine {
  /**
   * Evaluates telemetry payload from an agent against all active diagnostic rules.
   */
  public static processTelemetry(device: Device, telemetry: TelemetryPayload) {
    const data = db.get();
    const rules = data.diagnosticRules.filter(r => r.enabled);
    const triggeredRuleCodes = new Set<DiagnosticRuleCode>();

    const location = data.locations.find(l => l.id === device.locationId);
    const department = data.departments.find(d => d.id === device.departmentId);
    const locationName = location ? location.name : 'Unassigned Location';
    const departmentName = department ? department.name : 'Unassigned Department';

    // 1. CPU Rule
    const cpuRule = rules.find(r => r.code === 'HIGH_CPU_USAGE');
    if (cpuRule && telemetry.cpuUsagePercent >= cpuRule.thresholdValue) {
      triggeredRuleCodes.add('HIGH_CPU_USAGE');
      this.ensureIssue(device, locationName, departmentName, cpuRule, {
        metric: 'CPU Load',
        currentValue: `${telemetry.cpuUsagePercent.toFixed(1)}%`,
        thresholdValue: `${cpuRule.thresholdValue}%`,
        details: `Sustained high processor load detected (${telemetry.cpuUsagePercent.toFixed(1)}%). Top process: ${telemetry.processes?.[0]?.name || 'Unknown'} (${telemetry.processes?.[0]?.cpuPercent || 0}% CPU).`
      });
    }

    // 2. RAM Rule
    const ramRule = rules.find(r => r.code === 'HIGH_RAM_USAGE');
    if (ramRule && telemetry.ramUsagePercent >= ramRule.thresholdValue) {
      triggeredRuleCodes.add('HIGH_RAM_USAGE');
      const usedGb = (telemetry.ramUsedBytes / (1024 ** 3)).toFixed(1);
      const totalGb = (telemetry.ramTotalBytes / (1024 ** 3)).toFixed(1);
      this.ensureIssue(device, locationName, departmentName, ramRule, {
        metric: 'Memory Usage',
        currentValue: `${telemetry.ramUsagePercent.toFixed(1)}% (${usedGb} GB / ${totalGb} GB)`,
        thresholdValue: `${ramRule.thresholdValue}%`,
        details: `Physical memory is near exhaustion (${telemetry.ramUsagePercent.toFixed(1)}%). System responsiveness is severely degraded.`
      });
    }

    // 3. Low Disk Space Rule
    const diskRule = rules.find(r => r.code === 'LOW_DISK_SPACE');
    if (diskRule && telemetry.storage && telemetry.storage.length > 0) {
      const lowDrives = telemetry.storage.filter(d => {
        const freePercent = d.capacityBytes > 0 ? (d.freeBytes / d.capacityBytes) * 100 : 100;
        return freePercent <= diskRule.thresholdValue;
      });

      if (lowDrives.length > 0) {
        triggeredRuleCodes.add('LOW_DISK_SPACE');
        const driveDetails = lowDrives.map(d => {
          const freeGb = (d.freeBytes / (1024 ** 3)).toFixed(1);
          const capGb = (d.capacityBytes / (1024 ** 3)).toFixed(1);
          const freePct = ((d.freeBytes / d.capacityBytes) * 100).toFixed(1);
          return `Drive ${d.drive} (${freeGb} GB free of ${capGb} GB, ${freePct}% free)`;
        }).join(', ');

        this.ensureIssue(device, locationName, departmentName, diskRule, {
          metric: 'Storage Free Space',
          currentValue: `${((lowDrives[0].freeBytes / lowDrives[0].capacityBytes) * 100).toFixed(1)}% free`,
          thresholdValue: `${diskRule.thresholdValue}% free`,
          details: `Critically low storage remaining on partition: ${driveDetails}.`
        });
      }
    }

    // 4. CPU Temperature Rule
    const cpuTempRule = rules.find(r => r.code === 'HIGH_CPU_TEMP');
    if (cpuTempRule && telemetry.cpuTempC && telemetry.cpuTempC >= cpuTempRule.thresholdValue) {
      triggeredRuleCodes.add('HIGH_CPU_TEMP');
      this.ensureIssue(device, locationName, departmentName, cpuTempRule, {
        metric: 'CPU Package Temperature',
        currentValue: `${telemetry.cpuTempC.toFixed(1)}°C`,
        thresholdValue: `${cpuTempRule.thresholdValue}°C`,
        details: `Core temperature reached ${telemetry.cpuTempC.toFixed(1)}°C, exceeding safe thermal design limit (${cpuTempRule.thresholdValue}°C). Risk of thermal throttling or emergency power-down.`
      });
    }

    // 5. Cooling Fan Rule. Some laptops stop fans at idle, so only flag a
    // low reading when the processor is already hot.
    const fanRule = rules.find(r => r.code === 'FAN_FAILURE');
    if (fanRule && telemetry.cpuTempC !== undefined && telemetry.cpuTempC >= 70 && telemetry.fanSpeedRpm !== undefined && telemetry.fanSpeedRpm < fanRule.thresholdValue) {
      triggeredRuleCodes.add('FAN_FAILURE');
      this.ensureIssue(device, locationName, departmentName, fanRule, {
        metric: 'Cooling Fan Speed',
        currentValue: `${telemetry.fanSpeedRpm} RPM at ${telemetry.cpuTempC.toFixed(1)}°C`,
        thresholdValue: `${fanRule.thresholdValue} RPM minimum`,
        details: `The processor is at ${telemetry.cpuTempC.toFixed(1)}°C while the reported fan speed is only ${telemetry.fanSpeedRpm} RPM. Cooling may be obstructed or failing.`
      });
    }

    // 6. GPU Temperature Rule
    const gpuTempRule = rules.find(r => r.code === 'HIGH_GPU_TEMP');
    if (gpuTempRule && telemetry.gpuTempC && telemetry.gpuTempC >= gpuTempRule.thresholdValue) {
      triggeredRuleCodes.add('HIGH_GPU_TEMP');
      this.ensureIssue(device, locationName, departmentName, gpuTempRule, {
        metric: 'GPU Temperature',
        currentValue: `${telemetry.gpuTempC.toFixed(1)}°C`,
        thresholdValue: `${gpuTempRule.thresholdValue}°C`,
        details: `Graphics processor temperature reached ${telemetry.gpuTempC.toFixed(1)}°C.`
      });
    }

    // 6. Battery Critical / Low
    const batteryLowRule = rules.find(r => r.code === 'LOW_BATTERY');
    if (batteryLowRule && telemetry.battery && telemetry.battery.present && !telemetry.battery.isCharging && telemetry.battery.percentage <= batteryLowRule.thresholdValue) {
      triggeredRuleCodes.add('LOW_BATTERY');
      this.ensureIssue(device, locationName, departmentName, batteryLowRule, {
        metric: 'Battery Percentage',
        currentValue: `${telemetry.battery.percentage}% (Discharging)`,
        thresholdValue: `${batteryLowRule.thresholdValue}%`,
        details: `Laptop is running on critical battery (${telemetry.battery.percentage}%) and not connected to AC mains power.`
      });
    }

    // 7. Battery Degraded Health
    const batteryHealthRule = rules.find(r => r.code === 'BATTERY_DEGRADED');
    if (batteryHealthRule && telemetry.battery && telemetry.battery.present && telemetry.battery.healthPercent > 0 && telemetry.battery.healthPercent <= batteryHealthRule.thresholdValue) {
      triggeredRuleCodes.add('BATTERY_DEGRADED');
      this.ensureIssue(device, locationName, departmentName, batteryHealthRule, {
        metric: 'Battery Maximum Capacity Health',
        currentValue: `${telemetry.battery.healthPercent}% health`,
        thresholdValue: `${batteryHealthRule.thresholdValue}%`,
        details: `Battery wear level indicates maximum capacity has degraded to ${telemetry.battery.healthPercent}% of original factory spec.`
      });
    }

    // 8. Disk SMART Health
    const smartRule = rules.find(r => r.code === 'DISK_SMART_WARNING');
    if (smartRule && telemetry.storage) {
      const failingDrive = telemetry.storage.find(d => d.health === 'Failing' || d.health === 'Warning' || (d.smartStatus && d.smartStatus.toLowerCase().includes('bad')));
      if (failingDrive) {
        triggeredRuleCodes.add('DISK_SMART_WARNING');
        this.ensureIssue(device, locationName, departmentName, smartRule, {
          metric: 'SMART Storage Diagnostics',
          currentValue: failingDrive.health,
          thresholdValue: 'Healthy',
          details: `Drive ${failingDrive.drive} reported SMART diagnosis status: ${failingDrive.smartStatus || failingDrive.health}. Potential drive failure.`
        });
      }
    }

    // If any active issues for this device are NOT currently triggered in this telemetry payload,
    // we resolve them automatically (except offline or manual issues).
    const autoResolvableCodes: DiagnosticRuleCode[] = [
      'HIGH_CPU_USAGE', 
      'HIGH_RAM_USAGE', 
      'LOW_DISK_SPACE', 
      'HIGH_CPU_TEMP', 
      'FAN_FAILURE',
      'HIGH_GPU_TEMP', 
      'LOW_BATTERY'
    ];

    for (const issue of data.diagnosticIssues) {
      if (issue.deviceId === device.id && issue.status === 'Active' && autoResolvableCodes.includes(issue.ruleCode)) {
        if (!triggeredRuleCodes.has(issue.ruleCode)) {
          // Condition resolved
          issue.status = 'Resolved';
          issue.resolvedAt = new Date().toISOString();
          db.addNotification(
            `Issue Cleared: ${device.deviceName}`,
            `The condition for "${issue.title}" has returned to normal operational levels.`,
            'info',
            device.id,
            device.deviceName,
            issue.id
          );
        }
      }
    }

    // If device was previously offline issue, clear it since we received real telemetry
    const offlineIssue = data.diagnosticIssues.find(i => i.deviceId === device.id && i.ruleCode === 'DEVICE_OFFLINE' && i.status === 'Active');
    if (offlineIssue) {
      offlineIssue.status = 'Resolved';
      offlineIssue.resolvedAt = new Date().toISOString();
    }

    // Update Device Status dynamically
    this.recalculateDeviceStatus(device);
  }

  private static ensureIssue(
    device: Device, 
    locationName: string, 
    departmentName: string, 
    rule: any, 
    evidence: { metric: string; currentValue: string | number; thresholdValue: string | number; details: string }
  ) {
    const data = db.get();
    let existingIssue = data.diagnosticIssues.find(i => i.deviceId === device.id && i.ruleCode === rule.code && i.status === 'Active');

    if (existingIssue) {
      // Update evidence
      existingIssue.evidence = evidence;
      return existingIssue;
    }

    // Create new issue
    const newIssue: DiagnosticIssue = {
      id: `issue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      deviceId: device.id,
      deviceName: device.deviceName,
      assetId: device.assetId,
      locationName,
      departmentName,
      ruleCode: rule.code,
      title: `${rule.name}: ${device.deviceName}`,
      severity: rule.severity as Severity,
      status: 'Active',
      detectedAt: new Date().toISOString(),
      evidence,
      possibleCauses: rule.possibleCauses || [],
      recommendedActions: rule.recommendedActions || []
    };

    data.diagnosticIssues.unshift(newIssue);

    // Add Notification
    db.addNotification(
      `[${rule.severity.toUpperCase()}] ${rule.name} on ${device.deviceName}`,
      evidence.details,
      rule.severity === 'Critical' ? 'critical' : 'warning',
      device.id,
      device.deviceName,
      newIssue.id
    );

    // Add Audit Log
    db.addAuditLog(
      'system-engine',
      'Diagnostic Engine',
      'system',
      'ISSUE_DETECTED',
      'Diagnostic',
      newIssue.id,
      `Detected ${rule.name} on device ${device.deviceName} (${device.assetId}). Metric: ${evidence.currentValue} (Threshold: ${evidence.thresholdValue})`
    );

    // Auto-create ticket if configured
    if (data.settings.autoCreateTicketOnCritical && rule.severity === 'Critical') {
      this.autoCreateTicket(device, newIssue);
    }

    db.scheduleSave();
    return newIssue;
  }

  private static autoCreateTicket(device: Device, issue: DiagnosticIssue) {
    const data = db.get();
    // Check if open ticket for this issue exists
    const existingTicket = data.repairTickets.find(t => t.deviceId === device.id && t.issueId === issue.id && t.status !== 'Closed' && t.status !== 'Resolved');
    if (existingTicket) return;

    const count = data.repairTickets.length + 1;
    const ticketNumber = `TKT-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

    const newTicket: RepairTicket = {
      id: `ticket-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ticketNumber,
      deviceId: device.id,
      deviceName: device.deviceName,
      assetId: device.assetId,
      issueId: issue.id,
      title: `Critical Fault: ${issue.title}`,
      severity: issue.severity,
      priority: 'Urgent',
      description: `Automated Incident Ticket generated by Diagnostic Management Engine.\n\nEvidence: ${issue.evidence.details}\nMetric: ${issue.evidence.currentValue}\nRecommended Action: ${issue.recommendedActions[0] || 'Inspect hardware immediately.'}`,
      status: 'Open',
      detectedDate: issue.detectedAt,
      notes: [
        {
          id: `note-${Date.now()}`,
          userId: 'system',
          userName: 'System Diagnostic Automation',
          userRole: 'system',
          text: `Auto-generated ticket following critical diagnostic rule violation [${issue.ruleCode}].`,
          createdAt: new Date().toISOString()
        }
      ],
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    data.repairTickets.unshift(newTicket);
    issue.ticketId = newTicket.id;

    db.addNotification(
      `Repair Ticket Created: ${ticketNumber}`,
      `Automatic incident ticket opened for critical issue on ${device.deviceName}.`,
      'ticket',
      device.id,
      device.deviceName,
      issue.id,
      newTicket.id
    );

    db.addAuditLog(
      'system-engine',
      'Diagnostic Engine',
      'system',
      'TICKET_AUTO_CREATED',
      'Ticket',
      newTicket.id,
      `Auto-created ticket ${ticketNumber} for critical diagnostic issue on ${device.deviceName}.`
    );
  }

  public static recalculateDeviceStatus(device: Device) {
    const data = db.get();
    if (device.status === 'Waiting for Agent Connection') {
      return;
    }
    if (device.status === 'Maintenance') {
      return;
    }

    if (device.connectionState === 'offline') {
      device.status = 'Offline';
      return;
    }

    const activeIssues = data.diagnosticIssues.filter(i => i.deviceId === device.id && i.status === 'Active');
    const hasCritical = activeIssues.some(i => i.severity === 'Critical');
    const hasWarning = activeIssues.some(i => i.severity === 'High' || i.severity === 'Medium');

    if (hasCritical) {
      device.status = 'Critical';
    } else if (hasWarning) {
      device.status = 'Warning';
    } else {
      device.status = 'Online';
    }

    device.activeIssueCount = activeIssues.length;
    device.openTicketCount = data.repairTickets.filter(t => t.deviceId === device.id && (t.status === 'Open' || t.status === 'Assigned' || t.status === 'Diagnosing' || t.status === 'In Repair')).length;
  }

  /**
   * Heartbeat monitor called on periodic intervals by server
   */
  public static checkHeartbeats() {
    const data = db.get();
    const now = Date.now();
    const settings = data.settings;

    for (const device of data.devices) {
      if (device.status === 'Waiting for Agent Connection' || device.status === 'Maintenance') {
        continue;
      }

      if (!device.lastHeartbeatAt) {
        continue;
      }

      const lastHeartbeatTime = new Date(device.lastHeartbeatAt).getTime();
      const elapsedSeconds = (now - lastHeartbeatTime) / 1000;

      if (elapsedSeconds > settings.offlineThresholdSec) {
        // Device is offline
        if (device.connectionState !== 'offline') {
          device.connectionState = 'offline';
          device.status = 'Offline';
          device.offlineSince = new Date().toISOString();

          // Create Offline Issue
          const offlineRule = data.diagnosticRules.find(r => r.code === 'DEVICE_OFFLINE');
          if (offlineRule) {
            const loc = data.locations.find(l => l.id === device.locationId);
            const dept = data.departments.find(d => d.id === device.departmentId);
            this.ensureIssue(device, loc ? loc.name : 'Unknown', dept ? dept.name : 'Unknown', offlineRule, {
              metric: 'Heartbeat Timeout',
              currentValue: `${Math.round(elapsedSeconds)}s without heartbeat`,
              thresholdValue: `${settings.offlineThresholdSec}s`,
              details: `Agent connection lost. Device has stopped sending heartbeats for ${Math.round(elapsedSeconds)} seconds (threshold: ${settings.offlineThresholdSec}s).`
            });
          }

          db.addNotification(
            `Device Offline: ${device.deviceName}`,
            `${device.deviceName} (${device.assetId}) has gone offline. No heartbeat received for ${Math.round(elapsedSeconds)} seconds.`,
            'offline',
            device.id,
            device.deviceName
          );

          db.addAuditLog(
            'system-engine',
            'Heartbeat Monitor',
            'system',
            'DEVICE_OFFLINE',
            'Device',
            device.id,
            `Device ${device.deviceName} (${device.assetId}) marked Offline after ${Math.round(elapsedSeconds)}s heartbeat silence.`
          );

          db.scheduleSave();
        }
      } else if (elapsedSeconds > settings.connectionLostThresholdSec) {
        if (device.connectionState === 'connected') {
          device.connectionState = 'connection_lost';
          db.scheduleSave();
        }
      } else {
        if (device.connectionState !== 'connected') {
          device.connectionState = 'connected';
          this.recalculateDeviceStatus(device);
          db.scheduleSave();
        }
      }
    }
  }
}
