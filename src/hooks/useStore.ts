// BMW E60 Coder Pro - Global State Store
// 100% LIVE - All data comes from real OBD2 via native Android bridge.
// No simulation. No mock data. No Math.random().

import { create } from 'zustand';
import type {
  MapType, LiveData, LogSession,
  PerformanceMap, VehicleProfile, AiTuneRecommendation, ConnectionStatus,
  GaugeLayout, FlashBackup, DTCReading, AdapterConfig
} from '@/types';
import type { OBD2State, FlashSession, CableInfo } from '@/lib/obd2Connection';
import { aiTuningEngine } from '@/lib/aiTuningEngine';
import { geminiAiService, type AiChatMessage } from '@/lib/geminiAiService';
