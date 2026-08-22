export type UserRole = 
  | 'super_admin' 
  | 'it_admin' 
  | 'technician' 
  | 'department_head' 
  | 'viewer';

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  departmentId?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  headName: string;
  email: string;
  deviceCount?: number;
  createdAt: string;
}

export type LocationType = 'Laboratory' | 'Office' | 'Classroom' | 'Server Room' | 'Library' | 'Workshop';

export interface Location {
  id: string;
  name: string;
  type: LocationType;
  building: string;
  floor: string;
  roomNumber: string;
  departmentId?: string;
  description: string;
  deviceCount?: number;
  createdAt: string;
}

export type DeviceType = 'Desktop' | 'Laptop' | 'Workstation' | 'Mini PC' | 'All-in-One' | 'Server';

export type DeviceStatus = 'Online' | 'Offline' | 'Warning' | 'Critical' | 'Maintenance' | 'Waiting for Agent Connection';

export type ConnectionState = 'connected' | 'connection_lost' | 'offline' | 'never_connected';

export interface StorageDevice {
  drive: string;
  label?: string;
  capacityBytes: number;
  usedBytes: number;
  freeBytes: number;
  fsType: string;
  health: 'Healthy' | 'Warning' | 'Failing' | 'Unknown';
  smartStatus?: string;
  usagePercent: number;
}

export interface BatteryInfo {
  present: boolean;
  percentage: number;
  isCharging: boolean;
  healthPercent: number;
  cycleCount?: number;
  timeRemainingMin?: number;
  voltage?: number;
  technology?: string;
}

export interface NetworkInfo {
  ip: string;
  mac: string;
  adapterName: string;
  isConnected: boolean;
  bytesInPerSec?: number;
  bytesOutPerSec?: number;
  linkSpeedMbps?: number;
  gateway?: string;
  dns?: string[];
}

export interface ProcessItem {
  pid: number;
  name: string;
  cpuPercent: number;
  memMb: number;
  memPercent?: number;
  user?: string;
  status?: string;
}

export interface HardwareSpecs {
  deviceId: string;
  cpuModel?: string;
  cpuCores?: number;
  cpuLogicalCores?: number;
  cpuBaseSpeedGhz?: number;
  ramTotalBytes?: number;
  ramType?: string;
  storageDevices: StorageDevice[];
  gpuModel?: string;
  gpuMemoryBytes?: number;
  motherboard?: string;
  biosVersion?: string;
  systemArchitecture?: string;
  osVersion?: string;
  osBuild?: string;
  lastUpdated: string;
}

export interface TelemetryPayload {
  deviceId: string;
  timestamp: string;
  cpuUsagePercent: number;
  cpuTempC?: number;
  ramUsedBytes: number;
  ramTotalBytes: number;
  ramUsagePercent: number;
  storage: StorageDevice[];
  gpuUsagePercent?: number;
  gpuTempC?: number;
  battery?: BatteryInfo;
  network: NetworkInfo;
  uptimeSeconds: number;
  lastBootTime: string;
  processes: ProcessItem[];
  fanSpeedRpm?: number;
  motherboardTempC?: number;
}

export interface TelemetrySnapshot {
  timestamp: string;
  cpuUsagePercent: number;
  cpuTempC?: number;
  ramUsagePercent: number;
  networkInKbps?: number;
  networkOutKbps?: number;
}

export interface Device {
  id: string;
  registrationCode: string;
  deviceToken: string;
  deviceName: string;
  assetId: string;
  deviceType: DeviceType;
  assignedUser: string;
  departmentId: string;
  locationId: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  operatingSystem: string;
  purchaseDate?: string;
  warrantyExpiration?: string;
  status: DeviceStatus;
  connectionState: ConnectionState;
  notes: string;
  registeredAt: string;
  lastHeartbeatAt?: string;
  lastOnlineAt?: string;
  offlineSince?: string;
  ipAddress?: string;
  macAddress?: string;
  specs?: HardwareSpecs;
  latestTelemetry?: TelemetryPayload;
  activeIssueCount?: number;
  openTicketCount?: number;
  health?: {
    score: number | null;
    level: 'Excellent' | 'Good' | 'Attention Required' | 'Warning' | 'Critical' | 'Unavailable';
    reasons: string[];
    recommendations: string[];
    calculatedAt: string;
  };
}

export type Severity = 'Informational' | 'Low' | 'Medium' | 'High' | 'Critical';

export type DiagnosticRuleCode = 
  | 'HIGH_CPU_USAGE'
  | 'HIGH_RAM_USAGE'
  | 'LOW_DISK_SPACE'
  | 'HIGH_CPU_TEMP'
  | 'HIGH_GPU_TEMP'
  | 'LOW_BATTERY'
  | 'BATTERY_DEGRADED'
  | 'DISK_SMART_WARNING'
  | 'DEVICE_OFFLINE'
  | 'NETWORK_UNSTABLE';

export interface DiagnosticRule {
  id: string;
  code: DiagnosticRuleCode;
  name: string;
  metric: string;
  thresholdValue: number;
  thresholdUnit: string;
  durationSeconds: number;
  severity: Severity;
  description: string;
  enabled: boolean;
  possibleCauses: string[];
  recommendedActions: string[];
}

export type IssueStatus = 'Active' | 'Investigating' | 'Acknowledged' | 'Resolved';

export interface DiagnosticIssue {
  id: string;
  deviceId: string;
  deviceName: string;
  assetId: string;
  locationName: string;
  departmentName: string;
  ruleCode: DiagnosticRuleCode;
  title: string;
  severity: Severity;
  status: IssueStatus;
  detectedAt: string;
  resolvedAt?: string;
  evidence: {
    metric: string;
    currentValue: string | number;
    thresholdValue: string | number;
    durationDescription?: string;
    details: string;
  };
  possibleCauses: string[];
  recommendedActions: string[];
  ticketId?: string;
}

export type TicketStatus = 
  | 'Open' 
  | 'Assigned' 
  | 'Diagnosing' 
  | 'In Repair' 
  | 'Waiting for Parts' 
  | 'Resolved' 
  | 'Closed';

export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface TicketNote {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  text: string;
  createdAt: string;
}

export interface TicketAttachment {
  id: string;
  name: string;
  size: string;
  type: string;
  url: string;
  uploadedAt: string;
}

export interface RepairTicket {
  id: string;
  ticketNumber: string;
  deviceId: string;
  deviceName: string;
  assetId: string;
  issueId?: string;
  title: string;
  severity: Severity;
  priority: TicketPriority;
  description: string;
  status: TicketStatus;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  detectedDate: string;
  startedDate?: string;
  resolvedDate?: string;
  closedDate?: string;
  resolution?: string;
  verificationStatus?: 'Pending' | 'Passed' | 'Failed';
  verifiedAt?: string;
  verifiedBy?: string;
  notes: TicketNote[];
  attachments: TicketAttachment[];
  createdAt: string;
  updatedAt: string;
}

export type MaintenanceResult = 'Resolved' | 'Partially Resolved' | 'Requires Further Work' | 'Hardware Replaced' | 'Routine Maintenance Complete';

export interface MaintenanceRecord {
  id: string;
  recordNumber: string;
  deviceId: string;
  deviceName: string;
  assetId: string;
  ticketId?: string;
  ticketNumber?: string;
  date: string;
  technicianId: string;
  technicianName: string;
  problem: string;
  diagnosis: string;
  actionPerformed: string;
  partsReplaced?: string;
  softwareInstalled?: string;
  result: MaintenanceResult;
  notes: string;
  createdAt: string;
}

export type NotificationType = 'info' | 'warning' | 'critical' | 'ticket' | 'offline';

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  deviceId?: string;
  deviceName?: string;
  issueId?: string;
  ticketId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  entityType: 'Device' | 'Agent' | 'Ticket' | 'Diagnostic' | 'Maintenance' | 'User' | 'Settings' | 'Department' | 'Location';
  entityId: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

export interface SystemSettings {
  heartbeatIntervalSec: number;
  connectionLostThresholdSec: number;
  offlineThresholdSec: number;
  telemetryRetentionPoints: number;
  autoCreateTicketOnCritical: boolean;
  enableSoundAlerts: boolean;
  agentApiUrl: string;
}

export interface DashboardSummary {
  overallHealthScore?: number | null;
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  warningDevices: number;
  criticalDevices: number;
  maintenanceDevices: number;
  waitingDevices: number;
  openTickets: number;
  resolvedTickets: number;
  activeIssues: number;
  criticalIssues: number;
  devicesWithLowStorage: number;
  devicesWithHighCpu: number;
  devicesWithHighMemory: number;
  devicesWithHighTemp: number;
  statusDistribution: { status: string; count: number; color: string }[];
  problemsByType: { type: string; count: number }[];
  problemsBySeverity: { severity: string; count: number }[];
  recentAlerts: SystemNotification[];
  recentTickets: RepairTicket[];
}
