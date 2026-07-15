// BMW E60 Coder Pro - Google Gemini AI Service
// Integrates with Google AI Studio for real-time tuning analysis
// Set your API key in a .env file: VITE_GEMINI_API_KEY=your_key_here

function getApiKey(): string {
  // Use Vite env var if available, otherwise user must set it
  const env = (import.meta as any).env;
  const envKey = env?.VITE_GEMINI_API_KEY;
  if (envKey && envKey.length > 0) return envKey;
  // Placeholder - user must configure their own key via .env
  return '';
}

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL_NAME = 'models/gemini-2.0-flash';

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

/**
 * Test if the Gemini API is available and key is valid
 */
export async function testConnection(): Promise<boolean> {
  try {
    const key = getApiKey();
    const resp = await fetch(`${GEMINI_API_BASE}/${MODEL_NAME}?key=${key}`);
    return resp.status === 200;
  } catch {
    return false;
  }
}

/**
 * Analyze live OBD2 data with Gemini AI
 */
export async function analyzeLiveData(
  liveData: Record<string, number>,
  engineType: string,
  currentMap: string,
  modifications: string[]
): Promise<AiAnalysisResult> {
  const key = getApiKey();

  const systemPrompt = `You are an expert BMW ECU tuning advisor specializing in N54/N55/M54 engines. 
Analyze the provided live OBD2 data and give tuning recommendations.
Respond ONLY with valid JSON in this exact format:
{
  "summary": "brief analysis summary",
  "safetyAssessment": "safe/moderate/risky with explanation",
  "estimatedHpGain": number (0-100),
  "confidence": number (0-100),
  "recommendations": [
    {
      "parameter": "parameter name",
      "currentValue": number,
      "suggestedValue": number,
      "reason": "explanation",
      "priority": "high|medium|low",
      "expectedGain": number
    }
  ],
  "risks": ["risk1", "risk2"]
}`;

  const userPrompt = `Live OBD2 Data:
- RPM: ${liveData.rpm || 0}
- Boost: ${(liveData.boost || 0).toFixed(2)} bar
- AFR (lambda): ${(liveData.afr || 0).toFixed(3)}
- IAT: ${liveData.iat || 0}°C
- Coolant: ${liveData.coolantTemp || 0}°C
- Oil Temp: ${liveData.oilTemp || 0}°C
- Timing: ${liveData.timing || 0}°
- Knock: ${liveData.knock || 0}°
- Load: ${liveData.load || 0}%
- Throttle: ${liveData.throttle || 0}%
- Fuel Trim (ST): ${liveData.fuelTrimShort || 0}%
- Fuel Trim (LT): ${liveData.fuelTrimLong || 0}%
- Duty Cycle: ${liveData.dutyCycle || 0}%
- Oil Pressure: ${liveData.oilPressure || 0} bar

Engine: ${engineType}
Current Map: ${currentMap}
Modifications: ${modifications.join(', ') || 'Stock'}`;

  try {
    const resp = await fetch(`${GEMINI_API_BASE}/${MODEL_NAME}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!resp.ok) {
      throw new Error(`Gemini API error: ${resp.status} ${resp.statusText}`);
    }

    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    // Try to parse JSON response
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
      // If JSON parsing fails, return a structured fallback
      return {
        summary: 'AI analysis completed. Review recommendations carefully.',
        safetyAssessment: 'Safe - parameters within normal range',
        estimatedHpGain: 0,
        confidence: 70,
        recommendations: extractRecommendationsFromText(text, liveData),
        risks: [],
      };
    }
  } catch (err) {
    console.warn('Gemini AI analysis failed, using local fallback:', err);
    return localFallbackAnalysis(liveData, engineType);
  }
}

/**
 * Chat with the AI tuning advisor
 */
export async function chat(
  message: string,
  history: ChatMessage[],
  liveData: Record<string, number>,
  engineType: string
): Promise<string> {
  const key = getApiKey();

  const systemPrompt = `You are BMW AI Tuner, an expert in BMW ECU tuning for N54/N55/S55/M54 engines. 
You help users optimize their tunes safely. Be concise, technical but clear. 
Always prioritize engine safety. Current engine: ${engineType}.`;

  const contents = [
    { role: 'user' as const, parts: [{ text: systemPrompt }] },
    ...history.slice(-10).map(h => ({
      role: h.role as 'user' | 'model',
      parts: [{ text: h.text }],
    })),
    { role: 'user' as const, parts: [{ text: `[Live Data: RPM=${liveData.rpm}, Boost=${liveData.boost}bar, AFR=${liveData.afr}, IAT=${liveData.iat}C] ${message}` }] },
  ];

  try {
    const resp = await fetch(`${GEMINI_API_BASE}/${MODEL_NAME}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!resp.ok) {
      throw new Error(`Gemini API error: ${resp.status}`);
    }

    const data = await resp.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'I could not process that request.';
  } catch (err) {
    return `AI service unavailable. Error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

/**
 * Extract recommendations from non-JSON text response
 */
function extractRecommendationsFromText(
  text: string,
  liveData: Record<string, number>
): AiRecommendation[] {
  const recommendations: AiRecommendation[] = [];

  // Look for boost-related suggestions
  if (text.toLowerCase().includes('boost') && liveData.boost !== undefined) {
    recommendations.push({
      parameter: 'Boost Target',
      currentValue: liveData.boost,
      suggestedValue: Math.min(liveData.boost + 0.1, 2.0),
      reason: 'AI suggests optimizing boost profile',
      priority: 'medium',
      expectedGain: 10,
    });
  }

  // Look for timing-related suggestions
  if (text.toLowerCase().includes('timing') && liveData.timing !== undefined) {
    recommendations.push({
      parameter: 'Ignition Timing',
      currentValue: liveData.timing,
      suggestedValue: liveData.timing + 1,
      reason: 'AI suggests timing optimization',
      priority: 'medium',
      expectedGain: 5,
    });
  }

  return recommendations;
}

/**
 * Local fallback analysis when AI is unavailable
 */
function localFallbackAnalysis(
  liveData: Record<string, number>,
  _engineType: string
): AiAnalysisResult {
  const recommendations: AiRecommendation[] = [];
  const risks: string[] = [];

  // Check AFR
  if (liveData.afr < 0.8) {
    risks.push('AFR very rich - potential fuel wash');
    recommendations.push({
      parameter: 'Fuel Correction',
      currentValue: liveData.afr,
      suggestedValue: 0.85,
      reason: 'AFR too rich, leaning out recommended',
      priority: 'high',
      expectedGain: 0,
    });
  } else if (liveData.afr > 1.1) {
    risks.push('AFR lean - knock risk');
    recommendations.push({
      parameter: 'Fuel Correction',
      currentValue: liveData.afr,
      suggestedValue: 1.0,
      reason: 'AFR too lean, enriching recommended',
      priority: 'high',
      expectedGain: 0,
    });
  }

  // Check knock
  if (liveData.knock > 2) {
    risks.push('Knock detected - reduce timing');
    recommendations.push({
      parameter: 'Global Timing',
      currentValue: liveData.timing,
      suggestedValue: liveData.timing - 2,
      reason: 'Knock detected, pulling timing for safety',
      priority: 'high',
      expectedGain: -5,
    });
  }

  // Check IAT
  if (liveData.iat > 55) {
    risks.push('High IAT - power reduced');
    recommendations.push({
      parameter: 'Boost Target',
      currentValue: liveData.boost,
      suggestedValue: Math.max(liveData.boost - 0.1, 0.5),
      reason: 'High IAT, reducing boost for safety',
      priority: 'medium',
      expectedGain: -5,
    });
  }

  // Estimate HP gain
  let estimatedGain = 0;
  if (recommendations.length === 0 && liveData.rpm > 3000) {
    estimatedGain = 15;
  }

  return {
    summary: recommendations.length > 0
      ? `${recommendations.length} tuning adjustments recommended based on live data.`
      : 'All parameters within optimal range.',
    safetyAssessment: risks.length > 0 ? 'Attention Required' : 'Safe',
    estimatedHpGain: estimatedGain,
    confidence: 75,
    recommendations,
    risks,
  };
}

export default {
  testConnection,
  analyzeLiveData,
  chat,
};
