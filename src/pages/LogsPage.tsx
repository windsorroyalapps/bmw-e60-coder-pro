import React, { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { exportSessionToCSV, exportCombinedCSV } from '@/lib/csvExport';
import {
  FileText, Play, Square, Clock,
  AlertTriangle, Activity, Zap, Download, FolderOutput
} from 'lucide-react';

export const LogsPage: React.FC = () => {
  const {
    logSessions, currentSession, isLogging,
    startSession, stopSession, liveData
  } = useStore();
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState('');

  const activeSession = selectedSession
    ? logSessions.find(s => s.id === selectedSession)
    : currentSession;

  const formatDuration = (start: number, end?: number) => {
    const duration = ((end || Date.now()) - start) / 1000;
    const mins = Math.floor(duration / 60);
    const secs = Math.floor(duration % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString();
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header */}
      <div className="px-4 py-3 bg-[#0d1117] border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-green-400" />
            <div>
              <h1 className="text-xl font-bold text-white">Data Logs</h1>
              <p className="text-xs text-gray-500">
                {logSessions.length} sessions | {logSessions.reduce((a, s) => a + s.entries.length, 0)} entries
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Export buttons (visible when sessions exist) */}
            {logSessions.length > 0 && (
              <>
                <button
                  onClick={() => activeSession && exportSessionToCSV(activeSession)}
                  disabled={!activeSession}
                  className="flex items-center gap-1.5 bg-blue-600/20 hover:bg-blue-600/30 disabled:opacity-30 text-blue-400 text-xs px-3 py-2 rounded-lg transition-colors border border-blue-500/20"
                  title="Export current session as CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </button>
                <button
                  onClick={() => exportCombinedCSV(logSessions)}
                  className="flex items-center gap-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 text-xs px-3 py-2 rounded-lg transition-colors border border-purple-500/20"
                  title="Export all sessions as combined CSV"
                >
                  <FolderOutput className="w-3.5 h-3.5" />
                  Export All
                </button>
              </>
            )}
            {isLogging ? (
              <button
                onClick={stopSession}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
              >
                <Square className="w-4 h-4" />
                Stop
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="Session name..."
                  className="bg-[#161b22] border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-green-500"
                />
                <button
                  onClick={() => startSession(sessionName || `Log_${new Date().toLocaleTimeString()}`)}
                  className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Start
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Session List */}
        <div className="w-64 bg-[#0d1117] border-r border-gray-800 overflow-y-auto">
          {currentSession && (
            <button
              onClick={() => setSelectedSession(null)}
              className={`w-full text-left p-3 border-b border-gray-800 transition-colors ${
                !selectedSession ? 'bg-blue-500/10 border-l-2 border-l-blue-500' : 'hover:bg-gray-800/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                <span className="text-sm font-medium text-white truncate">{currentSession.name}</span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                {formatDuration(currentSession.startTime)}
                <span className="ml-auto">{currentSession.entries.length} entries</span>
              </div>
            </button>
          )}

          {logSessions.map(session => (
            <button
              key={session.id}
              onClick={() => setSelectedSession(session.id)}
              className={`w-full text-left p-3 border-b border-gray-800 transition-colors ${
                selectedSession === session.id ? 'bg-blue-500/10 border-l-2 border-l-blue-500' : 'hover:bg-gray-800/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-white truncate">{session.name}</span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                {formatDuration(session.startTime, session.endTime)}
                <span className="ml-auto">{session.entries.length} entries</span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs">
                <span className="text-orange-400">{session.maxRpm} RPM</span>
                <span className="text-blue-400">{session.maxBoost.toFixed(1)} bar</span>
                {session.knockEvents > 0 && (
                  <span className="text-red-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {session.knockEvents}
                  </span>
                )}
              </div>
            </button>
          ))}

          {logSessions.length === 0 && !currentSession && (
            <div className="p-6 text-center text-gray-500 text-sm">
              No log sessions yet
            </div>
          )}
        </div>

        {/* Session Detail */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeSession ? (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-[#0d1117] rounded-xl p-3 border border-gray-800">
                  <div className="text-xs text-gray-500">Max RPM</div>
                  <div className="text-lg font-mono text-white">{activeSession.maxRpm.toLocaleString()}</div>
                </div>
                <div className="bg-[#0d1117] rounded-xl p-3 border border-gray-800">
                  <div className="text-xs text-gray-500">Max Boost</div>
                  <div className="text-lg font-mono text-orange-400">{activeSession.maxBoost.toFixed(2)} bar</div>
                </div>
                <div className="bg-[#0d1117] rounded-xl p-3 border border-gray-800">
                  <div className="text-xs text-gray-500">Max Speed</div>
                  <div className="text-lg font-mono text-blue-400">{activeSession.maxSpeed} km/h</div>
                </div>
                <div className="bg-[#0d1117] rounded-xl p-3 border border-gray-800">
                  <div className="text-xs text-gray-500">Max IAT</div>
                  <div className="text-lg font-mono text-yellow-400">{Math.round(activeSession.maxIat)}°C</div>
                </div>
              </div>

              {/* Knock Events */}
              {activeSession.knockEvents > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <div>
                    <div className="text-sm font-medium text-red-300">
                      {activeSession.knockEvents} knock events detected
                    </div>
                    <div className="text-xs text-red-400">
                      Consider reducing timing advance or enriching fuel mixture
                    </div>
                  </div>
                </div>
              )}

              {/* Live entries for current session */}
              {activeSession === currentSession && (
                <div className="bg-[#0d1117] rounded-xl p-4 border border-gray-800">
                  <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-green-400" />
                    Live Data
                  </h3>
                  <div className="grid grid-cols-6 gap-2 text-xs">
                    <div className="bg-[#161b22] rounded p-2">
                      <div className="text-gray-500">RPM</div>
                      <div className="font-mono text-white">{liveData.rpm.toLocaleString()}</div>
                    </div>
                    <div className="bg-[#161b22] rounded p-2">
                      <div className="text-gray-500">Boost</div>
                      <div className="font-mono text-orange-400">{liveData.boost.toFixed(2)}</div>
                    </div>
                    <div className="bg-[#161b22] rounded p-2">
                      <div className="text-gray-500">Load</div>
                      <div className="font-mono text-white">{liveData.load}%</div>
                    </div>
                    <div className="bg-[#161b22] rounded p-2">
                      <div className="text-gray-500">AFR</div>
                      <div className="font-mono text-green-400">{liveData.afr.toFixed(2)}</div>
                    </div>
                    <div className="bg-[#161b22] rounded p-2">
                      <div className="text-gray-500">IAT</div>
                      <div className="font-mono text-blue-400">{Math.round(liveData.iat)}°C</div>
                    </div>
                    <div className="bg-[#161b22] rounded p-2">
                      <div className="text-gray-500">Timing</div>
                      <div className="font-mono text-purple-400">{liveData.timing.toFixed(1)}°</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Entries Table */}
              <div className="bg-[#0d1117] rounded-xl border border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-[#161b22]">
                      <tr className="text-gray-500">
                        <th className="text-left p-2">Time</th>
                        <th className="p-2 text-right">RPM</th>
                        <th className="p-2 text-right">Boost</th>
                        <th className="p-2 text-right">Load</th>
                        <th className="p-2 text-right">AFR</th>
                        <th className="p-2 text-right">IAT</th>
                        <th className="p-2 text-right">Timing</th>
                        <th className="p-2 text-right">Knock</th>
                        <th className="p-2">Event</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeSession.entries.slice(-100).reverse().map(entry => (
                        <tr key={entry.id} className="border-t border-gray-800 hover:bg-gray-800/30">
                          <td className="p-2 text-gray-400 font-mono">{formatTime(entry.timestamp)}</td>
                          <td className="p-2 text-right text-white font-mono">{entry.data.rpm?.toLocaleString()}</td>
                          <td className="p-2 text-right text-orange-400 font-mono">{entry.data.boost?.toFixed(2)}</td>
                          <td className="p-2 text-right text-white font-mono">{entry.data.load}%</td>
                          <td className="p-2 text-right text-green-400 font-mono">{entry.data.afr?.toFixed(2)}</td>
                          <td className="p-2 text-right text-blue-400 font-mono">{entry.data.iat ? `${Math.round(entry.data.iat)}°C` : '-'}</td>
                          <td className="p-2 text-right text-purple-400 font-mono">{entry.data.timing?.toFixed(1)}°</td>
                          <td className="p-2 text-right">
                            {entry.data.knock && entry.data.knock > 0 ? (
                              <span className="text-red-400 font-mono">{entry.data.knock}</span>
                            ) : (
                              <span className="text-gray-600">-</span>
                            )}
                          </td>
                          <td className="p-2">
                            {entry.event && (
                              <span className={`px-1.5 py-0.5 rounded text-xs ${
                                entry.severity === 'danger' ? 'bg-red-500/20 text-red-400' :
                                entry.severity === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-blue-500/20 text-blue-400'
                              }`}>
                                {entry.event}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-3" />
                <p>Select a session to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogsPage;
