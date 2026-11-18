import { BoostPad, SplinePoint, TrackDef, TrackHazard } from './racerTypes';

export const TRACKS: TrackDef[] = [
  {
    id: 'zonnedal',
    name: 'Sun Valley GP',
    subtitle: 'Classic circuit with sweeping corners & turbo straights',
    isSpecial: false,
    laps: 3,
    roadWidth: 220,
    bgColor: '#15803d',
    bgAccent: '#166534',
    roadColor: '#334155',
    curbA: '#ef4444',
    curbB: '#f8fafc',
    lineColor: '#94a3b8',
    gripFactor: 1.0,
    hasGuardrails: true,
    hasHeadlights: false,
    isFigure8: false,
    theme: 'classic',
    controlPoints: [
      [0, -900],
      [700, -900],
      [1150, -450],
      [980, 120],
      [1200, 650],
      [620, 960],
      [-80, 740],
      [-560, 960],
      [-1150, 620],
      [-920, 40],
      [-1120, -520],
      [-650, -900],
    ],
    boostIndices: [14, 95, 168],
    hazardSpecs: [],
  },
  {
    id: 'woestijn',
    name: 'Desert Canyon',
    subtitle: 'Sandstone hairpins built for long power drifts',
    isSpecial: false,
    laps: 3,
    roadWidth: 215,
    bgColor: '#b45309',
    bgAccent: '#92400e',
    roadColor: '#44403c',
    curbA: '#f59e0b',
    curbB: '#fef3c7',
    lineColor: '#d6d3d1',
    gripFactor: 0.94,
    hasGuardrails: true,
    hasHeadlights: false,
    isFigure8: false,
    theme: 'desert',
    controlPoints: [
      [-100, -1020],
      [820, -1020],
      [1260, -680],
      [760, -180],
      [1280, 260],
      [960, 880],
      [280, 1020],
      [-140, 480],
      [-640, 980],
      [-1220, 620],
      [-1040, -140],
      [-1180, -760],
    ],
    boostIndices: [22, 112, 198],
    hazardSpecs: [],
  },
  {
    id: 'neonstad',
    name: 'Neon Night City',
    subtitle: 'High speeds & dual boost strips through the skyline',
    isSpecial: false,
    laps: 3,
    roadWidth: 210,
    bgColor: '#090d24',
    bgAccent: '#1e1b4b',
    roadColor: '#1e293b',
    curbA: '#ec4899',
    curbB: '#22d3ee',
    lineColor: '#38bdf8',
    gripFactor: 1.03,
    hasGuardrails: true,
    hasHeadlights: false,
    isFigure8: false,
    theme: 'neon',
    controlPoints: [
      [0, -1060],
      [980, -1060],
      [1300, -520],
      [1300, 180],
      [820, 440],
      [1120, 940],
      [340, 1100],
      [-360, 1100],
      [-1140, 860],
      [-1260, 180],
      [-740, -160],
      [-1140, -760],
    ],
    boostIndices: [10, 58, 128, 190],
    hazardSpecs: [],
  },
  {
    id: 'ijsgletsjer',
    name: '❄️ Ice Glacier',
    subtitle: 'SPECIAL: Slippery ice zones let you drift sideways endlessly!',
    isSpecial: true,
    specialBadge: 'SLICK ICE',
    laps: 3,
    roadWidth: 235,
    bgColor: '#0284c7',
    bgAccent: '#0369a1',
    roadColor: '#bae6fd',
    curbA: '#0ea5e9',
    curbB: '#ffffff',
    lineColor: '#0284c7',
    gripFactor: 0.68,
    hasGuardrails: true,
    hasHeadlights: false,
    isFigure8: false,
    theme: 'ice',
    controlPoints: [
      [0, -980],
      [780, -960],
      [1260, -480],
      [1040, 180],
      [1180, 740],
      [520, 1020],
      [-40, 620],
      [-620, 1000],
      [-1220, 620],
      [-980, -60],
      [-1180, -640],
      [-640, -960],
    ],
    boostIndices: [18, 92, 165],
    hazardSpecs: [
      { t: 0.16, lateral: 0.15, radius: 75, kind: 'ice' },
      { t: 0.42, lateral: -0.2, radius: 85, kind: 'ice' },
      { t: 0.68, lateral: 0.1, radius: 85, kind: 'ice' },
      { t: 0.88, lateral: -0.15, radius: 75, kind: 'ice' },
    ],
  },
  {
    id: 'vulkaan',
    name: '🌋 Volcano Crater',
    subtitle: 'SPECIAL: Watch out for glowing lava pools on the track!',
    isSpecial: true,
    specialBadge: 'LAVA HAZARD',
    laps: 3,
    roadWidth: 225,
    bgColor: '#290d09',
    bgAccent: '#7c2d12',
    roadColor: '#292524',
    curbA: '#f97316',
    curbB: '#dc2626',
    lineColor: '#fb923c',
    gripFactor: 0.96,
    hasGuardrails: true,
    hasHeadlights: false,
    isFigure8: false,
    theme: 'volcano',
    controlPoints: [
      [-80, -1040],
      [820, -980],
      [1280, -420],
      [880, 160],
      [1260, 760],
      [540, 1060],
      [-120, 820],
      [-680, 1040],
      [-1260, 560],
      [-840, -20],
      [-1240, -560],
      [-680, -980],
    ],
    boostIndices: [15, 76, 138, 204],
    hazardSpecs: [
      { t: 0.22, lateral: 0.42, radius: 42, kind: 'lava' },
      { t: 0.36, lateral: -0.42, radius: 44, kind: 'lava' },
      { t: 0.56, lateral: 0.35, radius: 46, kind: 'lava' },
      { t: 0.78, lateral: -0.38, radius: 44, kind: 'lava' },
    ],
  },
  {
    id: 'regenboog',
    name: '🌈 Rainbow Skybridge',
    subtitle: "SPECIAL: No guardrails! Don't fall off into the stars!",
    isSpecial: true,
    specialBadge: 'NO GUARDRAILS',
    laps: 3,
    roadWidth: 215,
    bgColor: '#0f0728',
    bgAccent: '#311068',
    roadColor: '#4c1d95',
    curbA: '#f43f5e',
    curbB: '#38bdf8',
    lineColor: '#fde047',
    gripFactor: 1.0,
    hasGuardrails: false,
    hasHeadlights: false,
    isFigure8: false,
    theme: 'rainbow',
    controlPoints: [
      [0, -1080],
      [840, -1060],
      [1340, -560],
      [1040, 60],
      [1320, 640],
      [680, 1080],
      [-80, 680],
      [-740, 1060],
      [-1320, 580],
      [-920, -40],
      [-1280, -680],
      [-680, -1060],
    ],
    boostIndices: [12, 62, 114, 174, 218],
    hazardSpecs: [],
  },
  {
    id: 'spookbos',
    name: '👻 Haunted Castle Woods',
    subtitle: 'SPECIAL: Pitch-dark circuit lit by your real headlights!',
    isSpecial: true,
    specialBadge: 'HEADLIGHT NIGHT',
    laps: 3,
    roadWidth: 220,
    bgColor: '#050811',
    bgAccent: '#111827',
    roadColor: '#1f2937',
    curbA: '#a855f7',
    curbB: '#4ade80',
    lineColor: '#9ca3af',
    gripFactor: 0.98,
    hasGuardrails: true,
    hasHeadlights: true,
    isFigure8: false,
    theme: 'spooky',
    controlPoints: [
      [0, -960],
      [760, -940],
      [1180, -480],
      [840, 140],
      [1160, 720],
      [480, 980],
      [-120, 620],
      [-680, 960],
      [-1180, 520],
      [-820, -40],
      [-1160, -620],
      [-640, -940],
    ],
    boostIndices: [20, 102, 182],
    hazardSpecs: [
      { t: 0.27, lateral: -0.25, radius: 52, kind: 'slime' },
      { t: 0.52, lateral: 0.3, radius: 54, kind: 'slime' },
      { t: 0.81, lateral: 0.0, radius: 52, kind: 'slime' },
    ],
  },
  {
    id: 'kruispunt8',
    name: '♾️ Turbo Figure-8',
    subtitle: 'SPECIAL: Figure-8 mega circuit with a busy center crossing!',
    isSpecial: true,
    specialBadge: 'FIGURE-8 CROSSING',
    laps: 3,
    roadWidth: 215,
    bgColor: '#0c192c',
    bgAccent: '#172554',
    roadColor: '#334155',
    curbA: '#facc15',
    curbB: '#0f172a',
    lineColor: '#fde047',
    gripFactor: 1.0,
    hasGuardrails: true,
    hasHeadlights: false,
    isFigure8: true,
    theme: 'figure8',
    // Clean figure-8 crossing smoothly at (0,0)
    controlPoints: [
      [0, 0],
      [560, -520],
      [1240, -640],
      [1340, 0],
      [1240, 640],
      [560, 520],
      [0, 0],
      [-560, -520],
      [-1240, -640],
      [-1340, 0],
      [-1240, 640],
      [-560, 520],
    ],
    boostIndices: [34, 88, 152, 206],
    hazardSpecs: [],
  },
];

export interface BuiltTrack {
  def: TrackDef;
  points: SplinePoint[];
  totalLength: number;
  boostPads: BoostPad[];
  hazards: TrackHazard[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

export function buildTrack(def: TrackDef, targetSamples = 240): BuiltTrack {
  const pts = def.controlPoints;
  const n = pts.length;

  // High-resolution raw curve first, then resample by arc length
  const rawCount = 1200;
  const rawX: number[] = [];
  const rawY: number[] = [];
  const rawDist: number[] = [0];

  for (let i = 0; i < rawCount; i++) {
    const u = (i / rawCount) * n;
    const seg = Math.floor(u) % n;
    const localT = u - Math.floor(u);
    const p0 = pts[(seg - 1 + n) % n];
    const p1 = pts[seg];
    const p2 = pts[(seg + 1) % n];
    const p3 = pts[(seg + 2) % n];

    const x = catmullRom(p0[0], p1[0], p2[0], p3[0], localT);
    const y = catmullRom(p0[1], p1[1], p2[1], p3[1], localT);
    rawX.push(x);
    rawY.push(y);
    if (i > 0) {
      const dx = x - rawX[i - 1];
      const dy = y - rawY[i - 1];
      rawDist.push(rawDist[i - 1] + Math.hypot(dx, dy));
    }
  }
  const closingDist = Math.hypot(rawX[0] - rawX[rawCount - 1], rawY[0] - rawY[rawCount - 1]);
  const totalRawLength = rawDist[rawCount - 1] + closingDist;

  const sampledXY: Array<[number, number]> = [];
  let cursor = 0;
  for (let s = 0; s < targetSamples; s++) {
    const targetD = (s / targetSamples) * totalRawLength;
    while (cursor < rawCount - 1 && rawDist[cursor + 1] < targetD) {
      cursor++;
    }
    const nextIdx = (cursor + 1) % rawCount;
    const d0 = rawDist[cursor];
    const d1 = cursor === rawCount - 1 ? totalRawLength : rawDist[cursor + 1];
    const frac = d1 > d0 ? (targetD - d0) / (d1 - d0) : 0;
    const x = rawX[cursor] + (rawX[nextIdx] - rawX[cursor]) * frac;
    const y = rawY[cursor] + (rawY[nextIdx] - rawY[cursor]) * frac;
    sampledXY.push([x, y]);
  }

  const points: SplinePoint[] = [];
  let cumDist = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < targetSamples; i++) {
    const prev = sampledXY[(i - 1 + targetSamples) % targetSamples];
    const curr = sampledXY[i];
    const next = sampledXY[(i + 1) % targetSamples];
    if (i > 0) {
      cumDist += Math.hypot(curr[0] - prev[0], curr[1] - prev[1]);
    }
    const dx = next[0] - prev[0];
    const dy = next[1] - prev[1];
    const len = Math.hypot(dx, dy) || 1;
    const tx = dx / len;
    const ty = dy / len;
    const nx = -ty;
    const ny = tx;

    minX = Math.min(minX, curr[0]);
    minY = Math.min(minY, curr[1]);
    maxX = Math.max(maxX, curr[0]);
    maxY = Math.max(maxY, curr[1]);

    points.push({ x: curr[0], y: curr[1], tx, ty, nx, ny, dist: cumDist });
  }

  const endSeg = Math.hypot(
    sampledXY[0][0] - sampledXY[targetSamples - 1][0],
    sampledXY[0][1] - sampledXY[targetSamples - 1][1]
  );
  const totalLength = cumDist + endSeg;

  const boostPads: BoostPad[] = def.boostIndices.map((idx, i) => ({
    segmentIndex: ((idx % targetSamples) + targetSamples) % targetSamples,
    lateralOffset: i % 2 === 0 ? -0.22 : 0.22,
  }));

  const hazards: TrackHazard[] = def.hazardSpecs.map((h) => ({
    segmentIndex: Math.floor(h.t * targetSamples) % targetSamples,
    lateralOffset: h.lateral,
    radius: h.radius,
    kind: h.kind,
  }));

  return {
    def,
    points,
    totalLength,
    boostPads,
    hazards,
    bounds: {
      minX: minX - 420,
      minY: minY - 420,
      maxX: maxX + 420,
      maxY: maxY + 420,
    },
  };
}

export function renderStaticTrackCanvas(track: BuiltTrack): HTMLCanvasElement {
  const { bounds, points, def } = track;
  const w = Math.ceil(bounds.maxX - bounds.minX);
  const h = Math.ceil(bounds.maxY - bounds.minY);
  const off = document.createElement('canvas');
  // Downscale slightly for huge tracks so mobile memory stays light while still crisp
  const pixelScale = 0.65;
  off.width = Math.ceil(w * pixelScale);
  off.height = Math.ceil(h * pixelScale);
  const ctx = off.getContext('2d')!;
  ctx.scale(pixelScale, pixelScale);
  ctx.translate(-bounds.minX, -bounds.minY);

  // 1. Background terrain
  ctx.fillStyle = def.bgColor;
  ctx.fillRect(bounds.minX, bounds.minY, w, h);

  // Theme-specific rich static terrain props
  for (let gx = Math.floor(bounds.minX / 170) * 170; gx < bounds.maxX; gx += 170) {
    for (let gy = Math.floor(bounds.minY / 170) * 170; gy < bounds.maxY; gy += 170) {
      const seed = Math.abs(Math.sin(gx * 0.013 + gy * 0.037));
      const px = gx + 45 + seed * 70;
      const py = gy + 45 + ((seed * 17) % 1) * 70;

      if (def.theme === 'rainbow') {
        ctx.fillStyle = seed > 0.5 ? '#fde047' : '#38bdf8';
        ctx.globalAlpha = 0.32;
        ctx.beginPath();
        ctx.arc(px, py, 2.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (def.theme === 'neon') {
        // Cyber grid & rooftop pads
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(gx, gy, 170, 170);
        if (seed > 0.45) {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(px - 22, py - 22, 44, 44);
          ctx.strokeStyle = seed > 0.72 ? '#ec4899' : '#22d3ee';
          ctx.lineWidth = 2;
          ctx.strokeRect(px - 22, py - 22, 44, 44);
        }
      } else if (def.theme === 'classic') {
        // Lush trees & bushes
        ctx.fillStyle = 'rgba(2, 6, 23, 0.25)';
        ctx.beginPath();
        ctx.arc(px + 4, py + 5, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = seed > 0.5 ? '#166534' : '#14532d';
        ctx.beginPath();
        ctx.arc(px, py, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#22c55e';
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.arc(px - 5, py - 5, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (def.theme === 'desert') {
        // Sandstone rocks & cacti
        ctx.fillStyle = def.bgAccent;
        ctx.beginPath();
        ctx.ellipse(px, py, 28, 16, seed * Math.PI, 0, Math.PI * 2);
        ctx.fill();
        if (seed > 0.55) {
          ctx.fillStyle = '#15803d';
          ctx.beginPath();
          ctx.arc(px, py, 7, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (def.theme === 'ice') {
        // Snowdrifts & faceted icebergs
        ctx.fillStyle = 'rgba(224, 242, 254, 0.22)';
        ctx.beginPath();
        ctx.moveTo(px, py - 22);
        ctx.lineTo(px + 20, py + 14);
        ctx.lineTo(px - 22, py + 10);
        ctx.closePath();
        ctx.fill();
      } else if (def.theme === 'volcano') {
        // Obsidian boulders & lava cracks
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.arc(px, py, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px - 30, py);
        ctx.lineTo(px + 28, py + 14);
        ctx.stroke();
      } else {
        ctx.fillStyle = def.bgAccent;
        ctx.beginPath();
        ctx.arc(px, py, 24, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Lava glow pools around volcano outside track
  if (def.theme === 'volcano') {
    ctx.fillStyle = '#ea580c';
    ctx.globalAlpha = 0.4;
    for (let i = 0; i < 16; i++) {
      const lx = bounds.minX + ((i * 743) % w);
      const ly = bounds.minY + ((i * 521) % h);
      ctx.beginPath();
      ctx.arc(lx, ly, 65 + (i % 3) * 28, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  const traceCenterPath = (): void => {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
  };

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // 2. Outer guardrail shadow / painted apex curbs
  if (def.hasGuardrails) {
    traceCenterPath();
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = def.roadWidth + 36;
    ctx.stroke();

    // Alternating red/white or theme-colored curbs
    traceCenterPath();
    ctx.strokeStyle = def.curbA;
    ctx.lineWidth = def.roadWidth + 24;
    ctx.stroke();

    traceCenterPath();
    ctx.strokeStyle = def.curbB;
    ctx.lineWidth = def.roadWidth + 24;
    ctx.setLineDash([28, 28]);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    traceCenterPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = def.roadWidth + 14;
    ctx.stroke();
  }

  // 3. Main textured asphalt / rainbow road surface
  if (def.theme === 'rainbow') {
    const colors = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#38bdf8', '#a855f7'];
    const stripeW = def.roadWidth / colors.length;
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      for (let c = 0; c < colors.length; c++) {
        const offFrac = (c - (colors.length - 1) / 2) * stripeW;
        ctx.strokeStyle = colors[c];
        ctx.lineWidth = stripeW + 2;
        ctx.beginPath();
        ctx.moveTo(p1.x + p1.nx * offFrac, p1.y + p1.ny * offFrac);
        ctx.lineTo(p2.x + p2.nx * offFrac, p2.y + p2.ny * offFrac);
        ctx.stroke();
      }
    }
  } else {
    traceCenterPath();
    ctx.strokeStyle = def.roadColor;
    ctx.lineWidth = def.roadWidth;
    ctx.stroke();

    // Subtle darker inner racing groove
    traceCenterPath();
    ctx.strokeStyle = 'rgba(2, 6, 23, 0.16)';
    ctx.lineWidth = def.roadWidth * 0.62;
    ctx.stroke();

    // Asphalt grain / aggregate speckles along road
    const halfRoad = def.roadWidth * 0.42;
    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      for (let k = 0; k < 5; k++) {
        const r = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
        const frac = (r - Math.floor(r)) * 2 - 1;
        const sx = pt.x + pt.nx * frac * halfRoad;
        const sy = pt.y + pt.ny * frac * halfRoad;
        ctx.fillStyle = k % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.12)';
        ctx.fillRect(sx, sy, 3, 3);
      }
    }
  }

  // Crisp road shoulder border lines
  for (const side of [-1, 1]) {
    const offEdge = side * (def.roadWidth * 0.48);
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const ex = p.x + p.nx * offEdge;
      const ey = p.y + p.ny * offEdge;
      if (i === 0) ctx.moveTo(ex, ey);
      else ctx.lineTo(ex, ey);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Center dashed line
  traceCenterPath();
  ctx.strokeStyle = def.lineColor;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 4;
  ctx.setLineDash([24, 26]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // 4. Start / Finish Checkered Line + Gantry Pillars + Stadium Light Towers
  const sp = points[0];
  ctx.save();
  ctx.translate(sp.x, sp.y);
  ctx.rotate(Math.atan2(sp.ty, sp.tx));
  const halfW = def.roadWidth * 0.5;
  const cols = 2;
  const rows = 12;
  const cellH = def.roadWidth / rows;
  const cellW = 14;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#0f172a';
      ctx.fillRect(-cellW + c * cellW, -halfW + r * cellH, cellW, cellH);
    }
  }
  // Gantry side towers & overhead shadow bar
  ctx.fillStyle = 'rgba(2, 6, 23, 0.38)';
  ctx.fillRect(-8, -halfW - 14, 16, def.roadWidth + 28);
  for (const side of [-1, 1]) {
    const py = side * (halfW + 18);
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(0, py, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  ctx.restore();

  // 5. Hazards
  for (const haz of track.hazards) {
    const hp = points[haz.segmentIndex];
    const hx = hp.x + hp.nx * (haz.lateralOffset * halfW);
    const hy = hp.y + hp.ny * (haz.lateralOffset * halfW);
    ctx.save();
    if (haz.kind === 'ice') {
      ctx.fillStyle = 'rgba(224, 242, 254, 0.72)';
      ctx.strokeStyle = '#38bdf8';
    } else if (haz.kind === 'slime') {
      ctx.fillStyle = 'rgba(74, 222, 128, 0.65)';
      ctx.strokeStyle = '#15803d';
    } else {
      ctx.fillStyle = 'rgba(249, 115, 22, 0.85)';
      ctx.strokeStyle = '#fef08a';
    }
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(hx, hy, haz.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // 6. Boost pads
  for (const pad of track.boostPads) {
    const bp = points[pad.segmentIndex];
    const bx = bp.x + bp.nx * (pad.lateralOffset * halfW);
    const by = bp.y + bp.ny * (pad.lateralOffset * halfW);
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(Math.atan2(bp.ty, bp.tx));
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-26, -18, 52, 36);
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-26, -18, 52, 36);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 4;
    for (let ch = -12; ch <= 12; ch += 12) {
      ctx.beginPath();
      ctx.moveTo(ch - 5, -10);
      ctx.lineTo(ch + 5, 0);
      ctx.lineTo(ch - 5, 10);
      ctx.stroke();
    }
    ctx.restore();
  }

  return off;
}
