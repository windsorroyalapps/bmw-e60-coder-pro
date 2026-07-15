import React, { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { exportLogToCSV, downloadCSV } from '@/lib/csvExport';
import {
  FileText, Download, Play, Square,
  Clock, Database, ChevronRight
} from 'lucide-react';

export const LogsPage: React.FC = () => {
  const { isLogging, setIsLogging, logEntries, startSession, stopSession } = useStore();
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  // Group entries by date (using timestamp date as session key)
  const sessions = logEntries.reduce((acc, entry) => {
    const date = new Date(entry.timestamp).toISOString().split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, typeof logEntries>);

  const handleExport = (sessionId: string) => {
    const entries = sessions[sessionId] || [];
    const csv = exportLogToCSV(entries);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadCSV(csv, `bmw-log-${sessionId}-${timestamp}.csv`);
  };

  const handleStartLogging = () => {
    startSession(`Log ${new Date().toLocaleTimeString()}`);
  };

  const handleStopLogging = () => {
    stopSession();
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-[#0d1117] border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" />
          <h1 className="text-lg font-bold text-white">Logs</h1>
        </div>
        <div className="flex items-center gap-2">
          {isLogging ? (
            <button
              onClick={handleStopLogging}
              className="flex items-center gap-1.5 bg-red-600/20 text-red-400 text-xs px-3 py-1.5 rounded-lg border border-red-500/20"
            >
              <Square className="w-3.5 h-3.5" />
              Stop
            </button>
          ) : (
            <button
              onClick={handleStartLogging}
              className="flex items-center gap-1.5 bg-green-600/20 text-green-400 text-xs px-3 py-1.5 rounded-lg border border-green-500/20"
            >
              <Play className="w-3.5 h-3.5" />
              Start
            </button>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="px-4 py-3 bg-[#0d1117] border-b border-gray-800">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-gray-400">{logEntries.length} entries</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-gray-400">{Object.keys(sessions).length} sessions</span>
          </div>
          {isLogging && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              <span className="text-red-400">Recording</span>
            </div>
          )}
        </div>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto p-4">
        {Object.keys(sessions).length === 0 ? (
          <div className="text-center text-gray-600 text-sm mt-8">
            <FileText className="w-8 h-8 mx-auto mb-2 text-gray-700" />
            <p>No log sessions yet</p>
            <p className="text-xs mt-1">Start logging to capture OBD2 data</p>
          </div>
        ) : (
          <div className="space-y-2">
            {Object.entries(sessions).map(([sessionId, entries]) => (
              <div key={sessionId} className="bg-[#161b22] rounded-xl border border-gray-800 overflow-hidden">
                <button
                  onClick={() => setSelectedSession(selectedSession === sessionId ? null : sessionId)}
                  className="w-full flex items-center justify-between p-3"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-white font-mono">{sessionId}</span>
                    <span className="text-xs text-gray-500">({entries.length} entries)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={e => { e.stopPropagation(); handleExport(sessionId); }}
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2 py-1 rounded"
                    >
                      <Download className="w-3 h-3" />
                      CSV
                    </button>
                    <ChevronRight className={`w-4 h-4 text-gray-600 transition-transform ${selectedSession === sessionId ? 'rotate-90' : ''}`} />
                  </div>
                </button>

                {selectedSession === sessionId && (
                  <div className="border-t border-gray-800 p-3 max-h-48 overflow-y-auto">
                    <div className="space-y-1">
                      {entries.slice(-20).map((entry, i) => (
                        <div key={i} className="text-[10px] text-gray-500 font-mono">
                          <span className="text-gray-600">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                          {' '}RPM:{entry.data.rpm} Boost:{entry.data.boost?.toFixed(1)} AFR:{entry.data.afr?.toFixed(2)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LogsPage;
