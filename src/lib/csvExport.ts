// BMW E60 Coder Pro - CSV Log Export

export function exportLogToCSV(entries: { timestamp: number; data: Record<string, number>; event?: string }[]): string {
  if (entries.length === 0) return '';
  
  const keys = Object.keys(entries[0].data);
  const headers = ['timestamp', 'time', ...keys, 'event'];
  const rows = [headers.join(',')];
  
  for (const entry of entries) {
    const date = new Date(entry.timestamp);
    const timeStr = date.toLocaleTimeString();
    const values = keys.map(k => entry.data[k] ?? '');
    rows.push([entry.timestamp, timeStr, ...values, entry.event ?? ''].join(','));
  }
  
  return rows.join('\n');
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default { exportLogToCSV, downloadCSV };
