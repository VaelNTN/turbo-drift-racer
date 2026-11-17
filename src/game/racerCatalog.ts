import { CarDef, ChassisKind, DriverArchetype, DriverDef } from './racerTypes';

interface ChassisSpec {
  kind: ChassisKind;
  label: string;
  speed: number;
  accel: number;
  drift: number;
  prefix: string[];
}

const CHASSIS_SPECS: ChassisSpec[] = [
  { kind: 'f1', label: 'Formula 1', speed: 9, accel: 8, drift: 7, prefix: ['Apex', 'Turbo', 'Grand', 'Velocity', 'Nitro', 'Monaco', 'Aero', 'Sonic'] },
  { kind: 'supercar', label: 'Supercar', speed: 9, accel: 7, drift: 8, prefix: ['Veloce', 'Hyper', 'Solar', 'Phantom', 'Pulse', 'Mirage', 'Zenith', 'Venom'] },
  { kind: 'driftcoupe', label: 'Drift Coupe', speed: 7, accel: 8, drift: 10, prefix: ['Slide', 'Tokyo', 'Akina', 'Smoke', 'Sideways', 'Apex', 'Kanjo', 'Katana'] },
  { kind: 'muscle', label: 'Muscle Car', speed: 8, accel: 9, drift: 7, prefix: ['V8', 'Thunder', 'Bully', 'Titan', 'Fury', 'Charger', 'Bandit', 'Viper'] },
  { kind: 'rally', label: 'Rally', speed: 7, accel: 9, drift: 9, prefix: ['Dirt', 'Gravel', 'Nordic', 'Mud', 'Alpine', 'Turbo', 'Safari', 'Storm'] },
  { kind: 'kart', label: 'Race Kart', speed: 6, accel: 10, drift: 9, prefix: ['Mini', 'Pocket', 'Spark', 'Zoom', 'Sprint', 'Zippy', 'Flash', 'Blitz'] },
  { kind: 'pickup', label: 'Pickup Truck', speed: 7, accel: 8, drift: 8, prefix: ['Ranch', 'Baja', 'Haul', 'Canyon', 'Ranger', 'Bull', 'Sierra', 'Dune'] },
  { kind: 'monster', label: 'Monster Truck', speed: 7, accel: 8, drift: 7, prefix: ['Crush', 'Mega', 'Giga', 'Stomp', 'Beast', 'Mammoth', 'Boulder', 'Rex'] },
  { kind: 'hotrod', label: 'Hot Rod', speed: 8, accel: 9, drift: 8, prefix: ['Flame', 'Chrome', 'Retro', 'Blaze', 'Rat', 'Cruiser', 'Nitro', 'Rebel'] },
  { kind: 'van', label: 'Turbo Van', speed: 6, accel: 8, drift: 9, prefix: ['Party', 'Pizza', 'Disco', 'Hippie', 'Express', 'Camper', 'Taco', 'Rocket'] },
  { kind: 'cyberpod', label: 'Cyber Pod', speed: 9, accel: 8, drift: 8, prefix: ['Neon', 'Grid', 'Laser', 'Matrix', 'Synth', 'Pixel', 'Volt', 'Hex'] },
  { kind: 'ufo', label: 'UFO Saucer', speed: 8, accel: 9, drift: 9, prefix: ['Area51', 'Cosmo', 'Warp', 'Nova', 'Orbit', 'Nebula', 'Astro', 'Zeta'] },
  { kind: 'tank', label: 'Mini Tank', speed: 7, accel: 7, drift: 8, prefix: ['Panzer', 'Iron', 'Siege', 'Armor', 'Cannon', 'Fortress', 'Steel', 'Blitz'] },
  { kind: 'buggy', label: 'Dune Buggy', speed: 7, accel: 9, drift: 9, prefix: ['Sand', 'Hopper', 'Oasis', 'Sun', 'Breeze', 'Dune', 'Trail', 'Jump'] },
];

const CAR_PALETTES: Array<{
  tag: string;
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
}> = [
  { tag: 'Crimson', primary: '#ef4444', secondary: '#fee2e2', accent: '#facc15', glow: '#f87171' },
  { tag: 'Cobalt', primary: '#2563eb', secondary: '#dbeafe', accent: '#38bdf8', glow: '#60a5fa' },
  { tag: 'Emerald', primary: '#10b981', secondary: '#d1fae5', accent: '#bef264', glow: '#34d399' },
  { tag: 'Solar', primary: '#f59e0b', secondary: '#fef3c7', accent: '#ef4444', glow: '#fbbf24' },
  { tag: 'Violet', primary: '#8b5cf6', secondary: '#ede9fe', accent: '#f472b6', glow: '#a78bfa' },
  { tag: 'Cyber', primary: '#ec4899', secondary: '#1e1b4b', accent: '#22d3ee', glow: '#f472b6' },
  { tag: 'Carbon', primary: '#334155', secondary: '#0f172a', accent: '#f97316', glow: '#fb923c' },
  { tag: 'Frost', primary: '#06b6d4', secondary: '#ecfeff', accent: '#f8fafc', glow: '#22d3ee' },
];

// 14 chassis * 8 palettes = 112 unique visual cars!
export const CARS: CarDef[] = (() => {
  const list: CarDef[] = [];
  let id = 0;
  for (let c = 0; c < CHASSIS_SPECS.length; c++) {
    const spec = CHASSIS_SPECS[c];
    for (let p = 0; p < CAR_PALETTES.length; p++) {
      const pal = CAR_PALETTES[p];
      const deltaS = (p % 3) - 1;
      const deltaA = ((p + 1) % 3) - 1;
      const deltaD = ((p + 2) % 3) - 1;
      list.push({
        id,
        name: `${spec.prefix[p]} ${pal.tag}`,
        chassis: spec.kind,
        chassisLabel: spec.label,
        primary: pal.primary,
        secondary: pal.secondary,
        accent: pal.accent,
        underglow: pal.glow,
        topSpeedStat: Math.max(4, Math.min(10, spec.speed + deltaS)),
        accelStat: Math.max(4, Math.min(10, spec.accel + deltaA)),
        driftStat: Math.max(4, Math.min(10, spec.drift + deltaD)),
      });
      id++;
    }
  }
  return list;
})();

interface ArchetypeSpec {
  type: DriverArchetype;
  label: string;
  names: string[];
  skins: string[];
}

const ARCHETYPES: ArchetypeSpec[] = [
  { type: 'racer', label: 'Pro Racer', names: ['Max', 'Luna', 'Dex', 'Sam', 'Kira', 'Milo', 'Nora', 'Cole'], skins: ['#fed7aa', '#fdba74', '#d97706', '#92400e', '#fde68a', '#f5d0c5', '#c28b63', '#8d5524'] },
  { type: 'ninja', label: 'Ninja', names: ['Kage', 'Ryu', 'Hana', 'Shin', 'Tora', 'Yuki', 'Zed', 'Sora'], skins: ['#fed7aa', '#fde68a', '#f5d0c5', '#fdba74', '#fed7aa', '#fde68a', '#f5d0c5', '#fdba74'] },
  { type: 'robot', label: 'Robot', names: ['Bolt', 'Chip', 'Mecha', 'Servo', 'Byte', 'Sparky', 'Tron', 'Aegis'], skins: ['#cbd5e1', '#94a3b8', '#e2e8f0', '#64748b', '#bae6fd', '#fde68a', '#fecaca', '#d9f99d'] },
  { type: 'alien', label: 'Alien', names: ['Zorg', 'Blip', 'Xena', 'Quark', 'Vex', 'Gloop', 'Nova', 'Zuzu'], skins: ['#4ade80', '#22d3ee', '#c084fc', '#a3e635', '#38bdf8', '#f472b6', '#fb7185', '#fde047'] },
  { type: 'pirate', label: 'Pirate', names: ['Beard', 'Ruby', 'Hook', 'Storm', 'Jack', 'Anne', 'Flint', 'Cora'], skins: ['#fdba74', '#fed7aa', '#d97706', '#f5d0c5', '#c28b63', '#fde68a', '#92400e', '#fdba74'] },
  { type: 'knight', label: 'Knight', names: ['Arthur', 'Valerie', 'Lancel', 'Gawain', 'Edda', 'Roland', 'Drake', 'Isolde'], skins: ['#cbd5e1', '#e2e8f0', '#fde047', '#94a3b8', '#bae6fd', '#fed7aa', '#fecaca', '#d8b4fe'] },
  { type: 'king', label: 'King', names: ['Rex', 'Regina', 'Charles', 'Aurel', 'Sultan', 'Zara', 'Midas', 'Cleo'], skins: ['#fed7aa', '#fdba74', '#d97706', '#fde68a', '#8d5524', '#f5d0c5', '#c28b63', '#fed7aa'] },
  { type: 'astronaut', label: 'Astronaut', names: ['Buzz', 'Stella', 'Orion', 'Comet', 'Neil', 'Lyra', 'Cosmo', 'Vega'], skins: ['#f8fafc', '#e2e8f0', '#bae6fd', '#fef9c3', '#f1f5f9', '#e0f2fe', '#fce7f3', '#dcfce7'] },
  { type: 'cat', label: 'Cat', names: ['Mittens', 'Tiger', 'Whiskers', 'Felix', 'Mochi', 'Cleo', 'Binx', 'Neko'], skins: ['#fb923c', '#f8fafc', '#475569', '#fcd34d', '#cbd5e1', '#f472b6', '#94a3b8', '#fed7aa'] },
  { type: 'dog', label: 'Dog', names: ['Buddy', 'Maxie', 'Woof', 'Rocco', 'Biscuit', 'Rexy', 'Duke', 'Pebbles'], skins: ['#d97706', '#f8fafc', '#92400e', '#fcd34d', '#78350f', '#cbd5e1', '#fb923c', '#e5e7eb'] },
  { type: 'wizard', label: 'Wizard', names: ['Merlin', 'Nyx', 'Gandor', 'Elara', 'Zoltar', 'Freya', 'Albus', 'Morgana'], skins: ['#fed7aa', '#f5d0c5', '#fde68a', '#d97706', '#c28b63', '#fed7aa', '#8d5524', '#fdba74'] },
  { type: 'cowboy', label: 'Cowboy', names: ['Billy', 'Jessie', 'Clint', 'Dolly', 'Tex', 'Calamity', 'Wyatt', 'Savannah'], skins: ['#fdba74', '#fed7aa', '#c28b63', '#f5d0c5', '#92400e', '#fde68a', '#d97706', '#fed7aa'] },
  { type: 'dino', label: 'Dino', names: ['Raptor', 'T-Rex', 'Spike', 'Yoshi', 'Fang', 'Ptera', 'Stego', 'Chomp'], skins: ['#22c55e', '#f97316', '#ef4444', '#06b6d4', '#a855f7', '#eab308', '#ec4899', '#84cc16'] },
  { type: 'punk', label: 'Punk', names: ['Spike', 'Roxy', 'Axel', 'Jett', 'Sid', 'Vixen', 'Blaze', 'Rebel'], skins: ['#fed7aa', '#f5d0c5', '#fdba74', '#d97706', '#fde68a', '#c28b63', '#92400e', '#fed7aa'] },
];

const DRIVER_SUITS = [
  { suit: '#ef4444', accent: '#fde047', visor: '#0ea5e9' },
  { suit: '#2563eb', accent: '#38bdf8', visor: '#facc15' },
  { suit: '#16a34a', accent: '#bef264', visor: '#f97316' },
  { suit: ' #9333ea', accent: '#f472b6', visor: '#22d3ee' },
  { suit: '#ea580c', accent: '#fef08a', visor: '#0f172a' },
  { suit: '#0891b2', accent: '#67e8f9', visor: '#f43f5e' },
  { suit: '#be123c', accent: '#fda4af', visor: '#fef08a' },
  { suit: '#1e293b', accent: '#38bdf8', visor: '#a3e635' },
];

// 14 archetypes * 8 = 112 unique drivers!
export const DRIVERS: DriverDef[] = (() => {
  const list: DriverDef[] = [];
  let id = 0;
  for (let a = 0; a < ARCHETYPES.length; a++) {
    const arch = ARCHETYPES[a];
    for (let i = 0; i < 8; i++) {
      const palette = DRIVER_SUITS[(i + a) % DRIVER_SUITS.length];
      list.push({
        id,
        name: `${arch.names[i]}`,
        archetype: arch.type,
        archetypeLabel: arch.label,
        skin: arch.skins[i],
        suit: palette.suit.trim(),
        accent: palette.accent,
        visor: palette.visor,
      });
      id++;
    }
  }
  return list;
})();

export function getCarById(id: number): CarDef {
  return CARS[((id % CARS.length) + CARS.length) % CARS.length];
}

export function getDriverById(id: number): DriverDef {
  return DRIVERS[((id % DRIVERS.length) + DRIVERS.length) % DRIVERS.length];
}

/**
 * Draws a driver top-down/angled clearly so you see the exact character
 * inside the car cockpit AND zoomed in on the garage cards.
 */
export function drawDriverAvatar(
  ctx: CanvasRenderingContext2D,
  driver: DriverDef,
  x: number,
  y: number,
  scale = 1,
  lean = 0
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.rotate(lean * 0.25);

  // Shoulders / race suit
  ctx.fillStyle = driver.suit;
  ctx.beginPath();
  ctx.ellipse(-1, 0, 5.5, 8.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Suit stripe
  ctx.fillStyle = driver.accent;
  ctx.fillRect(-2, -6.5, 2.5, 13);

  // Hands gripping steering wheel forward (+x)
  ctx.fillStyle = driver.skin;
  ctx.beginPath();
  ctx.arc(5.5, -5, 2.1, 0, Math.PI * 2);
  ctx.arc(5.5, 5, 2.1, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = driver.skin;
  ctx.beginPath();
  ctx.arc(0, 0, 5.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Archetype details (top-down facing +X)
  switch (driver.archetype) {
    case 'racer': {
      // Racing helmet + visor
      ctx.fillStyle = driver.accent;
      ctx.beginPath();
      ctx.arc(-0.3, 0, 5.6, Math.PI * 0.3, Math.PI * 1.7);
      ctx.fill();
      ctx.fillStyle = driver.visor;
      ctx.fillRect(1.5, -3.5, 3.6, 7);
      break;
    }
    case 'ninja': {
      // Hood + headband tails
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = driver.accent;
      ctx.fillRect(-5.5, -1.5, 3.5, 3);
      ctx.fillStyle = driver.skin;
      ctx.fillRect(1.5, -2.8, 3, 5.6);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(2.7, -2.1, 1.3, 1.3);
      ctx.fillRect(2.7, 0.8, 1.3, 1.3);
      break;
    }
    case 'robot': {
      ctx.fillStyle = driver.skin;
      ctx.fillRect(-4.8, -4.8, 9.6, 9.6);
      ctx.fillStyle = driver.visor;
      ctx.fillRect(1.2, -3.6, 3.4, 7.2);
      ctx.fillStyle = driver.accent;
      ctx.beginPath();
      ctx.arc(-3.5, 0, 1.8, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'alien': {
      // Big black oval eyes + antenna
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.ellipse(2.3, -2.2, 1.8, 1.2, -0.3, 0, Math.PI * 2);
      ctx.ellipse(2.3, 2.2, 1.8, 1.2, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = driver.accent;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-2, 0);
      ctx.lineTo(-6, -2.5);
      ctx.stroke();
      ctx.fillStyle = driver.accent;
      ctx.beginPath();
      ctx.arc(-6, -2.5, 1.7, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'pirate': {
      // Tricorn hat + eyepatch
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.moveTo(4.5, 0);
      ctx.lineTo(-5, -6.8);
      ctx.lineTo(-5, 6.8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = driver.accent;
      ctx.beginPath();
      ctx.arc(-1, 0, 1.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'knight': {
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(0, 0, 5.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(1.8, -3.3, 2.2, 6.6);
      ctx.fillStyle = driver.suit;
      ctx.fillRect(-6, -1.6, 4.5, 3.2);
      break;
    }
    case 'king': {
      // Gold crown
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(0, 0, 4.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 0, 2.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#facc15';
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(ang) * 4.5, Math.sin(ang) * 4.5, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'astronaut': {
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(0, 0, 6.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(1.5, 0, 4.2, -Math.PI * 0.45, Math.PI * 0.45);
      ctx.fill();
      break;
    }
    case 'cat':
    case 'dog': {
      // Pointy cat ears or floppy dog ears
      ctx.fillStyle = driver.skin;
      if (driver.archetype === 'cat') {
        ctx.beginPath();
        ctx.moveTo(0, -4.5);
        ctx.lineTo(-4.5, -8);
        ctx.lineTo(-4, -2.5);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, 4.5);
        ctx.lineTo(-4.5, 8);
        ctx.lineTo(-4, 2.5);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = driver.accent;
        ctx.beginPath();
        ctx.ellipse(-1.5, -5.8, 2.6, 1.7, -0.4, 0, Math.PI * 2);
        ctx.ellipse(-1.5, 5.8, 2.6, 1.7, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      // Cute nose & eyes
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(4.8, 0, 1.3, 0, Math.PI * 2);
      ctx.arc(2.2, -2.1, 1.0, 0, Math.PI * 2);
      ctx.arc(2.2, 2.1, 1.0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'wizard': {
      // Pointed wizard hat trailing behind (-x)
      ctx.fillStyle = driver.suit;
      ctx.beginPath();
      ctx.arc(0, 0, 6.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = driver.accent;
      ctx.beginPath();
      ctx.moveTo(2, -3);
      ctx.lineTo(-9.5, 0);
      ctx.lineTo(2, 3);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'cowboy': {
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.ellipse(0, 0, 6.5, 7.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.ellipse(-0.5, 0, 3.8, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'dino': {
      // Spikes along back + snout
      ctx.fillStyle = driver.skin;
      ctx.beginPath();
      ctx.ellipse(2.5, 0, 4.5, 3.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = driver.accent;
      for (let s = -4; s <= 1; s += 2.4) {
        ctx.beginPath();
        ctx.arc(s, 0, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#0f172a';
      ctx.arc(3.5, -2.1, 0.9, 0, Math.PI * 2);
      ctx.arc(3.5, 2.1, 0.9, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'punk': {
      // Neon mohawk
      ctx.fillStyle = driver.accent;
      ctx.fillRect(-5.5, -1.6, 9, 3.2);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(2.2, -3.2, 2, 6.4);
      break;
    }
  }

  ctx.restore();
}

/**
 * Draws the complete car + visible driver on Canvas.
 * Oriented along +X (nose right, rear left).
 */
export function drawCarWithDriver(
  ctx: CanvasRenderingContext2D,
  car: CarDef,
  driver: DriverDef,
  x: number,
  y: number,
  angle: number,
  steer = 0,
  driftLevel: 0 | 1 | 2 | 3 = 0,
  boostLeft = 0,
  scale = 1,
  alpha = 1
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  // Underglow or drift aura
  if (driftLevel > 0 || boostLeft > 0) {
    const auraColor =
      boostLeft > 0
        ? '#f97316'
        : driftLevel === 3
          ? '#c084fc'
          : driftLevel === 2
            ? '#fb923c'
            : '#38bdf8';
    ctx.fillStyle = auraColor;
    ctx.globalAlpha = alpha * 0.25;
    ctx.beginPath();
    ctx.ellipse(0, 0, 29, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha;
  }

  // Turbo exhaust flames
  if (boostLeft > 0) {
    const flameLen = 14 + Math.random() * 11;
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(-22, -5);
    ctx.lineTo(-22 - flameLen, -3);
    ctx.lineTo(-22, -1);
    ctx.moveTo(-22, 1);
    ctx.lineTo(-22 - flameLen, 3);
    ctx.lineTo(-22, 5);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(-22, -4);
    ctx.lineTo(-22 - flameLen * 0.55, -3);
    ctx.lineTo(-22, -2);
    ctx.moveTo(-22, 2);
    ctx.lineTo(-22 - flameLen * 0.55, 3);
    ctx.lineTo(-22, 4);
    ctx.fill();
  }

  // Wheels (bigger for monster/buggy, wider for f1/tank)
  const wheelW = car.chassis === 'monster' ? 11 : car.chassis === 'kart' ? 7 : 9;
  const wheelH = car.chassis === 'monster' ? 6 : car.chassis === 'tank' ? 5.5 : 4.2;
  const wheelY = car.chassis === 'monster' ? 13.5 : car.chassis === 'f1' ? 12.2 : 11.2;

  const drawWheel = (wx: number, wy: number, turnAngle: number): void => {
    ctx.save();
    ctx.translate(wx, wy);
    ctx.rotate(turnAngle);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-wheelW * 0.5, -wheelH * 0.5, wheelW, wheelH);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-wheelW * 0.2, -wheelH * 0.25, wheelW * 0.4, wheelH * 0.5);
    ctx.restore();
  };

  if (car.chassis === 'ufo') {
    // UFO glows instead of wheels
    ctx.fillStyle = car.underglow;
    ctx.globalAlpha = alpha * 0.35;
    ctx.beginPath();
    ctx.arc(0, 0, 21, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha;
  } else if (car.chassis === 'tank') {
    // Tank treads
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-20, -14, 40, 6);
    ctx.fillRect(-20, 8, 40, 6);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-20, -14, 40, 6);
    ctx.strokeRect(-20, 8, 40, 6);
  } else {
    drawWheel(13, -wheelY, steer * 0.48);
    drawWheel(13, wheelY, steer * 0.48);
    drawWheel(-13, -wheelY, 0);
    drawWheel(-13, wheelY, 0);
  }

  // Chassis Body
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = '#020617';

  switch (car.chassis) {
    case 'f1': {
      // Narrow nose cone + wide front wing + rear wing + sidepods
      ctx.fillStyle = car.accent;
      ctx.fillRect(18, -11, 5, 22); // front wing
      ctx.fillRect(-23, -10.5, 5, 21); // rear wing
      ctx.fillStyle = car.primary;
      ctx.beginPath();
      ctx.moveTo(22, -2.5);
      ctx.lineTo(8, -5.5);
      ctx.lineTo(-14, -9.5);
      ctx.lineTo(-20, -6);
      ctx.lineTo(-20, 6);
      ctx.lineTo(-14, 9.5);
      ctx.lineTo(8, 5.5);
      ctx.lineTo(22, 2.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = car.secondary;
      ctx.fillRect(-10, -2, 26, 4);
      break;
    }
    case 'ufo': {
      ctx.fillStyle = car.primary;
      ctx.beginPath();
      ctx.ellipse(0, 0, 20, 17, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = car.secondary;
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 11.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Lights around saucer
      ctx.fillStyle = car.accent;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 16.5, Math.sin(a) * 14, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'tank': {
      ctx.fillStyle = car.primary;
      ctx.fillRect(-18, -10, 36, 20);
      ctx.strokeRect(-18, -10, 36, 20);
      ctx.fillStyle = car.accent;
      ctx.fillRect(4, -2.2, 20, 4.4); // cannon barrel
      ctx.strokeRect(4, -2.2, 20, 4.4);
      ctx.fillStyle = car.secondary;
      ctx.beginPath();
      ctx.arc(-2, 0, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'kart':
    case 'buggy': {
      // Open tubular frame + front bumper
      ctx.fillStyle = car.primary;
      ctx.beginPath();
      ctx.roundRect(-17, -9, 34, 18, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = car.accent;
      ctx.fillRect(12, -7.5, 6, 15);
      break;
    }
    case 'hotrod': {
      // Narrow front hood with exposed engine + wide rear
      ctx.fillStyle = car.primary;
      ctx.beginPath();
      ctx.moveTo(22, -5.5);
      ctx.lineTo(2, -7);
      ctx.lineTo(-4, -10.5);
      ctx.lineTo(-21, -10.5);
      ctx.lineTo(-21, 10.5);
      ctx.lineTo(-4, 10.5);
      ctx.lineTo(2, 7);
      ctx.lineTo(22, 5.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Chrome engine block on hood
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(7, -3.5, 9, 7);
      ctx.fillStyle = car.accent;
      ctx.fillRect(-20, -9, 3, 18);
      break;
    }
    case 'cyberpod': {
      // Sharp wedge
      ctx.fillStyle = car.primary;
      ctx.beginPath();
      ctx.moveTo(24, 0);
      ctx.lineTo(4, -11);
      ctx.lineTo(-21, -9);
      ctx.lineTo(-17, 0);
      ctx.lineTo(-21, 9);
      ctx.lineTo(4, 11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = car.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.lineTo(-15, 0);
      ctx.stroke();
      break;
    }
    case 'van':
    case 'pickup': {
      ctx.fillStyle = car.primary;
      ctx.beginPath();
      ctx.roundRect(-22, -10.5, 44, 21, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = car.secondary;
      if (car.chassis === 'pickup') {
        ctx.fillRect(-19, -8, 12, 16); // truck bed
      } else {
        ctx.fillRect(-18, -3.5, 36, 7); // racing stripe
      }
      ctx.fillStyle = car.accent;
      ctx.fillRect(10, -8.5, 4, 17); // windshield
      break;
    }
    default: {
      // supercar, muscle, rally, monster, driftcoupe
      ctx.fillStyle = car.primary;
      ctx.beginPath();
      ctx.roundRect(-22, -10.5, 45, 21, 7);
      ctx.fill();
      ctx.stroke();
      // Racing stripes
      ctx.fillStyle = car.secondary;
      ctx.fillRect(-19, -3.6, 39, 2.5);
      ctx.fillRect(-19, 1.1, 39, 2.5);
      // Windshield
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(4, -7.8, 7, 15.6, 2);
      ctx.fill();
      // Spoiler for supercar/driftcoupe/rally
      if (car.chassis === 'supercar' || car.chassis === 'driftcoupe' || car.chassis === 'rally') {
        ctx.fillStyle = car.accent;
        ctx.fillRect(-23.5, -10, 4.5, 20);
      }
      break;
    }
  }

  // Open cockpit well so driver stands out crisply
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.ellipse(-2, 0, 7.2, 8.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = car.accent;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Headlights
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(20, -8, 2.5, 3.5);
  ctx.fillRect(20, 4.5, 2.5, 3.5);

  // Driver inside cockpit leaning with steering!
  drawDriverAvatar(ctx, driver, -2.5, 0, 0.92, steer);

  ctx.restore();
}
