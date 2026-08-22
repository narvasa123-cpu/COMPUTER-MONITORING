export type DevicePurgeState = Record<string, unknown>;
type StateRecord = Record<string, unknown>;

export interface DevicePurgeResult {
  deviceId: string;
  summary: Record<string, number>;
}

const recordList = (value: unknown): StateRecord[] => Array.isArray(value)
  ? value.filter((item): item is StateRecord => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
  : [];

const valueId = (value: unknown) => value === undefined || value === null ? '' : String(value).trim();

const idsFrom = (records: StateRecord[], ids: Set<string>) => {
  for (const record of records) {
    const recordId = valueId(record.id);
    if (recordId) ids.add(recordId);
  }
};

const deleteKeyedDeviceData = (state: DevicePurgeState, key: string, deviceId: string, summary: Record<string, number>) => {
  const bucket = state[key];
  if (!bucket || typeof bucket !== 'object' || Array.isArray(bucket)) {
    summary[key] = 0;
    return;
  }
  const records = bucket as Record<string, unknown>;
  const value = records[deviceId];
  summary[key] = Array.isArray(value) ? value.length : value === undefined ? 0 : 1;
  delete records[deviceId];
};

const removeRecords = (
  state: DevicePurgeState,
  key: string,
  predicate: (record: StateRecord) => boolean,
  summary: Record<string, number>
) => {
  const current = recordList(state[key]);
  if (!Array.isArray(state[key])) {
    summary[key] = 0;
    return [] as StateRecord[];
  }
  const removed = current.filter(predicate);
  state[key] = current.filter(record => !predicate(record));
  summary[key] = removed.length;
  return removed;
};

/**
 * Permanently removes a device and every record directly linked to it from the
 * application's persisted state. This is intentionally a purge, not an
 * archive: no device-specific deletion audit entry is created afterward.
 */
export function permanentlyPurgeDeviceData(state: DevicePurgeState, deviceId: string): DevicePurgeResult | null {
  const devices = recordList(state.devices);
  const deviceIndex = devices.findIndex(device => valueId(device.id) === deviceId);
  if (deviceIndex < 0) return null;

  const [device] = devices.splice(deviceIndex, 1);
  state.devices = devices;
  const assetId = valueId(device.assetId);
  const summary: Record<string, number> = { devices: 1 };
  const relatedIds = new Set<string>([deviceId]);

  // Maps hold raw device telemetry and high-volume measurement histories.
  for (const key of [
    'telemetry',
    'telemetryHistory',
    'networkDiagnostics',
    'hardwareSpecs',
    'latestTelemetry',
    'deviceHeartbeats',
    'healthScores',
    'diagnosticHistory'
  ]) {
    deleteKeyedDeviceData(state, key, deviceId, summary);
  }

  const issues = removeRecords(state, 'issues', issue => valueId(issue.deviceId) === deviceId, summary);
  idsFrom(issues, relatedIds);
  const issueIds = new Set(issues.map(issue => valueId(issue.id)).filter(Boolean));

  const tickets = removeRecords(
    state,
    'tickets',
    ticket => valueId(ticket.deviceId) === deviceId || issueIds.has(valueId(ticket.issueId)),
    summary
  );
  idsFrom(tickets, relatedIds);
  const ticketIds = new Set(tickets.map(ticket => valueId(ticket.id)).filter(Boolean));

  const maintenance = removeRecords(
    state,
    'maintenance',
    record => valueId(record.deviceId) === deviceId || ticketIds.has(valueId(record.ticketId)),
    summary
  );
  idsFrom(maintenance, relatedIds);

  const diagnosticRuns = removeRecords(state, 'diagnosticRuns', run => valueId(run.deviceId) === deviceId, summary);
  idsFrom(diagnosticRuns, relatedIds);
  const diagnosticRunIds = new Set(diagnosticRuns.map(run => valueId(run.id)).filter(Boolean));
  const diagnosticResults = removeRecords(
    state,
    'diagnosticResults',
    result => valueId(result.deviceId) === deviceId || diagnosticRunIds.has(valueId(result.diagnosticRunId)),
    summary
  );
  idsFrom(diagnosticResults, relatedIds);

  const notifications = removeRecords(
    state,
    'notifications',
    notification => valueId(notification.deviceId) === deviceId || issueIds.has(valueId(notification.issueId)) || ticketIds.has(valueId(notification.ticketId)),
    summary
  );
  idsFrom(notifications, relatedIds);

  for (const key of ['deviceCommands', 'shutdownCommands', 'remoteSessions', 'deviceAgents', 'deviceParts', 'maintenanceSchedules', 'deviceRegistrations', 'alerts']) {
    const removed = removeRecords(state, key, record => valueId(record.deviceId) === deviceId, summary);
    idsFrom(removed, relatedIds);
  }

  const assignments = removeRecords(
    state,
    'assetAssignments',
    assignment => valueId(assignment.deviceId) === deviceId || (Boolean(assetId) && valueId(assignment.assetId) === assetId),
    summary
  );
  idsFrom(assignments, relatedIds);

  // Audit records containing a true reference to the device or to a purged
  // child record are device data too. Do not use a device-name substring here:
  // names can be shared by unrelated computers.
  const auditFields = ['deviceId', 'entityId', 'targetId', 'issueId', 'ticketId', 'maintenanceId', 'commandId', 'remoteSessionId', 'diagnosticRunId', 'diagnosticResultId', 'assignmentId', 'alertId'];
  removeRecords(
    state,
    'auditLogs',
    entry => auditFields.some(field => relatedIds.has(valueId(entry[field]))) ||
      (Boolean(assetId) && typeof entry.details === 'string' && entry.details.includes(assetId)),
    summary
  );

  summary.totalRecords = Object.values(summary).reduce((total, value) => total + value, 0);
  return { deviceId, summary };
}
