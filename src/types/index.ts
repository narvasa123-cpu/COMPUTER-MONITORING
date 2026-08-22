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
  ip?: string | null;
  mac?: string | null;
  adapterName?: string | null;
  isConnected?: boolean | null;
  bytesInPerSec?: number;
  bytesOutPerSec?: number;
  linkSpeedMbps?: number;
  gateway?: string;
  dns?: string[];
}

export type NetworkDiagnosticStatus = 'ONLINE' | 'LIMITED' | 'NO INTERNET' | 'LOCAL NETWORK ERROR' | 'DNS ERROR' | 'DISCONNECTED' | 'CRITICAL' | 'UNAVAILABLE';
export type NetworkTestResult = 'PASS' | 'FAIL' | 'UNAVAILABLE';

export interface WifiDiagnostics {
  available: boolean;
  adapterName?: string | null;
  adapterStatus?: string | null;
  connectionState?: string | null;
  ssid?: string | null;
  bssid?: string | null;
  signalQuality?: number | null;
  radioType?: string | null;
  band?: string | null;
  frequencyMhz?: number | null;
  linkSpeedMbps?: number | null;
  receiveLinkSpeedMbps?: number | null;
  transmitLinkSpeedMbps?: number | null;
  ipv4?: string | null;
  ipv6?: string | null;
  subnetMask?: string | null;
  defaultGateway?: string | null;
  defaultGatewayIpv6?: string | null;
  dnsServers?: string[];
  dhcpEnabled?: boolean | null;
  dhcpServer?: string | null;
  networkProfile?: string | null;
  networkCategory?: string | null;
  mac?: string | null;
  connectionObservedSince?: string | null;
  connectionDurationSeconds?: number | null;
  gatewayReachable?: boolean | null;
  dnsResolution?: boolean | null;
  internetReachable?: boolean | null;
  internetIcmpReachable?: boolean | null;
  internetHttpReachable?: boolean | null;
  packetLossPercent?: number | null;
  avgLatencyMs?: number | null;
  minLatencyMs?: number | null;
  maxLatencyMs?: number | null;
  failedProbes?: number | null;
  responseTimeMs?: number | null;
  testedAt?: string | null;
}

export interface NetworkDiagnosticTest {
  result: NetworkTestResult;
  detail: string;
}

export interface NetworkDiagnosticResult {
  id?: string;
  status: NetworkDiagnosticStatus;
  code: string;
  severity: Severity;
  confidence: 'High' | 'Medium' | 'Low';
  diagnosis: string;
  analysis: string;
  evidence: string[];
  recommendedActions: string[];
  tests: Record<string, NetworkDiagnosticTest>;
  wifi?: WifiDiagnostics | null;
  sourceTimestamp?: string;
  receivedAt?: string;
}

export interface NetworkDiagnosticsResponse {
  deviceId: string;
  agentStatus: 'CONNECTED' | 'OFFLINE';
  lastHeartbeatAt?: string | null;
  lastNetworkTestAt?: string | null;
  lastNetworkTestReceivedAt?: string | null;
  lastSuccessfulNetworkTestAt?: string | null;
  telemetryStale: boolean;
  networkDiagnosticIntervalSec: number;
  supportsOnDemandNetworkDiagnostics: boolean;
  pendingCommand?: { id: string; status: 'queued' | 'dispatched'; scope?: string; requestedAt?: string } | null;
  lastCommand?: { id: string; status: 'queued' | 'dispatched' | 'completed' | 'expired'; scope?: string; requestedAt?: string; completedAt?: string; expiredAt?: string } | null;
  current: NetworkDiagnosticResult | null;
  history: NetworkDiagnosticResult[];
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
  wifiDiagnostics?: WifiDiagnostics;
  commandResults?: Array<{ id: string; type: string; status: string; scope?: string }>;
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
  /** Last version actually reported by the monitoring agent. Never infer this from an asset record. */
  agentVersion?: string;
  /** Capabilities actually advertised by the agent during registration or telemetry. */
  agentCapabilities?: string[];
  /**
   * Lifecycle of an agent update request. `verified` is set only after a fresh
   * agent heartbeat reports the expected version/capabilities.
   */
  agentUpdateStatus?: 'queued' | 'dispatched' | 'package_delivered' | 'bootstrap_downloaded' | 'manual_package_downloaded' | 'awaiting_verification' | 'verified' | 'failed';
  agentUpdateTargetVersion?: string;
  agentUpdateCommandId?: string;
  agentUpdateRequestedAt?: string;
  agentUpdateVerifiedAt?: string;
  agentUpdatePackageDeliveredAt?: string;
  agentUpdateFailureReason?: string;
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
  networkHistoryRetentionPoints: number;
  networkDiagnosticIntervalSec: number;
  networkWeakSignalThresholdPercent: number;
  networkHighLatencyMs: number;
  networkPacketLossThresholdPercent: number;
  networkIncidentCooldownSec: number;
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
  networkHealth?: {
    monitoredDevices: number;
    online: number;
    limited: number;
    noInternet: number;
    localNetworkError: number;
    dnsError: number;
    disconnected: number;
    critical: number;
    activeIncidents: number;
    unavailable: number;
    stale: number;
    clusters: Array<{ locationId: string; locationName: string; affectedDevices: number; activeIssues: number; detectedWithinMinutes: number; possibleSharedCause: string }>;
  };
  statusDistribution: { status: string; count: number; color: string }[];
  problemsByType: { type: string; count: number }[];
  problemsBySeverity: { severity: string; count: number }[];
  recentAlerts: SystemNotification[];
  recentTickets: RepairTicket[];
}
