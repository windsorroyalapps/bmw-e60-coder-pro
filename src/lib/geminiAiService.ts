// BMW E60 Coder Pro - AI Service (Gemini)
import type { PerformanceMap, AiTuneRecommendation } from '@/types';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL_NAME = 'models/gemini-2.0-flash';

function getApiKey(): string {
  const env = (import.meta as any).env;
  const envKey = env?.VITE_GEMINI_API_KEY;
  if (envKey && envKey.length > 0) return envKey;
  return '';
}

export interface ProfileLike {
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

export interface AiDtcDefinition {
  code: string;
  description: string;
  system: string;
  severity: 'info' | 'warning' | 'critical';
  causes: string[];
  symptoms: string[];
  recommendation: string;
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
    if (!key) return false;

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

  if (!key) {
    console.warn('Gemini API key missing, using local fallback analysis');
    return localFallbackAnalysis(liveData, engineType);
  }

  const systemPrompt = `You are an expert BMW ECU tuning advisor. Analyze the provided live OBD2 data and give tuning recommendations. Respond ONLY with valid JSON in this exact format: {"summary":"brief analysis","safetyAssessment":"safe/moderate/risky","estimatedHpGain":number,"confidence":number,"recommendations":[{"parameter":"name","currentValue":number,"suggestedValue":number,"reason":"explanation","priority":"high|medium|low","expectedGain":number}],"risks":["risk1"]}`;
  const userPrompt = `Live OBD2 Data: RPM:${liveData.rpm || 0} Boost:${(liveData.boost || 0).toFixed(2)}bar AFR:${(liveData.afr || 0).toFixed(3)} IAT:${liveData.iat || 0}C Coolant:${liveData.coolantTemp || 0}C OilTemp:${liveData.oilTemp || 0}C Timing:${liveData.timing || 0} Knock:${liveData.knock || 0} Load:${liveData.load || 0}% Throttle:${liveData.throttle || 0}% FuelTrimST:${liveData.fuelTrimShort || 0}% FuelTrimLT:${liveData.fuelTrimLong || 0}% DutyCycle:${liveData.dutyCycle || 0}% Engine:${engineType} Map:${currentMap} Mods:${modifications.join(', ') || 'Stock'}`;

  try {
    const resp = await fetch(`${GEMINI_API_BASE}/${MODEL_NAME}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
      }),
    });
    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    return JSON.parse(text) as AiAnalysisResult;
  } catch (err) {
    console.warn('Gemini failed:', err);
    return localFallbackAnalysis(liveData, engineType);
  }
}

export async function getDtcDefinition(code: string, engineType: string): Promise<AiDtcDefinition> {
  const key = getApiKey();

  if (!key) {
    return { code, description: "Gemini API key missing", system: "Unknown", severity: "info", causes: [], symptoms: [], recommendation: "Please configure Gemini API key" };
  }

  const systemPrompt = `You are a BMW Master Technician. Respond ONLY with JSON definition for DTC ${code} on engine ${engineType}: {"code":"${code}","description":"...","system":"...","severity":"warning","causes":[],"symptoms":[],"recommendation":"..."}`;

  try {
    const resp = await fetch(`${GEMINI_API_BASE}/${MODEL_NAME}:generateContent?key=${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: systemPrompt }] }], generationConfig: { responseMimeType: 'application/json' } }),
    });
    const data = await resp.json();
    return JSON.parse(data.candidates[0].content.parts[0].text);
  } catch {
    return { code, description: "AI Error", system: "Unknown", severity: "warning", causes: [], symptoms: [], recommendation: "Try again later" };
  }
}

export async function chat(message: string, history: ChatMessage[], liveData: Record<string, number>, engineType: string): Promise<string> {
  const key = getApiKey();

  if (!key) {
    return "Gemini API key is not configured. Please add it to your environment variables.";
  }

  const historyText = history.slice(-5).map(h => `${h.role}: ${h.text}`).join('\n');
  const systemPrompt = `You are BMW AI Tuner. Engine: ${engineType}. Context: RPM=${liveData.rpm}, Boost=${liveData.boost}. History:\n${historyText}`;

  try {
    const resp = await fetch(`${GEMINI_API_BASE}/${MODEL_NAME}:generateContent?key=${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: systemPrompt + "\nUser: " + message }] }] }),
    });
    const data = await resp.json();
    return data.candidates[0].content.parts[0].text;
  } catch (err) {
    return "AI Error connection to Gemini.";
  }
}

function localFallbackAnalysis(liveData: Record<string, number>, _engineType: string): AiAnalysisResult {
  const recommendations: AiRecommendation[] = [];
  const risks: string[] = [];
  if (liveData.afr < 0.8) { risks.push('AFR very rich'); recommendations.push({ parameter: 'Fuel Correction', currentValue: liveData.afr, suggestedValue: 0.85, reason: 'AFR too rich', priority: 'high', expectedGain: 0 }); }
  if (liveData.knock > 2) { risks.push('Knock detected'); recommendations.push({ parameter: 'Global Timing', currentValue: liveData.timing, suggestedValue: liveData.timing - 2, reason: 'Knock detected', priority: 'high', expectedGain: -5 }); }
  return { summary: 'Safety analysis complete (Local Fallback)', safetyAssessment: risks.length > 0 ? 'Warning' : 'Safe', estimatedHpGain: 0, confidence: 75, recommendations, risks };
}

function inferRecommendationType(parameter: string): AiTuneRecommendation['type'] {
  const p = parameter.toLowerCase();
  if (p.includes('timing')) return 'timing';
  if (p.includes('fuel') || p.includes('afr')) return 'fuel';
  if (p.includes('boost')) return 'boost';
  return 'general';
}

export const geminiAiService = {
  async analyzeLiveData(data: any, profile: ProfileLike, _currentMap: PerformanceMap | null): Promise<{ recommendations: AiTuneRecommendation[] }> {
    const liveData = { rpm: data.rpm || 0, boost: data.boost || 0, afr: data.afr || 0, timing: data.timing || 0, knock: data.knock || 0 };
    const result = await analyzeLiveData(liveData, profile.engine, profile.currentMap, []);
    return { recommendations: result.recommendations.map((r, i) => ({
      id: `ai_${i}_${Date.now()}`,
      type: inferRecommendationType(r.parameter),
      severity: r.priority === 'high' ? 'critical' : 'suggestion',
      message: `${r.parameter}: ${r.reason}`,
      parameter: r.parameter,
      currentValue: r.currentValue,
      recommendedValue: r.suggestedValue,
      reason: r.reason,
      confidence: result.confidence,
      autoApplicable: r.priority !== 'high',
    })) };
  }
};

export default { testConnection, analyzeLiveData, chat, getDtcDefinition, geminiAiService };
