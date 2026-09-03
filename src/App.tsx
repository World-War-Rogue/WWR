import React, { useState, useEffect, useCallback } from 'react';
import { TacticalHUD } from './components/TacticalHUD';
import { BaseBuildingView } from './components/BaseBuildingView';
import { BaseExternalView } from './components/BaseExternalView';
import { BaseInternalView } from './components/BaseInternalView';
import { SquadCommandView } from './components/SquadCommandView';
import { CombatSimulatorView } from './components/CombatSimulatorView';
import { CommsCenterView } from './components/CommsCenterView';
import { AllianceCommandView } from './components/AllianceCommandView';
import { AllianceLeaderboardView } from './components/AllianceLeaderboardView';
import { ServerBrowserModal } from './components/ServerBrowserModal';
import { FairArmoryModal } from './components/FairArmoryModal';
import { GameDossierFolderModal } from './components/GameDossierFolderModal';
import { DeveloperOpsModal } from './components/DeveloperOpsModal';
import { loadDevOpsState, saveDevOpsState } from './data/initialDevOps';
import { DeveloperSessionState, LockableModuleId } from './types/devOps';
import { FolderArchive } from 'lucide-react';

import {
  Squad,
  Unit,
  BaseBuilding,
  PlayerProfile,
  SeasonTheater,
  ServerInfo,
  ChatMessage,
  SeasonId,
  AmmoType,
  ArmorMod,
  OpticsMod,
  TacticalStance,
  EquipmentCategoryKey,
  CategoryUpgradeProgress,
  BaseEvent,
  ActiveAppView,
  Alliance,
  AllianceRank,
  AllianceTask,
  AllianceEvent,
  AllianceLogEntry,
} from './types';

import { initializeUnits } from './data/units';
import { SEASONS_DATA } from './data/seasons';
import { SERVERS_DATA, INITIAL_SERVER_CHAT_LOGS } from './data/servers';
import { INITIAL_ALLIANCES_DATA, generateAllianceMembers } from './data/alliances';
import {
  INITIAL_SQUADS,
  INITIAL_BASE_BUILDINGS,
  INITIAL_PLAYER_PROFILE,
} from './data/initialState';
import {
  INITIAL_CATEGORY_PROGRESS,
  INITIAL_BASE_EVENTS,
} from './data/equipmentCategories';
import { ArmoryCrateTier, calculateSquadCombatPower } from './utils/antiCheat';
import { soundFx } from './utils/audio';

export default function App() {
  // --- CORE GAME STATE ---
  const [profile, setProfile] = useState<PlayerProfile>(INITIAL_PLAYER_PROFILE);
  const [squads, setSquads] = useState<Squad[]>(INITIAL_SQUADS);
  const [units, setUnits] = useState<Unit[]>(() => initializeUnits());
  const [buildings, setBuildings] = useState<BaseBuilding[]>(INITIAL_BASE_BUILDINGS);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_SERVER_CHAT_LOGS);

  // --- 6 EQUIPMENT CATEGORIES & BASE EVENTS STATE ---
  const [categoryProgress, setCategoryProgress] = useState<
    Record<EquipmentCategoryKey, CategoryUpgradeProgress>
  >(INITIAL_CATEGORY_PROGRESS);
  const [events, setEvents] = useState<BaseEvent[]>(INITIAL_BASE_EVENTS);

  // --- SELECTION & NAVIGATION ---
  const [activeSeasonId, setActiveSeasonId] = useState<SeasonId>('sandstorm');
  const [activeServerId, setActiveServerId] = useState<string>('global_war_room');
  const [activeSquadId, setActiveSquadId] = useState<string>('squad_alpha');
  // 2 Primary Views: 'base_external' and 'base_internal', plus 'combat', 'squads', 'comms', 'alliances'
  const [activeView, setActiveView] = useState<ActiveAppView>('base_external');

  // --- ALLIANCE & SERVER MATRIX STATE (100 MEMBERS) ---
  const [alliances, setAlliances] = useState<Alliance[]>(INITIAL_ALLIANCES_DATA);
  const [activeAllianceId, setActiveAllianceId] = useState<string>('alliance_aegis');
  const [playerAllianceRole, setPlayerAllianceRole] = useState<AllianceRank>('Colonel');
  const [isServerBrowserOpen, setIsServerBrowserOpen] = useState<boolean>(false);

  // --- MODALS & SPECIAL ACTIONS ---
  const [isArmoryOpen, setIsArmoryOpen] = useState<boolean>(false);
  const [isDocsOpen, setIsDocsOpen] = useState<boolean>(false);
  const [isDevOpsOpen, setIsDevOpsOpen] = useState<boolean>(false);
  const [devOpsState, setDevOpsState] = useState<DeveloperSessionState>(() => loadDevOpsState());
  const [claimedDaily, setClaimedDaily] = useState<boolean>(false);
  const [isSimulatingWave, setIsSimulatingWave] = useState<boolean>(false);

  // Sync devOpsState to localStorage
  useEffect(() => {
    saveDevOpsState(devOpsState);
  }, [devOpsState]);

  const currentDev =
    devOpsState.seats.find((s) => s.id === devOpsState.currentDevId) || devOpsState.seats[0];

  const activeSeason = SEASONS_DATA.find((s) => s.id === activeSeasonId) || SEASONS_DATA[0];
  const activeServer = SERVERS_DATA.find((s) => s.id === activeServerId) || SERVERS_DATA[0];
  const currentAlliance = alliances.find((a) => a.id === activeAllianceId) || alliances[0];

  // --- PASSIVE RESOURCE PRODUCTION TICK (Every 8 seconds) ---
  useEffect(() => {
    const timer = setInterval(() => {
      const mult = devOpsState.liveOverrides?.resourceMultiplier || 1.0;
      setProfile((prev) => ({
        ...prev,
        resources: {
          ...prev.resources,
          fuel: Math.round(prev.resources.fuel + 15 * mult),
          rations: Math.round(prev.resources.rations + 20 * mult),
          munitions: Math.round(prev.resources.munitions + 18 * mult),
          alloy: Math.round(prev.resources.alloy + 8 * mult),
        },
      }));
    }, 8000);

    return () => clearInterval(timer);
  }, [devOpsState.liveOverrides?.resourceMultiplier]);

  // Recalculate squad combat ratings whenever units or squads update
  useEffect(() => {
    setSquads((prevSquads) =>
      prevSquads.map((squad) => ({
        ...squad,
        totalCombatPower: calculateSquadCombatPower(squad, units),
      }))
    );
  }, [units]);

  // Keyboard shortcut listener (1-5 for squads, Ctrl+Shift+D or ~ for Dev Ops)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      // Hidden Dev Ops toggle hotkeys
      if (
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') ||
        e.key === '`' ||
        e.key === '~'
      ) {
        e.preventDefault();
        soundFx.playRadioChirp();
        setIsDevOpsOpen((prev) => !prev);
        return;
      }

      if (e.key === '1') setActiveSquadId('squad_alpha');
      if (e.key === '2') setActiveSquadId('squad_bravo');
      if (e.key === '3') setActiveSquadId('squad_charlie');
      if (e.key === '4') setActiveSquadId('squad_delta');
      if (e.key === '5') setActiveSquadId('squad_echo');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- ACTIONS ---

  // 1. Upgrade Base Building
  const handleUpgradeBuilding = (buildingId: string) => {
    const bldg = buildings.find((b) => b.id === buildingId);
    if (!bldg) return;

    if (
      profile.resources.fuel < bldg.upgradeCost.fuel ||
      profile.resources.alloy < bldg.upgradeCost.alloy ||
      profile.resources.munitions < bldg.upgradeCost.munitions
    ) {
      return;
    }

    // Deduct resources
    setProfile((prev) => ({
      ...prev,
      resources: {
        ...prev.resources,
        fuel: prev.resources.fuel - bldg.upgradeCost.fuel,
        alloy: prev.resources.alloy - bldg.upgradeCost.alloy,
        munitions: prev.resources.munitions - bldg.upgradeCost.munitions,
      },
    }));

    // Level up building stats
    setBuildings((prev) =>
      prev.map((b) => {
        if (b.id !== buildingId) return b;
        const newLevel = b.level + 1;
        const newMaxHp = Math.round(b.maxHp * 1.25);
        return {
          ...b,
          level: newLevel,
          maxHp: newMaxHp,
          hp: newMaxHp,
          defenseRating: Math.round(b.defenseRating * 1.2),
          upgradeCost: {
            fuel: Math.round(b.upgradeCost.fuel * 1.4),
            alloy: Math.round(b.upgradeCost.alloy * 1.4),
            munitions: Math.round(b.upgradeCost.munitions * 1.4),
          },
        };
      })
    );
  };

  // 2. Repair Base Integrity
  const handleRepairBase = () => {
    if (profile.resources.alloy < 200) return;
    setProfile((prev) => ({
      ...prev,
      baseIntegrity: 100,
      resources: {
        ...prev.resources,
        alloy: prev.resources.alloy - 200,
      },
    }));
  };

  // 3. Trigger Survival Drill Attack Wave
  const handleTriggerSurvivalWave = () => {
    setIsSimulatingWave(true);
    soundFx.playAlarm();

    setTimeout(() => {
      soundFx.playExplosion(true);
      // Repulse wave reward
      setProfile((prev) => ({
        ...prev,
        survivalWaveRecord: prev.survivalWaveRecord + 1,
        resources: {
          ...prev.resources,
          fuel: prev.resources.fuel + 600,
          munitions: prev.resources.munitions + 500,
          alloy: prev.resources.alloy + 400,
          warBonds: prev.resources.warBonds + 75,
        },
      }));
      setIsSimulatingWave(false);
      soundFx.playRadioChirp();
    }, 3200);
  };

  // 4. Swap Unit in a Squad Slot
  const handleSwapUnitInSquad = (squadId: string, slotIndex: number, newUnitId: string) => {
    setSquads((prev) =>
      prev.map((sq) => {
        if (sq.id !== squadId) return sq;
        const newUnitIds = [...sq.unitIds];
        newUnitIds[slotIndex] = newUnitId;
        return {
          ...sq,
          unitIds: newUnitIds,
        };
      })
    );
  };

  // 5. Update Unit Customization Loadout
  const handleUpdateUnitCustomization = (
    unitId: string,
    customization: {
      ammoType: AmmoType;
      armorMod: ArmorMod;
      opticsMod: OpticsMod;
      stance: TacticalStance;
    }
  ) => {
    setUnits((prev) =>
      prev.map((u) => {
        if (u.id !== unitId) return u;
        return {
          ...u,
          customization,
        };
      })
    );
  };

  // 6. Upgrade Unit Tech Level
  const handleUpgradeUnit = (unitId: string) => {
    if (profile.resources.warBonds < 50) return;

    setProfile((prev) => ({
      ...prev,
      resources: {
        ...prev.resources,
        warBonds: prev.resources.warBonds - 50,
      },
    }));

    setUnits((prev) =>
      prev.map((u) => {
        if (u.id !== unitId) return u;
        const nextLevel = u.upgradeLevel + 1;
        // As campaign progresses, units transition towards futuristic gear
        let newEra = u.era;
        if (nextLevel >= 5 && u.era === 'Cold War') newEra = 'Modern';
        if (nextLevel >= 8 && u.era === 'Modern') newEra = 'Near-Future';
        if (nextLevel >= 12 && u.era === 'Near-Future') newEra = 'Futuristic';

        return {
          ...u,
          upgradeLevel: nextLevel,
          era: newEra,
          hp: Math.round(u.hp * 1.15),
          firepower: Math.round(u.firepower * 1.15),
          armor: Math.min(95, Math.round(u.armor * 1.05)),
          penetration: Math.round(u.penetration * 1.1),
        };
      })
    );
  };

  // 7. Upgrade Category Tech Tier (1 of the 6 Categories)
  const handleUpgradeCategory = (categoryKey: EquipmentCategoryKey) => {
    const current = categoryProgress[categoryKey];
    const nextLevel = current ? current.level + 1 : 2;
    const cost = {
      alloy: nextLevel * 120,
      munitions: nextLevel * 150,
      fuel: nextLevel * 100,
      warBonds: nextLevel * 10,
    };

    if (
      profile.resources.alloy < cost.alloy ||
      profile.resources.munitions < cost.munitions ||
      profile.resources.fuel < cost.fuel ||
      profile.resources.warBonds < cost.warBonds
    ) {
      return;
    }

    // Deduct resources
    setProfile((prev) => ({
      ...prev,
      resources: {
        ...prev.resources,
        alloy: prev.resources.alloy - cost.alloy,
        munitions: prev.resources.munitions - cost.munitions,
        fuel: prev.resources.fuel - cost.fuel,
        warBonds: prev.resources.warBonds - cost.warBonds,
      },
    }));

    // Update category tier
    setCategoryProgress((prev) => ({
      ...prev,
      [categoryKey]: {
        ...prev[categoryKey],
        level: nextLevel,
        currentExp: 0,
        maxExp: Math.round(prev[categoryKey].maxExp * 1.4),
      },
    }));

    // Apply stat bonus to all units
    setUnits((prev) =>
      prev.map((u) => {
        let hpDelta = 0;
        let fpDelta = 0;
        let armorDelta = 0;
        let speedDelta = 0;

        if (categoryKey === 'lethality') fpDelta = 8;
        if (categoryKey === 'survivability') {
          hpDelta = 25;
          armorDelta = 2;
        }
        if (categoryKey === 'mobility') speedDelta = 4;
        if (categoryKey === 'electronics') fpDelta = 5;
        if (categoryKey === 'situational') fpDelta = 6;
        if (categoryKey === 'hmi') hpDelta = 15;

        return {
          ...u,
          hp: u.hp + hpDelta,
          firepower: u.firepower + fpDelta,
          armor: Math.min(95, u.armor + armorDelta),
          speed: u.speed + speedDelta,
          powerRating: u.powerRating + 12,
        };
      })
    );
  };

  // 8. Equip Gear on Unit across the 6 Categories
  const handleEquipGear = (
    unitId: string,
    category: EquipmentCategoryKey,
    subcategoryId: string,
    optionName: string
  ) => {
    setUnits((prev) =>
      prev.map((u) => {
        if (u.id !== unitId) return u;
        const cust = u.customization || {
          ammoType: 'APFSDS-DU' as AmmoType,
          armorMod: 'Titanium-Composite' as ArmorMod,
          opticsMod: 'Thermal-Gen3' as OpticsMod,
          stance: 'Aggressive-Assault' as TacticalStance,
        };

        const updated = { ...cust };
        if (category === 'lethality') {
          updated.lethalityGear = {
            ...(updated.lethalityGear || {
              primaryArmament: '120mm Smoothbore High-Pressure Cannon',
              secondarySystems: 'Multispectral Aerosol Smoke Grenade Launchers',
              ammunitionStorage: 'Isolated Bustle Compartment with Blow-Out Panels',
            }),
            ...(subcategoryId === 'primary_armaments' ? { primaryArmament: optionName } : {}),
            ...(subcategoryId === 'secondary_systems' ? { secondarySystems: optionName } : {}),
            ...(subcategoryId === 'ammunition_storage' ? { ammunitionStorage: optionName } : {}),
          };
        } else if (category === 'survivability') {
          updated.survivabilityGear = {
            ...(updated.survivabilityGear || {
              passiveArmor: 'High-Tensile Rolled Homogeneous Steel (RHA)',
              reactiveArmor: 'Heavy Double-Layer Explosive Reactive Tiles (ERA)',
              cbrnProtection: 'Positive-Pressure Cabin Overpressure System',
            }),
            ...(subcategoryId === 'passive_armor' ? { passiveArmor: optionName } : {}),
            ...(subcategoryId === 'reactive_armor' ? { reactiveArmor: optionName } : {}),
            ...(subcategoryId === 'cbrn_protection' ? { cbrnProtection: optionName } : {}),
          };
        } else if (category === 'mobility') {
          updated.mobilityGear = {
            ...(updated.mobilityGear || {
              powerplant: '1,500 HP Multi-Fuel Twin-Turbo Diesel',
              driveSystem: 'Reinforced Steel Tracks with Replaceable Rubber Pads',
              fuelDelivery: 'Self-Sealing Foam-Lined Armor Fuel Bladders',
            }),
            ...(subcategoryId === 'powerplant' ? { powerplant: optionName } : {}),
            ...(subcategoryId === 'drive_system' ? { driveSystem: optionName } : {}),
            ...(subcategoryId === 'fuel_delivery' ? { fuelDelivery: optionName } : {}),
          };
        } else if (category === 'electronics') {
          updated.electronicsGear = {
            ...(updated.electronicsGear || {
              commandControl: 'MIL-STD-1553B Dual Redundant Tactical Data Bus',
              communications: 'Frequency-Hopping Encrypted SINCGARS VHF/UHF Radio',
              powerArchitecture: '17 kW Auxiliary Power Unit (APU) with Muffler',
            }),
            ...(subcategoryId === 'command_control' ? { commandControl: optionName } : {}),
            ...(subcategoryId === 'communications' ? { communications: optionName } : {}),
            ...(subcategoryId === 'power_architecture' ? { powerArchitecture: optionName } : {}),
          };
        } else if (category === 'situational') {
          updated.situationalGear = {
            ...(updated.situationalGear || {
              optics: '3rd-Gen High-Definition FLIR Thermal Sight',
              sensors: '360° Laser Warning Receivers (LWR) & RF Detectors',
              fireControlSystems: 'Digital Ballistic Computer with Crosswind Sensor',
            }),
            ...(subcategoryId === 'optics' ? { optics: optionName } : {}),
            ...(subcategoryId === 'sensors' ? { sensors: optionName } : {}),
            ...(subcategoryId === 'fire_control_systems' ? { fireControlSystems: optionName } : {}),
          };
        } else if (category === 'hmi') {
          updated.hmiGear = {
            ...(updated.hmiGear || {
              controls: 'Ergonomic Dual-Grip Turret & Gunner Controller',
              lifeSupport: 'Thermoelectric Microclimate Vests & Air Conditioning',
              egressSystems: 'Pyrotechnic Rapid-Release Turret Hatches',
            }),
            ...(subcategoryId === 'controls' ? { controls: optionName } : {}),
            ...(subcategoryId === 'life_support' ? { lifeSupport: optionName } : {}),
            ...(subcategoryId === 'egress_systems' ? { egressSystems: optionName } : {}),
          };
        }

        return {
          ...u,
          customization: updated,
          powerRating: u.powerRating + 18,
          firepower: Math.round(u.firepower * 1.05),
          armor: Math.min(95, Math.round(u.armor * 1.03)),
        };
      })
    );
  };

  // 9. Sign Into Specific Tactical Event
  const handleSignInEvent = (eventId: string) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, status: 'signed_in' as const } : e))
    );
  };

  // 10. Execute Event Sortie Simulation
  const handleExecuteEventSortie = (eventId: string) => {
    const evt = events.find((e) => e.id === eventId);
    if (!evt) return;

    // Yield rewards to player profile
    setProfile((prev) => ({
      ...prev,
      resources: {
        ...prev.resources,
        warBonds: prev.resources.warBonds + evt.rewards.warBonds,
        alloy: prev.resources.alloy + evt.rewards.alloy,
        munitions: prev.resources.munitions + evt.rewards.munitions,
      },
    }));

    // Mark as completed
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, status: 'completed' as const } : e))
    );
  };

  // 11. Purchase Fair Armory Crate or Claim Daily
  const handlePurchaseCrate = (crate: ArmoryCrateTier) => {
    if (crate.isDailyFree) {
      setClaimedDaily(true);
    }
    setProfile((prev) => ({
      ...prev,
      resources: {
        fuel: prev.resources.fuel + crate.bonusFuel,
        rations: prev.resources.rations + 300,
        munitions: prev.resources.munitions + crate.bonusMunitions,
        alloy: prev.resources.alloy + crate.bonusAlloy,
        warBonds: prev.resources.warBonds + crate.warBondsYield,
      },
    }));
  };

  // 12. Send Chat Message
  const handleSendMessage = (text: string, serverId: string) => {
    const newMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      sender: profile.callsign,
      senderRank: profile.rank,
      senderCountry: 'US',
      serverId: serverId,
      serverName: activeServer.name,
      originalLanguage: 'en',
      originalText: text,
      translatedText: text,
      timestamp: 'Just now',
    };

    setChatMessages((prev) => [...prev, newMsg]);

    // Simulated international response after 1.8s
    setTimeout(() => {
      const foreignReplies = [
        {
          name: 'PanzerLeader_99',
          rank: 'Oberst',
          server: 'eu_central',
          country: 'DE',
          text: 'Verstanden! Unsere Leopard 2A7 Panzerung hält die Stellung.',
          trans: 'Understood! Our Leopard 2A7 armor is holding the line.',
          lang: 'de',
        },
        {
          name: 'Kyiv_Vanguard',
          rank: 'Major',
          server: 'eu_central',
          country: 'UA',
          text: 'Стугна-П на позиції, чекаємо ворожі колони на фланзі.',
          trans: 'Stugna-P in position, waiting for hostile columns on the flank.',
          lang: 'uk',
        },
        {
          name: 'Ronin_Tactical',
          rank: 'Captain',
          server: 'asia_pac',
          country: 'JP',
          text: 'Type 10のレールガン準備完了。弾道計算完了しました。',
          trans: 'Type 10 railgun ready. Ballistic calculations complete.',
          lang: 'ja',
        },
      ];
      const reply = foreignReplies[Math.floor(Math.random() * foreignReplies.length)];

      const serverReply: ChatMessage = {
        id: `msg_reply_${Date.now()}`,
        sender: reply.name,
        senderRank: reply.rank,
        senderCountry: reply.country as any,
        serverId: reply.server,
        serverName: 'International War Room',
        originalLanguage: reply.lang,
        originalText: reply.text,
        translatedText: reply.trans,
        timestamp: 'Just now',
      };
      setChatMessages((prev) => [...prev, serverReply]);
      soundFx.playRadioChirp();
    }, 1800);
  };

  // 9. Add resources from combat salvage
  const handleAddResources = (fuel: number, munitions: number, alloy: number, warBonds: number) => {
    setProfile((prev) => ({
      ...prev,
      resources: {
        fuel: prev.resources.fuel + fuel,
        rations: prev.resources.rations + 100,
        munitions: prev.resources.munitions + munitions,
        alloy: prev.resources.alloy + alloy,
        warBonds: prev.resources.warBonds + warBonds,
      },
    }));
  };

  // 10. Record PVP Victory/Defeat
  const handleRecordPvpResult = (isWin: boolean) => {
    setProfile((prev) => ({
      ...prev,
      pvpWins: isWin ? prev.pvpWins + 1 : prev.pvpWins,
      pvpLosses: !isWin ? prev.pvpLosses + 1 : prev.pvpLosses,
      baseIntegrity: !isWin ? Math.max(20, prev.baseIntegrity - 15) : prev.baseIntegrity,
    }));
  };

  // 11. Restore State from Imported JSON Save
  const handleImportState = (savedJson: string) => {
    const data = JSON.parse(savedJson);
    if (data.profile) setProfile(data.profile);
    if (data.squads) setSquads(data.squads);
    if (data.buildings) setBuildings(data.buildings);
  };

  // --- ALLIANCE OPERATIONS (ADMIRAL & UP TO 10 COLONELS) ---
  // Plan Alliance Task (Staff Authority)
  const handlePlanAllianceTask = (
    taskData: Omit<AllianceTask, 'id' | 'currentAmount' | 'status'>
  ) => {
    const newTask: AllianceTask = {
      ...taskData,
      id: `task_${Date.now()}`,
      currentAmount: 0,
      status: 'ACTIVE',
    };

    const newLog: AllianceLogEntry = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toTimeString().slice(0, 8),
      text: `${taskData.plannedByRank} ${taskData.plannedByCallsign} planned new alliance task: ${taskData.title}`,
      type: 'task_plan',
      officerName: taskData.plannedByCallsign,
    };

    setAlliances((prev) =>
      prev.map((a) =>
        a.id === activeAllianceId
          ? {
              ...a,
              tasks: [newTask, ...a.tasks],
              logs: [newLog, ...a.logs],
            }
          : a
      )
    );
  };

  // Set Up Alliance Event (Staff Authority)
  const handleSetUpAllianceEvent = (
    eventData: Omit<AllianceEvent, 'id' | 'currentScore' | 'status' | 'registeredMemberIds'>
  ) => {
    const newEvent: AllianceEvent = {
      ...eventData,
      id: `event_${Date.now()}`,
      currentScore: 0,
      status: 'UPCOMING',
      registeredMemberIds: ['mem-AEGIS-col-1'],
    };

    const newLog: AllianceLogEntry = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toTimeString().slice(0, 8),
      text: `${eventData.plannedByRank} ${eventData.plannedByCallsign} scheduled War Event: ${eventData.name} (${eventData.codeName})`,
      type: 'event_plan',
      officerName: eventData.plannedByCallsign,
    };

    setAlliances((prev) =>
      prev.map((a) =>
        a.id === activeAllianceId
          ? {
              ...a,
              events: [newEvent, ...a.events],
              logs: [newLog, ...a.logs],
            }
          : a
      )
    );
  };

  // Contribute to Task (All 100 Members)
  const handleContributeAllianceTask = (taskId: string, amount: number) => {
    setAlliances((prev) =>
      prev.map((a) => {
        if (a.id !== activeAllianceId) return a;
        const updatedTasks = a.tasks.map((t) => {
          if (t.id !== taskId) return t;
          const newAmount = t.currentAmount + amount;
          return {
            ...t,
            currentAmount: newAmount,
            status: newAmount >= t.targetAmount ? ('COMPLETED' as const) : t.status,
          };
        });

        const newLog: AllianceLogEntry = {
          id: `log_${Date.now()}`,
          timestamp: new Date().toTimeString().slice(0, 8),
          text: `${profile.callsign} contributed ${amount.toLocaleString()} supplies to active task.`,
          type: 'task_complete',
        };

        return {
          ...a,
          tasks: updatedTasks,
          logs: [newLog, ...a.logs],
        };
      })
    );

    // Grant player bonus War Bonds
    setProfile((prev) => ({
      ...prev,
      resources: {
        ...prev.resources,
        warBonds: prev.resources.warBonds + 50,
      },
    }));
  };

  // Register for Event (All 100 Members)
  const handleRegisterAllianceEvent = (eventId: string) => {
    setAlliances((prev) =>
      prev.map((a) => {
        if (a.id !== activeAllianceId) return a;
        const updatedEvents = a.events.map((e) => {
          if (e.id !== eventId) return e;
          if (e.registeredMemberIds.includes(profile.callsign)) return e;
          return {
            ...e,
            registeredMemberIds: [...e.registeredMemberIds, profile.callsign],
            currentScore: e.currentScore + 15000,
          };
        });
        return { ...a, events: updatedEvents };
      })
    );

    setProfile((prev) => ({
      ...prev,
      resources: {
        ...prev.resources,
        warBonds: prev.resources.warBonds + 100,
      },
    }));
  };

  // Promote Member to Colonel (Admiral power, max 10 Colonels enforced)
  const handlePromoteMember = (memberId: string): boolean => {
    const currentAlly = alliances.find((a) => a.id === activeAllianceId);
    if (!currentAlly) return false;

    const currentColonelsCount = currentAlly.members.filter((m) => m.rank === 'Colonel').length;
    if (currentColonelsCount >= 10) {
      return false; // Enforce maximum 10 Colonels!
    }

    setAlliances((prev) =>
      prev.map((a) => {
        if (a.id !== activeAllianceId) return a;
        const targetMember = a.members.find((m) => m.id === memberId);
        const updatedMembers = a.members.map((m) =>
          m.id === memberId ? { ...m, rank: 'Colonel' as AllianceRank } : m
        );

        const newLog: AllianceLogEntry = {
          id: `log_${Date.now()}`,
          timestamp: new Date().toTimeString().slice(0, 8),
          text: `Admiral promoted ${targetMember?.callsign || 'Officer'} to Colonel (Staff Planning Authority granted).`,
          type: 'promotion',
          officerName: targetMember?.callsign,
        };

        return {
          ...a,
          members: updatedMembers,
          logs: [newLog, ...a.logs],
        };
      })
    );
    return true;
  };

  // Demote Colonel to Lieutenant
  const handleDemoteMember = (memberId: string) => {
    setAlliances((prev) =>
      prev.map((a) => {
        if (a.id !== activeAllianceId) return a;
        const targetMember = a.members.find((m) => m.id === memberId);
        const updatedMembers = a.members.map((m) =>
          m.id === memberId ? { ...m, rank: 'Lieutenant' as AllianceRank } : m
        );

        const newLog: AllianceLogEntry = {
          id: `log_${Date.now()}`,
          timestamp: new Date().toTimeString().slice(0, 8),
          text: `${targetMember?.callsign || 'Officer'} was assigned to frontline Lieutenant duties.`,
          type: 'promotion',
          officerName: targetMember?.callsign,
        };

        return {
          ...a,
          members: updatedMembers,
          logs: [newLog, ...a.logs],
        };
      })
    );
  };

  // Discharge / Kick Member
  const handleKickMember = (memberId: string) => {
    setAlliances((prev) =>
      prev.map((a) => {
        if (a.id !== activeAllianceId) return a;
        return {
          ...a,
          members: a.members.filter((m) => m.id !== memberId),
        };
      })
    );
  };

  // Commission new 100-member Alliance (Player is Admiral)
  const handleCreateAlliance = (allianceData: {
    name: string;
    tag: string;
    motto: string;
    emblemIcon: string;
  }) => {
    const newMembers = generateAllianceMembers(
      allianceData.tag,
      profile.callsign,
      'US',
      {
        rank: 'Admiral',
        callsign: profile.callsign,
        country: 'US',
      }
    );

    const newAlliance: Alliance = {
      id: `alliance_${Date.now()}`,
      name: allianceData.name,
      tag: allianceData.tag,
      serverId: activeServerId,
      motto: allianceData.motto,
      emblemIcon: allianceData.emblemIcon,
      emblemColor: 'from-orange-600 to-amber-700',
      level: 1,
      totalCombatPower: newMembers.reduce((acc, m) => acc + m.combatPower, 0),
      maxMembers: 100,
      isOpenRecruitment: true,
      minPowerRequirement: 10000,
      members: newMembers,
      tasks: [],
      events: [],
      logs: [
        {
          id: `log_${Date.now()}`,
          timestamp: new Date().toTimeString().slice(0, 8),
          text: `Admiral ${profile.callsign} commissioned the [${allianceData.tag}] ${allianceData.name} Alliance with 100 members.`,
          type: 'promotion',
          officerName: profile.callsign,
        },
      ],
    };

    setAlliances((prev) => [newAlliance, ...prev]);
    setActiveAllianceId(newAlliance.id);
    setPlayerAllianceRole('Admiral');
  };

  const handleDevOpsNavigate = (moduleId: LockableModuleId) => {
    switch (moduleId) {
      case 'base_external':
        setActiveView('base_external');
        break;
      case 'base_internal':
        setActiveView('base_internal');
        break;
      case 'combat':
        setActiveView('combat');
        break;
      case 'squads':
        setActiveView('squads');
        break;
      case 'alliances':
        setActiveView('alliances');
        break;
      case 'alliance_leaderboard':
        setActiveView('alliance_leaderboard');
        break;
      case 'economy_armory':
        setIsArmoryOpen(true);
        break;
      default:
        break;
    }
  };

  return (
    <div
      className="min-h-screen bg-[#0a0c0b] text-[#d1d5db] font-sans flex flex-col relative selection:bg-orange-500 selection:text-white"
      style={{
        backgroundImage: 'radial-gradient(circle at 50% 50%, #1a2421 0%, #0a0c0b 100%)',
      }}
    >
      {/* Tactical Grid Overlay */}
      <div
        className="fixed inset-0 opacity-10 pointer-events-none z-0"
        style={{
          backgroundImage:
            'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Tactical C4ISR Navigation & Topbar */}
      <div className="relative z-20">
        <TacticalHUD
          profile={profile}
          activeSeason={activeSeason}
          seasons={SEASONS_DATA}
          onSelectSeason={setActiveSeasonId}
          activeServer={activeServer}
          servers={SERVERS_DATA}
          onSelectServer={setActiveServerId}
          activeView={activeView}
          onSelectView={setActiveView}
          onOpenArmory={() => setIsArmoryOpen(true)}
          onOpenDocs={() => setIsDocsOpen(true)}
          onOpenServerBrowser={() => setIsServerBrowserOpen(true)}
          onOpenDevOps={() => setIsDevOpsOpen(true)}
          activeDevCallsign={currentDev?.callsign}
          activeAllianceTag={currentAlliance.tag}
        />
      </div>

      {/* Main Viewport Container */}
      <main className="flex-1 flex flex-col relative z-10 pb-4">
        {/* PRIMARY VIEW 1: EXTERNAL BASE VIEW */}
        {(activeView === 'base_external' || (activeView as string) === 'base') && (
          <BaseExternalView
            buildings={buildings}
            onUpgradeBuilding={handleUpgradeBuilding}
            onRepairBase={handleRepairBase}
            profile={profile}
            activeSeason={activeSeason}
            onTriggerSurvivalWave={handleTriggerSurvivalWave}
            isSimulatingWave={isSimulatingWave}
            onNavigateToInternal={() => setActiveView('base_internal')}
            lockState={devOpsState.moduleLocks.base_external}
            currentDev={currentDev}
            onOpenDevOps={() => setIsDevOpsOpen(true)}
          />
        )}

        {/* PRIMARY VIEW 2: INTERNAL BASE VIEW (6 UPGRADE CATEGORIES, GEAR & EVENTS) */}
        {activeView === 'base_internal' && (
          <BaseInternalView
            profile={profile}
            units={units}
            squads={squads}
            categoryProgress={categoryProgress}
            events={events}
            onUpgradeCategory={handleUpgradeCategory}
            onEquipGear={handleEquipGear}
            onSignInEvent={handleSignInEvent}
            onExecuteEventSortie={handleExecuteEventSortie}
            onNavigateToExternal={() => setActiveView('base_external')}
            lockState={devOpsState.moduleLocks.base_internal}
            currentDev={currentDev}
            onOpenDevOps={() => setIsDevOpsOpen(true)}
          />
        )}

        {activeView === 'squads' && (
          <SquadCommandView
            squads={squads}
            activeSquadId={activeSquadId}
            onSelectSquad={setActiveSquadId}
            units={units}
            onSwapUnitInSquad={handleSwapUnitInSquad}
            onUpdateUnitCustomization={handleUpdateUnitCustomization}
            onUpgradeUnit={handleUpgradeUnit}
            profile={profile}
          />
        )}

        {activeView === 'combat' && (
          <CombatSimulatorView
            squads={squads}
            activeSquadId={activeSquadId}
            onSelectSquad={setActiveSquadId}
            units={units}
            activeSeason={activeSeason}
            profile={profile}
            onAddResources={handleAddResources}
            onRecordPvpResult={handleRecordPvpResult}
            lockState={devOpsState.moduleLocks.combat}
            currentDev={currentDev}
            onOpenDevOps={() => setIsDevOpsOpen(true)}
            liveOverrides={devOpsState.liveOverrides}
          />
        )}

        {activeView === 'comms' && (
          <CommsCenterView
            activeServer={activeServer}
            servers={SERVERS_DATA}
            onSelectServer={setActiveServerId}
            chatMessages={chatMessages}
            onSendMessage={handleSendMessage}
          />
        )}

        {/* ALLIANCE COMMAND VIEW (100-MEMBER MATRIX, ADMIRAL & COLONELS TASK/EVENT PLANNING) */}
        {activeView === 'alliances' && (
          <AllianceCommandView
            alliances={alliances}
            activeAllianceId={activeAllianceId}
            onSelectAlliance={setActiveAllianceId}
            playerRole={playerAllianceRole}
            onSetPlayerRole={setPlayerAllianceRole}
            profile={profile}
            activeServer={activeServer}
            onPlanTask={handlePlanAllianceTask}
            onSetUpEvent={handleSetUpAllianceEvent}
            onContributeTask={handleContributeAllianceTask}
            onRegisterEvent={handleRegisterAllianceEvent}
            onPromoteMember={handlePromoteMember}
            onDemoteMember={handleDemoteMember}
            onKickMember={handleKickMember}
            onCreateAlliance={handleCreateAlliance}
            onOpenServerBrowser={() => setIsServerBrowserOpen(true)}
            onOpenLeaderboard={() => setActiveView('alliance_leaderboard')}
          />
        )}

        {/* ALLIANCE LEADERBOARD VIEW (COMBAT POWER, SEASON EVENTS & TERRITORIAL CONTROL) */}
        {activeView === 'alliance_leaderboard' && (
          <AllianceLeaderboardView
            alliances={alliances}
            activeAllianceId={activeAllianceId}
            onSelectAlliance={setActiveAllianceId}
            servers={SERVERS_DATA}
            activeServer={activeServer}
            onSelectServer={setActiveServerId}
            playerRole={playerAllianceRole}
            profile={profile}
            onSwitchToAllianceCommand={() => setActiveView('alliances')}
          />
        )}
      </main>

      {/* Frosted Glass Tactical C4ISR Status Footer */}
      <footer className="h-12 bg-black/60 backdrop-blur-xl border-t border-white/10 flex items-center px-4 sm:px-8 justify-between relative z-20 text-xs font-mono">
        <div className="flex items-center gap-4 sm:gap-8 flex-wrap overflow-hidden">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            <span className="text-[10px] font-bold tracking-tighter uppercase text-slate-300">
              Fuel: {(profile.resources.fuel / 1000).toFixed(1)}k
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
            <span className="text-[10px] font-bold tracking-tighter uppercase text-slate-300">
              Alloy: {(profile.resources.alloy / 1000).toFixed(1)}k
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
            <span className="text-[10px] font-bold tracking-tighter uppercase text-slate-300">
              Ammo: {(profile.resources.munitions / 1000).toFixed(1)}k
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
            <span className="text-[10px] font-bold tracking-tighter uppercase text-slate-300">
              Bonds: {profile.resources.warBonds}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsArmoryOpen(true)}
            className="px-3 py-1 bg-white/5 hover:bg-orange-600/30 rounded border border-white/10 hover:border-orange-500/50 text-[10px] font-bold uppercase cursor-pointer transition-colors text-orange-400"
          >
            Armory
          </button>
          <button
            onClick={() => {
              soundFx.playRadioChirp();
              setIsDocsOpen(true);
            }}
            className="px-3 py-1 bg-amber-950/60 hover:bg-amber-900/80 rounded border border-amber-600/60 text-[10px] font-bold uppercase cursor-pointer transition-colors text-amber-300 flex items-center gap-1.5 shadow-sm"
            title="Open Classified Military File Folder /docs/"
          >
            <FolderArchive className="w-3 h-3 text-amber-400" />
            <span>Game Dossier (/docs/)</span>
          </button>
        </div>
      </footer>

      {/* Modals */}
      <ServerBrowserModal
        isOpen={isServerBrowserOpen}
        onClose={() => setIsServerBrowserOpen(false)}
        servers={SERVERS_DATA}
        activeServer={activeServer}
        onSelectServer={(srvId) => {
          setActiveServerId(srvId);
          setIsServerBrowserOpen(false);
        }}
      />

      <FairArmoryModal
        isOpen={isArmoryOpen}
        onClose={() => setIsArmoryOpen(false)}
        onPurchaseCrate={handlePurchaseCrate}
        claimedDaily={claimedDaily}
      />

      {/* Interactive Classified Game Information File Folder (/docs/) */}
      <GameDossierFolderModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
        profile={profile}
        squads={squads}
        buildings={buildings}
        onImportState={handleImportState}
      />

      {/* Hidden Multi-Developer Collaboration Studio & Lockout Suite */}
      <DeveloperOpsModal
        isOpen={isDevOpsOpen}
        onClose={() => setIsDevOpsOpen(false)}
        devState={devOpsState}
        onUpdateDevState={setDevOpsState}
        onNavigateToView={handleDevOpsNavigate}
        activeGameState={{
          profile,
          squads,
          buildings,
        }}
      />
    </div>
  );
}
