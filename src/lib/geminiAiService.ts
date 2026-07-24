// BMW E60 Coder Pro - Google Gemini AI Service
// Set your API key in a .env file: VITE_GEMINI_API_KEY=your_key_here

import type { PerformanceMap, AiTuneRecommendation } from '@/types';

function getApiKey(): string {
  // 1. Build-time env var (set via GitHub Actions or .env.local)
  const env = (import.meta as any).env;
  const envKey = env?.VITE_GEMINI_API_KEY;
  if (envKey && envKey.length > 0) return envKey;

  // 2. Runtime localStorage (user can set via Settings > AI Key)
  try {
    const lsKey = localStorage.getItem('gemini_api_key');
    if (lsKey && lsKey.length > 0) return lsKey;
  } catch {}

  // 3. Runtime global (injected by native layer or debug builds)
  try {
    const winKey = (window as any).__GEMINI_API_KEY__;
    if (winKey && winKey.length > 0) return winKey;
  } catch {}

  return '';
}

export function setApiKey(key: string): void {
  try {
    localStorage.setItem('gemini_api_key', key);
  } catch {}
}

export function hasApiKey(): boolean {
  return getApiKey().length > 0;
}

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL_NAME = 'models/gemini-2.0-flash';

// Loose profile interface - only includes fields actually used by this service
// This avoids type mismatch with the store's TuningProfile which has fewer fields
interface ProfileLike {
  engine: string;
  currentMap: string;
  hasUpgradedIntercooler?: boolean;
  hasUpgradedTurbo?: boolean;
  hasUpgradedFuelPump?: boolean;
  hasUpgradedClutch?: boolean;
  hasMethInjection?: boolean;
  hasDownpipes?: boolean;
  hasExhaust?: boolean;
  hasUpgradedChargepipe?: boolean;
}

export interface AiAnalysisResult {
  summary: string;
  safetyAssessment: string;
  estimatedHpGain: number;
  confidence: number;
  recommendations: AiRecommendation[];
  risks: string[];
}

export interface AiRecommendation {
  parameter: string;
  currentValue: number;
  suggestedValue: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  expectedGain: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export async function testConnection(): Promise<boolean> {
  try {
    const key = getApiKey();
    const resp = await fetch(`${GEMINI_API_BASE}/${MODEL_NAME}?key=${key}`);
    return resp.status === 200;
  } catch {
    return false;
  }
}

export async function analyzeLiveData(
  liveData: Record<string, number>,
  engineType: string,
  currentMap: string,
  modifications: string[]
): Promise<AiAnalysisResult> {
  const key = getApiKey();
  if (!key) return localFallbackAnalysis(liveData, engineType);

  const systemPrompt = `You are an expert BMW ECU tuning advisor. Analyze the provided live OBD2 data and give tuning recommendations. Respond ONLY with valid JSON in this exact format: {"summary":"brief analysis","safetyAssessment":"safe/moderate/risky","estimatedHpGain":number,"confidence":number,"recommendations":[{"parameter":"name","currentValue":number,"suggestedValue":number,"reason":"explanation","priority":"high|medium|low","expectedGain":number}],"risks":["risk1"]}`;

  const userPrompt = `Live OBD2 Data: RPM:${liveData.rpm || 0} Boost:${(liveData.boost || 0).toFixed(2)}bar AFR:${(liveData.afr || 0).toFixed(3)} IAT:${liveData.iat || 0}C Coolant:${liveData.coolantTemp || 0}C OilTemp:${liveData.oilTemp || 0}C Timing:${liveData.timing || 0} Knock:${liveData.knock || 0} Load:${liveData.load || 0}% Throttle:${liveData.throttle || 0}% FuelTrimST:${liveData.fuelTrimShort || 0}% FuelTrimLT:${liveData.fuelTrimLong || 0}% DutyCycle:${liveData.dutyCycle || 0}% Engine:${engineType} Map:${currentMap} Mods:${modifications.join(', ') || 'Stock'}`;

  try {
    const resp = await fetch(`${GEMINI_API_BASE}/${MODEL_NAME}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 2048, responseMimeType: 'application/json' },
      }),
    });
    if (!resp.ok) throw new Error(`Gemini API error: ${resp.status}`);
    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    try {
      const result = JSON.parse(text) as AiAnalysisResult;
      return {
        summary: result.summary || 'Analysis complete',
        safetyAssessment: result.safetyAssessment || 'Safe',
        estimatedHpGain: result.estimatedHpGain || 0,
        confidence: result.confidence || 80,
        recommendations: result.recommendations || [],
        risks: result.risks || [],
      };
    } catch {
      return { summary: 'AI analysis completed.', safetyAssessment: 'Safe', estimatedHpGain: 0, confidence: 70, recommendations: extractRecommendationsFromText(text, liveData), risks: [] };
    }
  } catch (err) {
    console.warn('Gemini AI failed, using fallback:', err);
    return localFallbackAnalysis(liveData, engineType);
  }
}

export async function chat(message: string, history: ChatMessage[], liveData: Record<string, number>, engineType: string): Promise<string> {
  const key = getApiKey();
  if (!key) return 'AI unavailable. Set VITE_GEMINI_API_KEY in .env file.';
  const systemPrompt = `You are BMW AI Tuner, an expert in BMW ECU tuning for N54/N55/S55/M54 engines. Be concise and technical. Prioritize engine safety. Engine: ${engineType}.`;
  const contents = [
    { role: 'user' as const, parts: [{ text: systemPrompt }] },
    ...history.slice(-10).map(h => ({ role: h.role as 'user' | 'model', parts: [{ text: h.text }] })),
    { role: 'user' as const, parts: [{ text: `[Live: RPM=${liveData.rpm},Boost=${liveData.boost}bar,AFR=${liveData.afr},IAT=${liveData.iat}C] ${message}` }] },
  ];
  try {
    const resp = await fetch(`${GEMINI_API_BASE}/${MODEL_NAME}:generateContent?key=${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, generationConfig: { temperature: 0.3, maxOutputTokens: 1024 } }),
    });
    if (!resp.ok) throw new Error(`API error: ${resp.status}`);
    const data = await resp.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not process.';
  } catch (err) {
    return `AI unavailable: ${err instanceof Error ? err.message : String(err)}`;
  }
}

// ===== Compatibility wrapper for aiTuningEngine.ts =====

function convertLiveData(data: any): Record<string, number> {
  return {
    rpm: data.rpm || 0, boost: data.boost || 0, afr: data.afr || 0, iat: data.iat || 0,
    coolantTemp: data.coolantTemp || 0, oilTemp: data.oilTemp || 0, timing: data.timing || 0,
    knock: data.knock || 0, load: data.load || 0, throttle: data.throttle || 0,
    fuelTrimShort: data.fuelTrimShort || 0, fuelTrimLong: data.fuelTrimLong || 0,
    dutyCycle: data.dutyCycle || 0, oilPressure: data.oilPressure || 0,
    batteryVoltage: data.battery || 0, turbineInlet: data.turbineInlet || 0,
    turbineOutlet: data.turbineOutlet || 0, lambda: data.lambda || 0,
    tqActual: data.tqActual || 0, tqRequested: data.tqRequested || 0,
    speed: data.speed || 0, fuelPressure: data.fuelPressure || 0, maf: data.maf || 0,
  };
}

function buildModifications(profile: ProfileLike): string[] {
  const mods: string[] = [];
  if (profile.hasUpgradedIntercooler) mods.push('Upgraded Intercooler');
  if (profile.hasUpgradedTurbo) mods.push('Upgraded Turbo(s)');
  if (profile.hasUpgradedFuelPump) mods.push('Upgraded Fuel Pump');
  if (profile.hasUpgradedClutch) mods.push('Upgraded Clutch');
  if (profile.hasMethInjection) mods.push('Methanol Injection');
  if (profile.hasDownpipes) mods.push('Downpipes');
  if (profile.hasExhaust) mods.push('Exhaust');
  if (profile.hasUpgradedChargepipe) mods.push('Upgraded Chargepipe');
  return mods;
}

function inferRecommendationType(parameter: string): AiTuneRecommendation['type'] {
  const p = parameter.toLowerCase();
  if (p.includes('timing') || p.includes('knock')) return 'timing';
  if (p.includes('fuel') || p.includes('afr') || p.includes('lambda')) return 'fuel';
  if (p.includes('boost') || p.includes('wastegate')) return 'boost';
  if (p.includes('throttle')) return 'throttle';
  if (p.includes('vanos')) return 'vanos';
  if (p.includes('safety') || p.includes('torque') || p.includes('oil') || p.includes('iat')) return 'safety';
  return 'general';
}

export const geminiAiService = {
  async analyzeLiveData(data: any, profile: ProfileLike, _currentMap: PerformanceMap | null): Promise<{ recommendations: AiTuneRecommendation[] }> {
    const liveData = convertLiveData(data);
    const result = await analyzeLiveData(liveData, profile.engine, profile.currentMap, buildModifications(profile));
    const recommendations: AiTuneRecommendation[] = result.recommendations.map(r => ({
      id: `ai_${r.parameter}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: inferRecommendationType(r.parameter),
      severity: r.priority === 'high' ? 'critical' : r.priority === 'medium' ? 'warning' : 'suggestion',
      message: `${r.parameter}: ${r.reason}`,
      parameter: r.parameter,
      currentValue: r.currentValue,
      recommendedValue: r.suggestedValue,
      reason: r.reason,
      confidence: Math.round(result.confidence),
      autoApplicable: r.priority !== 'high',
    }));
    return { recommendations };
  },

  analyzeLiveDataLocal(data: any, profile: ProfileLike, _currentMap: PerformanceMap | null): { recommendations: AiTuneRecommendation[] } {
    const liveData = convertLiveData(data);
    const result = localFallbackAnalysis(liveData, profile.engine);
    const recommendations: AiTuneRecommendation[] = result.recommendations.map(r => ({
      id: `local_${r.parameter}_${Date.now()}`,
      type: inferRecommendationType(r.parameter),
      severity: r.priority === 'high' ? 'critical' : r.priority === 'medium' ? 'warning' : 'suggestion',
      message: `${r.parameter}: ${r.reason}`,
      parameter: r.parameter,
      currentValue: r.currentValue,
      recommendedValue: r.suggestedValue,
      reason: r.reason,
      confidence: Math.round(result.confidence),
      autoApplicable: r.priority !== 'high',
    }));
    return { recommendations };
  },
};

function extractRecommendationsFromText(text: string, liveData: Record<string, number>): AiRecommendation[] {
  const recs: AiRecommendation[] = [];
  if (text.toLowerCase().includes('boost') && liveData.boost !== undefined) {
    recs.push({ parameter: 'Boost Target', currentValue: liveData.boost, suggestedValue: Math.min(liveData.boost + 0.1, 2.0), reason: 'AI suggests optimizing boost', priority: 'medium', expectedGain: 10 });
  }
  if (text.toLowerCase().includes('timing') && liveData.timing !== undefined) {
    recs.push({ parameter: 'Ignition Timing', currentValue: liveData.timing, suggestedValue: liveData.timing + 1, reason: 'AI suggests timing optimization', priority: 'medium', expectedGain: 5 });
  }
  return recs;
}

function localFallbackAnalysis(liveData: Record<string, number>, _engineType: string): AiAnalysisResult {
  const recommendations: AiRecommendation[] = [];
  const risks: string[] = [];
  if (liveData.afr < 0.8) { risks.push('AFR very rich'); recommendations.push({ parameter: 'Fuel Correction', currentValue: liveData.afr, suggestedValue: 0.85, reason: 'AFR too rich', priority: 'high', expectedGain: 0 }); }
  else if (liveData.afr > 1.1) { risks.push('AFR lean - knock risk'); recommendations.push({ parameter: 'Fuel Correction', currentValue: liveData.afr, suggestedValue: 1.0, reason: 'AFR too lean', priority: 'high', expectedGain: 0 }); }
  if (liveData.knock > 2) { risks.push('Knock detected'); recommendations.push({ parameter: 'Global Timing', currentValue: liveData.timing, suggestedValue: liveData.timing - 2, reason: 'Knock detected, pulling timing', priority: 'high', expectedGain: -5 }); }
  if (liveData.iat > 55) { risks.push('High IAT'); recommendations.push({ parameter: 'Boost Target', currentValue: liveData.boost, suggestedValue: Math.max(liveData.boost - 0.1, 0.5), reason: 'High IAT, reducing boost', priority: 'medium', expectedGain: -5 }); }
  const estimatedGain = (recommendations.length === 0 && liveData.rpm > 3000) ? 15 : 0;
  return { summary: recommendations.length > 0 ? `${recommendations.length} adjustments recommended` : 'All parameters optimal', safetyAssessment: risks.length > 0 ? 'Attention Required' : 'Safe', estimatedHpGain: estimatedGain, confidence: 75, recommendations, risks };
}

export default { testConnection, analyzeLiveData, chat };
