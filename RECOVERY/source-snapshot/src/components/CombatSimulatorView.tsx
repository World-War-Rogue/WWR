import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Crosshair,
  Shield,
  Zap,
  Flame,
  Radio,
  RotateCcw,
  Swords,
  Play,
  Pause,
  AlertTriangle,
  Award,
  Activity,
  BarChart3,
} from 'lucide-react';
import {
  Squad,
  Unit,
  SeasonTheater,
  DestructibleObstacle,
  CombatEntity,
  BallisticProjectile,
  ParticleEffect,
  GroundCrater,
  FlyingDebris,
  PlayerProfile,
  CombatAfterActionReport,
  CombatTelemetrySnapshot,
  CombatMilestoneEvent,
  CombatUnitTelemetry,
} from '../types';
import { COUNTRY_NAMES } from '../data/units';
import { determineVehicleType, getPilotForUnit, ENEMY_HERO_PILOTS } from '../data/pilots';
import {
  drawCombatVehicle,
  drawHeroPilotOverlay,
  drawRealisticMissile,
  drawRealisticTracer,
  drawAdvancedParticle,
  drawBlastCrater,
  drawFlyingDebrisItem,
  applyTacticalViewMode,
  TacticalViewMode,
} from '../utils/combatRenderer';
import { soundFx } from '../utils/audio';
import { PostCombatSummaryOverlay } from './PostCombatSummaryOverlay';
import { generateCombatAfterActionReport } from '../utils/aarGenerator';
import { ModuleLockState, DeveloperSeat, DevLiveOverrides } from '../types/devOps';
import { ModuleLockBanner } from './ModuleLockBanner';

interface CombatSimulatorViewProps {
  squads: Squad[];
  activeSquadId: string;
  onSelectSquad: (id: string) => void;
  units: Unit[];
  activeSeason: SeasonTheater;
  profile: PlayerProfile;
  onAddResources: (fuel: number, munitions: number, alloy: number, warBonds: number) => void;
  onRecordPvpResult: (isWin: boolean) => void;
  lockState?: ModuleLockState;
  currentDev?: DeveloperSeat;
  onOpenDevOps?: () => void;
  liveOverrides?: DevLiveOverrides;
}

export const CombatSimulatorView: React.FC<CombatSimulatorViewProps> = ({
  squads,
  activeSquadId,
  onSelectSquad,
  units,
  activeSeason,
  profile,
  onAddResources,
  onRecordPvpResult,
  lockState,
  currentDev,
  onOpenDevOps,
  liveOverrides,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Combat State
  const [battleRunning, setBattleRunning] = useState<boolean>(false);
  const [tacticalSlowMo, setTacticalSlowMo] = useState<boolean>(false);
  const [tacticalViewMode, setTacticalViewMode] = useState<TacticalViewMode>('standard');
  const [combatMode, setCombatMode] = useState<'pvp' | 'survival'>('pvp');
  const [rivalCommander, setRivalCommander] = useState<{
    name: string;
    server: string;
    power: number;
    flag: string;
  }>({
    name: 'Valkyrie_EU',
    server: 'EU-Central [Vanguard 04]',
    power: 5100,
    flag: '🇩🇪',
  });

  const [combatEntities, setCombatEntities] = useState<CombatEntity[]>([]);
  const [destructibles, setDestructibles] = useState<DestructibleObstacle[]>([]);
  const [battleResult, setBattleResult] = useState<'victory' | 'defeat' | null>(null);
  const [supportCooldowns, setSupportCooldowns] = useState<{
    airstrike: number;
    smoke: number;
    emp: number;
    artillery: number;
  }>({
    airstrike: 0,
    smoke: 0,
    emp: 0,
    artillery: 0,
  });

  // Post-Combat Telemetry & AAR Overlay State
  const [showPostCombatOverlay, setShowPostCombatOverlay] = useState<boolean>(false);
  const [aarReport, setAarReport] = useState<CombatAfterActionReport | null>(null);

  // Telemetry refs for tracking fluctuations throughout the engagement
  const battleStartTimeRef = useRef<number>(0);
  const lastSnapshotTimeRef = useRef<number>(0);
  const telemetrySnapshotsRef = useRef<CombatTelemetrySnapshot[]>([]);
  const telemetryMilestonesRef = useRef<CombatMilestoneEvent[]>([]);
  const telemetryMapRef = useRef<Record<string, Partial<CombatUnitTelemetry>>>({});

  // Reference for ongoing animation frames & physics state
  const entitiesRef = useRef<CombatEntity[]>([]);
  const obstaclesRef = useRef<DestructibleObstacle[]>([]);
  const projectilesRef = useRef<BallisticProjectile[]>([]);
  const particlesRef = useRef<ParticleEffect[]>([]);
  const cratersRef = useRef<GroundCrater[]>([]);
  const debrisRef = useRef<FlyingDebris[]>([]);
  const screenShakeRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const animationFrameId = useRef<number | null>(null);

  const activeSquad = squads.find((s) => s.id === activeSquadId) || squads[0];

  // Initialize or reset the combat arena
  const initCombatArena = useCallback(() => {
    // Reset telemetry tracking
    battleStartTimeRef.current = 0;
    lastSnapshotTimeRef.current = 0;
    telemetrySnapshotsRef.current = [];
    telemetryMilestonesRef.current = [];
    telemetryMapRef.current = {};
    cratersRef.current = [];
    debrisRef.current = [];
    screenShakeRef.current = 0;

    // 1. Initialize player units from active squad
    const playerEntities: CombatEntity[] = activeSquad.unitIds
      .map((uid, index) => {
        const u = units.find((x) => x.id === uid);
        if (!u) return null;
        const upgradeMult = 1 + (u.upgradeLevel - 1) * 0.15;
        const yPos = 80 + index * 55;
        const vType = determineVehicleType(u);
        const pilot = u.pilot || getPilotForUnit(u.id, u.role, u.country, u.name, false);
        return {
          id: `player_${u.id}_${index}`,
          unitId: u.id,
          name: u.name,
          team: 'player' as const,
          country: u.country,
          role: u.role,
          vehicleType: vType,
          pilot,
          x: 100 + (index % 2) * 40,
          y: yPos,
          targetX: 100 + (index % 2) * 40,
          targetY: yPos,
          headingAngle: 0, // facing east towards enemy
          turretAngle: 0,
          recoil: 0,
          rotorAngle: 0,
          bankAngle: 0,
          altitude: vType === 'airplane' ? 36 : vType === 'helicopter' ? 24 : 0,
          lastMuzzleFlash: 0,
          hp: Math.round(u.hp * upgradeMult),
          maxHp: Math.round(u.hp * upgradeMult),
          armor: u.armor,
          firepower: Math.round(u.firepower * upgradeMult),
          fireRate: u.fireRate,
          range: u.range,
          speed: u.speed,
          blastRadius: u.blastRadius,
          penetration: u.penetration,
          lastFired: performance.now() - Math.random() * 2000,
          squadName: activeSquad.name,
          stance: u.customization?.stance || 'Aggressive Assault',
          destroyed: false,
        };
      })
      .filter(Boolean) as CombatEntity[];

    // 2. Initialize enemy forces with diverse vehicle types & pilots
    const enemyTemplates = [
      { name: 'Hostile T-90M Proryv-3 MBT', role: 'Main Battle Tank', hp: 2350, armor: 85, firepower: 430, range: 320 },
      { name: 'Hostile Su-57 Felon Air Strike', role: 'Recon & Sniper', hp: 1450, armor: 48, firepower: 580, range: 420 },
      { name: 'Hostile Ka-52 Alligator Gunship', role: 'Attack Helicopter', hp: 1350, armor: 45, firepower: 470, range: 380 },
      { name: 'Hostile S-400 Triumf Missile Battery', role: 'Missile Battery', hp: 1500, armor: 52, firepower: 530, range: 440 },
      { name: 'Hostile Admiral Gorshkov Guided Warship', role: 'Guided Missile Warship', hp: 2500, armor: 68, firepower: 590, range: 420 },
      { name: 'Hostile BMP-3 100mm IFV', role: 'Infantry Fighting Vehicle', hp: 1600, armor: 60, firepower: 340, range: 280 },
    ];

    const enemyEntities: CombatEntity[] = enemyTemplates.map((tmpl, index) => {
      const yPos = 80 + index * 55;
      const vType = determineVehicleType({ name: tmpl.name, role: tmpl.role as any });
      const pilot = getPilotForUnit(`enemy_${index}`, tmpl.role as any, 'US', tmpl.name, true);
      return {
        id: `enemy_${index}`,
        unitId: `enemy_${index}`,
        name: tmpl.name,
        team: 'enemy' as const,
        country: 'US', // default
        role: tmpl.role as any,
        vehicleType: vType,
        pilot,
        x: 650 - (index % 2) * 40,
        y: yPos,
        targetX: 650 - (index % 2) * 40,
        targetY: yPos,
        headingAngle: Math.PI, // facing west towards player
        turretAngle: Math.PI,
        recoil: 0,
        rotorAngle: 0,
        bankAngle: 0,
        altitude: vType === 'airplane' ? 36 : vType === 'helicopter' ? 24 : 0,
        lastMuzzleFlash: 0,
        hp: tmpl.hp,
        maxHp: tmpl.hp,
        armor: tmpl.armor,
        firepower: tmpl.firepower,
        fireRate: 0.25,
        range: tmpl.range,
        speed: 38,
        blastRadius: tmpl.role === 'Self-Propelled Artillery' ? 85 : 40,
        penetration: 110,
        lastFired: performance.now() - Math.random() * 2000,
        squadName: 'Rival Battlegroup',
        stance: 'Aggressive Assault',
        destroyed: false,
      };
    });

    // 3. Initialize Destructible Battlefield Obstacles
    const initialObstacles: DestructibleObstacle[] = [
      {
        id: 'obs_wall_1',
        name: 'Reinforced Concrete Wall',
        type: 'concrete_wall',
        x: 370,
        y: 60,
        width: 30,
        height: 100,
        hp: 1200,
        maxHp: 1200,
        isDestroyed: false,
        coverValue: 0.7,
        rubblePassable: false,
      },
      {
        id: 'obs_wall_2',
        name: 'Reinforced Concrete Wall',
        type: 'concrete_wall',
        x: 370,
        y: 280,
        width: 30,
        height: 100,
        hp: 1200,
        maxHp: 1200,
        isDestroyed: false,
        coverValue: 0.7,
        rubblePassable: false,
      },
      {
        id: 'obs_sandbag_1',
        name: 'Sandbag Bunker Redoubt',
        type: 'sandbag',
        x: 320,
        y: 190,
        width: 50,
        height: 35,
        hp: 750,
        maxHp: 750,
        isDestroyed: false,
        coverValue: 0.5,
        rubblePassable: true,
      },
      {
        id: 'obs_fuel_1',
        name: 'Volatile JP-8 Fuel Tank',
        type: 'fuel_tank',
        x: 430,
        y: 210,
        width: 40,
        height: 35,
        hp: 400,
        maxHp: 400,
        isDestroyed: false,
        coverValue: 0.2,
        rubblePassable: true,
      },
    ];

    entitiesRef.current = [...playerEntities, ...enemyEntities];
    obstaclesRef.current = initialObstacles;
    projectilesRef.current = [];
    particlesRef.current = [];

    setCombatEntities([...entitiesRef.current]);
    setDestructibles([...obstaclesRef.current]);
    setBattleResult(null);
  }, [activeSquad, units]);

  useEffect(() => {
    initCombatArena();
  }, [initCombatArena]);

  // Main 60 FPS Ballistics & Destruction Loop
  useEffect(() => {
    let active = true;

    const runLoop = (now: number) => {
      if (!active) return;
      const rawDt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      const dt = Math.min(rawDt, 0.1) * (tacticalSlowMo ? 0.35 : 1.0);

      const canvas = canvasRef.current;
      if (!canvas) {
        animationFrameId.current = requestAnimationFrame(runLoop);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationFrameId.current = requestAnimationFrame(runLoop);
        return;
      }

      // Screen shake trauma decay
      const shake = screenShakeRef.current;
      const shakeX = shake > 0 ? (Math.random() - 0.5) * shake * 12 : 0;
      const shakeY = shake > 0 ? (Math.random() - 0.5) * shake * 12 : 0;
      screenShakeRef.current = Math.max(0, screenShakeRef.current - dt * 2.8);

      ctx.save();
      ctx.translate(shakeX, shakeY);

      // --- 1. RENDER BACKGROUND & SEASON ENVIRONMENT ---
      ctx.fillStyle = activeSeason.bgColor || '#0f172a';
      ctx.fillRect(-30, -30, canvas.width + 60, canvas.height + 60);

      // Procedural track ruts & battle scarring
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-20, 135);
      ctx.lineTo(canvas.width + 20, 140);
      ctx.moveTo(-20, 190);
      ctx.lineTo(canvas.width + 20, 185);
      ctx.moveTo(-20, 245);
      ctx.lineTo(canvas.width + 20, 250);
      ctx.moveTo(-20, 300);
      ctx.lineTo(canvas.width + 20, 295);
      ctx.stroke();

      // Subtle tactical grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Weather Hazard overlay
      if (activeSeason.id === 'sandstorm') {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.06)';
        ctx.fillRect(-20, -20, canvas.width + 40, canvas.height + 40);
      } else if (activeSeason.id === 'frostbite') {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.05)';
        ctx.fillRect(-20, -20, canvas.width + 40, canvas.height + 40);
      }

      // Render lingering Ground Blast Craters & scorched earth
      cratersRef.current.forEach((crater) => {
        drawBlastCrater(ctx, crater);
      });

      // --- 2. UPDATE & RENDER DESTRUCTIBLE OBSTACLES ---
      obstaclesRef.current.forEach((obs) => {
        // Drop shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(obs.x + 3, obs.y + 4, obs.width, obs.height);

        if (obs.isDestroyed) {
          // Crumbled rubble
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1;
          ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
          // Rubble rocks
          ctx.fillStyle = '#475569';
          ctx.fillRect(obs.x + 3, obs.y + 3, 6, 4);
          ctx.fillRect(obs.x + obs.width - 10, obs.y + 5, 7, 5);
          return;
        }

        // Draw obstacle body
        if (obs.type === 'concrete_wall') {
          ctx.fillStyle = '#475569';
          ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
          ctx.strokeStyle = '#334155';
          ctx.beginPath();
          ctx.moveTo(obs.x + obs.width / 2, obs.y);
          ctx.lineTo(obs.x + obs.width / 2, obs.y + obs.height);
          ctx.stroke();
        } else if (obs.type === 'fuel_tank') {
          const grad = ctx.createLinearGradient(obs.x, obs.y, obs.x, obs.y + obs.height);
          grad.addColorStop(0, '#dc2626');
          grad.addColorStop(0.5, '#ef4444');
          grad.addColorStop(1, '#991b1b');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 4);
          ctx.fill();
          ctx.strokeStyle = '#fca5a5';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(obs.x + 4, obs.y + obs.height / 2 - 2, obs.width - 8, 4);
        } else {
          ctx.fillStyle = '#78350f';
          ctx.beginPath();
          ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 3);
          ctx.fill();
          ctx.strokeStyle = '#b45309';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Obstacle Health Bar
        const hpPct = Math.max(0, obs.hp / obs.maxHp);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(obs.x, obs.y - 8, obs.width, 4);
        ctx.fillStyle = hpPct > 0.5 ? '#10b981' : hpPct > 0.25 ? '#f59e0b' : '#ef4444';
        ctx.fillRect(obs.x, obs.y - 8, obs.width * hpPct, 4);
      });

      // --- 3. COMBAT UNITS AI, BALLISTICS & FIRING ---
      const players = entitiesRef.current.filter((e) => e.team === 'player' && !e.destroyed);
      const enemies = entitiesRef.current.filter((e) => e.team === 'enemy' && !e.destroyed);

      // Check Victory / Defeat condition
      if (battleRunning && !battleResult) {
        let outcome: 'victory' | 'defeat' | null = null;
        if (enemies.length === 0 && players.length > 0) {
          outcome = 'victory';
          setBattleResult('victory');
          setBattleRunning(false);
          soundFx.playRadioChirp();
          onAddResources(800, 600, 500, 150);
          onRecordPvpResult(true);
        } else if (players.length === 0 && enemies.length > 0) {
          outcome = 'defeat';
          setBattleResult('defeat');
          setBattleRunning(false);
          onRecordPvpResult(false);
        }

        if (outcome) {
          const duration = Math.max(4.0, (now - (battleStartTimeRef.current || now)) / 1000);
          const report = generateCombatAfterActionReport({
            result: outcome,
            durationSec: duration,
            theaterName: activeSeason.name,
            playerCommanderName: profile.callsign,
            playerCommanderRank: profile.rank,
            playerSquadName: activeSquad.name,
            playerSquadPower: activeSquad.totalCombatPower,
            enemyCommanderName: rivalCommander.name,
            enemyCommanderServer: rivalCommander.server,
            enemyCommanderFlag: rivalCommander.flag,
            enemySquadPower: rivalCommander.power,
            playerEntities: entitiesRef.current.filter((e) => e.team === 'player'),
            enemyEntities: entitiesRef.current.filter((e) => e.team === 'enemy'),
            telemetryMap: telemetryMapRef.current,
            snapshots: telemetrySnapshotsRef.current,
            milestones: telemetryMilestonesRef.current,
          });
          setAarReport(report);
        }
      }

      if (battleRunning) {
        // Initialize engagement start timestamp and milestone
        if (battleStartTimeRef.current === 0) {
          battleStartTimeRef.current = now;
          telemetryMilestonesRef.current.push({
            id: `ms_contact_${Date.now()}`,
            timeSec: 0,
            type: 'first_contact',
            title: 'Ballistic Engagement Commenced',
            description: `Tactical engagement initiated between ${activeSquad.name} and ${rivalCommander.name}`,
            team: 'neutral',
            impactMagnitude: 'medium',
          });
        }

        // Collect periodic snapshots (every 280ms) for post-combat visual playback scrubbers
        if (now - lastSnapshotTimeRef.current >= 280) {
          lastSnapshotTimeRef.current = now;
          const elapsed = (now - battleStartTimeRef.current) / 1000;
          const pActive = entitiesRef.current.filter((e) => e.team === 'player' && !e.destroyed).length;
          const eActive = entitiesRef.current.filter((e) => e.team === 'enemy' && !e.destroyed).length;
          const pCurHp = entitiesRef.current.filter((e) => e.team === 'player').reduce((acc, u) => acc + Math.max(0, u.hp), 0);
          const pMax = entitiesRef.current.filter((e) => e.team === 'player').reduce((acc, u) => acc + u.maxHp, 0);
          const eCurHp = entitiesRef.current.filter((e) => e.team === 'enemy').reduce((acc, u) => acc + Math.max(0, u.hp), 0);
          const eMax = entitiesRef.current.filter((e) => e.team === 'enemy').reduce((acc, u) => acc + u.maxHp, 0);

          const uStates: Record<string, { hp: number; maxHp: number; destroyed: boolean; damageDealt: number; damageTaken: number; shotsFired: number; hitsLanded: number }> = {};
          entitiesRef.current.forEach((u) => {
            const tele = telemetryMapRef.current[u.id] || {};
            uStates[u.id] = {
              hp: Math.max(0, u.hp),
              maxHp: u.maxHp,
              destroyed: u.destroyed || u.hp <= 0,
              damageDealt: tele.damageDealt || 0,
              damageTaken: tele.damageTaken || 0,
              shotsFired: tele.shotsFired || 0,
              hitsLanded: tele.hitsLanded || 0,
            };
          });

          telemetrySnapshotsRef.current.push({
            timeSec: Math.round(elapsed * 10) / 10,
            playerTotalHp: pCurHp,
            playerMaxHp: pMax,
            enemyTotalHp: eCurHp,
            enemyMaxHp: eMax,
            playerActiveCount: pActive,
            enemyActiveCount: eActive,
            playerCumulativeDamage: entitiesRef.current.filter((e) => e.team === 'player').reduce((acc, u) => acc + (telemetryMapRef.current[u.id]?.damageDealt || 0), 0),
            enemyCumulativeDamage: entitiesRef.current.filter((e) => e.team === 'enemy').reduce((acc, u) => acc + (telemetryMapRef.current[u.id]?.damageDealt || 0), 0),
            playerDamageRate: Math.round(pCurHp > 0 ? (pMax - pCurHp) / Math.max(1, elapsed) : 0),
            enemyDamageRate: Math.round(eCurHp > 0 ? (eMax - eCurHp) / Math.max(1, elapsed) : 0),
            unitStates: uStates,
          });
        }

        entitiesRef.current.forEach((unit) => {
          if (unit.destroyed) return;

          const oppTeam = unit.team === 'player' ? enemies : players;
          if (oppTeam.length === 0) return;

          // Target acquisition (closest enemy)
          let closestDist = Infinity;
          let bestTarget: CombatEntity | null = null;
          for (const opp of oppTeam) {
            const dx = opp.x - unit.x;
            const dy = opp.y - unit.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < closestDist) {
              closestDist = dist;
              bestTarget = opp;
            }
          }

          // Aim turret & vehicle towards acquired target
          if (bestTarget) {
            const aimAngle = Math.atan2(bestTarget.y - unit.y, bestTarget.x - unit.x);
            unit.turretAngle = aimAngle;
            if (unit.vehicleType === 'airplane' || unit.vehicleType === 'helicopter') {
              unit.headingAngle = aimAngle;
            }
          }

          // Fire ballistic projectile if in range and cooldown ready
          const fireInterval = 1000 / unit.fireRate;
          if (bestTarget && closestDist <= unit.range && now - unit.lastFired >= fireInterval) {
            unit.lastFired = now;

            // Update telemetry shots fired for firing unit
            const tele = telemetryMapRef.current[unit.id] || {};
            tele.shotsFired = (tele.shotsFired || 0) + 1;
            telemetryMapRef.current[unit.id] = tele;

            // Animate realistic weapon recoil & muzzle blast flash
            unit.recoil = 1.0;
            unit.lastMuzzleFlash = now;

            // Hero Pilot Combat Radio Callout (random chance on fire)
            if (unit.pilot && (!unit.speechBubble || now > unit.speechBubble.expiresAt)) {
              if (Math.random() < 0.28) {
                unit.speechBubble = {
                  text: unit.pilot.firingCallout,
                  expiresAt: now + 1700,
                };
              }
            }

            // Determine projectile type, caliber, speed, and audio
            let projType: 'bullet' | 'missile' | 'tank_shell' | 'artillery_shell' | 'railgun' | 'laser' = 'bullet';
            let caliber = 'apfsds';
            let pSpeed = 550;

            const isRail = unit.role === 'Experimental Railgun';
            const isMissileLauncher =
              unit.vehicleType === 'helicopter' ||
              unit.vehicleType === 'airplane' ||
              unit.vehicleType === 'sam' ||
              unit.vehicleType === 'missile' ||
              (unit.vehicleType === 'ship' && Math.random() > 0.4) ||
              unit.name.toLowerCase().includes('tow') ||
              unit.name.toLowerCase().includes('missile') ||
              unit.name.toLowerCase().includes('kornet') ||
              unit.name.toLowerCase().includes('atgm') ||
              unit.name.toLowerCase().includes('himars') ||
              unit.name.toLowerCase().includes('patriot') ||
              unit.name.toLowerCase().includes('tomahawk') ||
              unit.name.toLowerCase().includes('iskander');

            if (isRail) {
              projType = 'railgun';
              caliber = 'railgun';
              pSpeed = 850;
              soundFx.playCannonShot(true);
            } else if (isMissileLauncher) {
              projType = 'missile';
              caliber = 'missile';
              pSpeed = 440;
              soundFx.playMissileLaunch();
            } else if (unit.vehicleType === 'artillery') {
              projType = 'artillery_shell';
              caliber = 'howitzer';
              pSpeed = 320;
              soundFx.playCannonShot(false);
            } else if (unit.vehicleType === 'tank' || unit.vehicleType === 'ship') {
              projType = 'tank_shell';
              caliber = unit.vehicleType === 'ship' ? 'naval_127mm' : 'apfsds';
              pSpeed = 680;
              soundFx.playCannonShot(false);
            } else {
              // IFVs, Recon, Autocannons, Machine Guns
              projType = 'bullet';
              caliber = 'autocannon';
              pSpeed = 700;
              soundFx.playMachineGun();
            }

            const targetX = bestTarget.x + (Math.random() - 0.5) * 16;
            const targetY = bestTarget.y + (Math.random() - 0.5) * 16;
            const flightAngle = Math.atan2(targetY - unit.y, targetX - unit.x);

            projectilesRef.current.push({
              id: `proj_${Math.random()}`,
              sourceUnitId: unit.id,
              targetUnitId: bestTarget.id,
              startX: unit.x,
              startY: unit.y,
              targetX,
              targetY,
              currentX: unit.x,
              currentY: unit.y,
              currentHeight: 0,
              speed: pSpeed,
              progress: 0,
              damage: unit.firepower,
              blastRadius: unit.blastRadius,
              penetration: unit.penetration,
              team: unit.team,
              caliber,
              projectileType: projType,
              flightAngle,
            });

            // Eject realistic metallic brass shell casings with tumbling physics
            if (projType === 'tank_shell' || projType === 'bullet' || projType === 'artillery_shell') {
              const ejectAngle = unit.turretAngle + (Math.PI / 2) * (Math.random() > 0.5 ? 1 : -1);
              particlesRef.current.push({
                id: `casing_${Math.random()}`,
                x: unit.x - Math.cos(unit.turretAngle) * 6,
                y: unit.y - Math.sin(unit.turretAngle) * 6,
                vx: Math.cos(ejectAngle) * (Math.random() * 50 + 25),
                vy: Math.sin(ejectAngle) * (Math.random() * 50 + 25) - 30,
                size: projType === 'tank_shell' ? 3.5 : projType === 'artillery_shell' ? 4.5 : 2,
                life: 0,
                maxLife: 2.5,
                angle: Math.random() * Math.PI * 2,
                angularVelocity: (Math.random() - 0.5) * 20,
                bounces: 2,
                color: '#fbbf24',
                type: 'casing',
              });
              soundFx.playCasingDrop();
            }

            // Heavy cannon muzzle shockwave ring
            if (projType === 'tank_shell' || projType === 'artillery_shell') {
              particlesRef.current.push({
                id: `shk_muzzle_${Math.random()}`,
                x: unit.x + Math.cos(unit.turretAngle) * 26,
                y: unit.y + Math.sin(unit.turretAngle) * 26,
                vx: 0,
                vy: 0,
                size: 2,
                life: 0,
                maxLife: 0.18,
                maxRadius: 30,
                color: '#ffffff',
                type: 'shockwave',
              });
            }
          }
        });
      }

      // --- 4. BALLISTIC PROJECTILE SIMULATION ---
      projectilesRef.current = projectilesRef.current.filter((proj) => {
        const dx = proj.targetX - proj.startX;
        const dy = proj.targetY - proj.startY;
        const totalDist = Math.sqrt(dx * dx + dy * dy);
        const speedMultiplier = liveOverrides?.velocityScale || 1.0;
        const step = (proj.speed * speedMultiplier * dt) / totalDist;
        proj.progress += step;

        if (proj.progress >= 1.0) {
          // --- IMPACT EXPLOSION & DAMAGE DISPERSION ---
          const hitX = proj.targetX;
          const hitY = proj.targetY;

          // Camera screen trauma shake
          screenShakeRef.current = Math.min(1.0, screenShakeRef.current + (proj.blastRadius > 40 ? 0.35 : 0.12));

          // Expanding atmospheric shockwave distortion
          particlesRef.current.push({
            id: `shk_${Math.random()}`,
            x: hitX,
            y: hitY,
            vx: 0,
            vy: 0,
            size: 2,
            life: 0,
            maxLife: 0.32,
            maxRadius: Math.max(30, proj.blastRadius * 0.85),
            color: '#ffffff',
            type: 'shockwave',
          });

          // Lingering ground blast crater
          if (proj.blastRadius > 10 || proj.projectileType === 'missile' || proj.projectileType === 'artillery_shell' || proj.projectileType === 'tank_shell') {
            if (cratersRef.current.length > 40) {
              cratersRef.current.shift();
            }
            cratersRef.current.push({
              id: `crater_${Math.random()}`,
              x: hitX,
              y: hitY,
              radius: Math.min(42, Math.max(14, proj.blastRadius * 0.45)),
              opacity: 1.0,
              createdAt: now,
              type: 'blast',
            });
          }

          // Play explosion or ricochet sound
          if (proj.blastRadius > 0 || proj.projectileType === 'missile') {
            soundFx.playExplosion(proj.blastRadius > 60);
          } else {
            soundFx.playRicochet();
          }

          // Visual explosion fireballs & shrapnel
          const particleCount = proj.blastRadius > 0 || proj.projectileType === 'missile' ? 16 : 8;
          for (let p = 0; p < particleCount; p++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 95 + 25;
            particlesRef.current.push({
              id: `part_${Math.random()}`,
              x: hitX,
              y: hitY,
              vx: Math.cos(angle) * spd,
              vy: Math.sin(angle) * spd,
              size: Math.random() * 4 + 2,
              life: 0,
              maxLife: Math.random() * 0.4 + 0.2,
              color: proj.caliber === 'railgun' ? '#38bdf8' : '#f59e0b',
              type: 'fire',
            });
          }

          // Damage destructibles in blast radius
          obstaclesRef.current.forEach((obs) => {
            if (obs.isDestroyed) return;
            const cx = obs.x + obs.width / 2;
            const cy = obs.y + obs.height / 2;
            const d = Math.sqrt((cx - hitX) ** 2 + (cy - hitY) ** 2);
            if (d <= Math.max(30, proj.blastRadius)) {
              obs.hp -= proj.damage;
              if (obs.hp <= 0) {
                obs.isDestroyed = true;
                soundFx.playStructureCollapse();

                // If fuel tank destroyed, trigger secondary explosion!
                if (obs.type === 'fuel_tank') {
                  soundFx.playExplosion(true);
                  screenShakeRef.current = 1.0;
                  cratersRef.current.push({
                    id: `crater_fuel_${Math.random()}`,
                    x: cx,
                    y: cy,
                    radius: 52,
                    opacity: 1.0,
                    createdAt: now,
                    type: 'fuel_scorch',
                  });
                  particlesRef.current.push({
                    id: `shk_fuel_${Math.random()}`,
                    x: cx,
                    y: cy,
                    vx: 0,
                    vy: 0,
                    size: 3,
                    life: 0,
                    maxLife: 0.5,
                    maxRadius: 110,
                    color: '#ffffff',
                    type: 'shockwave',
                  });

                  const fuelSec = battleStartTimeRef.current > 0 ? (performance.now() - battleStartTimeRef.current) / 1000 : 0;
                  telemetryMilestonesRef.current.push({
                    id: `ms_fuel_${Date.now()}`,
                    timeSec: Math.round(fuelSec * 10) / 10,
                    type: 'fuel_explosion',
                    title: 'JP-8 Volatile Fuel Tank Detonation',
                    description: 'Secondary blast wave erupted across 120m perimeter, incinerating nearby obstacles and armor plating.',
                    team: 'neutral',
                    impactMagnitude: 'critical',
                  });

                  entitiesRef.current.forEach((e) => {
                    const de = Math.sqrt((e.x - cx) ** 2 + (e.y - cy) ** 2);
                    if (de < 120) {
                      e.hp -= 400;
                      if (e.hp <= 0 && !e.destroyed) {
                        e.destroyed = true;
                        if (telemetryMapRef.current[e.id]) {
                          telemetryMapRef.current[e.id].timeOfDeathSec = Math.round(fuelSec * 10) / 10;
                        }
                      }
                    }
                  });
                }
              }
            }
          });

          // Damage target units
          entitiesRef.current.forEach((entity) => {
            if (entity.team === proj.team || entity.destroyed) return;
            const de = Math.sqrt((entity.x - hitX) ** 2 + (entity.y - hitY) ** 2);
            const effectiveRadius = Math.max(25, proj.blastRadius);

            if (de <= effectiveRadius) {
              // Sloped armor ricochet calculation
              const armorReduction = (entity.armor / 100) * 0.7;
              const netDamage = Math.max(20, Math.round(proj.damage * (1 - armorReduction)));
              entity.hp -= netDamage;

              // Thermal flare countermeasures for airborne targets taking damage
              if (entity.vehicleType === 'airplane' || entity.vehicleType === 'helicopter') {
                for (let f = 0; f < 3; f++) {
                  const fAngle = (entity.headingAngle || 0) + Math.PI + (Math.random() - 0.5) * 1.5;
                  const fSpeed = Math.random() * 85 + 50;
                  particlesRef.current.push({
                    id: `flare_${Math.random()}`,
                    x: entity.x,
                    y: entity.y - (entity.altitude || 24) * 0.3,
                    vx: Math.cos(fAngle) * fSpeed,
                    vy: Math.sin(fAngle) * fSpeed,
                    size: 3,
                    life: 0,
                    maxLife: 0.8 + Math.random() * 0.4,
                    color: '#ffffff',
                    type: 'flare',
                  });
                }
              }

              // Record telemetry for source unit
              if (proj.sourceUnitId) {
                const sTele = telemetryMapRef.current[proj.sourceUnitId] || {};
                sTele.hitsLanded = (sTele.hitsLanded || 0) + 1;
                sTele.damageDealt = (sTele.damageDealt || 0) + netDamage;
                if (proj.penetration > entity.armor * 1.1) {
                  sTele.criticalHits = (sTele.criticalHits || 0) + 1;
                }
                telemetryMapRef.current[proj.sourceUnitId] = sTele;
              }

              // Record telemetry for target unit
              const tTele = telemetryMapRef.current[entity.id] || {};
              tTele.damageTaken = (tTele.damageTaken || 0) + netDamage;
              if (armorReduction > 0.3) {
                tTele.ricochetsCaused = (tTele.ricochetsCaused || 0) + 1;
              }
              telemetryMapRef.current[entity.id] = tTele;

              if (entity.hp <= 0 && !entity.destroyed) {
                entity.destroyed = true;
                soundFx.playExplosion(true);
                const deathTime = battleStartTimeRef.current > 0 ? (performance.now() - battleStartTimeRef.current) / 1000 : 5.0;
                tTele.timeOfDeathSec = Math.round(deathTime * 10) / 10;
                if (proj.sourceUnitId && telemetryMapRef.current[proj.sourceUnitId]) {
                  telemetryMapRef.current[proj.sourceUnitId].kills = (telemetryMapRef.current[proj.sourceUnitId].kills || 0) + 1;
                }

                // Catastrophic ammunition rack detonation: Turret Toss!
                if (entity.vehicleType === 'tank' || entity.vehicleType === 'artillery' || entity.vehicleType === 'ifv') {
                  debrisRef.current.push({
                    id: `turret_${Math.random()}`,
                    x: entity.x,
                    y: entity.y,
                    z: 8,
                    vx: (Math.random() - 0.5) * 80,
                    vy: (Math.random() - 0.5) * 60,
                    vz: 180 + Math.random() * 80,
                    angle: entity.turretAngle,
                    angularVelocity: (Math.random() - 0.5) * 12,
                    type: 'turret',
                    team: entity.team,
                    size: 13,
                    settled: false,
                  });
                  screenShakeRef.current = Math.min(1.0, screenShakeRef.current + 0.5);
                }

                // Trigger Killer's Hero Pilot radio callout!
                if (proj.sourceUnitId) {
                  const killer = entitiesRef.current.find((e) => e.id === proj.sourceUnitId);
                  if (killer && killer.pilot) {
                    killer.speechBubble = {
                      text: killer.pilot.killCallout,
                      expiresAt: now + 2000,
                    };
                  }
                }

                telemetryMilestonesRef.current.push({
                  id: `ms_kill_${Date.now()}_${Math.random()}`,
                  timeSec: Math.round(deathTime * 10) / 10,
                  type: 'kill',
                  title: `${entity.name} Neutralized`,
                  description: `${entity.team === 'enemy' ? 'Hostile' : 'Friendly'} vehicle hull breached and destroyed in sector combat.`,
                  team: entity.team,
                  impactMagnitude: 'high',
                });
              }
            }
          });

          return false; // Remove projectile
        }

        // Projectile in flight: update coordinates & ballistic arc
        proj.currentX = proj.startX + dx * proj.progress;
        proj.currentY = proj.startY + dy * proj.progress;
        proj.currentHeight = Math.sin(proj.progress * Math.PI) * (proj.blastRadius > 50 ? 50 : 15);

        // Rocket smoke trail for missiles
        if (proj.projectileType === 'missile' && Math.random() < 0.6) {
          const angle = proj.flightAngle || 0;
          particlesRef.current.push({
            id: `smk_${Math.random()}`,
            x: proj.currentX - Math.cos(angle) * 8,
            y: proj.currentY - proj.currentHeight - Math.sin(angle) * 8,
            vx: -Math.cos(angle) * 20 + (Math.random() - 0.5) * 8,
            vy: -Math.sin(angle) * 20 + (Math.random() - 0.5) * 8,
            size: Math.random() * 3 + 2,
            life: 0,
            maxLife: 0.35,
            color: 'rgba(203, 213, 225, 0.7)',
            type: 'smoke',
          });
        }

        // Render realistic projectile (Missile with fins/exhaust, APFSDS sabot, or machine gun bullet tracer)
        if (proj.projectileType === 'missile') {
          drawRealisticMissile(ctx, proj, now);
        } else {
          drawRealisticTracer(ctx, proj);
        }

        return true;
      });

      // --- 5. UPDATE & RENDER FLYING DEBRIS (TURRET TOSS & SHRAPNEL) ---
      debrisRef.current = debrisRef.current.filter((deb) => {
        if (!deb.settled) {
          deb.vz -= 360 * dt; // Gravity acceleration
          deb.x += deb.vx * dt;
          deb.y += deb.vy * dt;
          deb.z += deb.vz * dt;
          deb.angle += deb.angularVelocity * dt;

          // Trail smoke while airborne
          if (Math.random() < 0.6) {
            particlesRef.current.push({
              id: `smk_deb_${Math.random()}`,
              x: deb.x,
              y: deb.y - deb.z,
              vx: (Math.random() - 0.5) * 10,
              vy: (Math.random() - 0.5) * 10,
              size: Math.random() * 4 + 3,
              life: 0,
              maxLife: 0.5,
              color: 'rgba(71, 85, 105, 0.7)',
              type: 'smoke',
            });
          }

          if (deb.z <= 0) {
            deb.z = 0;
            deb.vz = -deb.vz * 0.32; // Inelastic bounce
            deb.vx *= 0.55;
            deb.vy *= 0.55;
            deb.angularVelocity *= 0.45;
            if (Math.abs(deb.vz) < 22) {
              deb.settled = true;
              soundFx.playCasingDrop();
            }
          }
        }
        drawFlyingDebrisItem(ctx, deb);
        return true;
      });

      // --- 6. UPDATE & RENDER ADVANCED PARTICLES ---
      particlesRef.current = particlesRef.current.filter((part) => {
        part.life += dt;
        if (part.life >= part.maxLife) return false;

        // Custom physics for ejected brass casings
        if (part.type === 'casing') {
          part.vy += 220 * dt; // gravity
          part.x += part.vx * dt;
          part.y += part.vy * dt;
          part.angle = (part.angle || 0) + (part.angularVelocity || 0) * dt;

          // Ground bounce
          if (part.vy > 0 && part.life > 0.12 && (part.bounces || 0) > 0) {
            part.vy = -part.vy * 0.45;
            part.vx *= 0.6;
            part.angularVelocity = (part.angularVelocity || 0) * 0.5;
            part.bounces = (part.bounces || 0) - 1;
          }
        } else {
          part.x += part.vx * dt;
          part.y += part.vy * dt;
        }

        drawAdvancedParticle(ctx, part);
        return true;
      });

      // --- 7. UPDATE VEHICLE ANIMATIONS & RENDER COMBAT VEHICLES WITH HERO PILOTS ---
      entitiesRef.current.forEach((u) => {
        // Recoil decay
        if (u.recoil > 0) {
          u.recoil = Math.max(0, u.recoil - dt * 4.5);
        }
        // Spinning rotors for helicopters and drones
        if (u.vehicleType === 'helicopter' || u.vehicleType === 'drone') {
          u.rotorAngle = ((u.rotorAngle || 0) + dt * 28) % (Math.PI * 2);
        }
        // Speech bubble expiration
        if (u.speechBubble && now > u.speechBubble.expiresAt) {
          u.speechBubble = undefined;
        }

        if (u.destroyed) {
          // Render realistic charred smoking wreckage with burning flames
          ctx.save();
          ctx.translate(u.x, u.y);
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.roundRect(-16, -9, 32, 18, 3);
          ctx.fill();
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Burning flame flicker
          const flameSize = 7 + Math.sin(now * 0.02 + u.x) * 3;
          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.arc(0, -3, flameSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(0, -3, flameSize * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          return;
        }

        // Draw accurate vehicle model (Tanks with tracks/turrets, Airplanes with wings/afterburners, Helicopters with spinning rotors)
        drawCombatVehicle(ctx, u, now);

        // Draw Hero Pilot overlay (Pilot avatar badge, rank & callsign, health bar, and radio speech callouts)
        drawHeroPilotOverlay(ctx, u, now);
      });

      // Apply Tactical View Mode Post-processing (Standard HD, FLIR Thermal White-Hot, or NVG Green Phosphor)
      applyTacticalViewMode(ctx, canvas.width, canvas.height, tacticalViewMode, now);

      // Restore camera screen trauma shake transform
      ctx.restore();

      animationFrameId.current = requestAnimationFrame(runLoop);
    };

    animationFrameId.current = requestAnimationFrame(runLoop);

    return () => {
      active = false;
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [battleRunning, tacticalSlowMo, tacticalViewMode, activeSeason, battleResult, onAddResources, onRecordPvpResult]);

  // Tactical Air & Drone Support call-ins
  const triggerTacticalCallin = (type: 'airstrike' | 'smoke' | 'emp' | 'artillery') => {
    soundFx.playRadioChirp();
    const nowSec = battleStartTimeRef.current > 0 ? (performance.now() - battleStartTimeRef.current) / 1000 : 0;
    if (type === 'airstrike') {
      soundFx.playExplosion(true);
      telemetryMilestonesRef.current.push({
        id: `ms_cas_${Date.now()}`,
        timeSec: Math.round(nowSec * 10) / 10,
        type: 'cas_strike',
        title: 'A-10 Thunderbolt CAS Strafing Run',
        description: 'Close Air Support executed precision 30mm Gatling gun strafe across hostile front line.',
        team: 'player',
        impactMagnitude: 'critical',
      });
      // Bombard random enemy positions
      for (let i = 0; i < 3; i++) {
        projectilesRef.current.push({
          id: `airstrike_${Math.random()}`,
          startX: 400 + (Math.random() - 0.5) * 200,
          startY: -50,
          targetX: 550 + (Math.random() - 0.5) * 150,
          targetY: 150 + i * 80,
          currentX: 400,
          currentY: -50,
          currentHeight: 80,
          speed: 700,
          progress: 0,
          damage: 550,
          blastRadius: 90,
          penetration: 150,
          team: 'player',
          caliber: 'howitzer',
        });
      }
    } else if (type === 'emp') {
      soundFx.playCannonShot(true);
      telemetryMilestonesRef.current.push({
        id: `ms_emp_${Date.now()}`,
        timeSec: Math.round(nowSec * 10) / 10,
        type: 'emp_pulse',
        title: 'Directed EMP Shockwave Triggered',
        description: 'Hostile fire-control computer relays jammed in forced tactical reset.',
        team: 'player',
        impactMagnitude: 'high',
      });
      // Stun all enemy fire cooldowns
      entitiesRef.current.forEach((e) => {
        if (e.team === 'enemy') {
          e.lastFired = performance.now() + 4000;
        }
      });
    } else if (type === 'artillery') {
      soundFx.playCannonShot(false);
      telemetryMilestonesRef.current.push({
        id: `ms_arty_${Date.now()}`,
        timeSec: Math.round(nowSec * 10) / 10,
        type: 'artillery_barrage',
        title: 'Heavy Howitzer Saturation Barrage',
        description: '155mm high-explosive fragmentation shells delivered over enemy coordinates.',
        team: 'player',
        impactMagnitude: 'high',
      });
      for (let i = 0; i < 4; i++) {
        projectilesRef.current.push({
          id: `arty_${Math.random()}`,
          startX: 80,
          startY: 100 + i * 60,
          targetX: 600 + (Math.random() - 0.5) * 100,
          targetY: 120 + i * 60,
          currentX: 80,
          currentY: 100,
          currentHeight: 120,
          speed: 400,
          progress: 0,
          damage: 480,
          blastRadius: 80,
          penetration: 110,
          team: 'player',
          caliber: 'howitzer',
        });
      }
    }
  };

  // Handler to open AAR overlay (generate report on the fly if inspected before battle ends)
  const handleOpenAARReport = () => {
    soundFx.playRadioChirp();
    if (!aarReport) {
      const pActiveUnits = entitiesRef.current.filter((e) => e.team === 'player');
      const eActiveUnits = entitiesRef.current.filter((e) => e.team === 'enemy');
      const report = generateCombatAfterActionReport({
        result: battleResult || 'victory',
        durationSec: Math.max(12.0, (performance.now() - (battleStartTimeRef.current || performance.now())) / 1000),
        theaterName: activeSeason.name,
        playerCommanderName: profile.callsign,
        playerCommanderRank: profile.rank,
        playerSquadName: activeSquad.name,
        playerSquadPower: activeSquad.totalCombatPower,
        enemyCommanderName: rivalCommander.name,
        enemyCommanderServer: rivalCommander.server,
        enemyCommanderFlag: rivalCommander.flag,
        enemySquadPower: rivalCommander.power,
        playerEntities: pActiveUnits.length > 0 ? pActiveUnits : combatEntities.filter((e) => e.team === 'player'),
        enemyEntities: eActiveUnits.length > 0 ? eActiveUnits : combatEntities.filter((e) => e.team === 'enemy'),
        telemetryMap: telemetryMapRef.current,
        snapshots: telemetrySnapshotsRef.current,
        milestones: telemetryMilestonesRef.current,
      });
      setAarReport(report);
    }
    setShowPostCombatOverlay(true);
  };

  return (
    <div className="flex-1 p-3 sm:p-5 flex flex-col gap-3 max-w-7xl mx-auto w-full">
      {/* Mutex Area Lockout Banner */}
      <ModuleLockBanner
        lockState={lockState}
        currentDev={currentDev}
        onOpenDevOps={onOpenDevOps || (() => {})}
      />

      {/* Top Match & Opponent Dossier Bar */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-2xl flex flex-wrap items-center justify-between gap-3 font-mono">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-600/20 border border-orange-500/40 rounded-xl flex items-center justify-center text-orange-400 shadow-md">
            <Swords className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-white text-sm uppercase tracking-wide">
                TACTICAL BATTLE THEATER // REALISTIC BALLISTICS &amp; DESTRUCTIBLES
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-black/40 text-orange-400 border border-orange-500/30 font-black tracking-wider uppercase">
                {combatMode === 'pvp' ? 'PVP SERVER ENGAGEMENT' : 'ROGUE SURVIVAL DEFENSE'}
              </span>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
              <span className="text-slate-300">
                Deploying: <strong className="text-white">{activeSquad.name}</strong> ({activeSquad.totalCombatPower} PWR)
              </span>
              <span className="text-orange-500 font-bold">vs</span>
              <span className="text-orange-400 font-bold">
                {rivalCommander.flag} {rivalCommander.name} ({rivalCommander.power} PWR)
              </span>
            </div>
          </div>
        </div>

        {/* Tactical Controls & Play/Pause */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setTacticalSlowMo(!tacticalSlowMo);
              soundFx.playRadioChirp();
            }}
            className={`px-3 py-2 rounded-lg border text-xs font-black font-mono uppercase tracking-wider transition-all ${
              tacticalSlowMo
                ? 'bg-orange-600/30 border-orange-500 text-orange-300 shadow-[0_0_10px_rgba(234,88,12,0.3)]'
                : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Spacebar shortcut: Slows down combat time to 35% for strategic targeting"
          >
            SLOW-MO [SPACE]
          </button>

          <button
            onClick={handleOpenAARReport}
            className="px-3.5 py-2 rounded-lg bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 hover:text-orange-300 border border-orange-500/40 text-xs font-black font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shadow-orange-950/30"
            title="Inspect post-combat telemetry, visual playback scrubber, and comprehensive metric comparisons"
          >
            <Activity className="w-4 h-4 text-orange-400" />
            <span>AAR STATS &amp; PLAYBACK</span>
          </button>

          <button
            onClick={() => {
              initCombatArena();
              soundFx.playRadioChirp();
            }}
            className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-black font-mono uppercase tracking-wider flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-orange-400" />
            <span>RESET</span>
          </button>

          <button
            onClick={() => {
              setBattleRunning(!battleRunning);
              soundFx.playRadioChirp();
            }}
            className={`px-5 py-2 rounded-lg font-black text-xs font-mono uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all active:scale-95 ${
              battleRunning
                ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-amber-950/40'
                : 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-950/50'
            }`}
          >
            {battleRunning ? (
              <>
                <Pause className="w-4 h-4" />
                <span>CEASE FIRE</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>ENGAGE BATTLE [AUTO-FIRE]</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Canvas Battlefield with Frosted Glass Container */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#141b18]">
        <canvas
          ref={canvasRef}
          width={820}
          height={420}
          className="w-full h-[420px] block cursor-crosshair"
        />

        {/* Floating Canvas Top-Left Telemetry Badge */}
        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md p-2.5 rounded-lg border border-white/10 pointer-events-none font-mono text-xs flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">
              GRID LAT 34.02°N / LON 118.24°W
            </span>
          </div>
          <span className="text-white/20">|</span>
          <span className="text-[10px] text-slate-300 uppercase font-bold">
            THEATER: {activeSeason.name}
          </span>
        </div>

        {/* Tactical Optic Mode Selector (STANDARD HD / FLIR THERMAL / NVG) */}
        <div className="absolute top-3 right-3 bg-black/75 backdrop-blur-md p-1 rounded-lg border border-white/15 flex items-center gap-1 font-mono text-[10px] z-10 shadow-xl">
          <span className="text-slate-400 px-1.5 font-bold tracking-wider">OPTIC:</span>
          <button
            onClick={() => {
              setTacticalViewMode('standard');
              soundFx.playRadioChirp();
            }}
            className={`px-2 py-1 rounded font-black tracking-wider uppercase transition-all ${
              tacticalViewMode === 'standard'
                ? 'bg-orange-500 text-slate-950 shadow-[0_0_8px_rgba(249,115,22,0.6)]'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            HD REAL
          </button>
          <button
            onClick={() => {
              setTacticalViewMode('flir');
              soundFx.playRadioChirp();
            }}
            className={`px-2 py-1 rounded font-black tracking-wider uppercase transition-all ${
              tacticalViewMode === 'flir'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_8px_rgba(6,182,212,0.6)]'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            FLIR THERMAL
          </button>
          <button
            onClick={() => {
              setTacticalViewMode('nvg');
              soundFx.playRadioChirp();
            }}
            className={`px-2 py-1 rounded font-black tracking-wider uppercase transition-all ${
              tacticalViewMode === 'nvg'
                ? 'bg-emerald-500 text-slate-950 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            NVG NIGHT
          </button>
        </div>

        {/* Overlay Tactical Hotkey Call-ins */}
        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none font-mono text-xs">
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={() => triggerTacticalCallin('airstrike')}
              className="px-3 py-1.5 rounded-lg bg-black/60 hover:bg-orange-600/30 border border-white/15 hover:border-orange-500/50 text-slate-200 hover:text-white text-[11px] font-bold flex items-center gap-1.5 backdrop-blur-md transition-colors"
              title="Call in A-10 Thunderbolt Close Air Support (Key: Q)"
            >
              <span className="text-orange-400 font-black">[Q]</span>
              <span>AIRSTRIKE CAS</span>
            </button>
            <button
              onClick={() => triggerTacticalCallin('emp')}
              className="px-3 py-1.5 rounded-lg bg-black/60 hover:bg-orange-600/30 border border-white/15 hover:border-orange-500/50 text-slate-200 hover:text-white text-[11px] font-bold flex items-center gap-1.5 backdrop-blur-md transition-colors"
              title="Trigger EMP Pulse to stall hostile targeting (Key: E)"
            >
              <span className="text-cyan-400 font-black">[E]</span>
              <span>EMP PULSE</span>
            </button>
            <button
              onClick={() => triggerTacticalCallin('artillery')}
              className="px-3 py-1.5 rounded-lg bg-black/60 hover:bg-orange-600/30 border border-white/15 hover:border-orange-500/50 text-slate-200 hover:text-white text-[11px] font-bold flex items-center gap-1.5 backdrop-blur-md transition-colors"
              title="Order 155mm Heavy Artillery Saturation Barrage (Key: R)"
            >
              <span className="text-amber-400 font-black">[R]</span>
              <span>155mm BARRAGE</span>
            </button>
          </div>

          <div className="bg-black/60 border border-white/10 px-3 py-1 rounded-lg text-[11px] text-slate-300 backdrop-blur-md hidden sm:block">
            Ballistic Arc Physics &bull; Ricochets Active &bull; Destructibles Online
          </div>
        </div>

        {/* Victory / Defeat Modal Overlay */}
        {battleResult && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 z-30 font-mono">
            <div className="bg-[#0d1210]/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-6 max-w-md w-full shadow-2xl text-center space-y-4">
              <div className="flex justify-center">
                {battleResult === 'victory' ? (
                  <div className="w-16 h-16 rounded-full bg-orange-600/20 border-2 border-orange-500 flex items-center justify-center animate-bounce shadow-[0_0_20px_rgba(234,88,12,0.4)]">
                    <Award className="w-8 h-8 text-orange-400" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-red-950/80 border-2 border-red-500 flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-red-400" />
                  </div>
                )}
              </div>

              <div>
                <h2
                  className={`text-2xl font-black uppercase tracking-wider italic ${
                    battleResult === 'victory' ? 'text-orange-400' : 'text-red-400'
                  }`}
                >
                  {battleResult === 'victory' ? 'TACTICAL VICTORY' : 'DEFEAT: FALL BACK'}
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  {battleResult === 'victory'
                    ? 'Hostile armor lines eliminated. Battlefield fortifications neutralized with ballistic precision.'
                    : 'Heavy defensive damage sustained. Reorganize squad formation and reinforce armor plating.'}
                </p>
              </div>

              {/* Salvage Rewards if Victory */}
              {battleResult === 'victory' && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-left space-y-1.5 backdrop-blur-md">
                  <div className="text-orange-500 font-black uppercase text-[10px] tracking-wider">
                    Battlefield Salvage Recovered:
                  </div>
                  <div className="flex justify-between text-slate-200 font-bold">
                    <span className="text-blue-400">+800 Fuel</span>
                    <span className="text-red-400">+600 Ammo</span>
                    <span className="text-cyan-400">+500 Alloy</span>
                    <span className="text-yellow-400">+150 Bonds</span>
                  </div>
                </div>
              )}

              {/* Primary Call-to-Action: Open Post-Combat After Action Report with Visual Playback & Deep Metric Analysis */}
              <button
                onClick={handleOpenAARReport}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-950/60 flex items-center justify-center gap-2 border border-orange-400/50 transition-all hover:scale-[1.02] active:scale-95"
              >
                <Activity className="w-4 h-4 text-white animate-pulse" />
                <span>OPEN AFTER-ACTION REPORT // STATS PLAYBACK</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => initCombatArena()}
                  className="flex-1 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-bold text-xs uppercase tracking-wider"
                >
                  REPLAY SIMULATION
                </button>
                <button
                  onClick={() => {
                    initCombatArena();
                    setBattleResult(null);
                  }}
                  className="flex-1 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 font-black text-xs uppercase tracking-widest border border-white/10"
                >
                  CONTINUE
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Deployed Hero Pilots & Combat Assets Roster */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono">
        {/* Friendly Vanguard Pilots */}
        <div className="bg-white/5 backdrop-blur-md border border-emerald-500/20 rounded-xl p-3 shadow-lg">
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-black uppercase text-emerald-400 tracking-wider">
                ALLIED HERO PILOTS ({activeSquad.unitIds.length})
              </span>
            </div>
            <span className="text-[10px] text-slate-400">{activeSquad.name}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {activeSquad.unitIds.map((uid) => {
              const u = units.find((x) => x.id === uid);
              if (!u) return null;
              const pilot = u.pilot || getPilotForUnit(u.id, u.role, u.country, u.name, false);
              const vType = determineVehicleType(u);
              return (
                <div
                  key={uid}
                  className="flex items-center gap-2.5 p-2 rounded-lg bg-black/40 border border-white/10 hover:border-emerald-500/40 transition-colors"
                >
                  <span className="text-xl p-1 rounded-md bg-white/5 border border-white/10 flex-shrink-0">{pilot.avatarIcon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-black text-white truncate">"{pilot.callsign}"</span>
                      <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/50 text-emerald-300 font-bold uppercase">
                        {vType}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-300 truncate">{pilot.name} &bull; {pilot.rank}</div>
                    <div className="text-[9px] text-emerald-400/80 truncate italic">"{pilot.firingCallout}"</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hostile Battlegroup Commanders */}
        <div className="bg-white/5 backdrop-blur-md border border-rose-500/20 rounded-xl p-3 shadow-lg">
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-xs font-black uppercase text-rose-400 tracking-wider">
                HOSTILE RIVAL COMMANDERS
              </span>
            </div>
            <span className="text-[10px] text-slate-400">{rivalCommander.server}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ENEMY_HERO_PILOTS.slice(0, Math.max(4, activeSquad.unitIds.length)).map((pilot) => (
              <div
                key={pilot.id}
                className="flex items-center gap-2.5 p-2 rounded-lg bg-black/40 border border-white/10 hover:border-rose-500/40 transition-colors"
              >
                <span className="text-xl p-1 rounded-md bg-white/5 border border-white/10 flex-shrink-0">{pilot.avatarIcon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-black text-rose-300 truncate">"{pilot.callsign}"</span>
                    <span className="text-[9px] px-1 py-0.5 rounded bg-rose-950/80 border border-rose-700/50 text-rose-300 font-bold uppercase">
                      {pilot.specialty.split(' ')[0]}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-300 truncate">{pilot.name} &bull; {pilot.rank}</div>
                  <div className="text-[9px] text-rose-400/80 truncate italic">"{pilot.firingCallout}"</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5 Squads Quick Switcher for Combat */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-3 flex items-center justify-between gap-2 font-mono text-xs overflow-x-auto shadow-xl">
        <span className="text-orange-500 font-black text-[10px] tracking-widest uppercase whitespace-nowrap">
          SWITCH COMBAT SQUAD:
        </span>
        <div className="flex items-center gap-2">
          {squads.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                onSelectSquad(s.id);
                soundFx.playRadioChirp();
              }}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all border ${
                s.id === activeSquad.id
                  ? 'bg-orange-600 text-white border-orange-400/40 shadow-md shadow-orange-950/40'
                  : 'bg-white/5 text-slate-400 hover:text-white border-white/10 hover:bg-white/10'
              }`}
            >
              {s.name} ({s.totalCombatPower} PWR)
            </button>
          ))}
        </div>
      </div>

      {/* Post-Combat Summary Overlay with Visual Playback & Full Stats Fluctuations Comparison */}
      {showPostCombatOverlay && aarReport && (
        <PostCombatSummaryOverlay
          report={aarReport}
          onClose={() => setShowPostCombatOverlay(false)}
          onReplayBattle={() => {
            setShowPostCombatOverlay(false);
            initCombatArena();
            setBattleRunning(true);
          }}
        />
      )}
    </div>
  );
};
