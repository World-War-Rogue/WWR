import React, { useState } from 'react';
import {
  Crosshair,
  Shield,
  Zap,
  Cpu,
  Eye,
  UserCheck,
  ArrowUpRight,
  ChevronRight,
  CheckCircle2,
  Calendar,
  Layers,
  Wrench,
  Sparkles,
  ArrowLeft,
  AlertCircle,
  Play,
  Flame,
  Radio,
  FileCheck,
  ShoppingBag,
} from 'lucide-react';
import {
  EquipmentCategoryData,
  EquipmentCategoryKey,
  CategoryUpgradeProgress,
  BaseEvent,
  Unit,
  PlayerProfile,
  Squad,
} from '../types';
import { EQUIPMENT_CATEGORIES } from '../data/equipmentCategories';
import { soundFx } from '../utils/audio';
import { ModuleLockState, DeveloperSeat } from '../types/devOps';
import { ModuleLockBanner } from './ModuleLockBanner';

interface BaseInternalViewProps {
  profile: PlayerProfile;
  units: Unit[];
  squads: Squad[];
  categoryProgress: Record<EquipmentCategoryKey, CategoryUpgradeProgress>;
  events: BaseEvent[];
  onUpgradeCategory: (categoryKey: EquipmentCategoryKey) => void;
  onEquipGear: (unitId: string, category: EquipmentCategoryKey, subcategoryId: string, optionName: string) => void;
  onSignInEvent: (eventId: string) => void;
  onExecuteEventSortie: (eventId: string) => void;
  onNavigateToExternal: () => void;
  lockState?: ModuleLockState;
  currentDev?: DeveloperSeat;
  onOpenDevOps?: () => void;
}

export const BaseInternalView: React.FC<BaseInternalViewProps> = ({
  profile,
  units,
  squads,
  categoryProgress,
  events,
  onUpgradeCategory,
  onEquipGear,
  onSignInEvent,
  onExecuteEventSortie,
  onNavigateToExternal,
  lockState,
  currentDev,
  onOpenDevOps,
}) => {
  // 3 Primary Workshop Operations inside Base
  const [activeTab, setActiveTab] = useState<'categories' | 'gear' | 'events'>('categories');

  // Active Category inspected (1 of 6)
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<EquipmentCategoryKey>('lethality');

  // Selected Unit for Gear Customization
  const [selectedUnitId, setSelectedUnitId] = useState<string>(units[0]?.id || 'us_m1a2_sepv3');

  // Active Event filter
  const [eventFilter, setEventFilter] = useState<'all' | EquipmentCategoryKey>('all');

  // Find selected objects
  const selectedCategory =
    EQUIPMENT_CATEGORIES.find((c) => c.key === selectedCategoryKey) || EQUIPMENT_CATEGORIES[0];
  const selectedUnit = units.find((u) => u.id === selectedUnitId) || units[0];
  const selectedProgress = categoryProgress[selectedCategoryKey];

  const getCategoryIcon = (key: EquipmentCategoryKey, className = 'w-5 h-5') => {
    switch (key) {
      case 'lethality':
        return <Crosshair className={className} />;
      case 'survivability':
        return <Shield className={className} />;
      case 'mobility':
        return <Zap className={className} />;
      case 'electronics':
        return <Cpu className={className} />;
      case 'situational':
        return <Eye className={className} />;
      case 'hmi':
        return <UserCheck className={className} />;
      default:
        return <Wrench className={className} />;
    }
  };

  // Cost to upgrade a category to next level
  const nextLevel = selectedProgress ? selectedProgress.level + 1 : 2;
  const upgradeCost = {
    alloy: nextLevel * 120,
    munitions: nextLevel * 150,
    fuel: nextLevel * 100,
    warBonds: nextLevel * 10,
  };

  const canAffordCategoryUpgrade =
    profile.resources.alloy >= upgradeCost.alloy &&
    profile.resources.munitions >= upgradeCost.munitions &&
    profile.resources.fuel >= upgradeCost.fuel &&
    profile.resources.warBonds >= upgradeCost.warBonds;

  // Filtered events
  const filteredEvents =
    eventFilter === 'all'
      ? events
      : events.filter((e) => e.categoryAffinity === eventFilter);

  return (
    <div className="flex-1 p-3 sm:p-5 flex flex-col gap-4 max-w-7xl mx-auto w-full font-sans">
      {/* Mutex Area Lockout Banner */}
      <ModuleLockBanner
        lockState={lockState}
        currentDev={currentDev}
        onOpenDevOps={onOpenDevOps || (() => {})}
      />

      {/* Top Transition Banner & Secondary Nav to External Base */}
      <div className="bg-gradient-to-r from-slate-900/80 via-black/80 to-blue-950/60 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-950/40">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-400">
                PRIMARY VIEW 2 OF 2
              </span>
              <span className="bg-cyan-600 text-white text-[10px] font-black px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                INTERNAL BASE COMMAND &amp; WORKSHOP
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight mt-0.5">
              Heavy Engineering Bunker // Equipment Systems &amp; Operations
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl mt-0.5">
              Manage the 6 essential equipment upgrade categories, outfit unit gear loadouts, and sign into live tactical operations.
            </p>
          </div>
        </div>

        {/* Button to Ascend to External Base View */}
        <button
          onClick={() => {
            soundFx.playRadioChirp();
            onNavigateToExternal();
          }}
          className="w-full md:w-auto bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white font-black text-xs uppercase tracking-widest px-5 py-3 rounded-xl border border-white/10 hover:border-orange-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
          title="Ascend to the surface Forward Operating Base (FOB) perimeter"
        >
          <ArrowLeft className="w-4 h-4 text-orange-400" />
          <span>ASCEND TO SURFACE BASE</span>
        </button>
      </div>

      {/* Internal Base Sub-Navigation: 3 Core Operations */}
      <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-1.5 flex items-center gap-1.5 flex-wrap font-mono text-xs shadow-xl">
        <button
          onClick={() => {
            setActiveTab('categories');
            soundFx.playRadioChirp();
          }}
          className={`flex-1 py-2.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'categories'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950/50 border border-cyan-400/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>1. SIX EQUIPMENT CATEGORIES</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('gear');
            soundFx.playRadioChirp();
          }}
          className={`flex-1 py-2.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'gear'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950/50 border border-cyan-400/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>2. CHANGING GEAR &amp; LOADOUTS</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('events');
            soundFx.playRadioChirp();
          }}
          className={`flex-1 py-2.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'events'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950/50 border border-cyan-400/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>3. EVENT SIGN-IN &amp; OPERATIONS</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: THE 6 EQUIPMENT UPGRADE CATEGORIES                             */}
      {/* ========================================================================= */}
      {activeTab === 'categories' && (
        <div className="flex flex-col gap-4">
          {/* Horizontal 6 Categories Selector */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {EQUIPMENT_CATEGORIES.map((cat) => {
              const isSelected = cat.key === selectedCategoryKey;
              const prog = categoryProgress[cat.key];

              return (
                <button
                  key={cat.key}
                  onClick={() => {
                    setSelectedCategoryKey(cat.key);
                    soundFx.playRadioChirp();
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer select-none ${
                    isSelected
                      ? 'bg-white/15 border-cyan-400 shadow-xl shadow-cyan-950/50 ring-1 ring-cyan-400/50'
                      : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      CAT 0{cat.number}
                    </span>
                    <span className="text-[10px] font-mono font-black text-cyan-400">
                      LVL {prog?.level || 1}
                    </span>
                  </div>

                  <div className="my-2 flex items-center gap-2">
                    <div
                      className="p-2 rounded-xl"
                      style={{
                        backgroundColor: `${cat.color}20`,
                        color: cat.color,
                        border: `1px solid ${cat.color}40`,
                      }}
                    >
                      {getCategoryIcon(cat.key, 'w-4 h-4')}
                    </div>
                    <div className="font-bold text-xs text-white leading-snug line-clamp-2">
                      {cat.title}
                    </div>
                  </div>

                  {/* Level progress mini bar */}
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-1">
                    <div
                      className="h-full bg-cyan-400"
                      style={{
                        width: `${Math.min(100, ((prog?.currentExp || 0) / (prog?.maxExp || 1000)) * 100)}%`,
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Category Deep Dive Dossier */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col gap-6">
            {/* Category Header & Level Upgrade Action */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-white/10 font-mono">
              <div className="flex items-center gap-3.5">
                <div
                  className="p-3.5 rounded-2xl shadow-lg"
                  style={{
                    backgroundColor: `${selectedCategory.color}25`,
                    color: selectedCategory.color,
                    border: `1px solid ${selectedCategory.color}50`,
                  }}
                >
                  {getCategoryIcon(selectedCategory.key, 'w-7 h-7')}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      CATEGORY #{selectedCategory.number}
                    </span>
                    <span className="text-xs font-black px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-500/30">
                      TIER LEVEL {selectedProgress?.level || 1}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-white uppercase mt-0.5">
                    {selectedCategory.title}
                  </h2>
                  <p className="text-xs text-slate-300 max-w-2xl mt-0.5 font-sans">
                    {selectedCategory.summary}
                  </p>
                </div>
              </div>

              {/* Research Category Level Upgrade */}
              <div className="flex items-center gap-3 flex-wrap bg-black/40 p-3 rounded-2xl border border-white/10 w-full lg:w-auto">
                <div className="text-xs">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">NEXT TIER COST:</div>
                  <div className="flex items-center gap-2 font-mono font-bold mt-0.5">
                    <span className="text-cyan-400">Alloy: {upgradeCost.alloy}</span>
                    <span className="text-red-400">Ammo: {upgradeCost.munitions}</span>
                    <span className="text-yellow-400">Bonds: {upgradeCost.warBonds}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onUpgradeCategory(selectedCategory.key);
                    soundFx.playRadioChirp();
                  }}
                  disabled={!canAffordCategoryUpgrade}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-cyan-950/50 cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>UPGRADE TIER</span>
                </button>
              </div>
            </div>

            {/* Subcategories Breakdown: Exactly 3 subcomponents per category */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {selectedCategory.subcategories.map((subcat) => (
                <div
                  key={subcat.id}
                  className="bg-black/40 border border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-lg"
                >
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <h4 className="font-mono font-black text-sm text-white uppercase">
                        {subcat.name}
                      </h4>
                      <span className="text-[10px] font-mono text-cyan-400 font-bold">
                        {subcat.options.length} OPTIONS
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 mb-4 leading-relaxed font-sans">
                      {subcat.description}
                    </p>

                    {/* Component Options List */}
                    <div className="flex flex-col gap-2">
                      {subcat.options.map((opt) => (
                        <div
                          key={opt.id}
                          className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs font-mono"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-black text-slate-200">{opt.name}</span>
                            <span className="text-[10px] text-cyan-400 font-bold">T{opt.tier}</span>
                          </div>
                          <div className="text-[11px] text-emerald-400 font-bold mt-1">
                            {opt.statBonus}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 font-sans">
                            {opt.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>Equippable in Gear Bay</span>
                    <button
                      onClick={() => {
                        setActiveTab('gear');
                        soundFx.playRadioChirp();
                      }}
                      className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span>EQUIP ON ROSTER</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: CHANGING GEAR & CUSTOMIZING EQUIPMENT                           */}
      {/* ========================================================================= */}
      {activeTab === 'gear' && (
        <div className="flex flex-col gap-4">
          {/* Unit Selector Strip */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-mono">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-600/20 border border-cyan-500/40 text-cyan-400">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">EQUIPMENT LOADOUT BAY</div>
                <div className="text-sm font-black text-white uppercase">
                  SELECT UNIT TO CUSTOMIZE GEAR ACROSS ALL 6 CATEGORIES
                </div>
              </div>
            </div>

            {/* Dropdown Selector */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <label htmlFor="unit-selector" className="text-xs text-slate-400 font-bold uppercase">UNIT:</label>
              <select
                id="unit-selector"
                value={selectedUnitId}
                onChange={(e) => {
                  setSelectedUnitId(e.target.value);
                  soundFx.playRadioChirp();
                }}
                className="bg-black/60 border border-white/15 text-white text-xs rounded-xl px-3 py-2 font-mono font-bold focus:outline-none focus:border-cyan-400 cursor-pointer flex-1 md:flex-none"
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    [{u.country}] {u.name} - {u.role} (PWR: {u.powerRating})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Unit Stats & 6-Category Loadout Workbench */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left 4 Cols: Unit Dossier & Tactical Schematic */}
            <div className="lg:col-span-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-2xl flex flex-col justify-between font-mono">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div>
                    <span className="text-[10px] text-cyan-400 font-bold uppercase">{selectedUnit.countryName}</span>
                    <h3 className="text-base font-black text-white uppercase">{selectedUnit.name}</h3>
                  </div>
                  <span className="text-xs font-black px-2 py-0.5 rounded bg-black/40 text-amber-400 border border-amber-500/30">
                    {selectedUnit.role}
                  </span>
                </div>

                {/* Core Unit Stats */}
                <div className="grid grid-cols-2 gap-2 my-4">
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">FIREPOWER</div>
                    <div className="text-sm font-black text-red-400">{selectedUnit.firepower}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">ARMOR RATING</div>
                    <div className="text-sm font-black text-blue-400">{selectedUnit.armor}%</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">PENETRATION</div>
                    <div className="text-sm font-black text-amber-400">{selectedUnit.penetration} mm</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">SPEED</div>
                    <div className="text-sm font-black text-green-400">{selectedUnit.speed} km/h</div>
                  </div>
                </div>

                {/* Tactical Schematic Blueprint */}
                <div className="p-4 rounded-xl bg-black/60 border border-cyan-500/20 text-center relative overflow-hidden">
                  <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mb-2">
                    MODULAR CHASSIS SCHEMATIC // 6 HARDBOARDS
                  </div>
                  <div className="flex flex-col gap-1.5 text-left text-[11px] text-slate-300">
                    <div className="flex items-center justify-between border-b border-white/5 py-1">
                      <span className="text-red-400 font-bold">1. Armament:</span>
                      <span className="truncate max-w-[170px] text-slate-400">
                        {selectedUnit.customization?.lethalityGear?.primaryArmament || '120mm Smoothbore'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-white/5 py-1">
                      <span className="text-blue-400 font-bold">2. Protection:</span>
                      <span className="truncate max-w-[170px] text-slate-400">
                        {selectedUnit.customization?.survivabilityGear?.passiveArmor || 'Composite Titanium'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-white/5 py-1">
                      <span className="text-yellow-400 font-bold">3. Mobility:</span>
                      <span className="truncate max-w-[170px] text-slate-400">
                        {selectedUnit.customization?.mobilityGear?.powerplant || '1,500 HP Turbo-Diesel'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-white/5 py-1">
                      <span className="text-emerald-400 font-bold">4. Electronics:</span>
                      <span className="truncate max-w-[170px] text-slate-400">
                        {selectedUnit.customization?.electronicsGear?.commandControl || 'MIL-STD Data Bus'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-white/5 py-1">
                      <span className="text-purple-400 font-bold">5. Situational:</span>
                      <span className="truncate max-w-[170px] text-slate-400">
                        {selectedUnit.customization?.situationalGear?.optics || 'Gen-3 FLIR Thermal'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-cyan-400 font-bold">6. Ergonomics:</span>
                      <span className="truncate max-w-[170px] text-slate-400">
                        {selectedUnit.customization?.hmiGear?.controls || 'Dual-Grip Controllers'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-xs text-slate-300">
                <span className="text-cyan-400 font-bold">Tactical Advantage:</span> {selectedUnit.advantage}
              </div>
            </div>

            {/* Right 8 Cols: Gear Equipping Panels across the 6 Categories */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              {EQUIPMENT_CATEGORIES.map((cat) => (
                <div
                  key={cat.key}
                  className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-xl flex flex-col gap-3 font-mono"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <div
                        className="p-1.5 rounded-lg"
                        style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                      >
                        {getCategoryIcon(cat.key, 'w-4 h-4')}
                      </div>
                      <span className="font-black text-sm text-white uppercase">
                        {cat.number}. {cat.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">
                      Level {categoryProgress[cat.key]?.level || 1} Tech
                    </span>
                  </div>

                  {/* 3 Subcategory Gear Pickers */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    {cat.subcategories.map((subcat) => (
                      <div key={subcat.id} className="bg-black/40 p-2.5 rounded-xl border border-white/10">
                        <div className="text-[10px] text-cyan-400 font-bold uppercase mb-1.5 truncate">
                          {subcat.name}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {subcat.options.map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => {
                                onEquipGear(selectedUnit.id, cat.key, subcat.id, opt.name);
                                soundFx.playRadioChirp();
                              }}
                              className="p-2 rounded-lg text-left text-xs bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/50 transition-all cursor-pointer flex flex-col gap-0.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-200 truncate">{opt.name}</span>
                                <span className="text-[10px] text-cyan-400">T{opt.tier}</span>
                              </div>
                              <span className="text-[10px] text-emerald-400 font-bold">
                                {opt.statBonus}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: SIGNING INTO SPECIFIC EVENTS                                   */}
      {/* ========================================================================= */}
      {activeTab === 'events' && (
        <div className="flex flex-col gap-4">
          {/* Events Mission Header */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-mono">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-orange-600/20 border border-orange-500/40 text-orange-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">
                  OPERATIONS &amp; SORTIE DESK
                </div>
                <div className="text-sm font-black text-white uppercase">
                  SIGN INTO SPECIFIC TACTICAL EVENTS TO TEST EQUIPMENT &amp; CLAIM REWARDS
                </div>
              </div>
            </div>

            {/* Event Category Filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-slate-400 font-bold uppercase mr-1">FILTER:</span>
              <button
                onClick={() => setEventFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  eventFilter === 'all'
                    ? 'bg-orange-600 text-white'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                ALL
              </button>
              {EQUIPMENT_CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setEventFilter(c.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    eventFilter === c.key
                      ? 'bg-orange-600 text-white'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {c.title.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Events Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono">
            {filteredEvents.map((evt) => {
              const isSignedIn = evt.status === 'signed_in';
              const isCompleted = evt.status === 'completed';

              return (
                <div
                  key={evt.id}
                  className={`bg-white/5 backdrop-blur-md border rounded-2xl p-5 shadow-2xl flex flex-col justify-between transition-all ${
                    isSignedIn
                      ? 'border-orange-500 ring-1 ring-orange-500/40 bg-orange-950/10'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div>
                    {/* Top Status & Codename */}
                    <div className="flex items-center justify-between pb-2.5 border-b border-white/10 text-xs">
                      <span className="text-orange-400 font-black tracking-widest">{evt.codename}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          isCompleted
                            ? 'bg-green-950/60 text-green-400 border border-green-500/30'
                            : isSignedIn
                            ? 'bg-orange-600 text-white'
                            : 'bg-black/50 text-slate-300 border border-white/10'
                        }`}
                      >
                        {isCompleted ? 'MISSION COMPLETED' : isSignedIn ? 'SIGNED IN / ENLISTED' : 'OPEN TO SIGN'}
                      </span>
                    </div>

                    {/* Title & Category Affinity */}
                    <h3 className="font-black text-sm text-white uppercase mt-3 mb-1">
                      {evt.title}
                    </h3>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-500/30 font-bold uppercase">
                        Affinity: {evt.categoryAffinity}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">
                        Duration: {evt.durationMinutes}m
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 font-sans leading-relaxed mb-3">
                      {evt.tacticalBrief}
                    </p>

                    {/* Requirements & Modifiers */}
                    <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs flex flex-col gap-1.5 mb-3">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Min Squad Rating:</span>
                        <span className="text-amber-400 font-bold">{evt.minSquadRating} PWR</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Recommended Gear:</span>
                        <span className="text-cyan-400 font-bold truncate max-w-[150px]">
                          {evt.recommendedGear}
                        </span>
                      </div>
                      <div className="pt-1.5 border-t border-white/10 text-[10px] text-slate-400">
                        <span className="text-orange-400 font-bold">Modifiers:</span> {evt.modifiers.join(', ')}
                      </div>
                    </div>

                    {/* Rewards Preview */}
                    <div className="bg-black/60 p-2.5 rounded-xl border border-white/10 text-xs flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">REWARDS:</span>
                      <div className="flex items-center gap-2 font-bold text-[11px]">
                        <span className="text-yellow-400">+{evt.rewards.warBonds} Bonds</span>
                        <span className="text-cyan-400">+{evt.rewards.alloy} Alloy</span>
                        <span className="text-red-400">+{evt.rewards.munitions} Ammo</span>
                      </div>
                    </div>
                  </div>

                  {/* Sign In or Execute Sortie Actions */}
                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                    {!isSignedIn && !isCompleted && (
                      <button
                        onClick={() => {
                          onSignInEvent(evt.id);
                          soundFx.playRadioChirp();
                        }}
                        className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-950/40 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <FileCheck className="w-4 h-4" />
                        <span>SIGN INTO EVENT</span>
                      </button>
                    )}

                    {isSignedIn && !isCompleted && (
                      <button
                        onClick={() => {
                          soundFx.playAutocannon();
                          onExecuteEventSortie(evt.id);
                        }}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-green-950/50 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        <span>DEPLOY SORTIE (SIMULATE)</span>
                      </button>
                    )}

                    {isCompleted && (
                      <div className="w-full py-2 rounded-xl bg-green-950/40 border border-green-500/30 text-green-400 text-center font-bold text-xs flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>SORTIE COMPLETED // SALVAGE CLAIMED</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
