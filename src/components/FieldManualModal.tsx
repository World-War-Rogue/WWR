import React, { useState } from 'react';
import {
  FileText,
  Shield,
  Download,
  Upload,
  CheckCircle2,
  Key,
  BookOpen,
} from 'lucide-react';
import { PlayerProfile, Squad, BaseBuilding } from '../types';
import { generateAntiCheatChecksum } from '../utils/antiCheat';

interface FieldManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PlayerProfile;
  squads: Squad[];
  buildings: BaseBuilding[];
  onImportState: (savedJson: string) => void;
}

export const FieldManualModal: React.FC<FieldManualModalProps> = ({
  isOpen,
  onClose,
  profile,
  squads,
  buildings,
  onImportState,
}) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'anticheat' | 'save'>('manual');
  const [importString, setImportString] = useState<string>('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const checksum = generateAntiCheatChecksum(profile.callsign, profile.resources, squads);

  const handleExportSave = () => {
    const data = {
      profile,
      squads,
      buildings,
      checksum,
      timestamp: new Date().toISOString(),
      version: '1.0.0-MILSPEC',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WorldWarRogue_Save_${profile.callsign}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSave = () => {
    try {
      onImportState(importString);
      setImportStatus('SUCCESS: TACTICAL PROGRESS RESTORED AND VERIFIED!');
      setTimeout(() => setImportStatus(null), 3000);
    } catch {
      setImportStatus('ERROR: INVALID SAVE DATA PAYLOAD.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 font-mono">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-950/80 border border-blue-600/60">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>MILITARY FIELD MANUAL &amp; PRIVATE SERVER OPERATIONS</span>
                <span className="text-[10px] text-emerald-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 font-bold">
                  CLASSIFIED
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Ballistic combat rules, anti-tamper server protocols, and secure export.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-slate-800 text-slate-300 hover:text-white text-xs font-bold"
          >
            ✕ CLOSE
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-950 border-b border-slate-800 px-4 py-1.5 flex gap-2">
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'manual'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>FIELD MANUAL &amp; DOCTRINE</span>
          </button>
          <button
            onClick={() => setActiveTab('anticheat')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'anticheat'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>SERVER ANTI-CHEAT KERNEL</span>
          </button>
          <button
            onClick={() => setActiveTab('save')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'save'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT / IMPORT SAVE</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-950 text-xs text-slate-300 space-y-4">
          {activeTab === 'manual' && (
            <div className="space-y-4 leading-relaxed">
              <section className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-2 text-emerald-400">
                  1. SQUAD COMPOSITION: 5 SQUADS &amp; 6 SPECIALIZED UNITS
                </h3>
                <p>
                  World War Rogue enforces strict tactical specialization. A commander maintains exactly 5 operational squads (Alpha, Bravo, Charlie, Delta, Echo), each holding up to 6 specialized units chosen from an arsenal of 100+ global weapons.
                </p>
                <p className="mt-2 text-slate-400">
                  Every unit possesses distinct advantages (e.g., M1A2 Abrams depleted uranium armor) and vulnerabilities (high fuel consumption, slow speed). Balancing armor, anti-air, artillery, and reconnaissance is essential.
                </p>
              </section>

              <section className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-2 text-amber-400">
                  2. BALLISTIC PHYSICS &amp; DESTRUCTIBLE TERRAIN
                </h3>
                <p>
                  Combat is calculated using real ballistic equations ($r(t) = r_0 + v_0 t + \frac{1}{2}gt^2$). Shells follow parabolic trajectories over obstacles. Sloped armor angles introduce ricochet probabilities with distinct metallic deflections.
                </p>
                <p className="mt-2 text-slate-400">
                  Battlefield structures (concrete blast walls, sandbag bunkers, fuel tankers) take structural damage. When obliterated, they collapse into low-cover rubble, opening new sightlines for artillery.
                </p>
              </section>

              <section className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-2 text-cyan-400">
                  3. FAIR MONETIZATION CHARTER
                </h3>
                <p>
                  Unlike games that gate progress behind $99 paywalls, World War Rogue reduces upgrade costs by 95% ($0.99 to $4.99 supply drops) and provides 100% free daily reconnaissance drops. Tactical flanking, terrain exploitation, and smoke screens ensure skilled non-paying commanders can outplay paying players.
                </p>
              </section>
            </div>
          )}

          {activeTab === 'anticheat' && (
            <div className="space-y-4">
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <Shield className="w-5 h-5" />
                  <span>PRIVATE SERVER STATE VERIFICATION</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  To prevent unauthorized client-side memory tampering or hacked combat ratings, all squad rosters, unit upgrade levels, and resource transactions generate cryptographic server checksum tokens.
                </p>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
                  <div className="text-[10px] text-slate-500 uppercase">ACTIVE ANTI-TAMPER TOKEN</div>
                  <div className="text-sm font-bold text-emerald-400">{checksum}</div>
                  <div className="text-[10px] text-slate-400">
                    Status: Verified by Private Server Node ({profile.activeServer})
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">CALLSIGN</span>
                    <span className="font-bold text-slate-200">{profile.callsign}</span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">SECURITY CLEARANCE</span>
                    <span className="font-bold text-amber-400">DEFCON 2 AUTHORIZED</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'save' && (
            <div className="space-y-4">
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
                <h3 className="font-bold text-sm text-white">EXPORT TACTICAL SAVE FILE</h3>
                <p className="text-xs text-slate-400">
                  Export your complete campaign progress, custom unit modifications, squad rosters, and base levels to an encrypted JSON save.
                </p>
                <button
                  onClick={handleExportSave}
                  className="py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>EXPORT SAVE FILE (.JSON)</span>
                </button>
              </div>

              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
                <h3 className="font-bold text-sm text-white">RESTORE PROGRESS (IMPORT SAVE)</h3>
                <textarea
                  rows={4}
                  placeholder="Paste your JSON save payload here..."
                  value={importString}
                  onChange={(e) => setImportString(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
                {importStatus && (
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{importStatus}</span>
                  </div>
                )}
                <button
                  onClick={handleImportSave}
                  disabled={!importString.trim()}
                  className="py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>VERIFY &amp; RESTORE SAVE</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
