import { getDeviceId, getPlayerName, OnlineRacerSnapshot, OnlineRoomClient } from '../api/online';
import { CARS, DRIVERS, drawCarWithDriver, getCarById, getDriverById } from './racerCatalog';
import { buildTrack, BuiltTrack, renderStaticTrackCanvas } from './racerTracks';
import {
  Difficulty,
  RaceHudSnapshot,
  RaceMode,
  RacerProgressEntry,
  TrackDef,
} from './racerTypes';
import { racerSound } from './sound';

interface SkidMark {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  alpha: number;
}

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface SimRacer {
  id: string;
  name: string;
  isPlayer: boolean;
  isRemote: boolean;
  carId: number;
  driverId: number;
  x: number;
  y: number;
  angle: number; // body heading
  velAngle: number; // actual travel heading during drift
  speed: number;
  steer: number;
  drifting: boolean;
  driftDir: number; // -1 left, +1 right, 0 none
  driftCharge: number; // seconds
  driftLevel: 0 | 1 | 2 | 3;
  boostLeft: number;
  respawnTimer: number;
  hazardCooldown: number;

  // Lap & spline tracking
  segIndex: number;
  lap: number; // 1-based while racing
  maxProgress: number;
  progress: number;
  finished: boolean;
  finishTimeMs: number;

  // AI parameters
  aiTargetOffset: number;
  aiSkillMult: number;
  aiLookAhead: number;
  aiDriftTimer: number;

  // Previous rear tire world positions for skid marks
  prevRearLX: number;
  prevRearLY: number;
  prevRearRX: number;
  prevRearRY: number;
  hasPrevSkid: boolean;

  // Remote smoothing
  targetX?: number;
  targetY?: number;
  targetAngle?: number;
}

export interface InputState {
  left: boolean;
  right: boolean;
  gas: boolean;
  brake: boolean;
  drift: boolean;
}

const ONLINE_RIVAL_NAMES = [
  'TurboTimo',
  'NinaDrift',
  'MaxVeloce',
  'PixelSenne',
  'RubyApex',
  'BlitzKarel',
  'NovaRacer',
  'JettSlide',
];

export class TurboDriftEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private track: BuiltTrack;
  private staticTrackCanvas: HTMLCanvasElement;

  private mode: RaceMode;
  private difficulty: Difficulty;
  private autoGas: boolean;
  private roomClient: OnlineRoomClient | null = null;

  private racers: SimRacer[] = [];
  private skidMarks: SkidMark[] = [];
  private particles: SparkParticle[] = [];

  private input: InputState = {
    left: false,
    right: false,
    gas: false,
    brake: false,
    drift: false,
  };

  private countdownTimer = 3.2;
  private lastCountdownShown = 4;
  private raceTimeMs = 0;
  private finishedEmitted = false;
  private rafId = 0;
  private lastTs = 0;
  private lastHudPush = 0;

  private camX = 0;
  private camY = 0;
  private camZoom = 1;
  private shake = 0;

  private onHud: (snap: RaceHudSnapshot) => void;
  private onFinish?: (snap: RaceHudSnapshot) => void;

  constructor(
    canvas: HTMLCanvasElement,
    opts: {
      trackDef: TrackDef;
      playerCarId: number;
      playerDriverId: number;
      mode: RaceMode;
      difficulty: Difficulty;
      autoGas: boolean;
      roomCode?: string;
    },
    onHud: (snap: RaceHudSnapshot) => void,
    onFinish?: (snap: RaceHudSnapshot) => void
  ) {
    this.canvas = canvas;
    const c = canvas.getContext('2d');
    if (!c) throw new Error('2D context missing');
    this.ctx = c;
    this.track = buildTrack(opts.trackDef, 240);
    this.staticTrackCanvas = renderStaticTrackCanvas(this.track);
    this.mode = opts.mode;
    this.difficulty = opts.difficulty;
    this.autoGas = opts.autoGas;
    this.onHud = onHud;
    this.onFinish = onFinish;

    if (this.mode === 'online') {
      this.roomClient = new OnlineRoomClient(opts.roomCode || 'OPEN-1', opts.trackDef.id);
    }

    this.initGrid(opts.playerCarId, opts.playerDriverId);
  }

  private initGrid(playerCarId: number, playerDriverId: number): void {
    const pts = this.track.points;
    const n = pts.length;
    const totalRacers = 6;
    const playerName = getPlayerName();
    const myDeviceId = getDeviceId();

    const aiDiffFactor =
      this.difficulty === 'easy' ? 0.81 : this.difficulty === 'medium' ? 0.94 : 1.03;

    // Shuffled rival names
    const names = [...ONLINE_RIVAL_NAMES].sort(() => Math.random() - 0.5);

    for (let slot = 0; slot < totalRacers; slot++) {
      const isPlayer = slot === totalRacers - 1;
      const rowBack = Math.floor(slot / 2);
      const colSide = slot % 2 === 0 ? -1 : 1;
      const segIdx = (n - 3 - rowBack * 4 + n) % n;
      const p = pts[segIdx];
      const lat = colSide * 38;
      const sx = p.x + p.nx * lat;
      const sy = p.y + p.ny * lat;
      const ang = Math.atan2(p.ty, p.tx);

      const carId = isPlayer ? playerCarId : Math.floor(Math.random() * CARS.length);
      const driverId = isPlayer ? playerDriverId : Math.floor(Math.random() * DRIVERS.length);
      const skillVariance =
        this.mode === 'online'
          ? 0.92 + Math.random() * 0.14
          : aiDiffFactor + (Math.random() - 0.5) * 0.08;

      this.racers.push({
        id: isPlayer ? myDeviceId : `ai-${slot}`,
        name: isPlayer ? playerName : this.mode === 'online' ? `[Online] ${names[slot]}` : `Bot ${names[slot]}`,
        isPlayer,
        isRemote: false,
        carId,
        driverId,
        x: sx,
        y: sy,
        angle: ang,
        velAngle: ang,
        speed: 0,
        steer: 0,
        drifting: false,
        driftDir: 0,
        driftCharge: 0,
        driftLevel: 0,
        boostLeft: 0,
        respawnTimer: 0,
        hazardCooldown: 0,
        segIndex: segIdx,
        lap: 0, // starts slightly behind start line, increments to 1 on crossing start
        maxProgress: -(n - segIdx) / n,
        progress: -(n - segIdx) / n,
        finished: false,
        finishTimeMs: 0,
        aiTargetOffset: (Math.random() - 0.5) * 0.45,
        aiSkillMult: skillVariance,
        aiLookAhead: 7 + (slot % 4),
        aiDriftTimer: 0,
        prevRearLX: sx,
        prevRearLY: sy,
        prevRearRX: sx,
        prevRearRY: sy,
        hasPrevSkid: false,
      });
    }

    const player = this.racers.find((r) => r.isPlayer)!;
    this.camX = player.x;
    this.camY = player.y;
  }

  setInput(patch: Partial<InputState>): void {
    Object.assign(this.input, patch);
  }

  setAutoGas(val: boolean): void {
    this.autoGas = val;
  }

  start(): void {
    this.lastTs = performance.now();
    const tick = (ts: number): void => {
      const dt = Math.min(0.05, Math.max(0.001, (ts - this.lastTs) / 1000));
      this.lastTs = ts;
      this.update(dt);
      this.render();
      if (ts - this.lastHudPush > 75) {
        this.lastHudPush = ts;
        this.emitHud();
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
    this.emitHud();
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId);
    if (this.roomClient) {
      this.roomClient.close();
      this.roomClient = null;
    }
  }

  private getPlayer(): SimRacer {
    return this.racers.find((r) => r.isPlayer)!;
  }

  private update(dt: number): void {
    // Countdown handling
    if (this.countdownTimer > 0) {
      this.countdownTimer -= dt;
      const ceilVal = Math.max(0, Math.ceil(this.countdownTimer));
      if (ceilVal < this.lastCountdownShown) {
        this.lastCountdownShown = ceilVal;
        if (ceilVal >= 1 && ceilVal <= 3) {
          racerSound.countdown(false);
        } else if (ceilVal === 0) {
          racerSound.countdown(true);
        }
      }
    }

    const canDrive = this.countdownTimer <= 0.05;
    if (canDrive) {
      const player = this.getPlayer();
      if (!player.finished) {
        this.raceTimeMs += dt * 1000;
      }
    }

    // Sync online remote racers if active
    if (this.mode === 'online' && this.roomClient) {
      const p = this.getPlayer();
      const snap: OnlineRacerSnapshot = {
        deviceId: p.id,
        name: p.name,
        carId: p.carId,
        driverId: p.driverId,
        x: p.x,
        y: p.y,
        angle: p.angle,
        steer: p.steer,
        speed: p.speed,
        driftLevel: p.driftLevel,
        boostLeft: p.boostLeft,
        lap: p.lap,
        progress: p.progress,
        finished: p.finished,
        finishTimeMs: p.finishTimeMs,
        updatedAt: Date.now(),
      };
      this.roomClient.pushAndPoll(snap);
      this.mergeRemoteRacers(this.roomClient.getRemoteRacers());
    }

    for (const r of this.racers) {
      if (r.isRemote) {
        // Smooth interpolation for remote human players
        if (r.targetX !== undefined && r.targetY !== undefined) {
          r.x += (r.targetX - r.x) * Math.min(1, dt * 12);
          r.y += (r.targetY - r.y) * Math.min(1, dt * 12);
        }
        if (r.targetAngle !== undefined) {
          const diff = normalizeAngle(r.targetAngle - r.angle);
          r.angle += diff * Math.min(1, dt * 12);
        }
        continue;
      }

      if (!canDrive) {
        // Allow little wheel wiggle before start
        if (r.isPlayer) {
          const targetSteer = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
          r.steer += (targetSteer - r.steer) * Math.min(1, dt * 10);
        }
        continue;
      }

      this.updateSimulatedRacer(r, dt);
    }

    // Car-to-car soft bumper collisions
    for (let i = 0; i < this.racers.length; i++) {
      const a = this.racers[i];
      if (a.respawnTimer > 0) continue;
      for (let j = i + 1; j < this.racers.length; j++) {
        const b = this.racers[j];
        if (b.respawnTimer > 0) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        const minDist = 30;
        if (dist > 0.01 && dist < minDist) {
          const nx = dx / dist;
          const ny = dy / dist;
          const push = (minDist - dist) * 0.52;
          if (!a.isRemote) {
            a.x -= nx * push;
            a.y -= ny * push;
          }
          if (!b.isRemote) {
            b.x += nx * push;
            b.y += ny * push;
          }
          if (a.isPlayer || b.isPlayer) {
            this.shake = Math.max(this.shake, 2.5);
          }
        }
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }
    if (this.skidMarks.length > 450) {
      this.skidMarks.splice(0, this.skidMarks.length - 450);
    }

    // Smooth camera follow player
    const player = this.getPlayer();
    const lookX = player.x + Math.cos(player.angle) * Math.min(95, player.speed * 0.17);
    const lookY = player.y + Math.sin(player.angle) * Math.min(95, player.speed * 0.17);
    this.camX += (lookX - this.camX) * Math.min(1, dt * 8);
    this.camY += (lookY - this.camY) * Math.min(1, dt * 8);
    const targetZoom = player.boostLeft > 0 ? 0.94 : 1.02 - Math.min(0.1, (player.speed / 650) * 0.08);
    this.camZoom += (targetZoom - this.camZoom) * Math.min(1, dt * 4);
    this.shake = Math.max(0, this.shake - dt * 16);

    if (player.finished && !this.finishedEmitted) {
      this.finishedEmitted = true;
      const snap = this.buildHudSnapshot();
      const win = snap.place === 1;
      racerSound.finish(win);
      this.emitHud();
      if (this.onFinish) this.onFinish(snap);
    }
  }

  private mergeRemoteRacers(remotes: OnlineRacerSnapshot[]): void {
    const activeIds = new Set(remotes.map((r) => r.deviceId));
    // Replace bots progressively if real remote racers join
    for (const remote of remotes) {
      let existing = this.racers.find((r) => r.id === remote.deviceId);
      if (!existing) {
        // Reuse an unfinished AI slot so grid stays <= 6..8 clean
        const botIdx = this.racers.findIndex((r) => !r.isPlayer && !r.isRemote);
        const target: SimRacer = {
          id: remote.deviceId,
          name: remote.name,
          isPlayer: false,
          isRemote: true,
          carId: remote.carId,
          driverId: remote.driverId,
          x: remote.x,
          y: remote.y,
          angle: remote.angle,
          velAngle: remote.angle,
          speed: remote.speed,
          steer: remote.steer,
          drifting: remote.driftLevel > 0,
          driftDir: 0,
          driftCharge: 0,
          driftLevel: remote.driftLevel,
          boostLeft: remote.boostLeft,
          respawnTimer: 0,
          hazardCooldown: 0,
          segIndex: 0,
          lap: remote.lap,
          maxProgress: remote.progress,
          progress: remote.progress,
          finished: remote.finished,
          finishTimeMs: remote.finishTimeMs,
          aiTargetOffset: 0,
          aiSkillMult: 1,
          aiLookAhead: 8,
          aiDriftTimer: 0,
          prevRearLX: remote.x,
          prevRearLY: remote.y,
          prevRearRX: remote.x,
          prevRearRY: remote.y,
          hasPrevSkid: false,
          targetX: remote.x,
          targetY: remote.y,
          targetAngle: remote.angle,
        };
        if (botIdx >= 0) {
          this.racers[botIdx] = target;
        } else {
          this.racers.push(target);
        }
        existing = target;
      } else {
        existing.name = remote.name;
        existing.carId = remote.carId;
        existing.driverId = remote.driverId;
        existing.targetX = remote.x;
        existing.targetY = remote.y;
        existing.targetAngle = remote.angle;
        existing.steer = remote.steer;
        existing.speed = remote.speed;
        existing.driftLevel = remote.driftLevel;
        existing.boostLeft = remote.boostLeft;
        existing.lap = remote.lap;
        existing.progress = remote.progress;
        existing.finished = remote.finished;
        existing.finishTimeMs = remote.finishTimeMs;
      }
    }

    // Keep track of disconnected remote IDs gracefully
    for (const r of this.racers) {
      if (r.isRemote && !activeIds.has(r.id)) {
        r.speed *= 0.95;
      }
    }
  }

  private updateSimulatedRacer(r: SimRacer, dt: number): void {
    const car = getCarById(r.carId);
    const pts = this.track.points;
    const n = pts.length;
    const halfW = this.track.def.roadWidth * 0.5;

    if (r.respawnTimer > 0) {
      r.respawnTimer -= dt;
      if (r.respawnTimer <= 0) {
        const safePt = pts[r.segIndex];
        r.x = safePt.x;
        r.y = safePt.y;
        r.angle = Math.atan2(safePt.ty, safePt.tx);
        r.velAngle = r.angle;
        r.speed = 140;
        r.driftCharge = 0;
        r.driftLevel = 0;
        r.drifting = false;
      }
      return;
    }

    r.hazardCooldown = Math.max(0, r.hazardCooldown - dt);
    r.boostLeft = Math.max(0, r.boostLeft - dt);

    // Controls: Player vs AI
    let steerCmd = 0;
    let wantGas = false;
    let wantBrake = false;
    let wantDrift = false;

    if (r.isPlayer && !r.finished) {
      steerCmd = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
      wantGas = this.autoGas ? !this.input.brake : this.input.gas;
      wantBrake = this.input.brake;
      wantDrift = this.input.drift;
    } else {
      // AI Steering & pacing toward spline lookAhead
      const targetIdx = (r.segIndex + r.aiLookAhead) % n;
      const tp = pts[targetIdx];
      const tx = tp.x + tp.nx * (r.aiTargetOffset * halfW);
      const ty = tp.y + tp.ny * (r.aiTargetOffset * halfW);
      const desiredAngle = Math.atan2(ty - r.y, tx - r.x);
      const deltaAngle = normalizeAngle(desiredAngle - r.angle);
      steerCmd = Math.max(-1, Math.min(1, deltaAngle * 2.2));
      wantGas = true;

      // Hard/Medium AI initiates drifts on sharp corners
      if (!r.finished && this.difficulty !== 'easy' && Math.abs(deltaAngle) > 0.36 && r.speed > 280) {
        r.aiDriftTimer = 0.55;
      }
      if (r.aiDriftTimer > 0) {
        r.aiDriftTimer -= dt;
        wantDrift = true;
      }
    }

    r.steer += (steerCmd - r.steer) * Math.min(1, dt * 14);

    // Stat scaling
    const baseMaxSpeed = 435 + car.topSpeedStat * 13;
    const baseAccel = 310 + car.accelStat * 18;
    const driftBonusGrip = 0.8 + car.driftStat * 0.04;
    const skillMult = r.isPlayer ? 1.0 : r.finished ? 0.65 : r.aiSkillMult;
    const boostMult = r.boostLeft > 0 ? 1.36 : 1.0;

    // Check closest road segment in local window (safe for Figure-8)
    let bestSeg = r.segIndex;
    let bestD2 = Infinity;
    for (let offset = -12; offset <= 18; offset++) {
      const idx = (r.segIndex + offset + n) % n;
      const p = pts[idx];
      const dx = r.x - p.x;
      const dy = r.y - p.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        bestSeg = idx;
      }
    }
    const distFromCenter = Math.sqrt(bestD2);

    // Detect lap transitions around index 0
    if (r.segIndex > n * 0.78 && bestSeg < n * 0.22) {
      r.lap += 1;
      if (r.isPlayer && r.lap >= 2 && r.lap <= this.track.def.laps) {
        racerSound.lap(r.lap === this.track.def.laps);
      }
      if (r.lap > this.track.def.laps && !r.finished) {
        r.finished = true;
        r.finishTimeMs = this.raceTimeMs;
      }
    } else if (r.segIndex < n * 0.22 && bestSeg > n * 0.78) {
      r.lap -= 1;
    }
    r.segIndex = bestSeg;
    r.progress = r.lap + bestSeg / n;
    r.maxProgress = Math.max(r.maxProgress, r.progress);

    // Track surface detection
    const onAsphalt = distFromCenter <= halfW + 10;
    let onIce = this.track.def.theme === 'ice';
    let onSlime = false;

    for (const haz of this.track.hazards) {
      const hp = pts[haz.segmentIndex];
      const hx = hp.x + hp.nx * (haz.lateralOffset * halfW);
      const hy = hp.y + hp.ny * (haz.lateralOffset * halfW);
      if (Math.hypot(r.x - hx, r.y - hy) < haz.radius + 10) {
        if (haz.kind === 'ice') onIce = true;
        else if (haz.kind === 'slime') onSlime = true;
        else if (haz.kind === 'lava' && r.hazardCooldown <= 0) {
          r.hazardCooldown = 1.6;
          r.speed *= 0.42;
          r.angle += 1.2;
          if (r.isPlayer) {
            racerSound.bump();
            this.shake = 7;
          }
        }
      }
    }

    // Boost pads
    for (const pad of this.track.boostPads) {
      const bp = pts[pad.segmentIndex];
      const bx = bp.x + bp.nx * (pad.lateralOffset * halfW);
      const by = bp.y + bp.ny * (pad.lateralOffset * halfW);
      if (Math.hypot(r.x - bx, r.y - by) < 38) {
        if (r.boostLeft < 0.75) {
          if (r.isPlayer) racerSound.boost(1.1);
        }
        r.boostLeft = Math.max(r.boostLeft, 0.95);
        r.speed = Math.max(r.speed, baseMaxSpeed * 1.28);
      }
    }

    // Rainbow skybridge fall-off vs guardrails
    if (distFromCenter > halfW + 14) {
      if (!this.track.def.hasGuardrails) {
        // Fell off rainbow road! Drone respawn!
        if (distFromCenter > halfW + 46) {
          r.respawnTimer = 0.85;
          r.speed = 0;
          if (r.isPlayer) racerSound.bump();
          return;
        }
      } else {
        // Soft guardrail bounce back onto road
        const pt = pts[bestSeg];
        const rx = r.x - pt.x;
        const ry = r.y - pt.y;
        const dist = Math.hypot(rx, ry) || 1;
        r.x = pt.x + (rx / dist) * (halfW + 12);
        r.y = pt.y + (ry / dist) * (halfW + 12);
        r.speed *= 0.88;
        const roadAng = Math.atan2(pt.ty, pt.tx);
        r.angle += normalizeAngle(roadAng - r.angle) * 0.25;
        r.velAngle += normalizeAngle(roadAng - r.velAngle) * 0.3;
      }
    }

    // Speed integration
    const surfaceSpeedCap = (onAsphalt ? 1.0 : 0.72) * (onSlime ? 0.62 : 1.0);
    const maxSpd = baseMaxSpeed * skillMult * boostMult * surfaceSpeedCap;

    if (wantGas) {
      r.speed += baseAccel * boostMult * dt;
    } else if (wantBrake) {
      r.speed -= baseAccel * 1.4 * dt;
    } else {
      r.speed -= 160 * dt;
    }
    // Drag toward cap
    if (r.speed > maxSpd) {
      r.speed -= (r.speed - maxSpd) * Math.min(1, dt * 4.5);
    }
    r.speed = Math.max(-110, r.speed);

    // Drift mechanics!
    const canDrift = wantDrift && r.speed > 175 && (Math.abs(steerCmd) > 0.1 || r.drifting);
    if (canDrift) {
      if (!r.drifting) {
        r.drifting = true;
        r.driftDir = steerCmd !== 0 ? Math.sign(steerCmd) : r.steer >= 0 ? 1 : -1;
        r.driftCharge = 0;
        r.driftLevel = 0;
      }
      // Counter-steering subtly adjusts arc while keeping drift going
      const driftTurnRate = (r.driftDir * 2.15 + steerCmd * 1.15) * driftBonusGrip;
      r.angle = normalizeAngle(r.angle + driftTurnRate * dt);

      // Slip velocity lags behind nose angle -> real drift slide!
      const grip = onIce ? 2.4 : 4.2 * this.track.def.gripFactor;
      const targetVelAngle = r.angle - r.driftDir * 0.34;
      r.velAngle = normalizeAngle(r.velAngle + normalizeAngle(targetVelAngle - r.velAngle) * Math.min(1, dt * grip));

      // Charge Mini-Turbo (Blue -> Orange -> Purple)
      const chargeSpeed = Math.abs(steerCmd) > 0.15 ? 1.18 : 0.75;
      r.driftCharge += dt * chargeSpeed;
      const prevLvl = r.driftLevel;
      const nextLvl: 0 | 1 | 2 | 3 =
        r.driftCharge >= 1.75 ? 3 : r.driftCharge >= 1.0 ? 2 : r.driftCharge >= 0.42 ? 1 : 0;
      r.driftLevel = nextLvl;

      if (r.isPlayer && nextLvl > prevLvl && nextLvl !== 0) {
        racerSound.driftTier(nextLvl);
      }

      // Emit drift sparks & skidmarks
      this.emitDriftEffects(r);
    } else {
      if (r.drifting) {
        // Release Mini-Turbo boost!
        if (r.driftLevel > 0) {
          const boostDur = r.driftLevel === 1 ? 0.55 : r.driftLevel === 2 ? 0.95 : 1.45;
          r.boostLeft = Math.max(r.boostLeft, boostDur);
          r.speed = Math.max(r.speed, baseMaxSpeed * (1.14 + r.driftLevel * 0.08));
          if (r.isPlayer) {
            racerSound.boost(0.9 + r.driftLevel * 0.15);
            this.shake = Math.max(this.shake, 2 + r.driftLevel * 1.2);
          }
        }
        r.drifting = false;
        r.driftDir = 0;
        r.driftCharge = 0;
        r.driftLevel = 0;
      }
      r.hasPrevSkid = false;

      // Normal snappy arcade steering
      const speedTurnScale = Math.min(1, Math.abs(r.speed) / 140);
      const turnRate = steerCmd * 2.75 * speedTurnScale * (r.speed >= 0 ? 1 : -1);
      r.angle = normalizeAngle(r.angle + turnRate * dt);
      const alignRate = onIce ? 3.5 : 11.5 * this.track.def.gripFactor;
      r.velAngle = normalizeAngle(r.velAngle + normalizeAngle(r.angle - r.velAngle) * Math.min(1, dt * alignRate));
    }

    r.x += Math.cos(r.velAngle) * r.speed * dt;
    r.y += Math.sin(r.velAngle) * r.speed * dt;
  }

  private emitDriftEffects(r: SimRacer): void {
    const cos = Math.cos(r.angle);
    const sin = Math.sin(r.angle);
    const rlx = r.x - cos * 14 + sin * 10;
    const rly = r.y - sin * 14 - cos * 10;
    const rrx = r.x - cos * 14 - sin * 10;
    const rry = r.y - sin * 14 + cos * 10;

    if (r.hasPrevSkid) {
      const skidColor =
        r.driftLevel === 3
          ? '#a855f7'
          : r.driftLevel === 2
            ? '#f97316'
            : r.driftLevel === 1
              ? '#38bdf8'
              : '#0f172a';
      const alpha = r.driftLevel > 0 ? 0.55 : 0.35;
      this.skidMarks.push({ x1: r.prevRearLX, y1: r.prevRearLY, x2: rlx, y2: rly, color: skidColor, alpha });
      this.skidMarks.push({ x1: r.prevRearRX, y1: r.prevRearRY, x2: rrx, y2: rry, color: skidColor, alpha });
    }
    r.prevRearLX = rlx;
    r.prevRearLY = rly;
    r.prevRearRX = rrx;
    r.prevRearRY = rry;
    r.hasPrevSkid = true;

    if (r.driftLevel > 0 && Math.random() < 0.65) {
      const sparkColor =
        r.driftLevel === 3 ? '#e879f9' : r.driftLevel === 2 ? '#fb923c' : '#38bdf8';
      const rearX = (rlx + rrx) * 0.5;
      const rearY = (rly + rry) * 0.5;
      this.particles.push({
        x: rearX,
        y: rearY,
        vx: -Math.cos(r.angle) * 90 + (Math.random() - 0.5) * 90,
        vy: -Math.sin(r.angle) * 90 + (Math.random() - 0.5) * 90,
        life: 0.28,
        maxLife: 0.28,
        color: sparkColor,
        size: 3 + r.driftLevel * 1.2,
      });
    }
  }

  private computeStandings(): RacerProgressEntry[] {
    const sorted = [...this.racers].sort((a, b) => {
      if (a.finished && b.finished) return a.finishTimeMs - b.finishTimeMs;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.progress - a.progress;
    });

    return sorted.map((r, i) => ({
      id: r.id,
      name: r.name,
      isPlayer: r.isPlayer,
      isRemote: r.isRemote,
      carId: r.carId,
      driverId: r.driverId,
      place: i + 1,
      lap: Math.max(1, Math.min(this.track.def.laps, r.lap)),
      totalLaps: this.track.def.laps,
      finished: r.finished,
      finishTimeMs: r.finishTimeMs,
      progress: r.progress,
    }));
  }

  private buildHudSnapshot(): RaceHudSnapshot {
    const standings = this.computeStandings();
    const player = this.getPlayer();
    const pEntry = standings.find((s) => s.isPlayer)!;
    const remoteCount = this.racers.filter((r) => r.isRemote).length;
    return {
      countdown: this.countdownTimer > 0 ? Math.ceil(this.countdownTimer) : -1,
      place: pEntry.place,
      totalRacers: standings.length,
      lap: pEntry.lap,
      totalLaps: this.track.def.laps,
      speedKmh: Math.max(0, Math.round(player.speed * 0.48)),
      driftLevel: player.driftLevel,
      driftCharge: Math.min(1, player.driftCharge / 1.75),
      boostLeft: player.boostLeft,
      raceTimeMs: player.finished ? player.finishTimeMs : this.raceTimeMs,
      finished: player.finished,
      standings,
      respawning: player.respawnTimer > 0,
      onlineConnectedCount: 1 + remoteCount,
    };
  }

  private emitHud(): void {
    this.onHud(this.buildHudSnapshot());
  }

  private render(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(320, Math.round(rect.width));
    const h = Math.max(320, Math.round(rect.height));
    if (this.canvas.width !== w * dpr || this.canvas.height !== h * dpr) {
      this.canvas.width = w * dpr;
      this.canvas.height = h * dpr;
    }

    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Fill outer background
    ctx.fillStyle = this.track.def.bgColor;
    ctx.fillRect(0, 0, w, h);

    const shakeX = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 2 : 0;
    const shakeY = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 2 : 0;

    // Responsive base zoom so both phones & tablets see plenty of upcoming corner
    const responsiveBase = Math.min(w, h) / 620;
    const finalZoom = this.camZoom * responsiveBase;

    ctx.save();
    ctx.translate(w * 0.5 + shakeX, h * 0.55 + shakeY);
    ctx.scale(finalZoom, finalZoom);
    ctx.translate(-this.camX, -this.camY);

    // Draw cached static track canvas
    const b = this.track.bounds;
    ctx.drawImage(
      this.staticTrackCanvas,
      b.minX,
      b.minY,
      b.maxX - b.minX,
      b.maxY - b.minY
    );

    // Skid marks
    for (const s of this.skidMarks) {
      ctx.strokeStyle = s.color;
      ctx.globalAlpha = s.alpha;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Sparks / particles
    for (const pt of this.particles) {
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw all racers + name tags
    for (const r of this.racers) {
      if (r.respawnTimer > 0 && Math.floor(r.respawnTimer * 12) % 2 === 0) continue;
      const car = getCarById(r.carId);
      const driver = getDriverById(r.driverId);

      // Soft drop shadow under car
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(r.x + 3, r.y + 4, 23, 12, r.angle, 0, Math.PI * 2);
      ctx.fill();

      drawCarWithDriver(
        ctx,
        car,
        driver,
        r.x,
        r.y,
        r.angle,
        r.steer,
        r.driftLevel,
        r.boostLeft,
        1.05,
        1
      );

      // Racer name pill above car
      ctx.font = r.isPlayer ? 'bold 11px system-ui, sans-serif' : '10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = r.isPlayer ? '#facc15' : '#e2e8f0';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 3;
      ctx.strokeText(r.name, r.x, r.y - 24);
      ctx.fillText(r.name, r.x, r.y - 24);
    }

    // Special Spookkasteel Bos darkness + real headlight cones!
    if (this.track.def.hasHeadlights) {
      ctx.save();
      // Draw darkness overlay over viewport world area using even-odd cutout cones?
      // Simpler & super clean: screen-space radial gradient + headlight cones!
      ctx.restore();
    }

    ctx.restore();

    // If Spookbos, draw darkness + warm headlight beams in screen space
    if (this.track.def.hasHeadlights) {
      ctx.save();
      // Create temporary dark veil via composite or gradient cutouts?
      // 'destination-out' on a scratch layer would affect canvas underneath; instead fill ambient night with radial glow around screen center + forward cone!
      ctx.fillStyle = 'rgba(2, 4, 14, 0.72)';
      ctx.beginPath();
      ctx.rect(0, 0, w, h);

      // Cut out bright area around player + forward cone using evenodd!
      const p = this.getPlayer();
      const px = w * 0.5 + (p.x - this.camX) * finalZoom + shakeX;
      const py = h * 0.55 + (p.y - this.camY) * finalZoom + shakeY;

      // Ambient halo around car
      ctx.moveTo(px + 95, py);
      ctx.arc(px, py, 95, 0, Math.PI * 2, true);

      // Long headlight beam forward
      const beamLen = 380 * finalZoom;
      const spread = 0.42;
      const a1 = p.angle - spread;
      const a2 = p.angle + spread;
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(a2) * beamLen, py + Math.sin(a2) * beamLen);
      ctx.lineTo(px + Math.cos(a1) * beamLen, py + Math.sin(a1) * beamLen);
      ctx.closePath();

      ctx.fill('evenodd');
      ctx.restore();
    }

    // Minimap in top-right below HUD
    this.renderMinimap(ctx, w);
  }

  private renderMinimap(ctx: CanvasRenderingContext2D, viewW: number): void {
    const mapSize = 86;
    const mx = viewW - mapSize - 12;
    const my = 72;
    const b = this.track.bounds;
    const span = Math.max(b.maxX - b.minX, b.maxY - b.minY);
    const s = (mapSize - 14) / span;

    ctx.save();
    ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(mx, my, mapSize, mapSize, 12);
    ctx.fill();
    ctx.stroke();

    const toMx = (wx: number): number => mx + 7 + (wx - b.minX) * s;
    const toMy = (wy: number): number => my + 7 + (wy - b.minY) * s;

    const pts = this.track.points;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(toMx(pts[0].x), toMy(pts[0].y));
    for (let i = 4; i < pts.length; i += 4) {
      ctx.lineTo(toMx(pts[i].x), toMy(pts[i].y));
    }
    ctx.closePath();
    ctx.stroke();

    for (const r of this.racers) {
      ctx.fillStyle = r.isPlayer ? '#facc15' : r.isRemote ? '#38bdf8' : '#ef4444';
      ctx.beginPath();
      ctx.arc(toMx(r.x), toMy(r.y), r.isPlayer ? 4.2 : 2.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function normalizeAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
