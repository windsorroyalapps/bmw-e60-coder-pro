// BMW E60 Coder Pro - Fault Code Reader / Clearer Page
// Read, display, and clear Diagnostic Trouble Codes with full P-code descriptions.

import React, { useState, useCallback } from 'react';
import { useStore } from '@/hooks/useStore';
import { obd2Manager } from '@/lib/obd2Connection';
import { lookupDTC, getSeverityColor, getSeverityLabel, getSystemColor } from '@/lib/dtcDatabase';
import type { DTCCode } from '@/lib/dtcDatabase';
import {
  AlertTriangle, CheckCircle, RefreshCw, Trash2,
  ChevronDown, ChevronUp, Cpu, Zap,
  Activity, X, WifiOff, Loader, Car, Info
} from 'lucide-react';

interface ExpandedCode {
  code: string;
  status: 'active' | 'pending' | 'permanent' | 'stored';
  description: string;
  firstSeen?: number;
  lastSeen?: number;
  count?: number;
  dtcInfo?: DTCCode;
  ecuName: string;
  ecuAddress: string;
}

export const DTCPage: React.FC = () => {
  const { obd2, dtcReadings, setDtcReadings, addNotification } = useStore();
  const [isReading, setIsReading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [selectedEcu, setSelectedEcu] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [lastReadTime, setLastReadTime] = useState<number | null>(null);

  const connected = obd2.connectionState === 'connected';

  const handleReadDTCs = useCallback(async () => {
    if (!connected) {
      addNotification({ message: 'Connect to vehicle first', type: 'warning' });
      return;
    }
    setIsReading(true);
    try {
      const readings = await obd2Manager.readDTCs();
      const enrichedReadings = readings.map(r => ({
        ...r,
        codes: r.codes.map(c => {
          const dtcInfo = lookupDTC(c.code);
          return {
            ...c,
            description: dtcInfo?.description || c.description || 'Unknown code - no description available',
          };
        }),
      }));
      setDtcReadings(enrichedReadings);
      setLastReadTime(Date.now());

      const totalCodes = enrichedReadings.reduce((sum, r) => sum + r.codes.length, 0);
      if (totalCodes === 0) {
        addNotification({ message: 'No fault codes found - all clear!', type: 'success' });
      } else {
        addNotification({ message: `Found ${totalCodes} fault code(s) across ${enrichedReadings.length} ECU(s)`, type: 'warning' });
      }
    } catch (e: any) {
      addNotification({ message: 'Failed to read DTCs: ' + (e?.message || 'Unknown error'), type: 'error' });
    } finally {
      setIsReading(false);
    }
  }, [connected, setDtcReadings, addNotification]);

  const handleClearDTCs = useCallback(async (ecuAddress?: string) => {
    if (!connected) {
      addNotification({ message: 'Connect to vehicle first', type: 'warning' });
      return;
    }
    setIsClearing(true);
    try {
      const result = await obd2Manager.clearDTCs(ecuAddress);
      if (result.success) {
        addNotification({
          message: ecuAddress
            ? `Cleared ${result.cleared} code(s) from ECU`
            : `Cleared ${result.cleared} code(s) from all ECUs`,
          type: 'success',
        });
        await handleReadDTCs();
      } else {
        addNotification({ message: 'Failed to clear DTCs', type: 'error' });
      }
    } catch (e: any) {
      addNotification({ message: 'Clear failed: ' + (e?.message || 'Unknown error'), type: 'error' });
    } finally {
      setIsClearing(false);
    }
  }, [connected, addNotification, handleReadDTCs]);

  const allCodes: ExpandedCode[] = dtcReadings.flatMap(r =>
    r.codes.map(c => ({
      code: c.code,
      status: c.status,
      description: c.description,
      firstSeen: c.firstSeen,
      lastSeen: c.lastSeen,
      count: c.count,
      dtcInfo: lookupDTC(c.code),
      ecuName: r.ecuName,
      ecuAddress: r.ecuAddress,
    }))
  );

  const filteredByEcu = selectedEcu === 'all'
    ? allCodes
    : allCodes.filter(c => {
        const reading = dtcReadings.find(r => r.ecuAddress === selectedEcu);
        return reading?.codes.some(rc => rc.code === c.code);
      });

  const filteredCodes = filterSeverity === 'all'
    ? filteredByEcu
    : filteredByEcu.filter(c => c.dtcInfo?.severity === filterSeverity);

  const criticalCount = allCodes.filter(c => c.dtcInfo?.severity === 'critical').length;
  const severeCount = allCodes.filter(c => c.dtcInfo?.severity === 'severe').length;
  const activeCount = allCodes.filter(c => c.status === 'active').length;

  const toggleExpand = (code: string) => {
    setExpandedCode(expandedCode === code ? null : code);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <AlertTriangle className="w-3.5 h-3.5 text-red-400" />;
      case 'pending': return <Activity className="w-3.5 h-3.5 text-yellow-400" />;
      case 'permanent': return <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />;
      default: return <Info className="w-3.5 h-3.5 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'pending': return 'Pending';
      case 'permanent': return 'Permanent';
      case 'stored': return 'Stored';
      default: return status;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header */}
      <div className="px-4 py-3 bg-[#0d1117] border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-orange-400" />
            <div>
              <h1 className="text-xl font-bold text-white">Fault Codes</h1>
              <p className="text-xs text-gray-500">
                {connected
                  ? dtcReadings.length > 0
                    ? `${allCodes.length} code(s) found`
                    : 'Read DTCs from all ECUs'
                  : 'Connect to vehicle to read fault codes'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {connected && dtcReadings.length > 0 && (
              <button
                onClick={() => handleClearDTCs()}
                disabled={isClearing}
                className="flex items-center gap-1.5 bg-red-600/20 hover:bg-red-600/30 disabled:opacity-50 text-red-400 text-xs px-3 py-2 rounded-lg transition-colors border border-red-500/20"
              >
                {isClearing ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Clear All
              </button>
            )}
            <button
              onClick={handleReadDTCs}
              disabled={isReading || !connected}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white text-xs px-3 py-2 rounded-lg transition-colors"
            >
              {isReading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {isReading ? 'Reading...' : 'Read DTCs'}
            </button>
          </div>
        </div>

        {/* Stats Row */}
        {allCodes.length > 0 && (
          <div className="flex items-center gap-3 mt-3">
            {criticalCount > 0 && (
              <div className="flex items-center gap-1 text-xs bg-red-500/10 text-red-400 px-2 py-1 rounded border border-red-500/20">
                <AlertTriangle className="w-3 h-3" />
                {criticalCount} Critical
              </div>
            )}
            {severeCount > 0 && (
              <div className="flex items-center gap-1 text-xs bg-orange-500/10 text-orange-400 px-2 py-1 rounded border border-orange-500/20">
                <Zap className="w-3 h-3" />
                {severeCount} Severe
              </div>
            )}
            {activeCount > 0 && (
              <div className="flex items-center gap-1 text-xs bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded border border-yellow-500/20">
                <Activity className="w-3 h-3" />
                {activeCount} Active
              </div>
            )}
            {lastReadTime && (
              <span className="text-xs text-gray-600 ml-auto">
                Last read: {new Date(lastReadTime).toLocaleTimeString()}
              </span>
            )}
          </div>
        )}

        {/* Filters */}
        {allCodes.length > 0 && (
          <div className="flex items-center gap-2 mt-3">
            <select
              value={selectedEcu}
              onChange={(e) => setSelectedEcu(e.target.value)}
              className="bg-gray-800 text-white text-xs px-2 py-1.5 rounded border border-gray-700 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All ECUs</option>
              {dtcReadings.map(r => (
                <option key={r.ecuAddress} value={r.ecuAddress}>
                  {r.ecuName} ({r.codes.length})
                </option>
              ))}
            </select>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="bg-gray-800 text-white text-xs px-2 py-1.5 rounded border border-gray-700 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="severe">Severe</option>
              <option value="moderate">Moderate</option>
              <option value="minor">Minor</option>
              <option value="info">Info</option>
            </select>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {!connected && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <WifiOff className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">Not connected to vehicle</p>
            <p className="text-xs mt-1">Connect via the Connection Bar to read fault codes</p>
          </div>
        )}

        {connected && dtcReadings.length === 0 && !isReading && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <CheckCircle className="w-12 h-12 mb-3 text-green-500 opacity-50" />
            <p className="text-sm">No fault codes read yet</p>
            <p className="text-xs mt-1">Tap &quot;Read DTCs&quot; to scan all ECUs</p>
          </div>
        )}

        {isReading && dtcReadings.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Loader className="w-12 h-12 mb-3 animate-spin text-blue-400" />
            <p className="text-sm">Reading fault codes...</p>
            <p className="text-xs mt-1">Querying all connected ECUs</p>
          </div>
        )}

        {filteredCodes.map((code, idx) => (
          <div
            key={`${code.ecuAddress}-${code.code}-${idx}`}
            className={`rounded-lg border overflow-hidden transition-all ${
              code.dtcInfo
                ? getSeverityColor(code.dtcInfo.severity)
                : 'text-gray-400 bg-gray-800/50 border-gray-700'
            }`}
          >
            {/* Code Header */}
            <button
              onClick={() => toggleExpand(code.code)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
            >
              {getStatusIcon(code.status)}
              <span className="font-mono text-sm font-bold">{code.code}</span>
              <span className="flex-1 text-xs truncate">{code.description}</span>
              <div className="flex items-center gap-2">
                {code.dtcInfo && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${getSeverityColor(code.dtcInfo.severity)}`}>
                    {getSeverityLabel(code.dtcInfo.severity)}
                  </span>
                )}
                <span className="text-[10px] text-gray-500 px-1.5 py-0.5 rounded bg-gray-800/50">
                  {getStatusLabel(code.status)}
                </span>
                {expandedCode === code.code ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </div>
            </button>

            {/* Expanded Details */}
            {expandedCode === code.code && code.dtcInfo && (
              <div className="px-3 pb-3 border-t border-current border-opacity-20">
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`text-xs flex items-center gap-1 ${getSystemColor(code.dtcInfo.system)}`}>
                    <Cpu className="w-3 h-3" />
                    {code.dtcInfo.system.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">
                    ECU: {code.ecuName || 'Unknown'}
                  </span>
                  {code.count !== undefined && code.count > 1 && (
                    <span className="text-xs text-gray-500">
                      Occurrences: {code.count}
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-300 mt-2">{code.dtcInfo.description}</p>

                {code.dtcInfo.bmwSpecificNotes && (
                  <div className="mt-2 p-2 rounded bg-blue-500/5 border border-blue-500/10">
                    <div className="flex items-center gap-1 text-blue-400 text-[10px] font-medium">
                      <Car className="w-3 h-3" />
                      BMW N54 Specific
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{code.dtcInfo.bmwSpecificNotes}</p>
                  </div>
                )}

                {code.dtcInfo.possibleCauses.length > 0 && (
                  <div className="mt-2">
                    <span className="text-[10px] text-gray-500 font-medium">Possible Causes:</span>
                    <ul className="mt-1 space-y-0.5">
                      {code.dtcInfo.possibleCauses.map((cause, i) => (
                        <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
                          <span className="text-gray-600 mt-0.5">-</span>
                          {cause}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(code.firstSeen || code.lastSeen) && (
                  <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-600">
                    {code.firstSeen && (
                      <span>First: {new Date(code.firstSeen).toLocaleString()}</span>
                    )}
                    {code.lastSeen && (
                      <span>Last: {new Date(code.lastSeen).toLocaleString()}</span>
                    )}
                  </div>
                )}

                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => handleClearDTCs(code.ecuAddress)}
                    disabled={isClearing}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Clear ECU
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {filteredCodes.length === 0 && dtcReadings.length > 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <CheckCircle className="w-10 h-10 mb-2 text-green-500 opacity-50" />
            <p className="text-sm">No codes match current filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DTCPage;
