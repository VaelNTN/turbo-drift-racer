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
  isSmoke: boolean;
}

interface FloatingPopup {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

interface AmbientMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
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
  braking: boolean;
  drifting: boolean;
  driftDir: number; // -1 left, +1 right, 0 none
  driftCharge: number; // seconds
  driftLevel: 0 | 1 | 2 | 3;
  boostLeft: number;
  boostTier: 0 | 1 | 2 | 3;
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
  'TurboTim',
  'NinaDrift',
  'MaxVeloce',
  'PixelSam',
  'RubyApex',
  'BlitzKarl',
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
  private popups: FloatingPopup[] = [];
  private ambientMotes: AmbientMote[] = [];

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
  private animTime = 0;
  private finishedEmitted = false;
  private rafId = 0;
  private running = false;
  private paused = false;
  private lastTs = 0;
  private lastHudPush = 0;
  private wrongWayTimer = 0;
  private wrongWay = false;

  private camX = 0;
  private camY = 0;
  private camZoom = 1;
  private shake = 0;

  private cssW = 0;
  private cssH = 0;
  private dpr = 1;
  private cachedMinimapTop = 56;
  private lastMinimapMeasure = 0;

  private lightCanvas: HTMLCanvasElement | null = null;
  private lightCtx: CanvasRenderingContext2D | null = null;

  private onHud: (snap: RaceHudSnapshot) => void;
  private onFinish?: (snap: RaceHudSnapshot) => void;

  private boundResize = (): void => {
    this.lastMinimapMeasure = 0;
    this.syncCanvasMetrics();
  };
  private boundOrientation = (): void => {
    window.setTimeout(() => {
      this.lastMinimapMeasure = 0;
      this.syncCanvasMetrics();
    }, 90);
  };
  private boundVisibility = (): void => {
    if (!document.hidden) {
      this.lastTs = performance.now();
    }
  };

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
    this.initAmbientMotes();
  }

  private initAmbientMotes(): void {
    const b = this.track.bounds;
    const w = b.maxX - b.minX;
    const h = b.maxY - b.minY;
    for (let i = 0; i < 65; i++) {
      this.ambientMotes.push({
        x: b.minX + Math.random() * w,
        y: b.minY + Math.random() * h,
        vx: (Math.random() - 0.5) * 32,
        vy: this.track.def.theme === 'volcano' ? -25 - Math.random() * 25 : 18 + Math.random() * 22,
        size: 2 + Math.random() * 3,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  private syncCanvasMetrics(): void {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = Math.max(1, Math.round(rect.width * dpr));
    const ch = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw;
      this.canvas.height = ch;
    }
    this.cssW = rect.width;
    this.cssH = rect.height;
    this.dpr = dpr;
  }

  private initGrid(playerCarId: number, playerDriverId: number): void {
    const pts = this.track.points;
    const n = pts.length;
    const totalRacers = 6;
    const playerName = getPlayerName();
    const myDeviceId = getDeviceId();

    const aiDiffFactor =
      this.difficulty === 'easy' ? 0.81 : this.difficulty === 'medium' ? 0.94 : 1.03;

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
        braking: false,
        drifting: false,
        driftDir: 0,
        driftCharge: 0,
        driftLevel: 0,
        boostLeft: 0,
        boostTier: 0,
        respawnTimer: 0,
        hazardCooldown: 0,
        segIndex: segIdx,
        lap: 0,
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

  pause(): void {
    if (this.paused || this.finishedEmitted) return;
    this.paused = true;
    this.setInput({ left: false, right: false, gas: false, brake: false, drift: false });
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.lastTs = performance.now();
  }

  isPaused(): boolean {
    return this.paused;
  }

  start(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.running = true;
    this.syncCanvasMetrics();
    window.addEventListener('resize', this.boundResize);
    window.addEventListener('orientationchange', this.boundOrientation);
    document.addEventListener('visibilitychange', this.boundVisibility);

    this.lastTs = performance.now();
    const tick = (ts: number): void => {
      if (!this.running) return;
      const dt = Math.min(0.05, Math.max(0.001, (ts - this.lastTs) / 1000));
      this.lastTs = ts;
      if (!this.paused) {
        this.update(dt);
      }
      this.render();
      if (!this.paused && ts - this.lastHudPush > 75) {
        this.lastHudPush = ts;
        this.emitHud();
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
    this.emitHud();
  }

  destroy(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    window.removeEventListener('resize', this.boundResize);
    window.removeEventListener('orientationchange', this.boundOrientation);
    document.removeEventListener('visibilitychange', this.boundVisibility);
    racerSound.clearPending();
    if (this.roomClient) {
      this.roomClient.close();
      this.roomClient = null;
    }
  }

  private getPlayer(): SimRacer {
    return this.racers.find((r) => r.isPlayer)!;
  }

  private pushPopup(x: number, y: number, text: string, color: string): void {
    if (this.popups.length >= 16) this.popups.shift();
    this.popups.push({ x, y, text, color, life: 0.72, maxLife: 0.72 });
  }

  private update(dt: number): void {
    this.animTime += dt;

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
        if (r.isPlayer) {
          const targetSteer = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
          r.steer += (targetSteer - r.steer) * Math.min(1, dt * 10);
          r.braking = this.input.brake;
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

    // Update ambient motes
    const b = this.track.bounds;
    for (const m of this.ambientMotes) {
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      if (m.x < b.minX) m.x = b.maxX;
      else if (m.x > b.maxX) m.x = b.minX;
      if (m.y < b.minY) m.y = b.maxY;
      else if (m.y > b.maxY) m.y = b.minY;
    }

    // Update particles (sparks & expanding tire smoke)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      if (pt.isSmoke) {
        pt.vx *= 0.94;
        pt.vy *= 0.94;
        pt.size += dt * 14;
      }
      pt.life -= dt;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }
    if (this.particles.length > 180) {
      this.particles.splice(0, this.particles.length - 180);
    }

    // Persistent-fading skidmarks
    for (let i = this.skidMarks.length - 1; i >= 0; i--) {
      this.skidMarks[i].alpha -= dt * 0.11;
      if (this.skidMarks[i].alpha <= 0.02) {
        this.skidMarks.splice(i, 1);
      }
    }
    if (this.skidMarks.length > 360) {
      this.skidMarks.splice(0, this.skidMarks.length - 360);
    }

    // Floating popups
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const pop = this.popups[i];
      pop.life -= dt;
      pop.y -= dt * 36;
      if (pop.life <= 0) this.popups.splice(i, 1);
    }

    // Smooth camera follow player
    const player = this.getPlayer();
    const lookX = player.x + Math.cos(player.angle) * Math.min(95, player.speed * 0.17);
    const lookY = player.y + Math.sin(player.angle) * Math.min(95, player.speed * 0.17);
    this.camX += (lookX - this.camX) * Math.min(1, dt * 8);
    this.camY += (lookY - this.camY) * Math.min(1, dt * 8);
    const targetZoom = player.boostLeft > 0 ? 0.93 : 1.02 - Math.min(0.1, (player.speed / 650) * 0.08);
    this.camZoom += (targetZoom - this.camZoom) * Math.min(1, dt * 4);
    this.shake = Math.max(0, this.shake - dt * 16);

    // Wrong-way detection
    const curPt = this.track.points[player.segIndex];
    const headingDot = Math.cos(player.angle) * curPt.tx + Math.sin(player.angle) * curPt.ty;
    if (canDrive && !player.finished && player.respawnTimer <= 0 && player.speed > 40 && headingDot < -0.35) {
      this.wrongWayTimer = Math.min(2, this.wrongWayTimer + dt);
    } else {
      this.wrongWayTimer = Math.max(0, this.wrongWayTimer - dt * 2.5);
    }
    this.wrongWay = this.wrongWayTimer > 0.38;

    if (player.finished && !this.finishedEmitted) {
      this.finishedEmitted = true;
      this.wrongWay = false;
      const snap = this.buildHudSnapshot();
      const win = snap.place === 1;
      racerSound.finish(win);
      this.emitHud();
      if (this.onFinish) this.onFinish(snap);
    }
  }

  private mergeRemoteRacers(remotes: OnlineRacerSnapshot[]): void {
    const activeIds = new Set(remotes.map((r) => r.deviceId));
    for (const remote of remotes) {
      if (!Number.isFinite(remote.x) || !Number.isFinite(remote.y) || !Number.isFinite(remote.angle)) {
        continue;
      }
      let existing = this.racers.find((r) => r.id === remote.deviceId);
      if (!existing) {
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
          braking: false,
          drifting: remote.driftLevel > 0,
          driftDir: 0,
          driftCharge: 0,
          driftLevel: remote.driftLevel,
          boostLeft: remote.boostLeft,
          boostTier: remote.boostLeft > 0 ? 1 : 0,
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

    // NaN/Infinity guard
    if (!Number.isFinite(r.x) || !Number.isFinite(r.y) || !Number.isFinite(r.speed) || !Number.isFinite(r.angle)) {
      const safePt = pts[Math.max(0, Math.min(n - 1, r.segIndex))];
      r.x = safePt.x;
      r.y = safePt.y;
      r.angle = Math.atan2(safePt.ty, safePt.tx);
      r.velAngle = r.angle;
      r.speed = 120;
    }

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
    if (r.boostLeft <= 0) r.boostTier = 0;

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
      const targetIdx = (r.segIndex + r.aiLookAhead) % n;
      const tp = pts[targetIdx];
      const tx = tp.x + tp.nx * (r.aiTargetOffset * halfW);
      const ty = tp.y + tp.ny * (r.aiTargetOffset * halfW);
      const desiredAngle = Math.atan2(ty - r.y, tx - r.x);
      const deltaAngle = normalizeAngle(desiredAngle - r.angle);
      steerCmd = Math.max(-1, Math.min(1, deltaAngle * 2.2));
      wantGas = true;

      if (!r.finished && this.difficulty !== 'easy' && Math.abs(deltaAngle) > 0.36 && r.speed > 280) {
        r.aiDriftTimer = 0.55;
      }
      if (r.aiDriftTimer > 0) {
        r.aiDriftTimer -= dt;
        wantDrift = true;
      }
    }

    r.braking = wantBrake;
    r.steer += (steerCmd - r.steer) * Math.min(1, dt * 14);

    // Stat scaling
    const baseMaxSpeed = 435 + car.topSpeedStat * 13;
    const baseAccel = 310 + car.accelStat * 18;
    const driftBonusGrip = 0.8 + car.driftStat * 0.04;
    const skillMult = r.isPlayer ? 1.0 : r.finished ? 0.65 : r.aiSkillMult;
    const boostMult = r.boostLeft > 0 ? 1.36 : 1.0;

    // Closest road segment in local window (safe for Figure-8)
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
        this.pushPopup(r.x, r.y - 34, r.lap === this.track.def.laps ? 'FINAL LAP!' : `LAP ${r.lap}!`, '#facc15');
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
        if (r.boostLeft < 0.75 && r.isPlayer) {
          racerSound.boost(1.1);
          this.pushPopup(r.x, r.y - 34, 'PAD TURBO!', '#22d3ee');
        }
        r.boostLeft = Math.max(r.boostLeft, 0.95);
        r.boostTier = Math.max(r.boostTier, 2) as 0 | 1 | 2 | 3;
        r.speed = Math.max(r.speed, baseMaxSpeed * 1.28);
      }
    }

    // Rainbow skybridge fall-off vs guardrails
    if (distFromCenter > halfW + 14) {
      if (!this.track.def.hasGuardrails) {
        if (distFromCenter > halfW + 46) {
          r.respawnTimer = 0.85;
          r.speed = 0;
          if (r.isPlayer) racerSound.bump();
          return;
        }
      } else {
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
      const driftTurnRate = (r.driftDir * 2.15 + steerCmd * 1.15) * driftBonusGrip;
      r.angle = normalizeAngle(r.angle + driftTurnRate * dt);

      const grip = onIce ? 2.4 : 4.2 * this.track.def.gripFactor;
      const targetVelAngle = r.angle - r.driftDir * 0.34;
      r.velAngle = normalizeAngle(r.velAngle + normalizeAngle(targetVelAngle - r.velAngle) * Math.min(1, dt * grip));

      const chargeSpeed = Math.abs(steerCmd) > 0.15 ? 1.18 : 0.75;
      r.driftCharge += dt * chargeSpeed;
      const prevLvl = r.driftLevel;
      const nextLvl: 0 | 1 | 2 | 3 =
        r.driftCharge >= 1.75 ? 3 : r.driftCharge >= 1.0 ? 2 : r.driftCharge >= 0.42 ? 1 : 0;
      r.driftLevel = nextLvl;

      if (r.isPlayer && nextLvl > prevLvl && nextLvl !== 0) {
        racerSound.driftTier(nextLvl);
        const label = nextLvl === 1 ? 'DRIFT x1!' : nextLvl === 2 ? 'DRIFT x2!' : 'ULTRA DRIFT x3!';
        const col = nextLvl === 1 ? '#38bdf8' : nextLvl === 2 ? '#fb923c' : '#e879f9';
        this.pushPopup(r.x, r.y - 30, label, col);
      }

      this.emitDriftEffects(r);
    } else {
      if (r.drifting) {
        if (r.driftLevel > 0) {
          const boostDur = r.driftLevel === 1 ? 0.55 : r.driftLevel === 2 ? 0.95 : 1.45;
          r.boostLeft = Math.max(r.boostLeft, boostDur);
          r.boostTier = Math.max(r.boostTier, r.driftLevel) as 0 | 1 | 2 | 3;
          r.speed = Math.max(r.speed, baseMaxSpeed * (1.14 + r.driftLevel * 0.08));
          if (r.isPlayer) {
            racerSound.boost(0.9 + r.driftLevel * 0.15);
            this.shake = Math.max(this.shake, 2 + r.driftLevel * 1.2);
            const tLabel = r.driftLevel === 3 ? 'ULTRA TURBO!' : r.driftLevel === 2 ? 'SUPER TURBO!' : 'TURBO!';
            const tCol = r.driftLevel === 3 ? '#e879f9' : r.driftLevel === 2 ? '#fb923c' : '#38bdf8';
            this.pushPopup(r.x, r.y - 34, tLabel, tCol);
          }
        }
        r.drifting = false;
        r.driftDir = 0;
        r.driftCharge = 0;
        r.driftLevel = 0;
      }
      r.hasPrevSkid = false;

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
      const alpha = r.driftLevel > 0 ? 0.58 : 0.36;
      this.skidMarks.push({ x1: r.prevRearLX, y1: r.prevRearLY, x2: rlx, y2: rly, color: skidColor, alpha });
      this.skidMarks.push({ x1: r.prevRearRX, y1: r.prevRearRY, x2: rrx, y2: rry, color: skidColor, alpha });
    }
    r.prevRearLX = rlx;
    r.prevRearLY = rly;
    r.prevRearRX = rrx;
    r.prevRearRY = rry;
    r.hasPrevSkid = true;

    // Tire smoke plumes
    if (this.particles.length < 165 && Math.random() < 0.55) {
      const sx = Math.random() < 0.5 ? rlx : rrx;
      const sy = Math.random() < 0.5 ? rly : rry;
      this.particles.push({
        x: sx,
        y: sy,
        vx: -Math.cos(r.angle) * 35 + (Math.random() - 0.5) * 30,
        vy: -Math.sin(r.angle) * 35 + (Math.random() - 0.5) * 30,
        life: 0.42,
        maxLife: 0.42,
        color: this.track.def.theme === 'ice' ? '#e0f2fe' : '#cbd5e1',
        size: 5 + Math.random() * 4,
        isSmoke: true,
      });
    }

    // Mini-turbo sparks
    if (r.driftLevel > 0 && this.particles.length < 175 && Math.random() < 0.7) {
      const sparkColor =
        r.driftLevel === 3 ? '#e879f9' : r.driftLevel === 2 ? '#fb923c' : '#38bdf8';
      const rearX = (rlx + rrx) * 0.5;
      const rearY = (rly + rry) * 0.5;
      this.particles.push({
        x: rearX,
        y: rearY,
        vx: -Math.cos(r.angle) * 95 + (Math.random() - 0.5) * 95,
        vy: -Math.sin(r.angle) * 95 + (Math.random() - 0.5) * 95,
        life: 0.28,
        maxLife: 0.28,
        color: sparkColor,
        size: 3 + r.driftLevel * 1.2,
        isSmoke: false,
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

  private computeUpcomingTurn(player: SimRacer): 'none' | 'left' | 'right' | 'crossing' {
    if (this.countdownTimer > 0 || player.finished || this.wrongWay) return 'none';
    const pts = this.track.points;
    const n = pts.length;
    const idx = player.segIndex;

    if (this.track.def.isFigure8) {
      const mid = Math.floor(n * 0.5);
      const distTo0 = (n - idx) % n;
      const distToMid = (mid - idx + n) % n;
      if ((distTo0 >= 3 && distTo0 <= 22) || (distToMid >= 3 && distToMid <= 22)) {
        return 'crossing';
      }
    }

    const pNow = pts[(idx + 4) % n];
    const pAhead = pts[(idx + 18) % n];
    const angNow = Math.atan2(pNow.ty, pNow.tx);
    const angAhead = Math.atan2(pAhead.ty, pAhead.tx);
    const delta = normalizeAngle(angAhead - angNow);
    if (delta < -0.52) return 'left';
    if (delta > 0.52) return 'right';
    return 'none';
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
      wrongWay: this.wrongWay,
      upcomingTurn: this.computeUpcomingTurn(player),
    };
  }

  private emitHud(): void {
    this.onHud(this.buildHudSnapshot());
  }

  private renderFeatheredHeadlights(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    camCenterY: number,
    finalZoom: number,
    shakeX: number,
    shakeY: number
  ): void {
    const scale = 0.5;
    const lw = Math.max(120, Math.round(w * scale));
    const lh = Math.max(120, Math.round(h * scale));

    if (!this.lightCanvas) {
      this.lightCanvas = document.createElement('canvas');
      this.lightCtx = this.lightCanvas.getContext('2d');
    }
    if (!this.lightCanvas || !this.lightCtx) return;
    if (this.lightCanvas.width !== lw || this.lightCanvas.height !== lh) {
      this.lightCanvas.width = lw;
      this.lightCanvas.height = lh;
    }

    const lctx = this.lightCtx;
    lctx.save();
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.globalCompositeOperation = 'source-over';
    lctx.clearRect(0, 0, lw, lh);

    // Rich midnight forest darkness veil
    lctx.fillStyle = 'rgba(2, 5, 16, 0.80)';
    lctx.fillRect(0, 0, lw, lh);

    // Punch soft feathered light halos & headlight beams for EVERY racer (player + AI + remote)
    lctx.globalCompositeOperation = 'destination-out';
    const visibleGlows: Array<{ sx: number; sy: number; angle: number; isPlayer: boolean }> = [];

    for (const r of this.racers) {
      if (r.respawnTimer > 0) continue;
      const sx = w * 0.5 + (r.x - this.camX) * finalZoom + shakeX;
      const sy = camCenterY + (r.y - this.camY) * finalZoom + shakeY;
      if (sx < -420 || sx > w + 420 || sy < -420 || sy > h + 420) continue;

      visibleGlows.push({ sx, sy, angle: r.angle, isPlayer: r.isPlayer });

      const lx = sx * scale;
      const ly = sy * scale;
      const cos = Math.cos(r.angle);
      const sin = Math.sin(r.angle);

      // Soft ambient visibility halo around the car
      const haloR = (r.isPlayer ? 105 : 68) * finalZoom * scale;
      const haloGrad = lctx.createRadialGradient(lx, ly, haloR * 0.12, lx, ly, haloR);
      haloGrad.addColorStop(0, r.isPlayer ? 'rgba(0,0,0,0.96)' : 'rgba(0,0,0,0.82)');
      haloGrad.addColorStop(0.6, r.isPlayer ? 'rgba(0,0,0,0.52)' : 'rgba(0,0,0,0.36)');
      haloGrad.addColorStop(1, 'rgba(0,0,0,0)');
      lctx.fillStyle = haloGrad;
      lctx.beginPath();
      lctx.arc(lx, ly, haloR, 0, Math.PI * 2);
      lctx.fill();

      // Volumetric feathered headlight beam using smooth overlapping radial pools
      const beamLen = (r.isPlayer ? 365 : 275) * finalZoom * scale;
      const steps = 6;
      for (let i = 1; i <= steps; i++) {
        const frac = i / steps;
        const bx = lx + cos * (beamLen * frac * 0.9);
        const by = ly + sin * (beamLen * frac * 0.9);
        const br = (r.isPlayer ? 28 : 22) * finalZoom * scale + beamLen * frac * 0.34;
        const alpha = (r.isPlayer ? 0.94 : 0.78) * (1 - frac * 0.38);
        const g = lctx.createRadialGradient(bx, by, br * 0.08, bx, by, br);
        g.addColorStop(0, `rgba(0,0,0,${alpha.toFixed(3)})`);
        g.addColorStop(0.55, `rgba(0,0,0,${(alpha * 0.48).toFixed(3)})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        lctx.fillStyle = g;
        lctx.beginPath();
        lctx.arc(bx, by, br, 0, Math.PI * 2);
        lctx.fill();
      }
    }
    lctx.restore();

    // Composite darkness mask over the viewport
    ctx.save();
    ctx.drawImage(this.lightCanvas, 0, 0, w, h);

    // Subtle warm golden-white beam tint ahead of each car's headlamps
    ctx.globalCompositeOperation = 'lighter';
    for (const g of visibleGlows) {
      const cos = Math.cos(g.angle);
      const sin = Math.sin(g.angle);
      const len = (g.isPlayer ? 220 : 165) * finalZoom;
      const gx = g.sx + cos * (len * 0.55);
      const gy = g.sy + sin * (len * 0.55);
      const rad = len * 0.58;
      const warm = ctx.createRadialGradient(gx, gy, rad * 0.05, gx, gy, rad);
      warm.addColorStop(0, g.isPlayer ? 'rgba(254, 243, 199, 0.14)' : 'rgba(224, 242, 254, 0.10)');
      warm.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = warm;
      ctx.beginPath();
      ctx.arc(gx, gy, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private render(): void {
    this.syncCanvasMetrics();
    if (this.cssW < 2 || this.cssH < 2) return;

    const w = this.cssW;
    const h = this.cssH;
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // Fill outer background
    ctx.fillStyle = this.track.def.bgColor;
    ctx.fillRect(0, 0, w, h);

    const shakeX = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 2 : 0;
    const shakeY = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 2 : 0;

    // Responsive base zoom so both phones & tablets see plenty of upcoming corner
    const responsiveBase = Math.min(w, h) / 620;
    const finalZoom = this.camZoom * responsiveBase;
    const camCenterY = w > h && h < 540 ? h * 0.5 : h * 0.54;

    ctx.save();
    ctx.translate(w * 0.5 + shakeX, camCenterY + shakeY);
    ctx.scale(finalZoom, finalZoom);
    ctx.translate(-this.camX, -this.camY);

    // 1. Cached static track canvas
    const b = this.track.bounds;
    ctx.drawImage(
      this.staticTrackCanvas,
      b.minX,
      b.minY,
      b.maxX - b.minX,
      b.maxY - b.minY
    );

    // 2. Animated trackside environment & start gantry lights
    this.drawAnimatedTrackProps(ctx);

    // 3. Fading skid marks
    ctx.lineWidth = 4;
    for (const s of this.skidMarks) {
      ctx.strokeStyle = s.color;
      ctx.globalAlpha = s.alpha;
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 4. Tire smoke & drift sparks
    for (const pt of this.particles) {
      const ratio = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = pt.isSmoke ? ratio * 0.45 : ratio;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 5. All racers + name tags
    for (const r of this.racers) {
      if (r.respawnTimer > 0 && Math.floor(r.respawnTimer * 12) % 2 === 0) continue;
      const car = getCarById(r.carId);
      const driver = getDriverById(r.driverId);

      // Soft drop shadow under car
      ctx.fillStyle = 'rgba(0,0,0,0.38)';
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
        1,
        r.boostTier,
        r.braking
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

    // 6. Overhead Checkered Start/Finish Banner spanning gantry towers
    this.drawOverheadStartBanner(ctx);

    // 7. Floating DRIFT / TURBO popups
    for (const pop of this.popups) {
      const alpha = Math.max(0, Math.min(1, pop.life / pop.maxLife));
      ctx.globalAlpha = alpha;
      ctx.font = '900 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 3.5;
      ctx.strokeText(pop.text, pop.x, pop.y);
      ctx.fillStyle = pop.color;
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    // 8. Screen-space Speed Lines when boosting!
    const player = this.getPlayer();
    if (player.boostLeft > 0 || player.speed > 510) {
      this.drawSpeedLines(ctx, w, h, player.boostLeft > 0 ? 0.34 : 0.14, player.boostTier);
    }

    // 9. Haunted Castle Woods darkness + soft feathered headlights for ALL racers
    if (this.track.def.hasHeadlights) {
      this.renderFeatheredHeadlights(ctx, w, h, camCenterY, finalZoom, shakeX, shakeY);
    }

    // 10. Minimap in top-right below HUD (zero overlap)
    this.renderMinimap(ctx, w, h);
  }

  private drawAnimatedTrackProps(ctx: CanvasRenderingContext2D): void {
    const theme = this.track.def.theme;
    const halfW = this.track.def.roadWidth * 0.5;
    const pts = this.track.points;

    // Animated boost pad pulse glow
    const padPulse = 0.5 + Math.sin(this.animTime * 8) * 0.35;
    for (const pad of this.track.boostPads) {
      const bp = pts[pad.segmentIndex];
      const bx = bp.x + bp.nx * (pad.lateralOffset * halfW);
      const by = bp.y + bp.ny * (pad.lateralOffset * halfW);
      ctx.fillStyle = `rgba(34, 211, 238, ${(padPulse * 0.25).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(bx, by, 28, 0, Math.PI * 2);
      ctx.fill();
    }

    // Animated volcano lava / neon beacons / ice snow / space stars / spooky wisps
    for (const m of this.ambientMotes) {
      const shimmer = 0.45 + Math.sin(this.animTime * 4 + m.phase) * 0.35;
      ctx.globalAlpha = shimmer;
      if (theme === 'volcano') {
        ctx.fillStyle = '#fb923c';
      } else if (theme === 'ice') {
        ctx.fillStyle = '#e0f2fe';
      } else if (theme === 'neon') {
        ctx.fillStyle = m.phase > Math.PI ? '#22d3ee' : '#ec4899';
      } else if (theme === 'rainbow') {
        ctx.fillStyle = m.phase > Math.PI ? '#fde047' : '#c084fc';
      } else if (theme === 'spooky') {
        ctx.fillStyle = '#a855f7';
      } else if (theme === 'desert') {
        ctx.fillStyle = '#fde68a';
      } else {
        ctx.fillStyle = '#bbf7d0';
      }
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawOverheadStartBanner(ctx: CanvasRenderingContext2D): void {
    const sp = this.track.points[0];
    const halfW = this.track.def.roadWidth * 0.5;

    ctx.save();
    ctx.translate(sp.x, sp.y);
    ctx.rotate(Math.atan2(sp.ty, sp.tx));

    // Checkered gantry bridge banner
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-10, -halfW - 18, 20, this.track.def.roadWidth + 36);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeRect(-10, -halfW - 18, 20, this.track.def.roadWidth + 36);

    // Mini checkered banner strip on gantry
    const strips = 10;
    const sh = (this.track.def.roadWidth + 20) / strips;
    for (let i = 0; i < strips; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#f8fafc' : '#1e293b';
      ctx.fillRect(-4, -halfW - 10 + i * sh, 8, sh);
    }

    // Stadium floodlight glow cones at gantry towers
    for (const side of [-1, 1]) {
      const gy = side * (halfW + 18);
      ctx.fillStyle = 'rgba(254, 249, 195, 0.14)';
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(-42, gy - side * 70);
      ctx.lineTo(42, gy - side * 70);
      ctx.closePath();
      ctx.fill();

      // Countdown / Race light pod
      const lightColor =
        this.countdownTimer > 1.2
          ? '#ef4444'
          : this.countdownTimer > 0.05
            ? '#facc15'
            : '#22c55e';
      ctx.fillStyle = lightColor;
      ctx.beginPath();
      ctx.arc(0, gy, 5.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawSpeedLines(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    alpha: number,
    tier: 0 | 1 | 2 | 3
  ): void {
    const cx = w * 0.5;
    const cy = h * 0.55;
    const maxR = Math.hypot(w, h) * 0.55;
    const minR = Math.min(w, h) * 0.34;

    ctx.save();
    ctx.strokeStyle =
      tier === 3 ? '#f5d0fe' : tier === 2 ? '#fed7aa' : tier === 1 ? '#bae6fd' : '#ffffff';
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 2;

    const count = 18;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.sin(this.animTime * 22 + i) * 0.08;
      const r0 = minR + ((i * 37 + Math.floor(this.animTime * 40)) % 45);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
      ctx.stroke();
    }
    ctx.restore();
  }

  private getMinimapTop(viewH: number, mapSize: number): number {
    const now = performance.now();
    if (now - this.lastMinimapMeasure > 400) {
      this.lastMinimapMeasure = now;
      const safeTopStr = getComputedStyle(document.documentElement).getPropertyValue('--safe-top');
      const safeTop = Number.parseFloat(safeTopStr) || 0;
      const hudEl = document.querySelector('.race-hud-top');
      const hudBottom = hudEl ? hudEl.getBoundingClientRect().bottom : 0;
      this.cachedMinimapTop = Math.max(safeTop + 52, hudBottom > 0 ? Math.ceil(hudBottom + 8) : 52);
    }
    return Math.min(this.cachedMinimapTop, Math.max(44, viewH - mapSize - 110));
  }

  private renderMinimap(ctx: CanvasRenderingContext2D, viewW: number, viewH: number): void {
    const mapSize = viewW < 400 || viewH < 460 ? 68 : 84;
    const safeRightStr = getComputedStyle(document.documentElement).getPropertyValue('--safe-right');
    const safeRight = Number.parseFloat(safeRightStr) || 0;
    const mx = viewW - mapSize - Math.max(10, safeRight + 8);
    const my = this.getMinimapTop(viewH, mapSize);
    const b = this.track.bounds;
    const span = Math.max(b.maxX - b.minX, b.maxY - b.minY);
    const s = (mapSize - 14) / span;

    ctx.save();
    ctx.fillStyle = 'rgba(2, 6, 23, 0.74)';
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
