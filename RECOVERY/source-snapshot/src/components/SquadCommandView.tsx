import React, { useState } from 'react';
import {
  Shield,
  Zap,
  Flame,
  Search,
  Check,
  ChevronRight,
  Sparkles,
  Sliders,
  Crosshair,
  Lock,
  Users,
  Award,
  Anchor,
  Plane,
  Rocket,
} from 'lucide-react';
import {
  Squad,
  Unit,
  CountryCode,
  TechEra,
  UnitRole,
  AmmoType,
  ArmorMod,
  OpticsMod,
  TacticalStance,
  PlayerProfile,
  PilotHero,
  HeroCategory,
} from '../types';
import { COUNTRY_NAMES } from '../data/units';
import {
  determineVehicleType,
  getPilotForUnit,
  getHeroCategory,
  HERO_PILOTS_REGISTRY,
  HERO_CATEGORIES_CONFIG,
} from '../data/pilots';
import { soundFx } from '../utils/audio';

interface SquadCommandViewProps {
  squads: Squad[];
  activeSquadId: string;
  onSelectSquad: (id: string) => void;
  units: Unit[];
  onSwapUnitInSquad: (squadId: string, slotIndex: number, newUnitId: string) => void;
  onUpdateUnitCustomization: (
    unitId: string,
    customization: {
      ammoType: AmmoType;
      armorMod: ArmorMod;
      opticsMod: OpticsMod;
      stance: TacticalStance;
    }
  ) => void;
  onUpgradeUnit: (unitId: string) => void;
  profile: PlayerProfile;
}

export const SquadCommandView: React.FC<SquadCommandViewProps> = ({
  squads,
  activeSquadId,
  onSelectSquad,
  units,
  onSwapUnitInSquad,
  onUpdateUnitCustomization,
  onUpgradeUnit,
  profile,
}) => {
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [showRosterModal, setShowRosterModal] = useState<boolean>(false);
  const [showOfficersModal, setShowOfficersModal] = useState<boolean>(false);
  const [customizingUnitId, setCustomizingUnitId] = useState<string | null>(null);

  // Roster filtering states
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | HeroCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCountry, setFilterCountry] = useState<CountryCode | 'ALL'>('ALL');
  const [filterEra, setFilterEra] = useState<TechEra | 'ALL'>('ALL');
  const [filterRole, setFilterRole] = useState<UnitRole | 'ALL'>('ALL');

  // Officer Corps filtering states
  const [officerSearch, setOfficerSearch] = useState<string>('');
  const [officerCategory, setOfficerCategory] = useState<'ALL' | HeroCategory>('ALL');
  const [officerBranch, setOfficerBranch] = useState<string>('ALL');
  const [officerBadge, setOfficerBadge] = useState<string>('ALL');

  const activeSquad = squads.find((s) => s.id === activeSquadId) || squads[0];

  // Active units in this squad (up to 6)
  const squadUnits = activeSquad.unitIds.map((uid) => units.find((u) => u.id === uid)).filter(Boolean) as Unit[];

  // Customizing unit
  const customizingUnit = units.find((u) => u.id === customizingUnitId);
  const currentCustomization = customizingUnit?.customization || {
    ammoType: 'APFSDS Kinetic' as AmmoType,
    armorMod: 'Standard Steel' as ArmorMod,
    opticsMod: 'Iron Sights & Standard Optics' as OpticsMod,
    stance: 'Aggressive Assault' as TacticalStance,
  };

  // Filtered 100+ roster pool
  const filteredRoster = units.filter((u) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        u.name.toLowerCase().includes(q) ||
        u.countryName.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.advantage.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (categoryFilter !== 'ALL') {
      const cat = u.heroCategory || getHeroCategory(u);
      if (cat !== categoryFilter) return false;
    }
    if (filterCountry !== 'ALL' && u.country !== filterCountry) return false;
    if (filterEra !== 'ALL' && u.era !== filterEra) return false;
    if (filterRole !== 'ALL' && u.role !== filterRole) return false;
    return true;
  });

  // Filtered 100 Military Officers
  const filteredOfficers = HERO_PILOTS_REGISTRY.filter((p) => {
    if (officerSearch.trim()) {
      const q = officerSearch.toLowerCase();
      const match =
        p.name.toLowerCase().includes(q) ||
        p.callsign.toLowerCase().includes(q) ||
        p.rank.toLowerCase().includes(q) ||
        p.specialty.toLowerCase().includes(q) ||
        p.quote.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (officerCategory !== 'ALL' && p.heroCategory !== officerCategory) return false;
    if (officerBranch !== 'ALL' && p.serviceBranch !== officerBranch) return false;
    if (officerBadge !== 'ALL' && p.badge !== officerBadge) return false;
    return true;
  });

  const handleOpenSwapModal = (slotIndex: number) => {
    setSelectedSlotIndex(slotIndex);
    setShowRosterModal(true);
    soundFx.playRadioChirp();
  };

  const handleSelectUnitForSlot = (unitId: string) => {
    if (selectedSlotIndex !== null) {
      onSwapUnitInSquad(activeSquad.id, selectedSlotIndex, unitId);
      setShowRosterModal(false);
      setSelectedSlotIndex(null);
      soundFx.playRadioChirp();
    }
  };

  return (
    <div className="flex-1 p-3 sm:p-5 flex flex-col gap-4 max-w-7xl mx-auto w-full">
      {/* 5 Squads Switcher Navigation */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-3.5 shadow-2xl flex flex-wrap items-center justify-between gap-3 font-mono">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {squads.map((squad, index) => {
            const isActive = squad.id === activeSquad.id;
            return (
              <button
                key={squad.id}
                onClick={() => {
                  onSelectSquad(squad.id);
                  soundFx.playRadioChirp();
                }}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2.5 select-none border ${
                  isActive
                    ? 'bg-white/15 text-white border-l-4 border-orange-600 border-t-white/15 border-r-white/15 border-b-white/15 shadow-lg shadow-orange-950/40'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:text-white hover:bg-white/10'
                }`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center text-[11px] font-black ${
                  isActive ? 'bg-orange-600 text-white' : 'bg-white/10 text-slate-400'
                }`}>
                  {index + 1}
                </div>
                <div className="text-left">
                  <div className="leading-tight font-black uppercase text-xs">{squad.name}</div>
                  <div className="text-[10px] font-normal text-slate-400">{squad.formation} Formation</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Squad Tactical Summary */}
        <div className="flex items-center gap-3 text-xs">
          <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
            <span className="text-slate-400 text-[10px] block font-bold uppercase">COMBAT RATING</span>
            <span className="font-black text-orange-400 text-sm">{activeSquad.totalCombatPower} PWR</span>
          </div>
          <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 hidden md:block">
            <span className="text-slate-400 text-[10px] block font-bold uppercase">TACTICAL DOCTRINE</span>
            <span className="text-slate-200 truncate max-w-xs block font-bold">{activeSquad.tacticalSpecialty}</span>
          </div>
        </div>
      </div>

      {/* Tactical Sub-Header with Officer Corps Button & Quick Category Inspector */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 font-mono">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowOfficersModal(true);
              soundFx.playRadioChirp();
            }}
            className="px-3.5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-orange-950/40 border border-orange-400/30 transition-all"
          >
            <Award className="w-4 h-4 text-amber-300" />
            <span>🎖️ OFFICER CORPS (100 HERO COMMANDERS)</span>
          </button>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            100 Realistic Pilots, Tank Aces &amp; Warship Skippers
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
          <span className="text-slate-400 text-[10px] uppercase font-bold mr-1">ARSENAL:</span>
          {(
            [
              { id: 'ALL', label: 'ALL', icon: '🌐' },
              { id: 'tank', label: '10 TANKS', icon: '🛡️' },
              { id: 'missile', label: '10 MISSILES', icon: '🚀' },
              { id: 'aircraft', label: '10 AIRCRAFT', icon: '✈️' },
              { id: 'helicopter', label: '10 HELICOPTERS', icon: '🚁' },
              { id: 'ship', label: '10 WARSHIPS', icon: '⚓' },
            ] as const
          ).map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setCategoryFilter(cat.id);
                soundFx.playRadioChirp();
              }}
              className={`px-2.5 py-1 rounded-md font-bold uppercase transition-all flex items-center gap-1 border ${
                categoryFilter === cat.id
                  ? 'bg-orange-600 text-white border-orange-400 shadow-sm'
                  : 'bg-black/30 text-slate-400 border-white/10 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 6 Unit Slots Grid in Current Squad */}
      <div className="flex items-center justify-between font-mono text-xs text-slate-400 px-1">
        <span className="text-[10px] uppercase tracking-[0.2em] font-black text-orange-500">
          ACTIVE DEPLOYMENT: 6 SQUAD SLOTS
        </span>
        <span className="text-slate-300 font-bold">
          {filteredRoster.length} Units Matching Selected Filter
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
        {Array.from({ length: 6 }).map((_, slotIndex) => {
          const unit = squadUnits[slotIndex];

          if (!unit) {
            return (
              <button
                key={slotIndex}
                onClick={() => handleOpenSwapModal(slotIndex)}
                className="h-64 rounded-xl border border-dashed border-white/15 bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-all flex flex-col items-center justify-center p-4 text-slate-400 hover:text-orange-400 group"
              >
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-orange-500 group-hover:bg-orange-600/20 transition-all">
                  <Crosshair className="w-5 h-5 text-orange-400" />
                </div>
                <span className="font-mono text-xs mt-2 font-black uppercase text-slate-200 group-hover:text-orange-400">
                  DEPLOY UNIT TO SLOT {slotIndex + 1}
                </span>
                <span className="text-[11px] text-slate-500 mt-1">Select from 100+ Global Units</span>
              </button>
            );
          }

          const flag = COUNTRY_NAMES[unit.country]?.flag || '🌐';

          return (
            <div
              key={unit.id}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-xl flex flex-col justify-between hover:border-white/20 transition-all font-mono relative overflow-hidden"
            >
              {/* Top Unit Designation & National Identity */}
              <div>
                <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl" title={unit.countryName}>
                      {flag}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-white text-sm uppercase">{unit.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-600/20 border border-orange-500/40 text-orange-300 font-bold">
                          LVL {unit.upgradeLevel}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="text-slate-300">{unit.countryName}</span>
                        <span>•</span>
                        <span className="text-orange-400 font-bold">{unit.role}</span>
                        <span>•</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            unit.era === 'Futuristic'
                              ? 'bg-purple-900/40 text-purple-300 border border-purple-700/50'
                              : unit.era === 'Near-Future'
                              ? 'bg-blue-900/40 text-blue-300 border border-blue-700/50'
                              : unit.era === 'Modern'
                              ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50'
                              : 'bg-amber-900/40 text-amber-300 border border-amber-700/50'
                          }`}
                        >
                          {unit.era}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="text-xs font-black text-orange-400 bg-black/40 px-2 py-1 rounded-lg border border-white/10">
                    {Math.round(unit.powerRating * (1 + (unit.upgradeLevel - 1) * 0.15))} PWR
                  </span>
                </div>

                {/* Assigned Hero Pilot Profile */}
                {(() => {
                  const pilot = unit.pilot || getPilotForUnit(unit.id, unit.role, unit.country, unit.name, false);
                  const vType = determineVehicleType(unit);
                  return (
                    <div className="bg-orange-950/20 border border-orange-500/25 rounded-lg p-2 my-2 flex items-center justify-between gap-2 font-mono">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xl p-1 bg-black/40 rounded border border-white/10 flex-shrink-0">
                          {pilot.avatarIcon}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-white truncate">"{pilot.callsign}"</span>
                            <span className="text-[9px] px-1 py-0.5 rounded bg-orange-600/30 text-orange-300 font-bold uppercase">
                              {vType}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-300 truncate">
                            {pilot.name} &bull; {pilot.rank}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] text-orange-400 font-bold px-1.5 py-0.5 rounded bg-black/40 border border-white/5 whitespace-nowrap">
                        {pilot.specialty}
                      </span>
                    </div>
                  );
                })()}

                {/* Core Tactical Stats Bar */}
                <div className="grid grid-cols-4 gap-1.5 my-2.5 text-center text-xs">
                  <div className="bg-white/5 p-1 rounded-lg border border-white/10">
                    <span className="text-[9px] block text-slate-400 font-bold">HP</span>
                    <span className="font-bold text-emerald-400">{unit.hp}</span>
                  </div>
                  <div className="bg-white/5 p-1 rounded-lg border border-white/10">
                    <span className="text-[9px] block text-slate-400 font-bold">FIREPOWER</span>
                    <span className="font-bold text-red-400">{unit.firepower}</span>
                  </div>
                  <div className="bg-white/5 p-1 rounded-lg border border-white/10">
                    <span className="text-[9px] block text-slate-400 font-bold">ARMOR</span>
                    <span className="font-bold text-cyan-400">{unit.armor}%</span>
                  </div>
                  <div className="bg-white/5 p-1 rounded-lg border border-white/10">
                    <span className="text-[9px] block text-slate-400 font-bold">RANGE</span>
                    <span className="font-bold text-amber-400">{unit.range}m</span>
                  </div>
                </div>

                {/* Explicit Strategic Advantage & Disadvantage */}
                <div className="space-y-1.5 text-[11px] mb-3">
                  <div className="bg-white/5 border border-white/10 rounded-lg p-2 text-emerald-300">
                    <span className="font-bold text-emerald-400">ADVANTAGE: </span>
                    {unit.advantage}
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-2 text-red-300">
                    <span className="font-bold text-red-400">DISADVANTAGE: </span>
                    {unit.disadvantage}
                  </div>
                </div>

                {/* Active Customizations Pill Indicators */}
                <div className="flex flex-wrap gap-1 mb-3 text-[10px]">
                  <span className="bg-black/40 text-slate-300 px-2 py-0.5 rounded border border-white/10">
                    Ammo: {unit.customization?.ammoType || 'APFSDS Kinetic'}
                  </span>
                  <span className="bg-black/40 text-slate-300 px-2 py-0.5 rounded border border-white/10">
                    Armor: {unit.customization?.armorMod || 'Standard Steel'}
                  </span>
                  <span className="bg-black/40 text-slate-300 px-2 py-0.5 rounded border border-white/10">
                    Stance: {unit.customization?.stance || 'Aggressive Assault'}
                  </span>
                </div>
              </div>

              {/* Action Buttons for this Unit */}
              <div className="grid grid-cols-3 gap-1.5 pt-2.5 border-t border-white/10 text-xs">
                {/* Customize Button */}
                <button
                  onClick={() => {
                    setCustomizingUnitId(unit.id);
                    soundFx.playRadioChirp();
                  }}
                  className="py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 flex items-center justify-center gap-1 transition-colors font-bold uppercase text-[11px]"
                  title="Customize ammunition caliber, reactive armor, optics, and stance"
                >
                  <Sliders className="w-3.5 h-3.5 text-orange-400" />
                  <span>MODS</span>
                </button>

                {/* Upgrade Button */}
                <button
                  onClick={() => {
                    onUpgradeUnit(unit.id);
                    soundFx.playRadioChirp();
                  }}
                  disabled={profile.resources.warBonds < 50}
                  className="py-1.5 px-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-black flex items-center justify-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-md uppercase text-[11px]"
                  title="Upgrade Tech Level (+15% stats, transitions into futuristic gear. Costs 50 War Bonds)"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>UPGRADE (50)</span>
                </button>

                {/* Swap Unit Button */}
                <button
                  onClick={() => handleOpenSwapModal(slotIndex)}
                  className="py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 flex items-center justify-center gap-1 transition-colors font-bold uppercase text-[11px]"
                  title="Swap with another unit from the 100+ Global Arsenal"
                >
                  <span>SWAP</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 100+ UNIT ROSTER MODAL */}
      {showRosterModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-3 sm:p-5 font-mono">
          <div className="bg-[#0d1210]/95 backdrop-blur-2xl border border-white/15 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-black/40 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-white flex items-center gap-2 uppercase tracking-wide">
                  <span>GLOBAL MILITARY ARSENAL (100+ UNITS POOL)</span>
                  <span className="text-xs text-orange-400 bg-orange-600/20 px-2 py-0.5 rounded border border-orange-500/40">
                    SLOT {selectedSlotIndex !== null ? selectedSlotIndex + 1 : 1}
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select specialized unit from USA, NATO, Asian, and Middle Eastern defense doctrines.
                </p>
              </div>
              <button
                onClick={() => setShowRosterModal(false)}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white text-xs font-bold uppercase"
              >
                ✕ CLOSE
              </button>
            </div>

            {/* Category Quick Selector Tabs */}
            <div className="px-3 pt-2.5 bg-black/50 border-b border-white/10 flex items-center gap-1.5 overflow-x-auto text-xs scrollbar-thin">
              <span className="text-slate-400 text-[10px] uppercase font-black mr-1 flex-shrink-0">ARSENAL:</span>
              <button
                onClick={() => {
                  setCategoryFilter('ALL');
                  soundFx.playRadioChirp();
                }}
                className={`px-3 py-1.5 rounded-t-lg font-black uppercase text-[11px] transition-all flex items-center gap-1.5 border-t border-x flex-shrink-0 ${
                  categoryFilter === 'ALL'
                    ? 'bg-orange-600 text-white border-orange-400 shadow-md'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>🌐</span>
                <span>ALL UNITS</span>
              </button>
              {(Object.keys(HERO_CATEGORIES_CONFIG) as HeroCategory[]).map((catKey) => {
                const cfg = HERO_CATEGORIES_CONFIG[catKey];
                const isActive = categoryFilter === catKey;
                return (
                  <button
                    key={catKey}
                    onClick={() => {
                      setCategoryFilter(catKey);
                      soundFx.playRadioChirp();
                    }}
                    className={`px-3 py-1.5 rounded-t-lg font-black uppercase text-[11px] transition-all flex items-center gap-1.5 border-t border-x flex-shrink-0 ${
                      isActive
                        ? 'bg-orange-600 text-white border-orange-400 shadow-md'
                        : 'bg-white/5 text-slate-400 border-white/10 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span>{cfg.icon}</span>
                    <span>10 {cfg.name.toUpperCase()}</span>
                  </button>
                );
              })}
            </div>

            {/* Filter Controls Bar */}
            <div className="p-3 bg-white/5 border-b border-white/10 flex flex-wrap items-center gap-2.5 text-xs">
              {/* Search input */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search unit, country, weapon, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black/40 border border-white/15 rounded-lg pl-8 pr-3 py-1.5 text-slate-200 focus:outline-none focus:border-orange-500 text-xs"
                />
              </div>

              {/* Country Filter */}
              <select
                value={filterCountry}
                onChange={(e) => setFilterCountry(e.target.value as CountryCode | 'ALL')}
                className="bg-black/40 border border-white/15 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-orange-500"
              >
                <option value="ALL">All Nations (15)</option>
                <option value="US">🇺🇸 United States</option>
                <option value="DE">🇩🇪 Germany</option>
                <option value="GB">🇬🇧 United Kingdom</option>
                <option value="FR">🇫🇷 France</option>
                <option value="JP">🇯🇵 Japan</option>
                <option value="IL">🇮🇱 Israel</option>
                <option value="KR">🇰🇷 South Korea</option>
                <option value="SE">🇸🇪 Sweden</option>
                <option value="CA">🇨🇦 Canada</option>
                <option value="AU">🇦🇺 Australia</option>
                <option value="UA">🇺🇦 Ukraine</option>
                <option value="IT">🇮🇹 Italy</option>
                <option value="NO">🇳🇴 Norway</option>
                <option value="PL">🇵🇱 Poland</option>
                <option value="TR">🇹🇷 Turkey</option>
              </select>

              {/* Era Filter */}
              <select
                value={filterEra}
                onChange={(e) => setFilterEra(e.target.value as TechEra | 'ALL')}
                className="bg-black/40 border border-white/15 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-orange-500"
              >
                <option value="ALL">All Eras</option>
                <option value="Cold War">Cold War</option>
                <option value="Modern">Modern Advanced</option>
                <option value="Near-Future">Near-Future</option>
                <option value="Futuristic">Futuristic Prototypes</option>
              </select>
            </div>

            {/* Roster Cards List */}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-3 bg-black/40">
              {filteredRoster.map((u) => {
                const flag = COUNTRY_NAMES[u.country]?.flag || '🌐';
                const isAlreadyInSquad = activeSquad.unitIds.includes(u.id);
                const vType = determineVehicleType(u);
                const vIcon =
                  vType === 'tank'
                    ? '🛡️'
                    : vType === 'missile'
                    ? '🚀'
                    : vType === 'airplane'
                    ? '✈️'
                    : vType === 'helicopter'
                    ? '🚁'
                    : vType === 'ship'
                    ? '⚓'
                    : '🚜';

                return (
                  <div
                    key={u.id}
                    className={`rounded-xl p-3.5 border transition-all flex flex-col justify-between ${
                      isAlreadyInSquad
                        ? 'bg-white/10 border-orange-500/60 ring-1 ring-orange-500/40'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-white/10">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{flag}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-100">{u.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-black uppercase border border-orange-500/30">
                                {vIcon} {vType}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span>{u.countryName}</span>
                              <span>•</span>
                              <span className="text-orange-400 font-bold">{u.role}</span>
                              <span>•</span>
                              <span className="text-slate-300">{u.era}</span>
                            </div>
                          </div>
                        </div>
                        <span className="text-xs font-black text-orange-400 bg-black/40 px-2 py-0.5 rounded border border-white/10">
                          {u.powerRating} PWR
                        </span>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-4 gap-1.5 my-2 text-center text-xs">
                        <div className="bg-black/30 p-1 rounded border border-white/10">
                          <span className="text-[9px] block text-slate-400 font-bold">HP</span>
                          <span className="font-bold text-emerald-400">{u.hp}</span>
                        </div>
                        <div className="bg-black/30 p-1 rounded border border-white/10">
                          <span className="text-[9px] block text-slate-400 font-bold">DMG</span>
                          <span className="font-bold text-red-400">{u.firepower}</span>
                        </div>
                        <div className="bg-black/30 p-1 rounded border border-white/10">
                          <span className="text-[9px] block text-slate-400 font-bold">ARMOR</span>
                          <span className="font-bold text-cyan-400">{u.armor}%</span>
                        </div>
                        <div className="bg-black/30 p-1 rounded border border-white/10">
                          <span className="text-[9px] block text-slate-400 font-bold">PEN</span>
                          <span className="font-bold text-amber-400">{u.penetration}mm</span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-300 mb-2 leading-relaxed">
                        {u.description}
                      </div>

                      <div className="space-y-1 text-[10px] mb-3">
                        <div className="text-emerald-400">
                          <span className="font-bold">ADVANTAGE: </span>
                          {u.advantage}
                        </div>
                        <div className="text-red-400">
                          <span className="font-bold">DISADVANTAGE: </span>
                          {u.disadvantage}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSelectUnitForSlot(u.id)}
                      disabled={isAlreadyInSquad}
                      className="w-full py-2 px-3 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:bg-white/5 disabled:text-slate-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors shadow-md"
                    >
                      {isAlreadyInSquad ? (
                        <>
                          <Check className="w-4 h-4 text-orange-400" />
                          <span>ALREADY ASSIGNED TO THIS SQUAD</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>ASSIGN TO SQUAD SLOT {selectedSlotIndex !== null ? selectedSlotIndex + 1 : 1}</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* UNIT MODIFICATION & CUSTOMIZATION DRAWER */}
      {customizingUnit && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-3 sm:p-5 font-mono">
          <div className="bg-[#0d1210]/95 backdrop-blur-2xl border border-white/15 rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 bg-black/40 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-wide">
                  <Sliders className="w-4 h-4 text-orange-400" />
                  <span>CUSTOMIZE TACTICAL LOADOUT: {customizingUnit.name}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tune ballistic caliber, reactive armor plating, optical sensors, and tactical stance.
                </p>
              </div>
              <button
                onClick={() => setCustomizingUnitId(null)}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white text-xs font-bold uppercase"
              >
                ✕ DONE
              </button>
            </div>

            <div className="p-4 space-y-4 text-xs bg-black/20 overflow-y-auto max-h-[75vh]">
              {/* Ammunition Selection */}
              <div>
                <label className="text-orange-500 font-black uppercase text-[10px] tracking-wider block mb-1.5">
                  1. Ammunition Caliber &amp; Warhead Type:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(
                    [
                      'APFSDS Kinetic',
                      'High-Explosive Squash',
                      'Tandem HEAT',
                      'Flechette Anti-Infantry',
                      'EMP Disruption',
                    ] as AmmoType[]
                  ).map((ammo) => (
                    <button
                      key={ammo}
                      onClick={() => {
                        onUpdateUnitCustomization(customizingUnit.id, {
                          ...currentCustomization,
                          ammoType: ammo,
                        });
                        soundFx.playRadioChirp();
                      }}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        currentCustomization.ammoType === ammo
                          ? 'bg-white/10 border-orange-500 text-white shadow-md'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      <div className="font-bold">{ammo}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Armor Mod Selection */}
              <div>
                <label className="text-orange-500 font-black uppercase text-[10px] tracking-wider block mb-1.5">
                  2. Modular Armor Plating:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(
                    [
                      'Standard Steel',
                      'Explosive Reactive (ERA)',
                      'Composite Titanium',
                      'Active Trophy APS',
                      'Nanite Ceramic Weave',
                    ] as ArmorMod[]
                  ).map((armor) => (
                    <button
                      key={armor}
                      onClick={() => {
                        onUpdateUnitCustomization(customizingUnit.id, {
                          ...currentCustomization,
                          armorMod: armor,
                        });
                        soundFx.playRadioChirp();
                      }}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        currentCustomization.armorMod === armor
                          ? 'bg-white/10 border-cyan-400 text-white shadow-md'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      <div className="font-bold">{armor}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tactical Stance */}
              <div>
                <label className="text-orange-500 font-black uppercase text-[10px] tracking-wider block mb-1.5">
                  3. Tactical Engagement Stance:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      'Aggressive Assault',
                      'Overwatch Hold',
                      'Suppressive Flank',
                      'Guerrilla Ambush',
                    ] as TacticalStance[]
                  ).map((stance) => (
                    <button
                      key={stance}
                      onClick={() => {
                        onUpdateUnitCustomization(customizingUnit.id, {
                          ...currentCustomization,
                          stance: stance,
                        });
                        soundFx.playRadioChirp();
                      }}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        currentCustomization.stance === stance
                          ? 'bg-white/10 border-amber-400 text-white shadow-md'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      <div className="font-bold">{stance}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-black/40 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setCustomizingUnitId(null)}
                className="px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-900/30"
              >
                SAVE &amp; APPLY MODS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 100 HERO OFFICERS & COMMANDERS DOSSIER MODAL */}
      {showOfficersModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-5 font-mono">
          <div className="bg-[#0d1210]/95 backdrop-blur-2xl border border-white/15 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-black/50 border-b border-white/10 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎖️</span>
                  <h2 className="text-base font-black text-white uppercase tracking-wider">
                    MILITARY OFFICER CORPS (100 PERSONNEL DOSSIER)
                  </h2>
                  <span className="text-xs bg-orange-600/30 text-orange-300 px-2 py-0.5 rounded border border-orange-500/40 font-bold">
                    {filteredOfficers.length} OF 100 ROSTERED
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Realistic Fighter Pilots, Tank Gunners, Missile Launch Officers, Warship &amp; Submarine Skippers, and Drone Operators.
                </p>
              </div>

              <button
                onClick={() => setShowOfficersModal(false)}
                className="px-3.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white text-xs font-bold uppercase transition-colors"
              >
                ✕ CLOSE
              </button>
            </div>

            {/* Officer Category Tabs */}
            <div className="px-3 pt-2 bg-black/60 border-b border-white/10 flex items-center gap-1.5 overflow-x-auto text-xs scrollbar-thin">
              <span className="text-slate-400 text-[10px] uppercase font-black mr-1 flex-shrink-0">CORPS:</span>
              <button
                onClick={() => {
                  setOfficerCategory('ALL');
                  soundFx.playRadioChirp();
                }}
                className={`px-3 py-1.5 rounded-t-lg font-black uppercase text-[11px] transition-all flex items-center gap-1.5 border-t border-x flex-shrink-0 ${
                  officerCategory === 'ALL'
                    ? 'bg-orange-600 text-white border-orange-400 shadow-md'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>🎖️</span>
                <span>ALL OFFICERS (100)</span>
              </button>
              {(Object.keys(HERO_CATEGORIES_CONFIG) as HeroCategory[]).map((catKey) => {
                const cfg = HERO_CATEGORIES_CONFIG[catKey];
                const count = HERO_PILOTS_REGISTRY.filter((p) => p.heroCategory === catKey).length;
                const isActive = officerCategory === catKey;
                return (
                  <button
                    key={catKey}
                    onClick={() => {
                      setOfficerCategory(catKey);
                      soundFx.playRadioChirp();
                    }}
                    className={`px-3 py-1.5 rounded-t-lg font-black uppercase text-[11px] transition-all flex items-center gap-1.5 border-t border-x flex-shrink-0 ${
                      isActive
                        ? 'bg-orange-600 text-white border-orange-400 shadow-md'
                        : 'bg-white/5 text-slate-400 border-white/10 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span>{cfg.icon}</span>
                    <span>{cfg.name.toUpperCase()} ({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Officer Filter & Search Controls */}
            <div className="p-3 bg-white/5 border-b border-white/10 flex flex-wrap items-center gap-2.5 text-xs">
              {/* Search */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by callsign, name, rank, quote, or specialty..."
                  value={officerSearch}
                  onChange={(e) => setOfficerSearch(e.target.value)}
                  className="w-full bg-black/40 border border-white/15 rounded-lg pl-8 pr-3 py-1.5 text-slate-200 focus:outline-none focus:border-orange-500 text-xs"
                />
              </div>

              {/* Service Branch Filter */}
              <select
                value={officerBranch}
                onChange={(e) => setOfficerBranch(e.target.value)}
                className="bg-black/40 border border-white/15 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-orange-500"
              >
                <option value="ALL">All Service Branches (100)</option>
                <option value="Army">🪖 Army (Ground &amp; Armor)</option>
                <option value="Air Force">✈️ Air Force (Fighters, Bombers &amp; Drones)</option>
                <option value="Navy">⚓ Navy (Warships &amp; Submarines)</option>
                <option value="Marine Corps">⚔️ Marine Corps (Assault &amp; Heli)</option>
                <option value="Air Defense">📡 Air Defense (SAM &amp; Interceptors)</option>
              </select>

              {/* Badge Specialty Filter */}
              <select
                value={officerBadge}
                onChange={(e) => setOfficerBadge(e.target.value)}
                className="bg-black/40 border border-white/15 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-orange-500"
              >
                <option value="ALL">All Specialization Badges</option>
                <option value="Tank Ace">🛡️ Tank Ace</option>
                <option value="Fighter Pilot">✈️ Fighter Pilot</option>
                <option value="Rotor Ace">🚁 Rotor Ace</option>
                <option value="Missile Officer">🚀 Missile Officer</option>
                <option value="Naval Commander">⚓ Naval Commander</option>
                <option value="Submarine Skipper">🌊 Submarine Skipper</option>
                <option value="Drone Operator">🎯 Drone Operator</option>
                <option value="Artillery Master">💥 Artillery Master</option>
                <option value="Air Defense">📡 Air Defense</option>
                <option value="Recon Ghost">👁️ Recon Ghost</option>
                <option value="Cyber Drone">💻 Cyber Drone</option>
              </select>
            </div>

            {/* Officer Cards Grid */}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 bg-black/40">
              {filteredOfficers.map((officer) => {
                const flag = officer.country ? COUNTRY_NAMES[officer.country]?.flag || '🌐' : '🌐';
                const branchColor =
                  officer.serviceBranch === 'Army'
                    ? 'border-emerald-600/40 bg-emerald-950/20 text-emerald-300'
                    : officer.serviceBranch === 'Air Force'
                    ? 'border-sky-600/40 bg-sky-950/20 text-sky-300'
                    : officer.serviceBranch === 'Navy'
                    ? 'border-blue-600/40 bg-blue-950/20 text-blue-300'
                    : 'border-amber-600/40 bg-amber-950/20 text-amber-300';

                return (
                  <div
                    key={officer.id}
                    className="bg-white/5 border border-white/10 hover:border-orange-500/50 rounded-xl p-3.5 flex flex-col justify-between transition-all hover:shadow-xl hover:shadow-black/40 group"
                  >
                    <div>
                      {/* Officer Top Bar */}
                      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-white/10">
                        <div className="flex items-center gap-2.5">
                          <div className="w-11 h-11 rounded-lg bg-black/50 border border-white/15 flex items-center justify-center text-2xl shadow-inner group-hover:scale-105 transition-transform">
                            {officer.avatarIcon}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-sm text-white">"{officer.callsign}"</span>
                              <span className="text-sm" title={officer.country}>
                                {flag}
                              </span>
                            </div>
                            <div className="text-xs text-slate-300">
                              <span className="text-slate-400">{officer.rank}</span> {officer.name}
                            </div>
                          </div>
                        </div>

                        <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase border ${branchColor}`}>
                          {officer.serviceBranch || 'Military'}
                        </span>
                      </div>

                      {/* Combat Badge & Specialization */}
                      <div className="flex items-center justify-between gap-2 my-2 text-[11px]">
                        <span className="bg-orange-600/20 border border-orange-500/30 text-orange-300 px-2 py-0.5 rounded font-bold">
                          🎖️ {officer.badge}
                        </span>
                        <span className="text-slate-300 font-bold truncate max-w-[170px]" title={officer.specialty}>
                          {officer.specialty}
                        </span>
                      </div>

                      {/* Battle Quote */}
                      <div className="bg-black/30 border border-white/5 rounded-lg p-2 my-2 text-[11px] text-slate-300 italic">
                        "{officer.quote}"
                      </div>

                      {/* Firing & Kill Radio Transmissions */}
                      <div className="space-y-1 text-[10px] pt-1 text-slate-400 font-mono">
                        <div className="truncate">
                          <span className="text-orange-400 font-bold">TRANSMIT: </span>
                          <span className="text-slate-200">"{officer.firingCallout}"</span>
                        </div>
                        <div className="truncate">
                          <span className="text-emerald-400 font-bold">CONFIRM: </span>
                          <span className="text-slate-200">"{officer.killCallout}"</span>
                        </div>
                      </div>
                    </div>

                    {/* Radio Chirp Test / Active Status */}
                    <div className="pt-2.5 mt-2.5 border-t border-white/10 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>COMBAT READY</span>
                      </span>
                      <button
                        onClick={() => soundFx.playRadioChirp()}
                        className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-bold text-[10px] uppercase transition-colors"
                      >
                        TEST RADIO 📻
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
