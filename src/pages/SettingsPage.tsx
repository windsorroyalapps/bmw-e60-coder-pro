import React, { useState, useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import { ENGINE_SPECS } from '@/lib/engineData';
import {
  Settings, Car, Cpu, Save,
  CheckCircle, Gauge, Zap, CreditCard, Nfc, AlertCircle
} from 'lucide-react';
import type { EngineType, TransmissionType } from '@/types';

export const SettingsPage: React.FC = () => {
  const { profile, updateProfile, fuelCard, setFuelCard } = useStore();
  const [saved, setSaved] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [lastTx, setLastTx] = useState<{ amount: number; timestamp: number } | null>(null);

  useEffect(() => {
    const handleFuelTx = (event: any) => {
      console.log("Fuel Transaction Event:", event);
      // Capacitor events usually come through as a custom event or window property
      const data = typeof event.detail === 'string' ? JSON.parse(event.detail) : event.detail;
      setLastTx(data);

      // Auto-clear after 10 seconds
      setTimeout(() => setLastTx(null), 10000);
    };

    window.addEventListener('fuelTransactionVerified', handleFuelTx);
    return () => window.removeEventListener('fuelTransactionVerified', handleFuelTx);
  }, []);

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
              <label className="text-xs text-gray-500 block mb-1">Year</label>
              <input
                type="text"
                value={profile.year || ''}
                onChange={(e) => updateProfile({ year: e.target.value })}
                className="w-full bg-[#161b22] border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Fuel Octane</label>
              <select
                value={profile.fuelOctane || 93}
                onChange={(e) => updateProfile({ fuelOctane: Number(e.target.value) })}
                className="w-full bg-[#161b22] border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value={87}>87 (Regular)</option>
                <option value={91}>91 (Premium)</option>
                <option value={93}>93 (Premium+)</option>
                <option value={100}>100 (Race)</option>
              </select>
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
                onClick={() => updateProfile({ transmission: tr.id as any })}
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
                onClick={() => updateProfile({ [mod.key]: !(profile as any)[mod.key] } as any)}
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

        {/* NFC Fuel Payment */}
        <div className="bg-[#0d1117] rounded-xl p-4 border border-gray-800">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Fuel Payment (NFC)
          </h2>
          <div className={`p-4 rounded-lg border mb-3 text-center transition-all ${
            lastTx ? 'bg-amber-500/10 border-amber-500/50 scale-105' :
            fuelCard.enabled ? 'bg-green-500/5 border-green-500/20' : 'bg-blue-500/5 border-blue-500/20'
          }`}>
            {lastTx ? (
              <div className="animate-pulse">
                <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-2" />
                <div className="text-white font-bold text-lg mb-1">Pre-Auth Verified</div>
                <div className="text-2xl font-mono text-amber-500 mb-1">${lastTx.amount.toFixed(2)}</div>
                <div className="text-xs text-gray-400">Pump Authorization Successful</div>
              </div>
            ) : (
              <>
                <Nfc className={`w-12 h-12 mx-auto mb-2 ${fuelCard.enabled ? 'text-green-400' : 'text-blue-400'}`} />
                <div className="text-white font-bold text-lg mb-1">
                  {fuelCard.enabled ? `Fuel Card Active` : 'Fuel Card Inactive'}
                </div>
                {fuelCard.enabled && (
                  <div className="text-xs text-green-500 font-mono mb-1">
                    **** **** **** {fuelCard.lastFour}
                  </div>
                )}
                <div className="text-xs text-gray-500">
                  {fuelCard.enabled
                    ? 'Ready to tap at any BP, Ampol, or Shell pump'
                    : 'Tap to pay at gas pumps for auto-log integration'}
                </div>
              </>
            )}
          </div>
          <button
            disabled={isProvisioning}
            className={`w-full py-2.5 text-white text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
              isProvisioning ? 'bg-gray-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
            onClick={async () => {
              setIsProvisioning(true);
              try {
                // @ts-ignore
                const result = await window.Capacitor.Plugins.OBD2Bridge.provisionFuelCard({
                  token: "" // Pass empty to trigger rolling PAN generation
                });

                if (result.success) {
                  setFuelCard({
                    enabled: true,
                    token: result.token,
                    lastFour: result.token.slice(-4)
                  });
                  alert(`Fuel Card Provisioned! Rolling PAN: ****${result.token.slice(-4)}`);
                }
              } catch (e) {
                alert("Provisioning failed: " + e);
              } finally {
                setIsProvisioning(false);
              }
            }}
          >
            {isProvisioning ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Provisioning...
              </>
            ) : (
              fuelCard.enabled ? 'Rotate Rolling PAN' : 'Provision Fuel Card'
            )}
          </button>
          <div className="mt-3 flex items-center gap-2 text-[10px] text-gray-500">
            <CheckCircle className={`w-3 h-3 ${fuelCard.enabled ? 'text-green-500' : 'text-gray-600'}`} />
            Supports Visa/MasterCard Contactless (HCE) with Luhn validation
          </div>
        </div>

        {/* About */}
        <div className="bg-[#0d1117] rounded-xl p-4 border border-gray-800 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Car className="w-5 h-5 text-blue-400" />
            <span className="font-semibold text-white">BMW E60 Coder Pro</span>
          </div>
          <p className="text-xs text-gray-500">Complete BMW E60 tuning and diagnostics platform</p>
          <p className="text-xs text-gray-600 mt-1">AI-powered tuning with DME safe flash protocols</p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
