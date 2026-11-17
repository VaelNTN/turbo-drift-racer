import './style.css';
import {
  fetchTrackLeaderboard,
  getApiUrl,
  getAutoGas,
  getDifficulty,
  getLocalBestTimes,
  getPlayerName,
  getSelectedCarId,
  getSelectedDriverId,
  getSelectedTrackId,
  saveLocalBestTime,
  setApiUrl,
  setAutoGas,
  setDifficulty,
  setPlayerName,
  setSelectedCarId,
  setSelectedDriverId,
  setSelectedTrackId,
  submitRaceResult,
} from './api/online';
import { CARS, DRIVERS, drawCarWithDriver, drawDriverAvatar, getCarById, getDriverById } from './game/racerCatalog';
import { TurboDriftEngine } from './game/racerEngine';
import { TRACKS } from './game/racerTracks';
import { Difficulty, RaceHudSnapshot, RaceMode } from './game/racerTypes';
import { racerSound } from './game/sound';

const app = document.getElementById('app')!;

let raceMode: RaceMode = 'ai';
let difficulty: Difficulty = getDifficulty();
let selectedCarId = getSelectedCarId();
let selectedDriverId = getSelectedDriverId();
let selectedTrackId = getSelectedTrackId();
let autoGas = getAutoGas();
let roomCode = 'TURBO-1';
let garageTab: 'drivers' | 'cars' = 'drivers';
let garageFilter = 'all';

let engine: TurboDriftEngine | null = null;
let heroAnimId = 0;
let garageThumbCleanup: (() => void) | null = null;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtOrdinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const mod10 = n % 10;
  if (mod10 === 1) return `${n}st`;
  if (mod10 === 2) return `${n}nd`;
  if (mod10 === 3) return `${n}rd`;
  return `${n}th`;
}

function fmtTime(ms: number): string {
  if (!ms || ms <= 0) return '--:--.--';
  const totalSec = ms / 1000;
  const min = Math.floor(totalSec / 60);
  const sec = Math.floor(totalSec % 60);
  const hun = Math.floor((ms % 1000) / 10);
  return `${min}:${String(sec).padStart(2, '0')}.${String(hun).padStart(2, '0')}`;
}

function cleanupGarageThumbs(): void {
  if (garageThumbCleanup) {
    garageThumbCleanup();
    garageThumbCleanup = null;
  }
}

function renderHome(): void {
  stopEngine();
  cleanupGarageThumbs();
  cancelAnimationFrame(heroAnimId);

  const car = getCarById(selectedCarId);
  const driver = getDriverById(selectedDriverId);
  const bests = getLocalBestTimes();

  app.innerHTML = `
    <div class="screen" id="home-screen">
      <div class="header-bar">
        <div class="title-block">
          <h1>🏎️ TURBO DRIFT RACER</h1>
          <p>112 Drivers • 112 Cars • 8 Tracks • Power Drifting!</p>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="icon-btn" id="btn-sound" aria-label="Toggle sound">${racerSound.isMuted() ? '🔇' : '🔊'}</button>
          <button class="icon-btn" id="btn-records" aria-label="Leaderboard">🏆</button>
          <button class="icon-btn" id="btn-settings" aria-label="Settings">⚙️</button>
        </div>
      </div>

      <div class="card">
        <div class="card-title">
          <span>Your Driver & Car</span>
          <button class="secondary-cta" id="btn-open-garage" style="padding:5px 10px;font-size:0.78rem;">🎨 Choose 112 + 112</button>
        </div>
        <div class="combo-hero">
          <canvas class="combo-preview-canvas" id="hero-combo-canvas" width="224" height="152"></canvas>
          <div class="combo-info">
            <div class="name-line">${escapeHtml(driver.name)} (${escapeHtml(driver.archetypeLabel)})</div>
            <div class="sub-line">in ${escapeHtml(car.name)} (${escapeHtml(car.chassisLabel)})</div>
            <div class="stat-pills">
              <span class="pill">⚡ Top ${car.topSpeedStat}/10</span>
              <span class="pill">🚀 Accel ${car.accelStat}/10</span>
              <span class="pill">🔥 Drift ${car.driftStat}/10</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">
          <span>Game Mode</span>
          <span style="font-size:0.72rem;color:#38bdf8;">${raceMode === 'online' ? '🌐 Online Room + Rivals' : '🤖 Vs. AI'}</span>
        </div>
        <div class="seg-row" style="margin-bottom:8px;">
          <button class="seg-btn ${raceMode === 'ai' ? 'active' : ''}" id="mode-ai">🤖 Vs. AI</button>
          <button class="seg-btn ${raceMode === 'online' ? 'active' : ''}" id="mode-online">🌐 Online Race</button>
        </div>

        ${
          raceMode === 'ai'
            ? `<div class="seg-row">
                <button class="seg-btn diff-easy ${difficulty === 'easy' ? 'active' : ''}" data-diff="easy">Easy</button>
                <button class="seg-btn diff-medium ${difficulty === 'medium' ? 'active' : ''}" data-diff="medium">Medium</button>
                <button class="seg-btn diff-hard ${difficulty === 'hard' ? 'active' : ''}" data-diff="hard">Hard</button>
              </div>`
            : `<div class="online-box">
                <span style="font-size:0.8rem;color:#94a3b8;">Room:</span>
                <input class="text-input" id="room-code-input" value="${escapeHtml(roomCode)}" maxlength="16" placeholder="TURBO-1" />
                <button class="secondary-cta" id="btn-rand-room" style="padding:8px 10px;font-size:0.78rem;">🎲</button>
              </div>
              <div style="font-size:0.72rem;color:#94a3b8;margin-top:6px;">
                Share the same room code to race friends live, or compete directly against online rivals!
              </div>`
        }
      </div>

      <div class="card">
        <div class="card-title">
          <span>Select Track (3 Classic + 5 Special)</span>
        </div>
        <div class="track-strip">
          ${TRACKS.map((t) => {
            const best = bests[t.id];
            return `
              <button class="track-card ${t.id === selectedTrackId ? 'active' : ''}" data-track="${t.id}">
                <div class="t-name">${escapeHtml(t.name)}</div>
                <div style="display:flex;gap:4px;flex-wrap:wrap;">
                  ${t.isSpecial ? `<span class="pill special">⭐ ${escapeHtml(t.specialBadge || 'SPECIAL')}</span>` : `<span class="pill">Classic</span>`}
                  ${best ? `<span class="pill">⏱️ ${fmtTime(best)}</span>` : ''}
                </div>
                <div class="t-desc">${escapeHtml(t.subtitle)}</div>
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <button class="primary-cta" id="btn-start-race">🏁 START RACE!</button>
      <div style="text-align:center;font-size:0.73rem;color:#94a3b8;margin-top:8px;">
        Tip: Auto-Gas is ${autoGas ? 'ON (use ◀️ ▶️ + 🔥 DRIFT)' : 'OFF (manual gas & brake)'}. Release 🔥 DRIFT when the bar turns Blue, Orange, or Purple for a Turbo Boost!
      </div>
    </div>
  `;

  // Hero spinning preview animation
  const heroCanvas = document.getElementById('hero-combo-canvas') as HTMLCanvasElement;
  const hctx = heroCanvas.getContext('2d')!;
  let t = 0;
  const spin = (): void => {
    t += 0.03;
    hctx.clearRect(0, 0, heroCanvas.width, heroCanvas.height);
    drawCarWithDriver(
      hctx,
      car,
      driver,
      heroCanvas.width * 0.5,
      heroCanvas.height * 0.52,
      Math.sin(t) * 0.35 - 0.15,
      Math.cos(t * 1.4) * 0.8,
      2,
      0.5,
      2.3,
      1
    );
    heroAnimId = requestAnimationFrame(spin);
  };
  spin();

  document.getElementById('btn-sound')!.onclick = () => {
    racerSound.toggleMute();
    renderHome();
  };
  document.getElementById('btn-open-garage')!.onclick = () => {
    racerSound.click();
    renderGarage();
  };
  document.getElementById('btn-records')!.onclick = () => {
    racerSound.click();
    void openLeaderboardModal();
  };
  document.getElementById('btn-settings')!.onclick = () => {
    racerSound.click();
    openSettingsModal();
  };
  document.getElementById('mode-ai')!.onclick = () => {
    racerSound.click();
    raceMode = 'ai';
    renderHome();
  };
  document.getElementById('mode-online')!.onclick = () => {
    racerSound.click();
    raceMode = 'online';
    renderHome();
  };

  document.querySelectorAll<HTMLButtonElement>('[data-diff]').forEach((btn) => {
    btn.onclick = () => {
      racerSound.click();
      difficulty = btn.dataset.diff as Difficulty;
      setDifficulty(difficulty);
      renderHome();
    };
  });

  const roomInput = document.getElementById('room-code-input') as HTMLInputElement | null;
  if (roomInput) {
    roomInput.oninput = () => {
      roomCode = roomInput.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') || 'TURBO-1';
    };
  }
  const randRoomBtn = document.getElementById('btn-rand-room');
  if (randRoomBtn) {
    randRoomBtn.onclick = () => {
      roomCode = `TURBO-${Math.floor(100 + Math.random() * 899)}`;
      renderHome();
    };
  }

  document.querySelectorAll<HTMLButtonElement>('[data-track]').forEach((btn) => {
    btn.onclick = () => {
      racerSound.click();
      selectedTrackId = btn.dataset.track || 'zonnedal';
      setSelectedTrackId(selectedTrackId);
      renderHome();
    };
  });

  document.getElementById('btn-start-race')!.onclick = () => {
    racerSound.click();
    startRace();
  };
}

function updateGaragePreview(): void {
  const curCar = getCarById(selectedCarId);
  const curDriver = getDriverById(selectedDriverId);
  const preview = document.getElementById('garage-combo-canvas') as HTMLCanvasElement | null;
  if (preview) {
    const pctx = preview.getContext('2d')!;
    pctx.clearRect(0, 0, preview.width, preview.height);
    drawCarWithDriver(pctx, curCar, curDriver, 112, 76, -0.2, 0.3, 0, 0, 2.35, 1);
  }
  const nameEl = document.getElementById('garage-combo-name');
  if (nameEl) nameEl.textContent = `${curDriver.name} • ${curDriver.archetypeLabel}`;
  const subEl = document.getElementById('garage-combo-sub');
  if (subEl) subEl.textContent = `${curCar.name} • ${curCar.chassisLabel}`;
  const statsEl = document.getElementById('garage-combo-stats');
  if (statsEl) {
    statsEl.innerHTML = `
      <span class="pill">⚡ ${curCar.topSpeedStat}</span>
      <span class="pill">🚀 ${curCar.accelStat}</span>
      <span class="pill">🔥 ${curCar.driftStat}</span>
    `;
  }
}

function setupLazyGarageThumbnails(tab: 'drivers' | 'cars'): void {
  cleanupGarageThumbs();

  const screenEl = document.getElementById('garage-screen');
  const selector = tab === 'drivers' ? '[data-draw-driver]' : '[data-draw-car]';
  const canvases = Array.from(document.querySelectorAll<HTMLCanvasElement>(selector));
  if (canvases.length === 0) return;

  const curDriver = getDriverById(selectedDriverId);
  const queue: HTMLCanvasElement[] = [];
  let rafId = 0;
  let disposed = false;

  const drawCanvas = (cv: HTMLCanvasElement): void => {
    if (cv.dataset.drawn === '1') return;
    cv.dataset.drawn = '1';
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    if (tab === 'drivers') {
      const id = Number(cv.dataset.drawDriver);
      drawDriverAvatar(ctx, getDriverById(id), 60, 40, 3.3, 0);
    } else {
      const id = Number(cv.dataset.drawCar);
      drawCarWithDriver(ctx, getCarById(id), curDriver, 60, 40, -0.18, 0.2, 0, 0, 1.55, 1);
    }
  };

  const pumpQueue = (): void => {
    rafId = 0;
    if (disposed) return;
    const batch = 8;
    for (let i = 0; i < batch && queue.length > 0; i++) {
      const cv = queue.shift()!;
      drawCanvas(cv);
    }
    if (queue.length > 0) {
      rafId = requestAnimationFrame(pumpQueue);
    }
  };

  const enqueue = (cv: HTMLCanvasElement): void => {
    if (cv.dataset.drawn === '1' || cv.dataset.queued === '1') return;
    cv.dataset.queued = '1';
    queue.push(cv);
    if (!rafId) {
      rafId = requestAnimationFrame(pumpQueue);
    }
  };

  let observer: IntersectionObserver | null = null;
  if (typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const cv = entry.target as HTMLCanvasElement;
            observer?.unobserve(cv);
            enqueue(cv);
          }
        }
      },
      { root: screenEl, rootMargin: '180px 0px' }
    );
    for (const cv of canvases) {
      observer.observe(cv);
    }
  } else {
    for (const cv of canvases) {
      enqueue(cv);
    }
  }

  garageThumbCleanup = () => {
    disposed = true;
    if (rafId) cancelAnimationFrame(rafId);
    observer?.disconnect();
  };
}

function renderGarage(): void {
  cancelAnimationFrame(heroAnimId);
  cleanupGarageThumbs();

  const curCar = getCarById(selectedCarId);
  const curDriver = getDriverById(selectedDriverId);

  const driverArchetypes = Array.from(new Set(DRIVERS.map((d) => d.archetypeLabel)));
  const carChassis = Array.from(new Set(CARS.map((c) => c.chassisLabel)));
  const filterLabels = garageTab === 'drivers' ? driverArchetypes : carChassis;

  const filteredDrivers =
    garageFilter === 'all'
      ? DRIVERS
      : DRIVERS.filter((d) => d.archetypeLabel === garageFilter);
  const filteredCars =
    garageFilter === 'all'
      ? CARS
      : CARS.filter((c) => c.chassisLabel === garageFilter);

  app.innerHTML = `
    <div class="screen" id="garage-screen">
      <div class="header-bar">
        <button class="icon-btn" id="btn-garage-back">← Back</button>
        <div style="font-weight:900;font-size:1rem;">🎨 GARAGE (112 + 112)</div>
        <button class="icon-btn" id="btn-garage-rand">🎲 Mix</button>
      </div>

      <div class="card">
        <div class="combo-hero">
          <canvas class="combo-preview-canvas" id="garage-combo-canvas" width="224" height="152"></canvas>
          <div class="combo-info">
            <div class="name-line" id="garage-combo-name">${escapeHtml(curDriver.name)} • ${escapeHtml(curDriver.archetypeLabel)}</div>
            <div class="sub-line" id="garage-combo-sub">${escapeHtml(curCar.name)} • ${escapeHtml(curCar.chassisLabel)}</div>
            <div class="stat-pills" id="garage-combo-stats">
              <span class="pill">⚡ ${curCar.topSpeedStat}</span>
              <span class="pill">🚀 ${curCar.accelStat}</span>
              <span class="pill">🔥 ${curCar.driftStat}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="seg-row" style="margin-bottom:8px;">
        <button class="seg-btn ${garageTab === 'drivers' ? 'active' : ''}" id="tab-drivers">🧑 Drivers (${DRIVERS.length})</button>
        <button class="seg-btn ${garageTab === 'cars' ? 'active' : ''}" id="tab-cars">🏎️ Cars (${CARS.length})</button>
      </div>

      <div class="filter-scroll">
        <button class="filter-chip ${garageFilter === 'all' ? 'active' : ''}" data-filter="all">All</button>
        ${filterLabels
          .map(
            (lbl) =>
              `<button class="filter-chip ${garageFilter === lbl ? 'active' : ''}" data-filter="${escapeHtml(lbl)}">${escapeHtml(lbl)}</button>`
          )
          .join('')}
      </div>

      <div class="garage-grid" id="garage-grid">
        ${
          garageTab === 'drivers'
            ? filteredDrivers
                .map(
                  (d) => `
                <button class="garage-item ${d.id === selectedDriverId ? 'active' : ''}" data-pick-driver="${d.id}">
                  <canvas data-draw-driver="${d.id}" width="120" height="80"></canvas>
                  <div class="g-name">${escapeHtml(d.name)}</div>
                  <div class="g-sub">${escapeHtml(d.archetypeLabel)}</div>
                </button>
              `
                )
                .join('')
            : filteredCars
                .map(
                  (c) => `
                <button class="garage-item ${c.id === selectedCarId ? 'active' : ''}" data-pick-car="${c.id}">
                  <canvas data-draw-car="${c.id}" width="120" height="80"></canvas>
                  <div class="g-name">${escapeHtml(c.name)}</div>
                  <div class="g-sub">${escapeHtml(c.chassisLabel)}</div>
                </button>
              `
                )
                .join('')
        }
      </div>
    </div>
  `;

  updateGaragePreview();
  setupLazyGarageThumbnails(garageTab);

  document.getElementById('btn-garage-back')!.onclick = () => {
    racerSound.click();
    renderHome();
  };
  document.getElementById('btn-garage-rand')!.onclick = () => {
    racerSound.click();
    selectedDriverId = Math.floor(Math.random() * DRIVERS.length);
    selectedCarId = Math.floor(Math.random() * CARS.length);
    setSelectedDriverId(selectedDriverId);
    setSelectedCarId(selectedCarId);
    renderGarage();
  };
  document.getElementById('tab-drivers')!.onclick = () => {
    racerSound.click();
    garageTab = 'drivers';
    garageFilter = 'all';
    renderGarage();
  };
  document.getElementById('tab-cars')!.onclick = () => {
    racerSound.click();
    garageTab = 'cars';
    garageFilter = 'all';
    renderGarage();
  };
  document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((btn) => {
    btn.onclick = () => {
      racerSound.click();
      garageFilter = btn.dataset.filter || 'all';
      renderGarage();
    };
  });
  document.querySelectorAll<HTMLButtonElement>('[data-pick-driver]').forEach((btn) => {
    btn.onclick = () => {
      racerSound.click();
      selectedDriverId = Number(btn.dataset.pickDriver);
      setSelectedDriverId(selectedDriverId);
      document.querySelectorAll<HTMLButtonElement>('[data-pick-driver].active').forEach((el) => {
        el.classList.remove('active');
      });
      btn.classList.add('active');
      updateGaragePreview();
    };
  });
  document.querySelectorAll<HTMLButtonElement>('[data-pick-car]').forEach((btn) => {
    btn.onclick = () => {
      racerSound.click();
      selectedCarId = Number(btn.dataset.pickCar);
      setSelectedCarId(selectedCarId);
      document.querySelectorAll<HTMLButtonElement>('[data-pick-car].active').forEach((el) => {
        el.classList.remove('active');
      });
      btn.classList.add('active');
      updateGaragePreview();
    };
  });
}

function stopEngine(): void {
  if (engine) {
    engine.destroy();
    engine = null;
  }
}

function startRace(): void {
  cancelAnimationFrame(heroAnimId);
  cleanupGarageThumbs();
  stopEngine();

  const trackDef = TRACKS.find((t) => t.id === selectedTrackId) || TRACKS[0];

  app.innerHTML = `
    <div class="race-screen">
      <canvas id="race-canvas"></canvas>

      <div class="race-hud-top">
        <div class="hud-group">
          <button class="icon-btn" id="btn-exit-race" aria-label="Exit to menu">🏠</button>
          <div class="hud-badge place" id="hud-place">1st/6</div>
          <div class="hud-badge" id="hud-lap">Lap 1/${trackDef.laps}</div>
        </div>
        <div class="hud-group">
          <div class="hud-badge" id="hud-timer">0:00.00</div>
          <div class="hud-badge" id="hud-speed">0 km/h</div>
          <button class="icon-btn" id="btn-autogas">${autoGas ? '⚡Auto' : '🦶Gas'}</button>
        </div>
      </div>

      <div class="countdown-overlay" id="countdown-overlay">3</div>

      <div class="drift-meter-wrap hidden" id="drift-wrap">
        <div class="drift-meter-bar" id="drift-bar"></div>
        <div class="drift-meter-label" id="drift-label">DRIFT!</div>
      </div>

      <div class="touch-controls">
        <div class="touch-cluster">
          <button class="ctrl-btn" id="btn-left" aria-label="Steer left">◀️</button>
          <button class="ctrl-btn" id="btn-right" aria-label="Steer right">▶️</button>
        </div>
        <div class="touch-cluster" style="align-items:flex-end;">
          <button class="ctrl-btn small-pedal ${autoGas ? 'hidden' : ''}" id="btn-gas">⚡<br/>GAS</button>
          <button class="ctrl-btn small-pedal" id="btn-brake">🛑<br/>BRAKE</button>
          <button class="ctrl-btn drift-btn" id="btn-drift">🔥<br/>DRIFT</button>
        </div>
      </div>
    </div>
  `;

  const canvas = document.getElementById('race-canvas') as HTMLCanvasElement;
  const hudPlace = document.getElementById('hud-place')!;
  const hudLap = document.getElementById('hud-lap')!;
  const hudTimer = document.getElementById('hud-timer')!;
  const hudSpeed = document.getElementById('hud-speed')!;
  const countdownEl = document.getElementById('countdown-overlay')!;
  const driftWrap = document.getElementById('drift-wrap')!;
  const driftBar = document.getElementById('drift-bar') as HTMLElement;
  const driftLabel = document.getElementById('drift-label')!;

  const updateHud = (snap: RaceHudSnapshot): void => {
    hudPlace.textContent = `${fmtOrdinal(snap.place)}/${snap.totalRacers}`;
    hudLap.textContent = `Lap ${snap.lap}/${snap.totalLaps}`;
    hudTimer.textContent = fmtTime(snap.raceTimeMs);
    hudSpeed.textContent = `${snap.speedKmh} km/h`;

    if (snap.countdown > 0) {
      countdownEl.textContent = String(snap.countdown);
      countdownEl.classList.remove('hidden');
    } else if (snap.respawning) {
      countdownEl.textContent = '🛸 Drone Rescue!';
      countdownEl.style.fontSize = '1.8rem';
      countdownEl.classList.remove('hidden');
    } else {
      countdownEl.classList.add('hidden');
      countdownEl.style.fontSize = '4.5rem';
    }

    if (snap.driftCharge > 0.05) {
      driftWrap.classList.remove('hidden');
      driftBar.style.width = `${Math.round(snap.driftCharge * 100)}%`;
      if (snap.driftLevel === 3) {
        driftBar.style.background = '#c084fc';
        driftLabel.textContent = '🟣 PURPLE ULTRA-TURBO!';
        driftLabel.style.color = '#e9d5ff';
      } else if (snap.driftLevel === 2) {
        driftBar.style.background = '#fb923c';
        driftLabel.textContent = '🟠 ORANGE SUPER-TURBO!';
        driftLabel.style.color = '#fed7aa';
      } else if (snap.driftLevel === 1) {
        driftBar.style.background = '#38bdf8';
        driftLabel.textContent = '🔵 BLUE MINI-TURBO!';
        driftLabel.style.color = '#bae6fd';
      } else {
        driftBar.style.background = '#94a3b8';
        driftLabel.textContent = 'DRIFTING...';
        driftLabel.style.color = '#cbd5e1';
      }
    } else {
      driftWrap.classList.add('hidden');
    }
  };

  const onFinish = (snap: RaceHudSnapshot): void => {
    const isNewRecord = saveLocalBestTime(trackDef.id, snap.raceTimeMs);
    void submitRaceResult(
      trackDef.id,
      snap.raceTimeMs,
      snap.place === 1,
      selectedCarId,
      selectedDriverId
    );
    showFinishModal(snap, isNewRecord);
  };

  engine = new TurboDriftEngine(
    canvas,
    {
      trackDef,
      playerCarId: selectedCarId,
      playerDriverId: selectedDriverId,
      mode: raceMode,
      difficulty,
      autoGas,
      roomCode,
    },
    updateHud,
    onFinish
  );
  engine.start();

  // Touch helper using pointer events (supports simultaneous left/right + drift thumbs!)
  const bindHold = (elId: string, key: 'left' | 'right' | 'gas' | 'brake' | 'drift'): void => {
    const btn = document.getElementById(elId);
    if (!btn) return;
    const activePointers = new Set<number>();
    const syncState = (): void => {
      const pressed = activePointers.size > 0;
      btn.classList.toggle('pressed', pressed);
      if (engine) engine.setInput({ [key]: pressed });
    };
    btn.onpointerdown = (e) => {
      e.preventDefault();
      btn.setPointerCapture(e.pointerId);
      activePointers.add(e.pointerId);
      syncState();
    };
    const release = (e: PointerEvent): void => {
      activePointers.delete(e.pointerId);
      syncState();
    };
    btn.onpointerup = release;
    btn.onpointercancel = release;
  };

  bindHold('btn-left', 'left');
  bindHold('btn-right', 'right');
  bindHold('btn-gas', 'gas');
  bindHold('btn-brake', 'brake');
  bindHold('btn-drift', 'drift');

  // Keyboard support
  const onKey = (down: boolean) => (e: KeyboardEvent): void => {
    if (!engine) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') engine.setInput({ left: down });
    if (e.code === 'ArrowRight' || e.code === 'KeyD') engine.setInput({ right: down });
    if (e.code === 'ArrowUp' || e.code === 'KeyW') engine.setInput({ gas: down });
    if (e.code === 'ArrowDown' || e.code === 'KeyS') engine.setInput({ brake: down });
    if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      engine.setInput({ drift: down });
    }
  };
  const keyDownH = onKey(true);
  const keyUpH = onKey(false);
  window.addEventListener('keydown', keyDownH);
  window.addEventListener('keyup', keyUpH);

  document.getElementById('btn-autogas')!.onclick = () => {
    autoGas = !autoGas;
    setAutoGas(autoGas);
    engine?.setAutoGas(autoGas);
    document.getElementById('btn-autogas')!.textContent = autoGas ? '⚡Auto' : '🦶Gas';
    document.getElementById('btn-gas')!.classList.toggle('hidden', autoGas);
  };

  document.getElementById('btn-exit-race')!.onclick = () => {
    window.removeEventListener('keydown', keyDownH);
    window.removeEventListener('keyup', keyUpH);
    racerSound.click();
    renderHome();
  };
}

function showFinishModal(snap: RaceHudSnapshot, isNewRecord: boolean): void {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  const medal =
    snap.place === 1
      ? '🥇 1ST PLACE!'
      : snap.place === 2
        ? '🥈 2ND PLACE!'
        : snap.place === 3
          ? '🥉 3RD PLACE!'
          : `#${snap.place} FINISHED`;

  modal.innerHTML = `
    <div class="modal-card">
      <h2 style="margin:0 0 4px;text-align:center;color:#facc15;">${medal}</h2>
      <div style="text-align:center;font-size:0.95rem;color:#38bdf8;font-weight:800;">
        Time: ${fmtTime(snap.raceTimeMs)} ${isNewRecord ? '🔥 NEW RECORD!' : ''}
      </div>

      <div class="standings-list">
        ${snap.standings
          .map((s) => {
            const drv = getDriverById(s.driverId);
            const car = getCarById(s.carId);
            return `
              <div class="standing-row ${s.isPlayer ? 'me' : ''}">
                <span>#${s.place} ${escapeHtml(s.name)} <small style="color:#94a3b8;">(${escapeHtml(drv.name)} • ${escapeHtml(car.chassisLabel)})</small></span>
                <span>${s.finished ? fmtTime(s.finishTimeMs) : `Lap ${s.lap}`}</span>
              </div>
            `;
          })
          .join('')}
      </div>

      <div style="display:flex;gap:8px;margin-top:10px;">
        <button class="primary-cta" id="btn-race-again" style="padding:11px;">🔁 Race Again</button>
        <button class="secondary-cta" id="btn-race-menu" style="padding:11px 14px;">🏠 Menu</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector<HTMLButtonElement>('#btn-race-again')!.onclick = () => {
    modal.remove();
    startRace();
  };
  modal.querySelector<HTMLButtonElement>('#btn-race-menu')!.onclick = () => {
    modal.remove();
    renderHome();
  };
}

async function openLeaderboardModal(): Promise<void> {
  const track = TRACKS.find((t) => t.id === selectedTrackId) || TRACKS[0];
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <h3 style="margin:0;">🏆 Records • ${escapeHtml(track.name)}</h3>
        <button class="icon-btn" id="close-lb" aria-label="Close">✕</button>
      </div>
      <div id="lb-body" style="font-size:0.85rem;color:#94a3b8;">Connecting...</div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector<HTMLButtonElement>('#close-lb')!.onclick = () => modal.remove();

  const bests = getLocalBestTimes();
  const { entries, status } = await fetchTrackLeaderboard(track.id);
  const body = modal.querySelector('#lb-body')!;

  let html = `<div class="pill" style="display:inline-block;margin-bottom:10px;">Your personal best: ${fmtTime(bests[track.id] || 0)}</div>`;
  if (entries.length === 0) {
    if (status === 'unconfigured') {
      html += `<p>Online leaderboards coming soon — race locally to set your best times!</p>`;
    } else if (status === 'offline') {
      html += `<p>Offline mode — could not connect to the leaderboard right now.</p>`;
    } else {
      html += `<p>No online scores yet for this track. Be the first to set a record!</p>`;
    }
  } else {
    html +=
      `<div class="standings-list">` +
      entries
        .map((e) => {
          const drv = getDriverById(e.driverId);
          return `<div class="standing-row"><span>#${e.rank} ${escapeHtml(e.playerName)} (${escapeHtml(drv.name)})</span><span>${fmtTime(e.bestTimeMs)}</span></div>`;
        })
        .join('') +
      `</div>`;
  }
  body.innerHTML = html;
}

function openSettingsModal(): void {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <h3 style="margin:0;" id="settings-title">⚙️ Settings</h3>
        <button class="icon-btn" id="close-set" aria-label="Close">✕</button>
      </div>
      <label style="display:block;font-size:0.8rem;color:#94a3b8;margin-bottom:4px;">Driver Name</label>
      <input class="text-input" id="set-name" value="${escapeHtml(getPlayerName())}" maxlength="18" style="width:100%;margin-bottom:10px;" />

      <label style="display:block;font-size:0.8rem;color:#94a3b8;margin-bottom:4px;">Controls</label>
      <button class="secondary-cta" id="set-autogas" style="width:100%;margin-bottom:10px;">
        Auto-Gas: ${autoGas ? 'ON (Simple: ◀️ ▶️ + DRIFT)' : 'OFF (Manual Gas & Brake)'}
      </button>

      <div id="secret-server-wrap" class="hidden" style="margin-bottom:12px;">
        <label style="display:block;font-size:0.8rem;color:#94a3b8;margin-bottom:4px;">Server URL</label>
        <input class="text-input" id="set-api" value="${escapeHtml(getApiUrl())}" placeholder="https://api.example.com" style="width:100%;" />
      </div>

      <button class="primary-cta" id="save-set" style="padding:11px;">Save</button>
      <div id="settings-version" style="text-align:center;font-size:0.7rem;color:#64748b;margin-top:8px;">Turbo Drift Racer • v1.0</div>
    </div>
  `;
  document.body.appendChild(modal);

  // Secret 5-tap toggle to reveal/hide custom server URL
  let tapCount = 0;
  let tapResetTimer = 0;
  const secretWrap = modal.querySelector<HTMLDivElement>('#secret-server-wrap')!;
  const handleSecretTap = (): void => {
    tapCount += 1;
    window.clearTimeout(tapResetTimer);
    tapResetTimer = window.setTimeout(() => {
      tapCount = 0;
    }, 1500);
    if (tapCount >= 5) {
      tapCount = 0;
      secretWrap.classList.toggle('hidden');
    }
  };
  modal.querySelector<HTMLElement>('#settings-title')!.onclick = handleSecretTap;
  modal.querySelector<HTMLElement>('#settings-version')!.onclick = handleSecretTap;

  modal.querySelector<HTMLButtonElement>('#close-set')!.onclick = () => modal.remove();
  const autoBtn = modal.querySelector<HTMLButtonElement>('#set-autogas')!;
  autoBtn.onclick = () => {
    autoGas = !autoGas;
    autoBtn.textContent = `Auto-Gas: ${autoGas ? 'ON (Simple: ◀️ ▶️ + DRIFT)' : 'OFF (Manual Gas & Brake)'}`;
  };
  modal.querySelector<HTMLButtonElement>('#save-set')!.onclick = () => {
    const nm = (modal.querySelector('#set-name') as HTMLInputElement).value;
    setPlayerName(nm);
    if (!secretWrap.classList.contains('hidden')) {
      const url = (modal.querySelector('#set-api') as HTMLInputElement).value;
      setApiUrl(url);
    }
    setAutoGas(autoGas);
    modal.remove();
    renderHome();
  };
}

renderHome();
