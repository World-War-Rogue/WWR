import {
  CombatEntity,
  BallisticProjectile,
  GroundCrater,
  FlyingDebris,
  ParticleEffect,
} from '../types';

/**
 * High-Realism Battlefield Visual Renderer
 * Includes:
 * - Animated rotating tank caterpillar treads and suspension rock
 * - Camouflage armor plating with panel highlights, rivets, and thermal vents
 * - Supersonic fighter jet afterburners with Mach shock diamonds, dynamic wing banking, and wingtip vortices
 * - Attack helicopter spinning rotor motion blur, ground downwash dust rings, and steerable FLIR pods
 * - Multi-stage ballistic muzzle blasts, APFSDS sabot darts, rocket exhaust plumes, and brass shell casings
 * - Scorched earth craters, expanding shockwaves, turret toss cookoffs, and tactical thermal FLIR overlay
 */

export type TacticalViewMode = 'standard' | 'flir' | 'nvg';

// Helper: draw ambient drop shadow cast on the ground by vehicles and obstacles
function drawGroundShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  rotation: number = 0,
  intensity: number = 0.38
) {
  ctx.save();
  ctx.translate(x + 4, y + 6);
  ctx.rotate(rotation);
  ctx.fillStyle = `rgba(0, 0, 0, ${intensity})`;
  ctx.beginPath();
  ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Helper: Camouflage pattern splotches
function drawCamouflageSplotches(
  ctx: CanvasRenderingContext2D,
  isPlayer: boolean,
  width: number,
  height: number
) {
  ctx.save();
  ctx.fillStyle = isPlayer ? 'rgba(34, 84, 61, 0.45)' : 'rgba(116, 42, 42, 0.45)';
  ctx.beginPath();
  ctx.ellipse(-width * 0.25, -height * 0.15, width * 0.3, height * 0.25, 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = isPlayer ? 'rgba(20, 50, 36, 0.55)' : 'rgba(74, 20, 20, 0.55)';
  ctx.beginPath();
  ctx.ellipse(width * 0.2, height * 0.2, width * 0.25, height * 0.22, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ==========================================
// 1. MAIN BATTLE TANK (ANIMATED & DETAILED)
// ==========================================
export function drawTank(
  ctx: CanvasRenderingContext2D,
  entity: CombatEntity,
  timeMs: number
) {
  const isPlayer = entity.team === 'player';
  const hullBase = isPlayer ? '#1b4332' : '#5c1d1d'; // Woodland Olive vs Crimson
  const hullHighlight = isPlayer ? '#2d6a4f' : '#7f1d1d';
  const metalTrim = '#1e293b';

  // Recoil & spring oscillation physics
  const recoilOffset = entity.recoil * 5;
  const recoilOscillation = Math.sin(timeMs * 0.03) * (entity.recoil * 1.5);
  const suspensionPitch = (recoilOffset - recoilOscillation);

  // 1. Drop shadow on terrain
  drawGroundShadow(ctx, entity.x, entity.y, 22, 16, entity.headingAngle, 0.45);

  ctx.save();
  ctx.translate(entity.x, entity.y);

  // Suspension recoil pushback
  if (entity.recoil > 0) {
    ctx.translate(-Math.cos(entity.turretAngle) * suspensionPitch, -Math.sin(entity.turretAngle) * suspensionPitch);
  }

  // --- CATERPILLAR TREADS (LEFT & RIGHT) ---
  const treadW = 38;
  const treadH = 8;
  const treadOffset = 11;
  const treadSpeed = entity.speed > 0 ? (timeMs * 0.08) % 6 : 0;

  // Render both left and right tracks
  [-treadOffset, treadOffset].forEach((ty) => {
    // Outer rubberized track belt
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(-treadW / 2, ty - treadH / 2, treadW, treadH, 3);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Animated individual metal track pins / teeth moving
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.2;
    for (let tx = -treadW / 2 + 3; tx < treadW / 2 - 2; tx += 4) {
      const animatedX = ((tx + treadSpeed + treadW / 2) % (treadW - 6)) - treadW / 2 + 3;
      ctx.beginPath();
      ctx.moveTo(animatedX, ty - treadH / 2 + 1);
      ctx.lineTo(animatedX, ty + treadH / 2 - 1);
      ctx.stroke();
    }

    // Road wheels with spinning spokes & center hubs
    for (let wx = -13; wx <= 13; wx += 6.5) {
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(wx, ty, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Wheel center axle nut
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(wx, ty, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Flexible rubber mud flaps (front and rear)
    ctx.fillStyle = '#090d16';
    ctx.fillRect(treadW / 2 - 1, ty - treadH / 2 - 0.5, 3, treadH + 1);
    ctx.fillRect(-treadW / 2 - 2, ty - treadH / 2 - 0.5, 3, treadH + 1);
  });

  // --- TANK HULL & ARMOR PLATING ---
  // Lower chassis
  ctx.fillStyle = hullBase;
  ctx.beginPath();
  ctx.moveTo(-18, -10);
  ctx.lineTo(14, -10);
  ctx.lineTo(19, -6); // Sloped glacis
  ctx.lineTo(19, 6);
  ctx.lineTo(14, 10);
  ctx.lineTo(-18, 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Camouflage texture
  drawCamouflageSplotches(ctx, isPlayer, 34, 18);

  // Sloped Front Glacis Plate with Composite Armor Bevel
  ctx.fillStyle = hullHighlight;
  ctx.beginPath();
  ctx.moveTo(6, -9);
  ctx.lineTo(17, -5);
  ctx.lineTo(17, 5);
  ctx.lineTo(6, 9);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Front Headlights with Glass Lens Gleam
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(17, -7, 1.5, 2);
  ctx.fillRect(17, 5, 1.5, 2);

  // Side-skirt Reactive Armor (ERA) Bricks
  ctx.fillStyle = isPlayer ? '#10b981' : '#f87171';
  for (let ex = -12; ex <= 8; ex += 5) {
    ctx.fillRect(ex, -10, 4, 1.8);
    ctx.fillRect(ex, 8.2, 4, 1.8);
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(ex, -10, 4, 1.8);
    ctx.strokeRect(ex, 8.2, 4, 1.8);
  }

  // Engine Deck Louvers / Exhaust Vents (Rear)
  ctx.fillStyle = metalTrim;
  ctx.fillRect(-16, -6, 8, 12);
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1;
  for (let rx = -15; rx <= -9; rx += 2) {
    ctx.beginPath();
    ctx.moveTo(rx, -5);
    ctx.lineTo(rx, 5);
    ctx.stroke();
  }

  // --- ROTATABLE TURRET, CANNON & ACCESSORIES ---
  ctx.save();
  ctx.rotate(entity.turretAngle);

  // Turret shadow on hull
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 11, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cannon Barrel with Recoil Slide & Thermal Sleeve
  const barrelLen = 27 - entity.recoil * 7;
  const barrelW = 3.6;

  // Barrel tube
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(4, -barrelW / 2, barrelLen, barrelW);
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1;
  ctx.strokeRect(4, -barrelW / 2, barrelLen, barrelW);

  // Bore Evacuator Cylinder (Fume Extractor)
  ctx.fillStyle = '#334155';
  ctx.fillRect(12, -barrelW / 2 - 0.8, 6, barrelW + 1.6);
  ctx.strokeRect(12, -barrelW / 2 - 0.8, 6, barrelW + 1.6);

  // Double-Baffle Muzzle Brake at Tip
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(4 + barrelLen - 3.5, -barrelW / 2 - 1.2, 4.5, barrelW + 2.4);
  // Muzzle brake gas ports
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(4 + barrelLen - 2, -barrelW / 2 - 1, 1, 0.8);
  ctx.fillRect(4 + barrelLen - 2, barrelW / 2 + 0.2, 1, 0.8);

  // Gun Mantlet with Dust Cover
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(1, -5, 6, 10, 2);
  ctx.fill();

  // Angular Turret Armor (Chobham / Leopard 2A7 wedge style)
  ctx.fillStyle = hullHighlight;
  ctx.beginPath();
  ctx.moveTo(-11, -8);
  ctx.lineTo(5, -7);
  ctx.lineTo(9, -3.5);
  ctx.lineTo(9, 3.5);
  ctx.lineTo(5, 7);
  ctx.lineTo(-11, 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Turret Camo
  drawCamouflageSplotches(ctx, isPlayer, 18, 14);

  // Commander's Cupola with Prism Sight Blocks
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(-3, -3, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#475569';
  ctx.stroke();

  // Commander's Independent Thermal Viewer (CITV)
  ctx.fillStyle = isPlayer ? '#38bdf8' : '#f87171';
  ctx.fillRect(1, 2.5, 3, 2.5);

  // Pintle-mounted .50 Cal / Remote Weapon Station (RWS)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-4, -6, 2, 4);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-3, -4);
  ctx.lineTo(5, -4);
  ctx.stroke();

  // Flexible Radio Whip Antenna (Bends and oscillates with recoil)
  const antennaBend = Math.sin(timeMs * 0.02) * 1.5 - entity.recoil * 3;
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-9, 4);
  ctx.quadraticCurveTo(-14 + antennaBend, 6, -18 + antennaBend * 1.5, 5);
  ctx.stroke();

  // --- REALISTIC HIGH-INTENSITY MUZZLE BLAST ---
  if (timeMs - entity.lastMuzzleFlash < 120) {
    const p = (timeMs - entity.lastMuzzleFlash) / 120;
    const blastSize = (1 - p) * 18 + 5;
    const fx = 4 + barrelLen + 2;

    ctx.save();
    ctx.translate(fx, 0);

    // Multi-color radial shockwave flare
    const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, blastSize);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.25, '#fef08a');
    grad.addColorStop(0.6, '#f97316');
    grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, blastSize, 0, Math.PI * 2);
    ctx.fill();

    // Sideways gas expulsion from muzzle brake vents
    ctx.fillStyle = 'rgba(254, 240, 138, 0.85)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-4, -blastSize * 0.8);
    ctx.lineTo(2, -blastSize * 0.9);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-4, blastSize * 0.8);
    ctx.lineTo(2, blastSize * 0.9);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  ctx.restore(); // Restore turret
  ctx.restore(); // Restore tank
}

// ==========================================
// 2. FIGHTER JET / CAS (DYNAMIC BANKING & MACH AFTERBURNERS)
// ==========================================
export function drawAirplane(
  ctx: CanvasRenderingContext2D,
  entity: CombatEntity,
  timeMs: number
) {
  const isPlayer = entity.team === 'player';
  const altitude = entity.altitude || 36;
  const fuselageColor = isPlayer ? '#1e293b' : '#3f1f1f'; // Stealth Slate vs Hostile Carbon
  const wingColor = isPlayer ? '#334155' : '#4a2525';
  const canopyColor = '#38bdf8';

  // 1. Soft Dynamic Elevation Ground Shadow
  drawGroundShadow(
    ctx,
    entity.x + altitude * 0.5,
    entity.y + altitude * 0.8,
    26,
    18,
    entity.headingAngle,
    0.28
  );

  ctx.save();
  // Elevation in 2.5D flight
  ctx.translate(entity.x, entity.y - altitude * 0.35);
  ctx.rotate(entity.headingAngle);

  // Dynamic wing banking into turns
  const bank = entity.bankAngle || Math.sin(timeMs * 0.004 + entity.x) * 0.15;
  ctx.transform(1, 0, 0, Math.cos(bank), 0, 0);

  // --- TWIN SUPERSONIC AFTERBURNERS WITH MACH SHOCK DIAMONDS ---
  const thrustCycle = Math.sin(timeMs * 0.06) * 4;
  const flameLen = 16 + thrustCycle;

  // Twin engine nozzles
  [-3, 3].forEach((ny) => {
    ctx.save();
    // Afterburner outer plume
    const flameGrad = ctx.createLinearGradient(-15, ny, -15 - flameLen, ny);
    flameGrad.addColorStop(0, '#ffffff');
    flameGrad.addColorStop(0.2, '#38bdf8');
    flameGrad.addColorStop(0.55, '#f97316');
    flameGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.moveTo(-15, ny - 2);
    ctx.lineTo(-15 - flameLen, ny);
    ctx.lineTo(-15, ny + 2);
    ctx.closePath();
    ctx.fill();

    // Mach Shock Diamonds (Bright supersonic nodes inside exhaust)
    for (let d = 4; d < flameLen - 3; d += 4) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(-15 - d, ny, 1.2, 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });

  // --- SWEPT WINGS WITH AILERONS & MISSILE PYLONS ---
  ctx.fillStyle = wingColor;
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(-4, -22); // Left wingtip
  ctx.lineTo(-12, -22);
  ctx.lineTo(-8, -5);
  ctx.lineTo(-17, -14); // Left tail stabilizer
  ctx.lineTo(-18, -7);
  ctx.lineTo(-15, -2);
  ctx.lineTo(-15, 2);
  ctx.lineTo(-18, 7);
  ctx.lineTo(-17, 14); // Right tail stabilizer
  ctx.lineTo(-8, 5);
  ctx.lineTo(-12, 22);
  ctx.lineTo(-4, 22); // Right wingtip
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Wingtip Condensation Vortices during maneuvers
  if (Math.abs(bank) > 0.08 || Math.random() < 0.3) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-8, -22);
    ctx.lineTo(-24, -22 + bank * 10);
    ctx.moveTo(-8, 22);
    ctx.lineTo(-24, 22 - bank * 10);
    ctx.stroke();
  }

  // Wingtip Missiles (AIM-9X Sidewinder / R-73)
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(-11, -23, 11, 1.8);
  ctx.fillRect(-11, 21.2, 11, 1.8);
  // Seeker head
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(0, -23, 2, 1.8);
  ctx.fillRect(0, 21.2, 2, 1.8);

  // Under-wing Ordnance Pylons (JDAM / Maverick)
  ctx.fillStyle = '#64748b';
  ctx.fillRect(-4, -13, 8, 2.2);
  ctx.fillRect(-4, 10.8, 8, 2.2);

  // --- FUSELAGE & STEALTH CONTOURING ---
  ctx.fillStyle = fuselageColor;
  ctx.beginPath();
  ctx.moveTo(25, 0); // Sharp needle radome
  ctx.lineTo(14, -4.5);
  ctx.lineTo(-15, -4.5);
  ctx.lineTo(-16, 0);
  ctx.lineTo(-15, 4.5);
  ctx.lineTo(14, 4.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Radome nose tip color
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.moveTo(25, 0);
  ctx.lineTo(19, -2.5);
  ctx.lineTo(19, 2.5);
  ctx.closePath();
  ctx.fill();

  // Cockpit Canopy (Tinted Glass Bubble + HUD Reflection)
  ctx.fillStyle = canopyColor;
  ctx.beginPath();
  ctx.ellipse(6, 0, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Pilot Helmet & Visor
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(5, 0, 1.6, 0, Math.PI * 2);
  ctx.fill();
  // Tinted visor
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(5.5, -0.8, 1, 1.6);

  // Green Head-Up Display (HUD) Glass Gleam
  ctx.fillStyle = 'rgba(74, 222, 128, 0.7)';
  ctx.fillRect(10, -1, 1.5, 2);

  // National / Faction Marking Stripe
  ctx.fillStyle = isPlayer ? '#10b981' : '#ef4444';
  ctx.fillRect(-6, -1.5, 4, 3);

  // 20mm Vulcan Cannon Muzzle Flash
  if (timeMs - entity.lastMuzzleFlash < 80) {
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(27, 0, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ==========================================
// 3. ATTACK HELICOPTER (SPINNING ROTORS & DOWNWASH)
// ==========================================
export function drawHelicopter(
  ctx: CanvasRenderingContext2D,
  entity: CombatEntity,
  timeMs: number
) {
  const isPlayer = entity.team === 'player';
  const altitude = entity.altitude || 24;
  const bodyColor = isPlayer ? '#1b4332' : '#5c1d1d';
  const trimColor = '#0f172a';

  // 1. Rotor Downwash Ground Shadow & Swirling Dust Ring
  const downwashRadius = 24 + Math.sin(timeMs * 0.02) * 2;
  ctx.save();
  ctx.translate(entity.x + altitude * 0.3, entity.y + altitude * 0.6);
  // Swirling dust circle on ground
  ctx.strokeStyle = 'rgba(203, 213, 225, 0.2)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, downwashRadius, downwashRadius * 0.75, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Soft hull shadow
  drawGroundShadow(ctx, 0, 0, 18, 14, entity.headingAngle, 0.32);
  ctx.restore();

  ctx.save();
  ctx.translate(entity.x, entity.y - altitude * 0.3);
  ctx.rotate(entity.headingAngle);

  // Hover vibration
  const hoverBob = Math.sin(timeMs * 0.009 + entity.x) * 1.5;
  ctx.translate(0, hoverBob);

  // Tubular Landing Skids & Heavy Struts
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  // Left and right skids
  ctx.moveTo(-12, -10);
  ctx.lineTo(9, -10);
  ctx.moveTo(-12, 10);
  ctx.lineTo(9, 10);
  // Struts
  ctx.moveTo(-6, -6);
  ctx.lineTo(-6, -10);
  ctx.moveTo(5, -6);
  ctx.lineTo(5, -10);
  ctx.moveTo(-6, 6);
  ctx.lineTo(-6, 10);
  ctx.moveTo(5, 6);
  ctx.lineTo(5, 10);
  ctx.stroke();

  // Stub Weapon Wings
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-5, -15, 8, 30);
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1;
  ctx.strokeRect(-5, -15, 8, 30);

  // 19-Tube Hydra 70 Rocket Pods & AGM-114 Hellfire Rails
  // Left Pods
  ctx.fillStyle = '#64748b';
  ctx.fillRect(-3, -18, 7, 4);
  // Right Pods
  ctx.fillRect(-3, 14, 7, 4);
  // Missile seeker tips
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(4, -18, 1.5, 4);
  ctx.fillRect(4, 14, 1.5, 4);

  // Tail Boom Assembly
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.moveTo(-7, -3.5);
  ctx.lineTo(-27, -1.8);
  ctx.lineTo(-27, 1.8);
  ctx.lineTo(-7, 3.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Vertical Tail Fin
  ctx.fillStyle = isPlayer ? '#10b981' : '#f87171';
  ctx.fillRect(-29, -1, 4, 10);

  // High-Speed Spinning Tail Rotor (Animated blur disc)
  const tailRotorSpin = timeMs * 0.08;
  ctx.save();
  ctx.translate(-28, 8);
  ctx.rotate(tailRotorSpin);
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.8)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.lineTo(6, 0);
  ctx.stroke();
  ctx.restore();

  // Main Helicopter Tandem Fuselage
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.moveTo(16, 0); // Nose
  ctx.lineTo(10, -6);
  ctx.lineTo(-9, -6);
  ctx.lineTo(-9, 6);
  ctx.lineTo(10, 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Camouflage
  drawCamouflageSplotches(ctx, isPlayer, 22, 12);

  // Tandem Canopy (Gunner Front, Pilot Rear)
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.roundRect(3, -3, 10, 6, 2.5);
  ctx.fill();
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Pilot Silhouettes
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(5, 0, 1.3, 0, Math.PI * 2); // Pilot
  ctx.arc(10, 0, 1.3, 0, Math.PI * 2); // Gunner
  ctx.fill();

  // Rotating FLIR / TADS Targeting Ball on Nose
  ctx.save();
  ctx.translate(16, 0);
  ctx.rotate(entity.turretAngle - entity.headingAngle);
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(1.5, -1, 1.5, 2);
  ctx.restore();

  // Chin-Mounted 30mm M230 Chain Gun (Aims dynamically)
  ctx.save();
  ctx.translate(13, 0);
  ctx.rotate(entity.turretAngle - entity.headingAngle);
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, -1, 10, 2);
  ctx.restore();

  // --- HIGH-FIDELITY MAIN ROTOR DISC WITH MOTION BLUR ---
  const rotorSpin = entity.rotorAngle || (timeMs * 0.035) % (Math.PI * 2);
  ctx.save();
  ctx.translate(-1, 0);

  // 1. Semi-transparent rotor motion blur disc
  ctx.fillStyle = 'rgba(226, 232, 240, 0.12)';
  ctx.beginPath();
  ctx.arc(0, 0, 29, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 2. 4 High-Speed Blades
  ctx.rotate(rotorSpin);
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 0.8;
  for (let b = 0; b < 4; b++) {
    ctx.save();
    ctx.rotate((b * Math.PI) / 2);
    // Blade airfoil
    ctx.fillRect(2, -1.4, 27, 2.8);
    ctx.strokeRect(2, -1.4, 27, 2.8);
    // High-visibility yellow blade tip
    ctx.fillStyle = '#fde047';
    ctx.fillRect(25, -1.4, 4, 2.8);
    ctx.restore();
  }

  // Rotor Mast Hub & Swashplate Links
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

// ==========================================
// 4. INFANTRY FIGHTING VEHICLE (IFV)
// ==========================================
export function drawIFV(
  ctx: CanvasRenderingContext2D,
  entity: CombatEntity,
  timeMs: number
) {
  const isPlayer = entity.team === 'player';
  const hullColor = isPlayer ? '#1e3a2b' : '#5c1d1d';

  drawGroundShadow(ctx, entity.x, entity.y, 20, 14, entity.headingAngle, 0.42);

  ctx.save();
  ctx.translate(entity.x, entity.y);

  // 8 Heavy Combat Wheels / Track Pods
  ctx.fillStyle = '#0f172a';
  for (let wx = -12; wx <= 12; wx += 8) {
    ctx.fillRect(wx - 3, -11, 6, 3.5);
    ctx.fillRect(wx - 3, 7.5, 6, 3.5);
  }

  // Chassis
  ctx.fillStyle = hullColor;
  ctx.beginPath();
  ctx.moveTo(-16, -9);
  ctx.lineTo(13, -9);
  ctx.lineTo(17, -5);
  ctx.lineTo(17, 5);
  ctx.lineTo(13, 9);
  ctx.lineTo(-16, 9);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Camouflage
  drawCamouflageSplotches(ctx, isPlayer, 30, 16);

  // Turret with Autocannon & Anti-Tank Missile Box
  ctx.save();
  ctx.rotate(entity.turretAngle);

  // Rapid 30mm Autocannon Barrel
  const barrelLen = 19 - entity.recoil * 4;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(3, -1.2, barrelLen, 2.4);

  // Dual ATGM Launcher Pod on Turret Side
  ctx.fillStyle = '#334155';
  ctx.fillRect(-2, -7, 8, 4);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(6, -6.5, 1.5, 3); // Missile cap

  // Turret body
  ctx.fillStyle = isPlayer ? '#2d6a4f' : '#7f1d1d';
  ctx.beginPath();
  ctx.roundRect(-7, -5, 13, 10, 2);
  ctx.fill();
  ctx.stroke();

  // Muzzle flash
  if (timeMs - entity.lastMuzzleFlash < 70) {
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(3 + barrelLen + 2, 0, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  ctx.restore();
}

// ==========================================
// 5. SELF-PROPELLED ARTILLERY & SAMS
// ==========================================
export function drawArtillery(
  ctx: CanvasRenderingContext2D,
  entity: CombatEntity,
  timeMs: number
) {
  const isPlayer = entity.team === 'player';
  const hullColor = isPlayer ? '#1e3a2b' : '#5c1d1d';

  drawGroundShadow(ctx, entity.x, entity.y, 24, 16, entity.headingAngle, 0.45);

  ctx.save();
  ctx.translate(entity.x, entity.y);

  // Heavy Treads
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-17, -11, 34, 4.5);
  ctx.fillRect(-17, 6.5, 34, 4.5);

  // Heavy Hull
  ctx.fillStyle = hullColor;
  ctx.beginPath();
  ctx.roundRect(-16, -8, 32, 16, 2);
  ctx.fill();
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Enormous 155mm Howitzer Cannon with Hydraulic Dampers
  ctx.save();
  ctx.rotate(entity.turretAngle);

  const barrelLen = 33 - entity.recoil * 9;
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(4, -2.8, barrelLen, 5.6);
  // Hydraulic recoil slide cylinders
  ctx.fillStyle = '#64748b';
  ctx.fillRect(4, -4.5, 8, 1.5);
  ctx.fillRect(4, 3, 8, 1.5);

  // Heavy Double-Baffle Muzzle Brake
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(4 + barrelLen - 4.5, -4.5, 6, 9);

  // Massive Boxy Turret
  ctx.fillStyle = isPlayer ? '#2d6a4f' : '#7f1d1d';
  ctx.beginPath();
  ctx.roundRect(-11, -8, 20, 16, 2);
  ctx.fill();
  ctx.stroke();

  // Heavy Artillery Blast Flash
  if (timeMs - entity.lastMuzzleFlash < 140) {
    const p = (timeMs - entity.lastMuzzleFlash) / 140;
    ctx.fillStyle = `rgba(249, 115, 22, ${1 - p})`;
    ctx.beginPath();
    ctx.arc(4 + barrelLen + 6, 0, (1 - p) * 20 + 6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  ctx.restore();
}

export function drawSAM(
  ctx: CanvasRenderingContext2D,
  entity: CombatEntity,
  timeMs: number
) {
  const isPlayer = entity.team === 'player';
  const hullColor = isPlayer ? '#1b4332' : '#5c1d1d';

  drawGroundShadow(ctx, entity.x, entity.y, 22, 15, entity.headingAngle, 0.42);

  ctx.save();
  ctx.translate(entity.x, entity.y);

  // 8x8 Heavy Transport Chassis
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-16, -10, 32, 4);
  ctx.fillRect(-16, 6, 32, 4);

  ctx.fillStyle = hullColor;
  ctx.fillRect(-15, -7, 30, 14);
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-15, -7, 30, 14);

  // Rotating Search & Acquisition 3D Radar Dish
  const radarAngle = timeMs * 0.005;
  ctx.save();
  ctx.translate(-7, 0);
  ctx.rotate(radarAngle);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(0, 0, 6, -Math.PI / 3, Math.PI / 3);
  ctx.stroke();
  // Radar beam active sweep glow
  ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, 16, -Math.PI / 5, Math.PI / 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Elevating Quad-Cell Surface-to-Air Missile Launcher Rack
  ctx.save();
  ctx.rotate(entity.turretAngle);
  ctx.fillStyle = '#334155';
  ctx.fillRect(-3, -7, 18, 14);
  ctx.strokeStyle = '#020617';
  ctx.strokeRect(-3, -7, 18, 14);

  // 4 Guided Missile Canisters with Warheads
  [-5, -2, 1, 4].forEach((my) => {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(15, my, 4, 2);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(19, my, 2, 2);
  });
  ctx.restore();

  ctx.restore();
}

export function drawMissileLauncher(
  ctx: CanvasRenderingContext2D,
  entity: CombatEntity,
  timeMs: number
) {
  const isPlayer = entity.team === 'player';
  const hullColor = isPlayer ? '#1b4332' : '#5c1d1d';

  drawGroundShadow(ctx, entity.x, entity.y, 26, 16, entity.headingAngle, 0.45);

  ctx.save();
  ctx.translate(entity.x, entity.y);

  // 10x10 Heavy All-Terrain Transport Wheels
  ctx.fillStyle = '#0f172a';
  for (let i = -16; i <= 16; i += 8) {
    ctx.fillRect(i - 2, -11, 5, 3);
    ctx.fillRect(i - 2, 8, 5, 3);
  }

  // Heavy Armored Cab & Cargo Chassis
  ctx.fillStyle = hullColor;
  ctx.fillRect(-18, -8, 36, 16);
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-18, -8, 36, 16);

  // Front Armored Windshield
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(11, -6, 4, 12);

  // Hydraulic Outrigger Stabilizers
  ctx.fillStyle = '#475569';
  ctx.fillRect(-10, -12, 4, 3);
  ctx.fillRect(-10, 9, 4, 3);
  ctx.fillRect(4, -12, 4, 3);
  ctx.fillRect(4, 9, 4, 3);

  // Rotating Datalink / Phased Array Dish
  ctx.save();
  ctx.translate(6, 0);
  ctx.rotate(timeMs * 0.004);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI);
  ctx.stroke();
  ctx.restore();

  // Heavy Guided Missile Launch Canister / Pod (Traversing & Elevating)
  ctx.save();
  ctx.rotate(entity.turretAngle);
  const recoilOffset = (entity.recoil || 0) * 0.4;
  ctx.translate(-recoilOffset, 0);

  // Heavy Canister Block (e.g. Patriot / HIMARS / S-400 / Iskander)
  ctx.fillStyle = '#334155';
  ctx.fillRect(-14, -8, 26, 16);
  ctx.strokeStyle = '#020617';
  ctx.strokeRect(-14, -8, 26, 16);

  // Warning Stripes & Vent Grids
  ctx.fillStyle = '#eab308';
  ctx.fillRect(8, -8, 3, 16);
  ctx.fillStyle = '#020617';
  ctx.fillRect(9, -8, 1, 16);

  // Twin Heavy Missile Launch Caps
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(12, -4, 3, 0, Math.PI * 2);
  ctx.arc(12, 4, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(12, -4, 1.2, 0, Math.PI * 2);
  ctx.arc(12, 4, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Blast Exhaust Shield at rear
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-16, -9, 3, 18);

  // Launch Backblast Plume when firing
  if (timeMs - entity.lastMuzzleFlash < 180) {
    const p = (timeMs - entity.lastMuzzleFlash) / 180;
    // Front missile launch flare
    ctx.fillStyle = `rgba(255, 255, 255, ${1 - p})`;
    ctx.beginPath();
    ctx.arc(18, 0, (1 - p) * 16 + 5, 0, Math.PI * 2);
    ctx.fill();
    // Rear rocket exhaust plume
    ctx.fillStyle = `rgba(249, 115, 22, ${(1 - p) * 0.8})`;
    ctx.beginPath();
    ctx.arc(-22, 0, (1 - p) * 20 + 6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  ctx.restore();
}

export function drawWarship(
  ctx: CanvasRenderingContext2D,
  entity: CombatEntity,
  timeMs: number
) {
  const isPlayer = entity.team === 'player';

  ctx.save();
  ctx.translate(entity.x, entity.y);

  // Water Wake & Stern Propeller Wash
  const waveSin = Math.sin(timeMs * 0.007 + entity.x);
  ctx.fillStyle = 'rgba(224, 242, 254, 0.35)';
  ctx.beginPath();
  // Bow wave
  ctx.moveTo(28, 0);
  ctx.lineTo(16, -15 + waveSin * 1.5);
  ctx.lineTo(-24, -14);
  ctx.lineTo(-26, 0);
  ctx.lineTo(-24, 14);
  ctx.lineTo(16, 15 - waveSin * 1.5);
  ctx.closePath();
  ctx.fill();

  // Stern wake spray
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.beginPath();
  ctx.arc(-26, 0, 6 + waveSin * 2, 0, Math.PI * 2);
  ctx.fill();

  // Sleek Stealth Warship Hull (Angled Tumblehome / Flare Bow)
  ctx.fillStyle = '#475569'; // Haze gray
  ctx.beginPath();
  ctx.moveTo(25, 0); // Pointed Bow
  ctx.lineTo(12, -9);
  ctx.lineTo(-22, -9);
  ctx.lineTo(-24, -6);
  ctx.lineTo(-24, 6);
  ctx.lineTo(-22, 9);
  ctx.lineTo(12, 9);
  ctx.closePath();
  ctx.fill();

  // Hull Armor & Border
  ctx.strokeStyle = isPlayer ? '#166534' : '#991b1b';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Forward VLS (Vertical Launch System) Missile Cells (Mk 41)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(2, -5, 8, 10);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(2, -5, 8, 10);
  // VLS grid hatches
  ctx.fillStyle = '#334155';
  ctx.fillRect(3, -4, 3, 3);
  ctx.fillRect(3, 1, 3, 3);
  ctx.fillRect(6, -4, 3, 3);
  ctx.fillRect(6, 1, 3, 3);

  // Angled Superstructure & Integrated Mast
  ctx.fillStyle = '#334155';
  ctx.fillRect(-12, -6, 12, 12);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.strokeRect(-12, -6, 12, 12);

  // Bridge Windows with Glare
  ctx.fillStyle = '#0ea5e9';
  ctx.fillRect(-2, -4, 2, 8);

  // Rotating Phased-Array Air Search Radar Scanner
  ctx.save();
  ctx.translate(-6, 0);
  ctx.rotate(timeMs * 0.005);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-4, 0);
  ctx.lineTo(4, 0);
  ctx.stroke();
  ctx.restore();

  // Aft Phalanx CIWS 20mm Mount
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(-16, 0, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Forward 5-inch (127mm) Stealth Naval Gun Turret (Traversing)
  ctx.save();
  ctx.translate(14, 0);
  ctx.rotate(entity.turretAngle);
  const gunRecoil = (entity.recoil || 0) * 0.5;

  // Gun Barrel
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-gunRecoil, 0);
  ctx.lineTo(12 - gunRecoil, 0);
  ctx.stroke();

  // Stealth Turret Cupola
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(4, 0);
  ctx.lineTo(-3, -4);
  ctx.lineTo(-5, 0);
  ctx.lineTo(-3, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Naval Gun Muzzle Flash
  if (timeMs - entity.lastMuzzleFlash < 140) {
    const p = (timeMs - entity.lastMuzzleFlash) / 140;
    ctx.fillStyle = `rgba(255, 237, 213, ${1 - p})`;
    ctx.beginPath();
    ctx.arc(14, 0, (1 - p) * 16 + 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  ctx.restore();
}

export function drawSubmarine(
  ctx: CanvasRenderingContext2D,
  entity: CombatEntity,
  timeMs: number
) {
  const isPlayer = entity.team === 'player';
  ctx.save();
  ctx.translate(entity.x, entity.y);
  ctx.rotate(entity.headingAngle);

  // Submerged Hydrodynamic Water Ripple / Cavitation wake
  const wakeDist = 20 + Math.sin(timeMs * 0.01 + entity.x) * 4;
  ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
  ctx.beginPath();
  ctx.ellipse(-20, 0, wakeDist, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Streamlined Cylindrical Teardrop Pressure Hull
  ctx.fillStyle = isPlayer ? '#0f291e' : '#1e1111'; // Dark tactical anechoic tile coating
  ctx.beginPath();
  ctx.moveTo(26, 0); // Rounded hydrodynamic bow dome
  ctx.bezierCurveTo(24, -8, 12, -10, -16, -10);
  ctx.bezierCurveTo(-26, -10, -30, -5, -32, 0); // Tapered stern
  ctx.bezierCurveTo(-30, 5, -26, 10, -16, 10);
  ctx.bezierCurveTo(12, 10, 24, 8, 26, 0);
  ctx.closePath();
  ctx.fill();

  // Anechoic Rubber Tile Border
  ctx.strokeStyle = isPlayer ? '#059669' : '#b91c1c';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Bow Sonar Sphere Dome & Torpedo Tube Shutters
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.arc(22, 0, 4, -Math.PI / 2, Math.PI / 2);
  ctx.fill();
  // Torpedo tube port/starboard indicators
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(16, -7, 4, 2);
  ctx.fillRect(16, 5, 4, 2);

  // Vertical Launch System (VPM) Tomahawk Missile Hatches (midship)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-6, -6, 10, 12);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-6, -6, 10, 12);
  // Missile hatches dots
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(-2, -3, 1.2, 0, Math.PI * 2);
  ctx.arc(-2, 3, 1.2, 0, Math.PI * 2);
  ctx.arc(2, -3, 1.2, 0, Math.PI * 2);
  ctx.arc(2, 3, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Conning Tower / Sail (Hydrodynamic Fin with Photonics Mast & Periscope)
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(4, -4, 10, 8, 2);
  ctx.fill();
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Periscope / Optronic Mast Glint
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(10, 0, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Stern X-Stern Rudders and Shrouded Pump-Jet Propulsor
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-35, -7, 5, 14);
  // Propulsor cavitation bubbles
  const bubbleOffset = (timeMs * 0.08) % 12;
  ctx.fillStyle = 'rgba(147, 197, 253, 0.4)';
  ctx.beginPath();
  ctx.arc(-36 - bubbleOffset, 0, 2, 0, Math.PI * 2);
  ctx.arc(-42 - bubbleOffset * 0.6, -2, 1.5, 0, Math.PI * 2);
  ctx.arc(-42 - bubbleOffset * 0.6, 2, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Sonar Pulse Ping Ring Animation (undersea acoustic signature)
  const pingPhase = (timeMs * 0.002 + entity.x * 0.01) % 1;
  ctx.strokeStyle = `rgba(56, 189, 248, ${(1 - pingPhase) * 0.5})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(20, 0, pingPhase * 36 + 6, 0, Math.PI * 2);
  ctx.stroke();

  // Torpedo launch flash
  if (timeMs - entity.lastMuzzleFlash < 180) {
    const p = (timeMs - entity.lastMuzzleFlash) / 180;
    ctx.fillStyle = `rgba(56, 189, 248, ${1 - p})`;
    ctx.beginPath();
    ctx.arc(26, 0, (1 - p) * 14 + 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function drawDrone(
  ctx: CanvasRenderingContext2D,
  entity: CombatEntity,
  timeMs: number
) {
  const isPlayer = entity.team === 'player';
  ctx.save();
  ctx.translate(entity.x, entity.y);
  ctx.rotate(entity.headingAngle);

  // High-altitude ground shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(-4, 18, 16, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // High-aspect-ratio slender wings (like Reaper / Bayraktar TB2)
  ctx.fillStyle = isPlayer ? '#1e293b' : '#3f1515';
  ctx.beginPath();
  ctx.moveTo(2, -26);
  ctx.lineTo(8, -24);
  ctx.lineTo(4, 0);
  ctx.lineTo(8, 24);
  ctx.lineTo(2, 26);
  ctx.lineTo(-4, 24);
  ctx.lineTo(-2, 0);
  ctx.lineTo(-4, -24);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = isPlayer ? '#38bdf8' : '#ef4444';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Fuselage (Bulbous SATCOM dome forward, slender tail aft)
  ctx.fillStyle = isPlayer ? '#0f172a' : '#1e1111';
  ctx.beginPath();
  ctx.moveTo(18, 0); // Nose
  ctx.bezierCurveTo(16, -6, 6, -6, -8, -4);
  ctx.lineTo(-18, -2);
  ctx.lineTo(-18, 2);
  ctx.lineTo(-8, 4);
  ctx.bezierCurveTo(6, 6, 16, 6, 18, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = isPlayer ? '#10b981' : '#f87171';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Inverted V-Tail (V-rudder stabilizers)
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.moveTo(-16, 0);
  ctx.lineTo(-24, -9);
  ctx.lineTo(-22, -10);
  ctx.lineTo(-14, -1);
  ctx.lineTo(-14, 1);
  ctx.lineTo(-22, 10);
  ctx.lineTo(-24, 9);
  ctx.closePath();
  ctx.fill();

  // Spinning Pusher Propeller at Aft
  ctx.save();
  ctx.translate(-19, 0);
  ctx.rotate(timeMs * 0.05);
  ctx.strokeStyle = 'rgba(248, 250, 252, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.lineTo(0, 9);
  ctx.stroke();
  ctx.restore();

  // Underside EO/IR Gimbal Turret (Optical & Thermal Sensor Ball)
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.arc(12, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Targeting Laser Designator Beam Pulse
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(15, 0);
  ctx.lineTo(45, 0);
  ctx.stroke();
  ctx.setLineDash([]);

  // Wing Hardpoint Hellfire / MAM-L Missiles
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(-2, -14, 8, 2.5);
  ctx.fillRect(-2, 11.5, 8, 2.5);

  // Firing flash
  if (timeMs - entity.lastMuzzleFlash < 140) {
    const p = (timeMs - entity.lastMuzzleFlash) / 140;
    ctx.fillStyle = `rgba(254, 240, 138, ${1 - p})`;
    ctx.beginPath();
    ctx.arc(18, 0, (1 - p) * 12 + 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function drawCombatVehicle(
  ctx: CanvasRenderingContext2D,
  entity: CombatEntity,
  timeMs: number
) {
  switch (entity.vehicleType) {
    case 'airplane':
      drawAirplane(ctx, entity, timeMs);
      break;
    case 'helicopter':
      drawHelicopter(ctx, entity, timeMs);
      break;
    case 'ifv':
      drawIFV(ctx, entity, timeMs);
      break;
    case 'artillery':
      drawArtillery(ctx, entity, timeMs);
      break;
    case 'sam':
      drawSAM(ctx, entity, timeMs);
      break;
    case 'missile':
      drawMissileLauncher(ctx, entity, timeMs);
      break;
    case 'ship':
      drawWarship(ctx, entity, timeMs);
      break;
    case 'submarine':
      drawSubmarine(ctx, entity, timeMs);
      break;
    case 'drone':
      drawDrone(ctx, entity, timeMs);
      break;
    case 'tank':
    default:
      drawTank(ctx, entity, timeMs);
      break;
  }
}

// ==========================================
// 6. BALLISTIC PROJECTILES & TRACERS
// ==========================================
export function drawRealisticMissile(
  ctx: CanvasRenderingContext2D,
  proj: BallisticProjectile,
  timeMs: number
) {
  ctx.save();
  ctx.translate(proj.currentX, proj.currentY - proj.currentHeight);
  ctx.rotate(proj.flightAngle);

  // Blazing Rocket Motor Flare & Afterburning Exhaust
  const flameLen = 11 + Math.sin(timeMs * 0.05 + proj.startX) * 4;
  const grad = ctx.createLinearGradient(-3, 0, -3 - flameLen, 0);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.25, '#fde047');
  grad.addColorStop(0.65, '#f97316');
  grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-3, -2.2);
  ctx.lineTo(-3 - flameLen, 0);
  ctx.lineTo(-3, 2.2);
  ctx.closePath();
  ctx.fill();

  // Missile Fuselage (Pointed Radome & Cylindrical Body)
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(10, 0); // Pointed warhead tip
  ctx.lineTo(7, -2);
  ctx.lineTo(-3, -2);
  ctx.lineTo(-3, 2);
  ctx.lineTo(7, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Red/Orange Guidance Ring
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(4, -2, 1.8, 4);

  // Stabilizing Tail Fins (Cruciform)
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.moveTo(-1, -2);
  ctx.lineTo(-4, -6);
  ctx.lineTo(-5, -2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-1, 2);
  ctx.lineTo(-4, 6);
  ctx.lineTo(-5, 2);
  ctx.fill();

  ctx.restore();
}

export function drawRealisticTracer(
  ctx: CanvasRenderingContext2D,
  proj: BallisticProjectile
) {
  ctx.save();
  ctx.translate(proj.currentX, proj.currentY - proj.currentHeight);
  ctx.rotate(proj.flightAngle);

  if (proj.projectileType === 'tank_shell') {
    // Heavy APFSDS Sabot Dart
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-7, -1.5, 14, 3);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(-15, -1, 9, 2);

    // Supersonic shockwave envelope
    ctx.strokeStyle = 'rgba(253, 224, 71, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.lineTo(-10, -5);
    ctx.moveTo(7, 0);
    ctx.lineTo(-10, 5);
    ctx.stroke();
  } else if (proj.projectileType === 'artillery_shell') {
    // Parabolic High-Explosive Shell
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(249, 115, 22, 0.6)';
    ctx.fillRect(-12, -2, 8, 4);
  } else if (proj.projectileType === 'railgun') {
    // Hypersonic Cyan Bolt
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#0284c7';
    ctx.shadowBlur = 10;
    ctx.fillRect(-12, -1.5, 24, 3);
  } else {
    // Rapid Autocannon / Machine Gun Bullet Tracer
    const tracerLen = 12;
    const grad = ctx.createLinearGradient(tracerLen, 0, -tracerLen, 0);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.35, '#fef08a');
    grad.addColorStop(0.75, '#f97316');
    grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(-tracerLen, -1.5, tracerLen * 2, 3, 1.5);
    ctx.fill();
  }

  ctx.restore();
}

// ==========================================
// 7. PARTICLES, SHOCKWAVES & BRASS CASINGS
// ==========================================
export function drawAdvancedParticle(
  ctx: CanvasRenderingContext2D,
  part: ParticleEffect
) {
  const lifeRatio = part.life / part.maxLife;
  const alpha = 1 - lifeRatio;

  ctx.save();

  if (part.type === 'casing') {
    // Tumbling Brass Bullet / Shell Casing
    ctx.translate(part.x, part.y);
    ctx.rotate(part.angle || 0);
    ctx.fillStyle = '#fbbf24'; // Brass gold
    ctx.fillRect(-3, -1.2, 6, 2.4);
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(-3, -1.2, 6, 2.4);
  } else if (part.type === 'shockwave') {
    // Expanding Pressure Wave Distortion Ring
    const radius = (part.maxRadius || 60) * lifeRatio;
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.65})`;
    ctx.lineWidth = Math.max(1, 4 * (1 - lifeRatio));
    ctx.beginPath();
    ctx.arc(part.x, part.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  } else if (part.type === 'flare') {
    // Magnesium Countermeasure Flare with glowing spark
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#f97316';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
    ctx.fill();
  } else if (part.type === 'smoke') {
    // Billowing Volumetric Smoke
    ctx.fillStyle = part.color;
    ctx.beginPath();
    ctx.arc(part.x, part.y, part.size * (1 + lifeRatio * 1.5), 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Fire / Shrapnel / Sparks
    ctx.fillStyle = part.color;
    ctx.beginPath();
    ctx.arc(part.x, part.y, part.size * (1 - lifeRatio), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ==========================================
// 8. BLAST CRATERS & DEBRIS
// ==========================================
export function drawBlastCrater(
  ctx: CanvasRenderingContext2D,
  crater: GroundCrater
) {
  ctx.save();
  ctx.translate(crater.x, crater.y);

  // Outer scorched soot rim
  const grad = ctx.createRadialGradient(0, 0, crater.radius * 0.2, 0, 0, crater.radius);
  grad.addColorStop(0, 'rgba(15, 23, 42, 0.9)');
  grad.addColorStop(0.5, 'rgba(30, 41, 59, 0.7)');
  grad.addColorStop(0.85, 'rgba(120, 53, 15, 0.4)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, crater.radius, 0, Math.PI * 2);
  ctx.fill();

  // Inner blast hole with glowing embers
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.arc(0, 0, crater.radius * 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawFlyingDebrisItem(
  ctx: CanvasRenderingContext2D,
  debris: FlyingDebris
) {
  ctx.save();
  // Shadow on ground
  drawGroundShadow(ctx, debris.x, debris.y + debris.z * 0.7, debris.size, debris.size * 0.6, debris.angle, 0.35);

  // Flying object (elevated by z)
  ctx.translate(debris.x, debris.y - debris.z);
  ctx.rotate(debris.angle);

  if (debris.type === 'turret') {
    // Flying detached tank turret with burning flame
    ctx.fillStyle = debris.team === 'player' ? '#1b4332' : '#5c1d1d';
    ctx.beginPath();
    ctx.roundRect(-debris.size, -debris.size * 0.7, debris.size * 2, debris.size * 1.4, 3);
    ctx.fill();
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Detached barrel stub
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(debris.size - 2, -2, debris.size * 0.9, 4);

    // Billowing fire plume from turret ring
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Twisted burning armor plate chunk
    ctx.fillStyle = '#334155';
    ctx.fillRect(-debris.size / 2, -debris.size / 2, debris.size, debris.size);
  }

  ctx.restore();
}

// ==========================================
// 9. HERO PILOT OVERLAY BADGES & HUD
// ==========================================
export function drawHeroPilotOverlay(
  ctx: CanvasRenderingContext2D,
  entity: CombatEntity,
  timeMs: number
) {
  if (entity.destroyed) return;

  const isPlayer = entity.team === 'player';
  const altitudeOffset = entity.vehicleType === 'airplane' ? 36 : entity.vehicleType === 'helicopter' ? 24 : 0;
  const baseY = entity.y - altitudeOffset;

  ctx.save();

  // Health bar
  const barW = 44;
  const barH = 4.5;
  const barX = entity.x - barW / 2;
  const barY = baseY - 24;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.beginPath();
  ctx.roundRect(barX - 1, barY - 1, barW + 2, barH + 2, 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  const hpPct = Math.max(0, entity.hp / entity.maxHp);
  const hpColor = hpPct > 0.5 ? (isPlayer ? '#10b981' : '#ef4444') : hpPct > 0.25 ? '#f59e0b' : '#dc2626';
  ctx.fillStyle = hpColor;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW * hpPct, barH, 1.5);
  ctx.fill();

  // Pilot callsign pill badge
  const pilot = entity.pilot;
  const pilotBadgeY = barY - 13;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.strokeStyle = isPlayer ? 'rgba(52, 211, 153, 0.5)' : 'rgba(248, 113, 113, 0.5)';
  ctx.lineWidth = 1;

  ctx.font = 'bold 9px monospace';
  const pilotLabel = `${pilot.avatarIcon} ${pilot.rank.slice(0, 4)}. "${pilot.callsign}"`;
  const textMetrics = ctx.measureText(pilotLabel);
  const badgeW = Math.max(52, textMetrics.width + 10);
  const badgeX = entity.x - badgeW / 2;

  ctx.beginPath();
  ctx.roundRect(badgeX, pilotBadgeY - 8, badgeW, 13, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isPlayer ? '#6ee7b7' : '#fca5a5';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(pilotLabel, entity.x, pilotBadgeY - 1.5);

  // Model name tag
  ctx.font = '9px monospace';
  ctx.fillStyle = '#cbd5e1';
  ctx.textAlign = 'center';
  ctx.fillText(entity.name.split(' ')[0], entity.x, entity.y + 24);

  // Speech bubble callouts
  if (entity.speechBubble && timeMs < entity.speechBubble.expiresAt) {
    const bubbleText = entity.speechBubble.text;
    ctx.font = 'bold 10px monospace';
    const bubbleW = ctx.measureText(bubbleText).width + 16;
    const bubbleH = 18;
    const bubbleX = entity.x - bubbleW / 2;
    const bubbleY = pilotBadgeY - 26;

    ctx.fillStyle = isPlayer ? 'rgba(6, 78, 59, 0.95)' : 'rgba(127, 29, 29, 0.95)';
    ctx.strokeStyle = isPlayer ? '#34d399' : '#f87171';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 5);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(entity.x - 3, bubbleY + bubbleH);
    ctx.lineTo(entity.x, bubbleY + bubbleH + 4);
    ctx.lineTo(entity.x + 3, bubbleY + bubbleH);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(bubbleText, entity.x, bubbleY + bubbleH / 2);
  }

  ctx.restore();
}

// ==========================================
// 10. TACTICAL HUD & THERMAL FLIR POST-PROCESSING
// ==========================================
export function applyTacticalViewMode(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  mode: TacticalViewMode,
  timeMs: number
) {
  if (mode === 'standard') return;

  ctx.save();
  if (mode === 'flir') {
    // Thermal White-Hot / Black-Hot military overlay
    ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
    ctx.fillRect(0, 0, width, height);

    // FLIR crosshair reticle
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(width / 2, 40);
    ctx.lineTo(width / 2, height - 40);
    ctx.moveTo(60, height / 2);
    ctx.lineTo(width - 60, height / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Telemetry text
    ctx.font = '10px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText('OPTIC: FLIR 12.8X [WHITE HOT]', 20, 25);
    ctx.fillText('FOV: 32.4° // STAB: ACTIVE', 20, 40);
    ctx.textAlign = 'right';
    ctx.fillText(`AZ: ${(Math.round(timeMs * 0.05) % 360).toString().padStart(3, '0')}° // EL: +02°`, width - 20, 25);
  } else if (mode === 'nvg') {
    // Green Phosphor Night Vision
    ctx.fillStyle = 'rgba(22, 101, 52, 0.22)';
    ctx.fillRect(0, 0, width, height);

    // Faint CRT scanlines
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    for (let y = 0; y < height; y += 4) {
      ctx.fillRect(0, y, width, 1);
    }

    ctx.font = '10px monospace';
    ctx.fillStyle = '#4ade80';
    ctx.textAlign = 'left';
    ctx.fillText('GEN-3 NVG // GAIN: +18dB', 20, 25);
  }
  ctx.restore();
}
