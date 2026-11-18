class RacerSoundFx {
  private ctx: AudioContext | null = null;
  private muted = false;
  private lastAt: Record<string, number> = {};
  private timers = new Set<number>();

  constructor() {
    try {
      this.muted = localStorage.getItem('turbo_drift_muted_v1') === '1';
    } catch {
      this.muted = false;
    }
  }

  private ensureCtx(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private canPlay(key: string, minMs: number): boolean {
    const now = performance.now();
    const prev = this.lastAt[key] ?? 0;
    if (now - prev < minMs) return false;
    this.lastAt[key] = now;
    return true;
  }

  private schedule(fn: () => void, ms: number): void {
    const id = window.setTimeout(() => {
      this.timers.delete(id);
      fn();
    }, ms);
    this.timers.add(id);
  }

  clearPending(): void {
    for (const id of this.timers) {
      window.clearTimeout(id);
    }
    this.timers.clear();
  }

  isMuted(): boolean {
    return this.muted;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem('turbo_drift_muted_v1', this.muted ? '1' : '0');
    } catch {
      // ignore
    }
    return this.muted;
  }

  private tone(freq: number, endFreq: number, dur: number, type: OscillatorType, vol = 0.08): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), now + dur);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur);
  }

  click(): void {
    if (!this.canPlay('click', 40)) return;
    this.tone(540, 720, 0.06, 'triangle', 0.05);
  }

  countdown(go: boolean): void {
    if (go) {
      this.tone(880, 1174, 0.25, 'sawtooth', 0.09);
    } else {
      this.tone(440, 420, 0.14, 'triangle', 0.07);
    }
  }

  driftTier(level: 1 | 2 | 3): void {
    if (!this.canPlay('drift', 80)) return;
    const base = level === 1 ? 520 : level === 2 ? 700 : 940;
    this.tone(base, base * 1.25, 0.09, 'sine', 0.07);
  }

  boost(power = 1): void {
    if (!this.canPlay('boost', 120)) return;
    this.tone(240 * power, 680 * power, 0.24, 'sawtooth', 0.08);
  }

  bump(): void {
    if (!this.canPlay('bump', 120)) return;
    this.tone(130, 55, 0.11, 'square', 0.07);
  }

  lap(finalLap: boolean): void {
    this.tone(523, 659, 0.12, 'triangle', 0.08);
    this.schedule(() => this.tone(finalLap ? 880 : 784, finalLap ? 1046 : 880, 0.18, 'triangle', 0.08), 100);
  }

  finish(win: boolean): void {
    const notes = win ? [523, 659, 784, 1046] : [440, 523, 587];
    notes.forEach((f, i) => {
      this.schedule(() => this.tone(f, f * 1.03, 0.16, 'triangle', 0.08), i * 95);
    });
  }
}

export const racerSound = new RacerSoundFx();
