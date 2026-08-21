import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { 
  User, 
  Department, 
  Location, 
  Device, 
  HardwareSpecs, 
  TelemetryPayload, 
  TelemetrySnapshot,
  DiagnosticRule, 
  DiagnosticIssue, 
  RepairTicket, 
  MaintenanceRecord, 
  SystemNotification, 
  AuditLog, 
  SystemSettings 
} from '../src/types/index';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'monitoring-db.json');

export interface DatabaseSchema {
  users: (User & { passwordHash: string })[];
  departments: Department[];
  locations: Location[];
  devices: Device[];
  hardwareSpecs: Record<string, HardwareSpecs>;
  latestTelemetry: Record<string, TelemetryPayload>;
  telemetryHistory: Record<string, TelemetrySnapshot[]>;
  diagnosticRules: DiagnosticRule[];
  diagnosticIssues: DiagnosticIssue[];
  repairTickets: RepairTicket[];
  maintenanceRecords: MaintenanceRecord[];
  notifications: SystemNotification[];
  auditLogs: AuditLog[];
  settings: SystemSettings;
}

const DEFAULT_SETTINGS: SystemSettings = {
  heartbeatIntervalSec: 10,
  connectionLostThresholdSec: 25,
  offlineThresholdSec: 50,
  telemetryRetentionPoints: 120,
  autoCreateTicketOnCritical: true,
  enableSoundAlerts: true,
  agentApiUrl: ''
};

const DEFAULT_DIAGNOSTIC_RULES: DiagnosticRule[] = [
  {
    id: 'rule-cpu-high',
    code: 'HIGH_CPU_USAGE',
    name: 'High CPU Usage',
    metric: 'cpu_usage',
    thresholdValue: 85,
    thresholdUnit: '%',
    durationSeconds: 30,
    severity: 'High',
    description: 'Triggers when CPU load consistently exceeds 85% for more than 30 seconds.',
    enabled: true,
    possibleCauses: [
      'Runaway background process or infinite loop',
      'Unscheduled antivirus/malware scan or crypto-miner',
      'Heavy compiler, database query, or rendering task',
      'System service (e.g. Windows Search Indexer, TiWorker) running in degraded state'
    ],
    recommendedActions: [
      'Inspect the top CPU processes table in telemetry',
      'Terminate rogue background processes via Task Manager or remote console',
      'Check for pending Windows Updates and reboot the machine',
      'Schedule high-intensity tasks during off-peak lab hours'
    ]
  },
  {
    id: 'rule-ram-high',
    code: 'HIGH_RAM_USAGE',
    name: 'High Memory (RAM) Usage',
    metric: 'ram_usage',
    thresholdValue: 90,
    thresholdUnit: '%',
    durationSeconds: 30,
    severity: 'High',
    description: 'Triggers when physical memory consumption exceeds 90%.',
    enabled: true,
    possibleCauses: [
      'Memory leak in long-running user application or browser session',
      'Multiple heavy IDEs/virtual machines open concurrently',
      'Insufficient physical RAM installed for current lab/workload requirements'
    ],
    recommendedActions: [
      'Close unnecessary heavy applications and browser tabs',
      'Restart the offending application to clear leaked heap memory',
      'Consider upgrading physical RAM module if workload demands it'
    ]
  },
  {
    id: 'rule-disk-low',
    code: 'LOW_DISK_SPACE',
    name: 'Low Disk Space Warning',
    metric: 'disk_free_percent',
    thresholdValue: 12,
    thresholdUnit: '% free',
    durationSeconds: 0,
    severity: 'Critical',
    description: 'Triggers when primary OS drive free space falls below 12%.',
    enabled: true,
    possibleCauses: [
      'Accumulation of temporary files, crash dumps, and Windows update caches',
      'Large student project files, video recordings, or ISO images in Downloads/Documents',
      'Unpruned log directories or database dumps'
    ],
    recommendedActions: [
      'Run Windows Disk Cleanup (cleanmgr.exe) or storage optimization',
      'Clear %TEMP% and user download directories',
      'Archive or relocate non-essential student datasets to network NAS'
    ]
  },
  {
    id: 'rule-cpu-temp',
    code: 'HIGH_CPU_TEMP',
    name: 'CPU Thermal Throttling / Overheating',
    metric: 'cpu_temp',
    thresholdValue: 82,
    thresholdUnit: '°C',
    durationSeconds: 20,
    severity: 'Critical',
    description: 'Triggers when CPU package temperature exceeds 82°C.',
    enabled: true,
    possibleCauses: [
      'Blocked air intake/exhaust vents or accumulated dust inside heatsink',
      'Failed or clogged CPU cooling fan',
      'Degraded or dried thermal paste between CPU IHS and cooler',
      'High ambient room temperature in laboratory'
    ],
    recommendedActions: [
      'Check chassis fan operation and air flow immediately',
      'Clean dust filters and heatsink fins with compressed air',
      'Re-apply thermal compound on processor during scheduled maintenance',
      'Inspect lab air conditioning and ventilation'
    ]
  },
  {
    id: 'rule-gpu-temp',
    code: 'HIGH_GPU_TEMP',
    name: 'GPU Overheating',
    metric: 'gpu_temp',
    thresholdValue: 86,
    thresholdUnit: '°C',
    durationSeconds: 20,
    severity: 'High',
    description: 'Triggers when GPU temperature exceeds 86°C.',
    enabled: true,
    possibleCauses: [
      'GPU cooling fan failure or dust accumulation',
      'Heavy 3D rendering or GPU compute stress without sufficient airflow'
    ],
    recommendedActions: [
      'Inspect graphics card fans and thermal pads',
      'Reduce rendering load or improve chassis exhaust fans'
    ]
  },
  {
    id: 'rule-battery-low',
    code: 'LOW_BATTERY',
    name: 'Critical Laptop Battery',
    metric: 'battery_percentage',
    thresholdValue: 15,
    thresholdUnit: '%',
    durationSeconds: 10,
    severity: 'Medium',
    description: 'Triggers when laptop battery drops below 15% without AC power connected.',
    enabled: true,
    possibleCauses: [
      'Laptop unplugged from charging cart or workstation dock',
      'Faulty power adapter or loose charging port'
    ],
    recommendedActions: [
      'Connect laptop to charging dock immediately to prevent abrupt shutdown',
      'Verify AC adapter indicator LED is active'
    ]
  },
  {
    id: 'rule-battery-health',
    code: 'BATTERY_DEGRADED',
    name: 'Battery Health Degradation',
    metric: 'battery_health',
    thresholdValue: 60,
    thresholdUnit: '% health',
    durationSeconds: 0,
    severity: 'Low',
    description: 'Triggers when laptop maximum battery capacity degrades below 60% of original design.',
    enabled: true,
    possibleCauses: [
      'Chemical wear over high charge cycle count (>500 cycles)',
      'Swollen or defective lithium-ion battery cells'
    ],
    recommendedActions: [
      'Schedule battery replacement during preventive maintenance window',
      'Inspect chassis for signs of battery swelling'
    ]
  },
  {
    id: 'rule-device-offline',
    code: 'DEVICE_OFFLINE',
    name: 'Device Unexpectedly Offline',
    metric: 'offline_duration',
    thresholdValue: 60,
    thresholdUnit: 'seconds',
    durationSeconds: 60,
    severity: 'High',
    description: 'Triggers when a registered active PC stops reporting heartbeats for over 60 seconds.',
    enabled: true,
    possibleCauses: [
      'Computer powered off or entered sleep/hibernation',
      'Network cable disconnected or Wi-Fi dropped',
      'System crashed (BSOD / kernel panic) or frozen',
      'Monitoring agent service terminated'
    ],
    recommendedActions: [
      'Check physical power and ethernet/Wi-Fi connection',
      'Verify if user intentionally shut down the machine',
      'Inspect Windows Event Viewer for unexpected shutdown or BSOD crash codes'
    ]
  },
  {
    id: 'rule-smart-warning',
    code: 'DISK_SMART_WARNING',
    name: 'Disk SMART Health Warning',
    metric: 'smart_warning',
    thresholdValue: 1,
    thresholdUnit: 'flag',
    durationSeconds: 0,
    severity: 'Critical',
    description: 'Triggers when hard drive or SSD SMART diagnostics detect reallocated sectors or impending failure.',
    enabled: true,
    possibleCauses: [
      'Physical NAND flash degradation or bad magnetic sectors',
      'Excessive read/write error rates on storage controller'
    ],
    recommendedActions: [
      'Back up all user and system data immediately',
      'Clone drive to a new NVMe/SATA SSD and replace the failing storage unit'
    ]
  }
];

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function getInitialDatabase(): DatabaseSchema {
  const superAdminId = 'user-superadmin-01';
  const itAdminId = 'user-itadmin-01';
  const techId = 'user-tech-01';

  return {
    users: [
      {
        id: superAdminId,
        username: 'admin',
        email: 'admin@system.local',
        fullName: 'IT Chief Administrator',
        role: 'super_admin',
        passwordHash: hashPassword('admin123'),
        createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString()
      },
      {
        id: itAdminId,
        username: 'itadmin',
        email: 'itadmin@system.local',
        fullName: 'Network & Lab Administrator',
        role: 'it_admin',
        passwordHash: hashPassword('admin123'),
        createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString()
      },
      {
        id: techId,
        username: 'technician',
        email: 'tech@system.local',
        fullName: 'Hardware Support Specialist',
        role: 'technician',
        passwordHash: hashPassword('admin123'),
        createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString()
      },
      {
        id: 'user-dept-01',
        username: 'depthead',
        email: 'depthead@system.local',
        fullName: 'Dr. Sarah Connor (Computer Science Head)',
        role: 'department_head',
        departmentId: 'dept-cs-01',
        passwordHash: hashPassword('admin123'),
        createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString()
      },
      {
        id: 'user-viewer-01',
        username: 'viewer',
        email: 'viewer@system.local',
        fullName: 'Staff Inspector',
        role: 'viewer',
        passwordHash: hashPassword('admin123'),
        createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString()
      }
    ],
    departments: [
      {
        id: 'dept-cs-01',
        name: 'Computer Science & Engineering',
        code: 'CS-ENG',
        description: 'Undergraduate and Graduate Computer Laboratories',
        headName: 'Dr. Sarah Connor',
        email: 'cs-chair@institution.edu',
        createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString()
      },
      {
        id: 'dept-hr-01',
        name: 'Human Resources Management',
        code: 'HR-ADMIN',
        description: 'Personnel, Payroll, and Administrative Workstations',
        headName: 'Marcus Vance',
        email: 'hr@institution.edu',
        createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString()
      },
      {
        id: 'dept-reg-01',
        name: 'Registrar & Admissions Office',
        code: 'REG-ADM',
        description: 'Student Records and Enrollment Terminals',
        headName: 'Elena Rostova',
        email: 'registrar@institution.edu',
        createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString()
      },
      {
        id: 'dept-it-01',
        name: 'Information Technology Services',
        code: 'IT-OPS',
        description: 'Central Infrastructure, Helpdesk, and Server Ops',
        headName: 'Alex Rivera',
        email: 'it-helpdesk@institution.edu',
        createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString()
      },
      {
        id: 'dept-lib-01',
        name: 'University Library & Media Center',
        code: 'LIB-MEDIA',
        description: 'Public research terminals and student kiosks',
        headName: 'Clara Oswald',
        email: 'library@institution.edu',
        createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString()
      }
    ],
    locations: [
      {
        id: 'loc-lab-101',
        name: 'Computer Laboratory 1 (Software Dev)',
        type: 'Laboratory',
        building: 'Turing Technology Hall',
        floor: '1st Floor',
        roomNumber: 'Lab 101',
        departmentId: 'dept-cs-01',
        description: '35 Workstations configured for programming & IDEs',
        createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString()
      },
      {
        id: 'loc-lab-102',
        name: 'Computer Laboratory 2 (AI & Multimedia)',
        type: 'Laboratory',
        building: 'Turing Technology Hall',
        floor: '1st Floor',
        roomNumber: 'Lab 102',
        departmentId: 'dept-cs-01',
        description: '30 GPU-accelerated workstations for 3D modeling and AI',
        createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString()
      },
      {
        id: 'loc-hr-office',
        name: 'Human Resources Suite',
        type: 'Office',
        building: 'Administration Center',
        floor: '2nd Floor',
        roomNumber: 'Suite 204',
        departmentId: 'dept-hr-01',
        description: 'Administrative workstations and secure record terminals',
        createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString()
      },
      {
        id: 'loc-reg-office',
        name: 'Registrar Operations Desk',
        type: 'Office',
        building: 'Administration Center',
        floor: '1st Floor',
        roomNumber: 'Room 110',
        departmentId: 'dept-reg-01',
        description: 'Enrollment terminals and database query stations',
        createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString()
      },
      {
        id: 'loc-it-helpdesk',
        name: 'IT Operations & Hardware Bench',
        type: 'Workshop',
        building: 'Central Services Wing',
        floor: 'Ground Floor',
        roomNumber: 'Workshop G-12',
        departmentId: 'dept-it-01',
        description: 'Diagnostics, repair bench, and spare parts storage',
        createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString()
      }
    ],
    devices: [],
    hardwareSpecs: {},
    latestTelemetry: {},
    telemetryHistory: {},
    diagnosticRules: DEFAULT_DIAGNOSTIC_RULES,
    diagnosticIssues: [],
    repairTickets: [],
    maintenanceRecords: [],
    notifications: [],
    auditLogs: [
      {
        id: 'audit-init-01',
        userId: superAdminId,
        userName: 'IT Chief Administrator',
        userRole: 'super_admin',
        action: 'SYSTEM_INITIALIZED',
        entityType: 'Settings',
        entityId: 'system',
        details: 'PC & Laptop Monitoring & Diagnostic Management System initialized successfully.',
        ipAddress: '127.0.0.1',
        timestamp: new Date().toISOString()
      }
    ],
    settings: DEFAULT_SETTINGS
  };
}

class DatabaseStore {
  private data: DatabaseSchema;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.ensureDataDir();
    this.data = this.load();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Ensure diagnostic rules are up to date
        if (!parsed.diagnosticRules || parsed.diagnosticRules.length === 0) {
          parsed.diagnosticRules = DEFAULT_DIAGNOSTIC_RULES;
        }
        if (!parsed.settings) {
          parsed.settings = DEFAULT_SETTINGS;
        }
        return parsed;
      }
    } catch (err) {
      console.error('Error reading database file, initializing fresh store:', err);
    }
    const initial = getInitialDatabase();
    this.saveImmediate(initial);
    return initial;
  }

  public get(): DatabaseSchema {
    return this.data;
  }

  public saveImmediate(dataToSave?: DatabaseSchema) {
    if (dataToSave) {
      this.data = dataToSave;
    }
    try {
      this.ensureDataDir();
      const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  public scheduleSave() {
    if (this.saveTimeout) {
      return;
    }
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      this.saveImmediate();
    }, 500);
  }

  public addAuditLog(
    userId: string,
    userName: string,
    userRole: string,
    action: string,
    entityType: AuditLog['entityType'],
    entityId: string,
    details: string,
    ipAddress?: string
  ): AuditLog {
    const log: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId,
      userName,
      userRole,
      action,
      entityType,
      entityId,
      details,
      ipAddress,
      timestamp: new Date().toISOString()
    };
    this.data.auditLogs.unshift(log);
    // Keep max 1000 audit logs in memory
    if (this.data.auditLogs.length > 1000) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 1000);
    }
    this.scheduleSave();
    return log;
  }

  public addNotification(
    title: string,
    message: string,
    type: SystemNotification['type'],
    deviceId?: string,
    deviceName?: string,
    issueId?: string,
    ticketId?: string
  ): SystemNotification {
    const notif: SystemNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title,
      message,
      type,
      deviceId,
      deviceName,
      issueId,
      ticketId,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    this.data.notifications.unshift(notif);
    if (this.data.notifications.length > 200) {
      this.data.notifications = this.data.notifications.slice(0, 200);
    }
    this.scheduleSave();
    return notif;
  }
}

export const db = new DatabaseStore();
export { hashPassword };
