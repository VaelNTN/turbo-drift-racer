import { Difficulty } from '../game/racerTypes';

export interface OnlineRacerSnapshot {
  deviceId: string;
  name: string;
  carId: number;
  driverId: number;
  x: number;
  y: number;
  angle: number;
  steer: number;
  speed: number;
  driftLevel: 0 | 1 | 2 | 3;
  boostLeft: number;
  lap: number;
  progress: number;
  finished: boolean;
  finishTimeMs: number;
  updatedAt: number;
}

export interface OnlineLeaderboardEntry {
  rank: number;
  deviceId: string;
  playerName: string;
  trackId: string;
  bestTimeMs: number;
  wins: number;
  carId: number;
  driverId: number;
  updatedAt: string;
}

const KEY_DEVICE = 'tdr_device_id_v1';
const KEY_NAME = 'tdr_player_name_v1';
const KEY_CAR = 'tdr_car_id_v1';
const KEY_DRIVER = 'tdr_driver_id_v1';
const KEY_TRACK = 'tdr_track_id_v1';
const KEY_DIFF = 'tdr_difficulty_v1';
const KEY_AUTOGAS = 'tdr_autogas_v1';
const KEY_API = 'tdr_api_url_v1';
const KEY_BESTS = 'tdr_track_bests_v1';

export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(KEY_DEVICE);
    if (!id) {
      id = `racer-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
      localStorage.setItem(KEY_DEVICE, id);
    }
    return id;
  } catch {
    return 'racer-local';
  }
}

export function getPlayerName(): string {
  try {
    return localStorage.getItem(KEY_NAME) || 'DriftKoning';
  } catch {
    return 'DriftKoning';
  }
}

export function setPlayerName(name: string): void {
  try {
    localStorage.setItem(KEY_NAME, name.trim().slice(0, 18) || 'DriftKoning');
  } catch {
    // ignore
  }
}

export function getSelectedCarId(): number {
  try {
    return Number(localStorage.getItem(KEY_CAR) || 0) || 0;
  } catch {
    return 0;
  }
}

export function setSelectedCarId(id: number): void {
  try {
    localStorage.setItem(KEY_CAR, String(id));
  } catch {
    // ignore
  }
}

export function getSelectedDriverId(): number {
  try {
    return Number(localStorage.getItem(KEY_DRIVER) || 0) || 0;
  } catch {
    return 0;
  }
}

export function setSelectedDriverId(id: number): void {
  try {
    localStorage.setItem(KEY_DRIVER, String(id));
  } catch {
    // ignore
  }
}

export function getSelectedTrackId(): string {
  try {
    return localStorage.getItem(KEY_TRACK) || 'zonnedal';
  } catch {
    return 'zonnedal';
  }
}

export function setSelectedTrackId(id: string): void {
  try {
    localStorage.setItem(KEY_TRACK, id);
  } catch {
    // ignore
  }
}

export function getDifficulty(): Difficulty {
  try {
    const v = localStorage.getItem(KEY_DIFF);
    if (v === 'easy' || v === 'medium' || v === 'hard') return v;
  } catch {
    // ignore
  }
  return 'medium';
}

export function setDifficulty(d: Difficulty): void {
  try {
    localStorage.setItem(KEY_DIFF, d);
  } catch {
    // ignore
  }
}

export function getAutoGas(): boolean {
  try {
    const v = localStorage.getItem(KEY_AUTOGAS);
    return v !== '0';
  } catch {
    return true;
  }
}

export function setAutoGas(enabled: boolean): void {
  try {
    localStorage.setItem(KEY_AUTOGAS, enabled ? '1' : '0');
  } catch {
    // ignore
  }
}

export function getApiUrl(): string {
  try {
    const saved = localStorage.getItem(KEY_API);
    if (saved) return saved;
  } catch {
    // ignore
  }
  const envUrl = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL || '';
  return envUrl.trim().replace(/\/+$/, '');
}

export function setApiUrl(url: string): void {
  try {
    localStorage.setItem(KEY_API, url.trim().replace(/\/+$/, ''));
  } catch {
    // ignore
  }
}

export function getLocalBestTimes(): Record<string, number> {
  try {
    const raw = localStorage.getItem(KEY_BESTS);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

export function saveLocalBestTime(trackId: string, timeMs: number): boolean {
  const bests = getLocalBestTimes();
  const prev = bests[trackId];
  if (!prev || timeMs < prev) {
    bests[trackId] = Math.round(timeMs);
    try {
      localStorage.setItem(KEY_BESTS, JSON.stringify(bests));
    } catch {
      // ignore
    }
    return true;
  }
  return false;
}

export async function submitRaceResult(
  trackId: string,
  timeMs: number,
  won: boolean,
  carId: number,
  driverId: number
): Promise<void> {
  const base = getApiUrl();
  if (!base || timeMs <= 0) return;
  try {
    await fetch(`${base}/api/turbo-drift/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: getDeviceId(),
        playerName: getPlayerName(),
        trackId,
        bestTimeMs: Math.round(timeMs),
        win: won,
        carId,
        driverId,
      }),
    });
  } catch {
    // ignore offline
  }
}

export async function fetchTrackLeaderboard(trackId: string): Promise<OnlineLeaderboardEntry[]> {
  const base = getApiUrl();
  if (!base) return [];
  try {
    const res = await fetch(
      `${base}/api/turbo-drift/highscores?trackId=${encodeURIComponent(trackId)}&limit=25&deviceId=${encodeURIComponent(getDeviceId())}`
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { entries?: OnlineLeaderboardEntry[] };
    return Array.isArray(data.entries) ? data.entries : [];
  } catch {
    return [];
  }
}

/**
 * Coordinates Online Multiplayer Rooms via:
 * 1) Cloudflare Worker HTTP polling (`/api/turbo-drift/rooms/:code/sync`) when `apiUrl` is set, AND
 * 2) Local `BroadcastChannel` so multiple tabs/windows on the same device can also race live!
 */
export class OnlineRoomClient {
  private roomCode: string;
  private trackId: string;
  private bc: BroadcastChannel | null = null;
  private remoteMap = new Map<string, OnlineRacerSnapshot>();
  private lastSyncAt = 0;
  private syncing = false;
  private myId = getDeviceId();

  constructor(roomCode: string, trackId: string) {
    this.roomCode = roomCode.toUpperCase();
    this.trackId = trackId;
    if (typeof BroadcastChannel !== 'undefined') {
      this.bc = new BroadcastChannel(`turbo-drift-room-${this.roomCode}-${this.trackId}`);
      this.bc.onmessage = (ev: MessageEvent<OnlineRacerSnapshot>) => {
        const msg = ev.data;
        if (msg && msg.deviceId && msg.deviceId !== this.myId) {
          this.remoteMap.set(msg.deviceId, { ...msg, updatedAt: Date.now() });
        }
      };
    }
  }

  getRemoteRacers(): OnlineRacerSnapshot[] {
    const now = Date.now();
    const list: OnlineRacerSnapshot[] = [];
    for (const [id, snap] of this.remoteMap.entries()) {
      if (now - snap.updatedAt < 8000) {
        list.push(snap);
      } else {
        this.remoteMap.delete(id);
      }
    }
    return list;
  }

  pushAndPoll(mine: OnlineRacerSnapshot): void {
    const now = Date.now();
    if (this.bc) {
      this.bc.postMessage(mine);
    }

    const base = getApiUrl();
    if (!base) return;
    if (this.syncing || now - this.lastSyncAt < 180) return;

    this.syncing = true;
    this.lastSyncAt = now;
    void fetch(`${base}/api/turbo-drift/rooms/${encodeURIComponent(this.roomCode)}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackId: this.trackId,
        racer: mine,
      }),
    })
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { racers?: OnlineRacerSnapshot[] };
        if (Array.isArray(data.racers)) {
          const ts = Date.now();
          for (const r of data.racers) {
            if (r.deviceId && r.deviceId !== this.myId) {
              this.remoteMap.set(r.deviceId, { ...r, updatedAt: ts });
            }
          }
        }
      })
      .catch(() => {
        // fallback stays smooth
      })
      .finally(() => {
        this.syncing = false;
      });
  }

  close(): void {
    if (this.bc) {
      this.bc.close();
      this.bc = null;
    }
  }
}
