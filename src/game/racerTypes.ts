export type Difficulty = 'easy' | 'medium' | 'hard';
export type RaceMode = 'ai' | 'online';

export type ChassisKind =
  | 'f1'
  | 'supercar'
  | 'muscle'
  | 'rally'
  | 'kart'
  | 'pickup'
  | 'monster'
  | 'hotrod'
  | 'van'
  | 'cyberpod'
  | 'ufo'
  | 'tank'
  | 'buggy'
  | 'driftcoupe';

export interface CarDef {
  id: number;
  name: string;
  chassis: ChassisKind;
  chassisLabel: string;
  primary: string;
  secondary: string;
  accent: string;
  underglow: string;
  topSpeedStat: number; // 1..10
  accelStat: number; // 1..10
  driftStat: number; // 1..10
}

export type DriverArchetype =
  | 'racer'
  | 'ninja'
  | 'robot'
  | 'alien'
  | 'pirate'
  | 'knight'
  | 'king'
  | 'astronaut'
  | 'cat'
  | 'dog'
  | 'wizard'
  | 'cowboy'
  | 'dino'
  | 'punk';

export interface DriverDef {
  id: number;
  name: string;
  archetype: DriverArchetype;
  archetypeLabel: string;
  skin: string;
  suit: string;
  accent: string;
  visor: string;
}

export interface SplinePoint {
  x: number;
  y: number;
  tx: number; // unit tangent x
  ty: number; // unit tangent y
  nx: number; // unit right normal x
  ny: number; // unit right normal y
  dist: number; // cumulative distance from start
}

export interface BoostPad {
  segmentIndex: number;
  lateralOffset: number; // -0.5 .. 0.5 of halfWidth
}

export interface TrackHazard {
  segmentIndex: number;
  lateralOffset: number;
  radius: number;
  kind: 'ice' | 'slime' | 'lava';
}

export interface TrackDef {
  id: string;
  name: string;
  subtitle: string;
  isSpecial: boolean;
  specialBadge?: string;
  laps: number;
  roadWidth: number;
  bgColor: string;
  bgAccent: string;
  roadColor: string;
  curbA: string;
  curbB: string;
  lineColor: string;
  gripFactor: number;
  hasGuardrails: boolean;
  hasHeadlights: boolean;
  isFigure8: boolean;
  theme: 'classic' | 'desert' | 'neon' | 'ice' | 'volcano' | 'rainbow' | 'spooky' | 'figure8';
  controlPoints: Array<[number, number]>;
  boostIndices: number[];
  hazardSpecs: Array<{ t: number; lateral: number; radius: number; kind: 'ice' | 'slime' | 'lava' }>;
}

export interface RacerProgressEntry {
  id: string;
  name: string;
  isPlayer: boolean;
  isRemote: boolean;
  carId: number;
  driverId: number;
  place: number;
  lap: number;
  totalLaps: number;
  finished: boolean;
  finishTimeMs: number;
  progress: number;
}

export interface RaceHudSnapshot {
  countdown: number; // 3, 2, 1, 0(GO), -1(racing)
  place: number;
  totalRacers: number;
  lap: number;
  totalLaps: number;
  speedKmh: number;
  driftLevel: 0 | 1 | 2 | 3;
  driftCharge: number; // 0..1
  boostLeft: number;
  raceTimeMs: number;
  finished: boolean;
  standings: RacerProgressEntry[];
  respawning: boolean;
  onlineConnectedCount: number;
}
