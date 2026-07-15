import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '@/hooks/useStore';
import { geminiAiService } from '@/lib/geminiAiService';
import {
  Brain, AlertTriangle, CheckCircle, Info, Zap, Fuel,
  Gauge, Settings, TrendingUp, Shield, Play, Sparkles,
  Wifi, WifiOff, Loader, Send, MessageSquare,
  RefreshCw, X, User, Bot
} from 'lucide-react';

export const AiAnalysisPage: React.FC = () => {
  const {
    liveData, currentMap, aiRecommendations,
    refreshAiAnalysis, refreshAiAnalysisAsync, applyRecommendation,
    isAiTuning, setIsAiTuning,
    aiApiAvailable, aiIsThinking, aiSummary, aiSafetyAssessment,
    aiEstimatedHpGain, aiConfidence, aiChatHistory, sendAiChat, aiLastError,
  } = useStore();

  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [testedApi, setTestedApi] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-test AI API connection on first load
  useEffect(() => {
    if (!testedApi && aiApiAvailable === null) {
      geminiAiService.testConnection().then(ok => {
        useStore.getState().setAiApiAvailable(ok);
        setTestedApi(true);
      });
    }
  }, [testedApi, aiApiAvailable]);

  // Refresh analysis when live data changes (engine running)
  useEffect(() => {
    if (liveData.rpm > 0 && currentMap) {
      refreshAiAnalysis();
    }
  }, [liveData.rpm, liveData.boost, liveData.afr, liveData.knock, liveData.iat, liveData.oilTemp]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiChatHistory]);

  const handleDeepAnalyze = async () => {
    await refreshAiAnalysisAsync();
  };

  const handleChatSend = async () => {
    if (!chatInput.trim()) return;
    const question = chatInput.trim();
    setChatInput('');
    await sendAiChat(question);
  };

  const handleChatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSend();
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'suggestion': return <Info className="w-5 h-5 text-blue-400" />;
      default: return <Info className="w-5 h-5 text-gray-400" />;
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/10 border-red-500/30';
      case 'warning': return 'bg-yellow-500/10 border-yellow-500/30';
      case 'suggestion': return 'bg-blue-500/10 border-blue-500/30';
      default: return 'bg-gray-500/10 border-gray-500/30';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'timing': return <Zap className="w-4 h-4" />;
      case 'fuel': return <Fuel className="w-4 h-4" />;
      case 'boost': return <TrendingUp className="w-4 h-4" />;
      case 'throttle': return <Gauge className="w-4 h-4" />;
      case 'vanos': return <Settings className="w-4 h-4" />;
      case 'safety': return <Shield className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  const criticalCount = aiRecommendations.filter(r => r.severity === 'critical').length;
  const warningCount = aiRecommendations.filter(r => r.severity === 'warning').length;

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header */}
      <div className="px-4 py-3 bg-[#0d1117] border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-purple-400" />
            <div>
              <h1 className="text-xl font-bold text-white">AI Analysis</h1>
              <div className="flex items-center gap-2">
                {aiApiAvailable === true && (
                  <span className="text-[10px] flex items-center gap-1 text-green-400">
                    <Wifi className="w-3 h-3" /> Gemini AI Connected
                  </span>
                )}
                {aiApiAvailable === false && (
                  <span className="text-[10px] flex items-center gap-1 text-yellow-400">
                    <WifiOff className="w-3 h-3" /> Local Rules Only
                  </span>
                )}
                {aiApiAvailable === null && (
                  <span className="text-[10px] flex items-center gap-1 text-gray-500">
                    <Loader className="w-3 h-3 animate-spin" /> Checking AI...
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Deep Analyze Button */}
            <button
              onClick={handleDeepAnalyze}
              disabled={aiIsThinking || liveData.rpm === 0}
              className="flex items-center gap-1.5 bg-purple-600/20 hover:bg-purple-600/30 disabled:bg-purple-900/20 text-purple-400 text-xs px-3 py-1.5 rounded-lg transition-colors border border-purple-500/20"
            >
              {aiIsThinking ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {aiIsThinking ? 'Analyzing...' : 'Deep Analyze'}
            </button>

            {/* AI Tuning Toggle */}
            <button
              onClick={() => setIsAiTuning(!isAiTuning)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                isAiTuning
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-600/20 text-purple-400 hover:bg-purple-600/30'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isAiTuning ? 'AI Active' : 'Auto-Tune'}
            </button>

            {/* Chat Toggle */}
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                chatOpen
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Chat
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* AI Status Banner */}
        {aiIsThinking && (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-3 flex items-center gap-3 animate-pulse">
            <Loader className="w-5 h-5 text-purple-400 animate-spin" />
            <div>
              <div className="text-sm font-semibold text-purple-300">AI is analyzing your data...</div>
              <div className="text-xs text-purple-400">Sending live OBD2 data to Gemini for intelligent recommendations</div>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {aiLastError && aiApiAvailable === false && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex items-center gap-3">
            <WifiOff className="w-5 h-5 text-yellow-400" />
            <div className="flex-1">
              <div className="text-sm text-yellow-400">AI API unavailable - using local rule-based analysis</div>
              <div className="text-xs text-yellow-500/60">{aiLastError}</div>
            </div>
          </div>
        )}

        {/* Live Data Summary */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-[#0d1117] rounded-xl p-3 border border-gray-800">
            <div className="text-xs text-gray-500">RPM</div>
            <div className={`text-lg font-mono ${liveData.rpm > 0 ? 'text-white' : 'text-gray-600'}`}>
              {liveData.rpm > 0 ? liveData.rpm.toLocaleString() : '---'}
            </div>
          </div>
          <div className="bg-[#0d1117] rounded-xl p-3 border border-gray-800">
            <div className="text-xs text-gray-500">Boost</div>
            <div className={`text-lg font-mono ${liveData.rpm > 0 ? 'text-orange-400' : 'text-gray-600'}`}>
              {liveData.rpm > 0 ? `${liveData.boost.toFixed(2)} bar` : '---'}
            </div>
          </div>
          <div className="bg-[#0d1117] rounded-xl p-3 border border-gray-800">
            <div className="text-xs text-gray-500">AFR</div>
            <div className={`text-lg font-mono ${liveData.rpm > 0 ? 'text-green-400' : 'text-gray-600'}`}>
              {liveData.rpm > 0 ? `${liveData.afr.toFixed(2)} \u03bb` : '---'}
            </div>
          </div>
          <div className="bg-[#0d1117] rounded-xl p-3 border border-gray-800">
            <div className="text-xs text-gray-500">IAT</div>
            <div className={`text-lg font-mono ${liveData.rpm > 0 ? 'text-blue-400' : 'text-gray-600'}`}>
              {liveData.rpm > 0 ? `${Math.round(liveData.iat)}\u00b0C` : '---'}
            </div>
          </div>
        </div>

        {/* Engine Off State */}
        {liveData.rpm === 0 && (
          <div className="text-center py-8 text-gray-500 bg-[#0d1117] rounded-xl border border-gray-800">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-lg font-medium">Engine not running</p>
            <p className="text-sm">Connect to vehicle and start engine for live AI analysis</p>
          </div>
        )}

        {/* AI Summary Card */}
        {aiSummary && liveData.rpm > 0 && (
          <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold text-purple-300">AI Assessment</span>
              {aiConfidence > 0 && (
                <span className="text-[10px] text-gray-500 ml-auto">Confidence: {aiConfidence}%</span>
              )}
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">{aiSummary}</p>
            {aiSafetyAssessment && (
              <div className="mt-2 flex items-center gap-2 text-xs">
                <Shield className="w-3.5 h-3.5 text-green-400" />
                <span className="text-gray-400">{aiSafetyAssessment}</span>
              </div>
            )}
            {aiEstimatedHpGain > 0 && (
              <div className="mt-2 flex items-center gap-2 text-xs">
                <Zap className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-orange-400">Est. HP gain from recommendations: +{aiEstimatedHpGain} hp</span>
              </div>
            )}
          </div>
        )}

        {/* AI Auto-Tuning Status */}
        {isAiTuning && liveData.rpm > 0 && (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
            </div>
            <div>
              <div className="text-sm font-semibold text-purple-300">AI Auto-Tuning Active</div>
              <div className="text-xs text-purple-400">
                Automatically analyzing data and suggesting optimizations every 2 seconds
              </div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div className="space-y-3">
          {/* Section header with counts */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-400">Recommendations</h3>
            <div className="flex items-center gap-2">
              {criticalCount > 0 && (
                <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                  {criticalCount} Critical
                </span>
              )}
              {warningCount > 0 && (
                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                  {warningCount} Warning
                </span>
              )}
              <span className="text-xs text-gray-600">{aiRecommendations.length} total</span>
            </div>
          </div>

          {aiRecommendations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p className="text-lg font-medium">All parameters optimal</p>
              <p className="text-sm">No tuning adjustments recommended at this time</p>
            </div>
          ) : (
            aiRecommendations.map(rec => (
              <div key={rec.id} className={`rounded-xl border p-4 ${getSeverityBg(rec.severity)}`}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getSeverityIcon(rec.severity)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-gray-400">{getTypeIcon(rec.type)}</span>
                      <span className="font-semibold text-white capitalize">{rec.type}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        rec.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                        rec.severity === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {rec.severity}
                      </span>
                      <span className="text-xs text-gray-500">Confidence: {rec.confidence}%</span>
                    </div>
                    <p className="text-sm text-gray-300 mb-2">{rec.message}</p>
                    <p className="text-xs text-gray-500 mb-2">{rec.reason}</p>

                    <div className="flex items-center gap-4 text-xs flex-wrap">
                      <div>
                        <span className="text-gray-500">Current: </span>
                        <span className="text-white font-mono">{rec.currentValue.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Recommended: </span>
                        <span className="text-green-400 font-mono">{rec.recommendedValue.toFixed(2)}</span>
                      </div>
                      {rec.autoApplicable && (
                        <span className="text-green-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Auto-safe
                        </span>
                      )}
                    </div>

                    {rec.autoApplicable && (
                      <button
                        onClick={() => applyRecommendation(rec.id)}
                        className="mt-2 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Play className="w-3 h-3" />
                        Apply
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Performance Summary */}
        {currentMap && (
          <div className="bg-[#0d1117] rounded-xl p-4 border border-gray-800">
            <h3 className="font-semibold text-white mb-3">Current Map Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Map</div>
                <div className="text-white">{currentMap.name}</div>
              </div>
              <div>
                <div className="text-gray-500">Safety Score</div>
                <div className={`font-mono ${
                  currentMap.safetyScore >= 80 ? 'text-green-400' :
                  currentMap.safetyScore >= 60 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {currentMap.safetyScore}/100
                </div>
              </div>
              <div>
                <div className="text-gray-500">AI Powered</div>
                <div className="text-purple-400">{aiApiAvailable === true ? 'Gemini AI' : 'Local Rules'}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Panel */}
      {chatOpen && (
        <div className="border-t border-gray-800 bg-[#0d1117] flex flex-col" style={{ height: '50%' }}>
          {/* Chat Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-white">AI Tuning Chat</span>
              {aiApiAvailable === true && (
                <span className="w-2 h-2 rounded-full bg-green-400" />
              )}
            </div>
            <div className="flex items-center gap-2">
              {aiChatHistory.length > 0 && (
                <button
                  onClick={() => {
                    geminiAiService.clearChat();
                    useStore.getState().setAiChatHistory([]);
                  }}
                  className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setChatOpen(false)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {aiChatHistory.length === 0 && (
              <div className="text-center py-6 text-gray-600">
                <Bot className="w-8 h-8 mx-auto mb-2 text-gray-700" />
                <p className="text-sm">Ask me anything about tuning your BMW E60</p>
                <div className="mt-3 space-y-1">
                  {['What timing should I run on Stage 2?', 'Is my AFR safe at WOT?', 'How much boost can stock turbos handle?', 'Should I upgrade my intercooler?'].map(q => (
                    <button
                      key={q}
                      onClick={() => { setChatInput(q); }}
                      className="block w-full text-left text-xs text-gray-500 hover:text-blue-400 hover:bg-gray-800/50 px-2 py-1 rounded transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {aiChatHistory.map((msg, idx) => (
              <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'model' && (
                  <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300'
                }`}>
                  {msg.text}
                </div>
                {msg.role === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                )}
              </div>
            ))}

            {aiIsThinking && chatOpen && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div className="bg-gray-800 rounded-xl px-3 py-2">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="px-3 py-2 border-t border-gray-800">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleChatKeyDown}
                placeholder="Ask about tuning..."
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg text-xs text-white px-3 py-2 focus:outline-none focus:border-blue-500 placeholder:text-gray-600"
              />
              <button
                onClick={handleChatSend}
                disabled={!chatInput.trim() || aiIsThinking}
                className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 flex items-center justify-center transition-colors"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiAnalysisPage;
