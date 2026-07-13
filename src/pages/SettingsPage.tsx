import React, { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { ENGINE_SPECS } from '@/lib/engineData';
import {
  Settings, Car, Cpu, Save,
  CheckCircle, Gauge, Zap
} from 'lucide-react';
import type { EngineType, TransmissionType } from '@/types';

export const SettingsPage: React.FC = () => {
  const { profile, updateProfile } = useStore();
  const [saved, setSaved] = useState(false);

  const engines: { id: EngineType; name: string }[] = [
    { id: 'n54', name: 'N54 (Twin-Turbo)' },
    { id: 'n52', name: 'N52 (Naturally Aspirated)' },
    { id: 'm54', name: 'M54 (Naturally Aspirated)' },
    { id: 'm57', name: 'M57 (Turbo Diesel)' },
  ];

  const transmissions: { id: TransmissionType; name: string }[] = [
    { id: 'manual_6', name: '6-Speed Manual' },
    { id: 'auto_6', name: '6-Speed Automatic' },
    { id: 'auto_6_sport', name: '6-Speed Auto Sport' },
    { id: 'smg_3', name: 'SMG-III' },
  ];

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] overflow-auto">
      {/* Header */}
      <div className="px-4 py-3 bg-[#0d1117] border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-gray-400" />
            <h1 className="text-xl font-bold text-white">Settings</h1>
          </div>
          <button
            onClick={handleSave}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-colors ${
              saved ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Vehicle Profile */}
        <div className="bg-[#0d1117] rounded-xl p-4 border border-gray-800">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Car className="w-4 h-4" />
            Vehicle Profile
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Profile Name</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => updateProfile({ name: e.target.value })}
                className="w-full bg-[#161b22] border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">VIN</label>
              <input
                type="text"
                value={profile.vin}
                onChange={(e) => updateProfile({ vin: e.target.value })}
                className="w-full bg-[#161b22] border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Mileage (km)</label>
              <input
                type="number"
                value={profile.mileage}
                onChange={(e) => updateProfile({ mileage: Number(e.target.value) })}
                className="w-full bg-[#161b22] border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Engine Selection */}
        <div className="bg-[#0d1117] rounded-xl p-4 border border-gray-800">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            Engine
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {engines.map(eng => {
              const spec = ENGINE_SPECS[eng.id];
              return (
                <button
                  key={eng.id}
                  onClick={() => updateProfile({ engine: eng.id })}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    profile.engine === eng.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="font-semibold text-white text-sm">{eng.name}</div>
                  <div className="text-xs text-gray-500">
                    {spec.stockPower}hp | {spec.displacement}L | {spec.fuelType}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Transmission */}
        <div className="bg-[#0d1117] rounded-xl p-4 border border-gray-800">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Gauge className="w-4 h-4" />
            Transmission
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {transmissions.map(tr => (
              <button
                key={tr.id}
                onClick={() => updateProfile({ transmission: tr.id })}
                className={`p-3 rounded-lg border text-left transition-all ${
                  profile.transmission === tr.id
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <span className="text-white text-sm">{tr.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Modifications */}
        <div className="bg-[#0d1117] rounded-xl p-4 border border-gray-800">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Modifications
          </h2>
          <div className="space-y-2">
            {[
              { key: 'hasUpgradedIntercooler', label: 'Upgraded Intercooler', desc: 'Reduces IAT for more power' },
              { key: 'hasUpgradedTurbo', label: 'Upgraded Turbocharger(s)', desc: 'Larger turbos for more boost' },
              { key: 'hasUpgradedFuelPump', label: 'Upgraded Fuel Pump', desc: 'LPFP upgrade for E85/high power' },
              { key: 'hasUpgradedClutch', label: 'Upgraded Clutch', desc: 'Holds more torque' },
              { key: 'hasMethInjection', label: 'Methanol Injection', desc: 'Reduces IAT, suppresses knock' },
              { key: 'hasDownpipes', label: 'Catless Downpipes', desc: 'Reduces backpressure' },
              { key: 'hasExhaust', label: 'Performance Exhaust', desc: 'Full catback system' },
              { key: 'hasUpgradedChargepipe', label: 'Upgraded Chargepipe', desc: 'Prevents failure under boost' },
            ].map(mod => (
              <button
                key={mod.key}
                onClick={() => updateProfile({ [mod.key]: !(profile as any)[mod.key] })}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                  (profile as any)[mod.key]
                    ? 'border-green-500/50 bg-green-500/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                  (profile as any)[mod.key] ? 'bg-green-500 border-green-500' : 'border-gray-600'
                }`}>
                  {(profile as any)[mod.key] && <CheckCircle className="w-4 h-4 text-white" />}
                </div>
                <div>
                  <div className="text-sm text-white">{mod.label}</div>
                  <div className="text-xs text-gray-500">{mod.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-[#0d1117] rounded-xl p-4 border border-gray-800">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Notes</h2>
          <textarea
            value={profile.notes}
            onChange={(e) => updateProfile({ notes: e.target.value })}
            placeholder="Add notes about your build..."
            rows={3}
            className="w-full bg-[#161b22] border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>

        {/* About */}
        <div className="bg-[#0d1117] rounded-xl p-4 border border-gray-800 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Car className="w-5 h-5 text-blue-400" />
            <span className="font-semibold text-white">BMW E60 Coder Pro</span>
          </div>
          <p className="text-xs text-gray-500">Complete BMW E60 tuning and diagnostics platform</p>
          <p className="texttext-gray-600 mt-1">AI-powered tuning with DME safe flash protocols</p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
