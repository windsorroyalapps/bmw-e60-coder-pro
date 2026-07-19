import React, { useState, useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import { getDTCInfo, searchDTCs } from '@/lib/dtcDatabase';
import { getDtcDefinition } from '@/lib/geminiAiService';
import type { AiDtcDefinition } from '@/lib/geminiAiService';
import type { DTCInfo } from '@/lib/dtcDatabase';
import {
  AlertTriangle, Search, X, ChevronRight,
  Activity, CircleDot, ShieldAlert, Info,
  Wrench, AlertCircle, Loader2
} from 'lucide-react';

const SEVERITY_COLORS = {
  info: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  warning: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  critical: 'text-red-400 bg-red-500/10 border-red-500/20',
};

const SEVERITY_LABELS = {
  info: 'Info',
  warning: 'Warning',
  critical: 'Critical',
};

export const DTCPage: React.FC = () => {
  const { obd2, profile } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDTC, setSelectedDTC] = useState<DTCInfo | AiDtcDefinition | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'info' | 'warning' | 'critical'>('all');

  const handleDtcClick = async (dtc: DTCInfo) => {
    setSelectedDTC(dtc);
    setAiLoading(true);
    try {
      const aiDef = await getDtcDefinition(dtc.code, profile.engine);
      setSelectedDTC(aiDef);
    } catch (err) {
      console.error('Failed to get AI DTC definition', err);
    } finally {
      setAiLoading(false);
    }
  };

  // Simulated active DTCs from ECU
  const activeDTCs: DTCInfo[] = [
    getDTCInfo('P0301') || { code: 'P0301', description: 'Cylinder 1 misfire', system: 'Ignition', severity: 'critical' },
    getDTCInfo('P0171') || { code: 'P0171', description: 'System too lean', system: 'Fuel', severity: 'critical' },
    getDTCInfo('P0030') || { code: 'P0030', description: 'O2 sensor heater', system: 'Fuel', severity: 'warning' },
  ];

  const searchResults = searchQuery.length >= 2 ? searchDTCs(searchQuery) : [];

  const filteredResults = activeFilter === 'all'
    ? searchResults
    : searchResults.filter(d => d.severity === activeFilter);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-[#0d1117] border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <h1 className="text-lg font-bold text-white">DTC Reader</h1>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <CircleDot className="w-3.5 h-3.5 text-green-400" />
          <span className="text-green-400">{obd2.connectionState === 'connected' ? 'Live' : 'Offline'}</span>
        </div>
      </div>

      {/* Active DTCs */}
      <div className="px-4 py-3 bg-[#0d1117] border-b border-gray-800">
        <h2 className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5" />
          Active Codes ({activeDTCs.length})
        </h2>
        <div className="space-y-2">
          {activeDTCs.map(dtc => (
            <button
              key={dtc.code}
              onClick={() => handleDtcClick(dtc)}
              className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-colors ${SEVERITY_COLORS[dtc.severity]}`}
            >
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-mono font-medium">{dtc.code}</div>
                <div className="text-xs text-gray-400 truncate">{dtc.description}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3 bg-[#0d1117] border-b border-gray-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search DTC codes..."
            className="w-full bg-[#161b22] border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 mt-2">
          {(['all', 'info', 'warning', 'critical'] as const).map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`text-[10px] px-2 py-1 rounded-md transition-colors ${
                activeFilter === filter
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-gray-800 text-gray-500 hover:text-gray-300'
              }`}
            >
              {filter === 'all' ? 'All' : SEVERITY_LABELS[filter]}
            </button>
          ))}
        </div>
      </div>

      {/* Search Results */}
      <div className="flex-1 overflow-y-auto p-4">
        {searchQuery.length < 2 ? (
          <div className="text-center text-gray-600 text-sm mt-8">
            <Info className="w-8 h-8 mx-auto mb-2 text-gray-700" />
            <p>Enter a DTC code or description to search</p>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="text-center text-gray-600 text-sm mt-8">
            No codes found for &quot;{searchQuery}&quot;
          </div>
        ) : (
          <div className="space-y-1">
            {filteredResults.map(dtc => (
              <button
                key={dtc.code}
                onClick={() => handleDtcClick(dtc)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#161b22] text-left transition-colors"
              >
                <span className={`text-xs px-1.5 py-0.5 rounded ${SEVERITY_COLORS[dtc.severity]}`}>
                  {dtc.code}
                </span>
                <span className="text-sm text-gray-300 flex-1 truncate">{dtc.description}</span>
                <span className="text-[10px] text-gray-600">{dtc.system}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* DTC Detail Modal */}
      {selectedDTC && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0d1117] rounded-2xl border border-gray-700 shadow-2xl w-full max-w-sm p-5 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`text-lg font-mono font-bold ${SEVERITY_COLORS[selectedDTC.severity].split(' ')[0]}`}>
                  {selectedDTC.code}
                </div>
                {aiLoading && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
              </div>
              <button onClick={() => setSelectedDTC(null)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <Info className="w-3 h-3" /> Description
                </div>
                <div className="text-sm text-white leading-relaxed">{selectedDTC.description}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">System</div>
                  <div className="text-sm text-white font-medium">{selectedDTC.system}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Severity</div>
                  <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${SEVERITY_COLORS[selectedDTC.severity]}`}>
                    {SEVERITY_LABELS[selectedDTC.severity]}
                  </span>
                </div>
              </div>

              {'causes' in selectedDTC && selectedDTC.causes.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Possible Causes
                  </div>
                  <ul className="text-xs text-gray-300 space-y-1 list-disc pl-4">
                    {selectedDTC.causes.map((cause, i) => <li key={i}>{cause}</li>)}
                  </ul>
                </div>
              )}

              {'recommendation' in selectedDTC && selectedDTC.recommendation && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                  <div className="text-[10px] text-blue-400 font-bold uppercase mb-1 flex items-center gap-1">
                    <Wrench className="w-3 h-3" /> Tech Recommendation
                  </div>
                  <div className="text-xs text-blue-100 italic">
                    {selectedDTC.recommendation}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedDTC(null)}
              className="w-full mt-6 bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-xl transition-colors text-sm font-medium"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DTCPage;
