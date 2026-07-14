// BMW E60 Coder Pro - CSV Log Export
// Exports log sessions to MegaLogViewer-compatible and Excel-compatible CSV formats.

import type { LogSession, LogEntry } from '@/types';

export interface CSVColumn {
  header: string;
  key: string;
  extractor: (entry: LogEntry, session: LogSession) => string | number;
}

export const STANDARD_COLUMNS: CSVColumn[] = [
  { header: 'Time', key: 'time', extractor: (e) => new Date(e.timestamp).toISOString() },
  { header: 'TimeMs', key: 'timeMs', extractor: (e) => e.timestamp },
  { header: 'RelativeMs', key: 'relMs', extractor: (e, s) => e.timestamp - s.startTime },
  { header: 'RPM', key: 'rpm', extractor: (e) => e.data.rpm ?? '' },
  { header: 'Speed', key: 'speed', extractor: (e) => e.data.speed ?? '' },
  { header: 'Boost_psi', key: 'boost', extractor: (e) => e.data.boost !== undefined ? (e.data.boost * 14.504).toFixed(2) : '' },
  { header: 'Boost_bar', key: 'boostBar', extractor: (e) => e.data.boost !== undefined ? e.data.boost.toFixed(3) : '' },
  { header: 'Throttle', key: 'throttle', extractor: (e) => e.data.throttle ?? '' },
  { header: 'Load', key: 'load', extractor: (e) => e.data.load ?? '' },
  { header: 'Coolant_C', key: 'coolant', extractor: (e) => e.data.coolantTemp ?? '' },
  { header: 'OilTemp_C', key: 'oilTemp', extractor: (e) => e.data.oilTemp ?? '' },
  { header: 'OilPress_bar', key: 'oilPress', extractor: (e) => e.data.oilPressure ?? '' },
  { header: 'IAT_C', key: 'iat', extractor: (e) => e.data.iat ?? '' },
  { header: 'AFR', key: 'afr', extractor: (e) => e.data.afr ?? '' },
  { header: 'Lambda', key: 'lambda', extractor: (e) => e.data.lambda ?? '' },
  { header: 'Timing_deg', key: 'timing', extractor: (e) => e.data.timing ?? '' },
  { header: 'FuelPress_bar', key: 'fuelPress', extractor: (e) => e.data.fuelPressure ?? '' },
  { header: 'Battery_V', key: 'battery', extractor: (e) => e.data.battery ?? '' },
  { header: 'Knock', key: 'knock', extractor: (e) => e.data.knock ?? '' },
  { header: 'MAF_gps', key: 'maf', extractor: (e) => e.data.maf ?? '' },
  { header: 'MAP_mbar', key: 'map', extractor: (e) => e.data.mapPressure ?? '' },
  { header: 'FuelTrimShort', key: 'fuelTrimShort', extractor: (e) => e.data.fuelTrimShort ?? '' },
  { header: 'FuelTrimLong', key: 'fuelTrimLong', extractor: (e) => e.data.fuelTrimLong ?? '' },
  { header: 'WGDuty', key: 'dutyCycle', extractor: (e) => e.data.dutyCycle ?? '' },
  { header: 'TQ_Actual_Nm', key: 'tqActual', extractor: (e) => e.data.tqActual ?? '' },
  { header: 'TQ_Req_Nm', key: 'tqRequested', extractor: (e) => e.data.tqRequested ?? '' },
  { header: 'TurbineIn_C', key: 'turbineIn', extractor: (e) => e.data.turbineInlet ?? '' },
  { header: 'TurbineOut_C', key: 'turbineOut', extractor: (e) => e.data.turbineOutlet ?? '' },
  { header: 'Event', key: 'event', extractor: (e) => e.event ?? '' },
  { header: 'Severity', key: 'severity', extractor: (e) => e.severity ?? '' },
];

function escapeCSV(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function sessionToCSV(
  session: LogSession,
  columns: CSVColumn[] = STANDARD_COLUMNS
): string {
  const header = columns.map(c => escapeCSV(c.header)).join(',');
  const rows = session.entries.map(entry =>
    columns.map(col => escapeCSV(col.extractor(entry, session))).join(',')
  );

  const meta = [
    `# Session: ${session.name}`,
    `# Engine: ${session.engineType}`,
    `# Map: ${session.mapType}`,
    `# Start: ${new Date(session.startTime).toISOString()}`,
    `# End: ${session.endTime ? new Date(session.endTime).toISOString() : 'N/A (incomplete)'}`,
    `# Duration: ${session.endTime ? ((session.endTime - session.startTime) / 1000).toFixed(1) : ((Date.now() - session.startTime) / 1000).toFixed(1)} seconds`,
    `# Entries: ${session.entries.length}`,
    `# Max RPM: ${session.maxRpm}`,
    `# Max Boost: ${session.maxBoost.toFixed(2)} bar`,
    `# Max Speed: ${session.maxSpeed} km/h`,
    `# Max IAT: ${Math.round(session.maxIat)} C`,
    `# Knock Events: ${session.knockEvents}`,
    `#`,
  ].join('\n');

  return `${meta}\n${header}\n${rows.join('\n')}`;
}

export function generateFilename(session: LogSession): string {
  const date = new Date(session.startTime);
  const dateStr = date.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const safeName = session.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `BMW_E60_${safeName}_${dateStr}.csv`;
}

export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportSessionToCSV(session: LogSession): void {
  const csv = sessionToCSV(session);
  const filename = generateFilename(session);
  downloadCSV(csv, filename);
}

export function exportCombinedCSV(sessions: LogSession[]): void {
  const columns = STANDARD_COLUMNS;
  const parts: string[] = [];

  parts.push(`# BMW E60 Coder Pro - Combined Log Export`);
  parts.push(`# Sessions: ${sessions.length}`);
  parts.push(`# Total Entries: ${sessions.reduce((a, s) => a + s.entries.length, 0)}`);
  parts.push(`# Export Date: ${new Date().toISOString()}`);
  parts.push(`#`);

  for (const session of sessions) {
    parts.push(`# === Session: ${session.name} ===`);
    parts.push(`# Engine: ${session.engineType} | Map: ${session.mapType}`);
    parts.push(`# Start: ${new Date(session.startTime).toISOString()}`);
    parts.push(`#`);
    parts.push(columns.map(c => escapeCSV(c.header)).join(','));

    for (const entry of session.entries) {
      parts.push(columns.map(col => escapeCSV(col.extractor(entry, session))).join(','));
    }

    parts.push('');
  }

  const csv = parts.join('\n');
  const filename = `BMW_E60_Combined_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.csv`;
  downloadCSV(csv, filename);
}
