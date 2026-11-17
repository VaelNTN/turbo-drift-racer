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
  OnlineLeaderboardEntry,
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

function fmtTime(ms: number): string {
  if (!ms || ms <= 0) return '--:--.--';
  const totalSec = ms / 1000;
  const min = Math.floor(totalSec / 60);
  const sec = Math.floor(totalSec % 60);
  const hun = Math.floor((ms % 1000) / 10);
  return `${min}:${String(sec).padStart(2, '0')}.${String(hun).padStart(2, '0')}`;
}

function renderHome(): void {
  stopEngine();
  cancelAnimationFrame(heroAnimId);

  const car = getCarById(selectedCarId);
  const driver = getDriverById(selectedDriverId);
  const bests = getLocalBestTimes();

  app.innerHTML = `
    <div class="screen" id="home-screen">
      <div class="header-bar">
        <div class="title-block">
          <h1>🏎️ TURBO DRIFT RACER</h1>
          <p>112 Mannetjes • 112 Auto's • 8 Tracks • Driften!</p>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="icon-btn" id="btn-sound">${racerSound.isMuted() ? '🔇' : '🔊'}</button>
          <button class="icon-btn" id="btn-records">🏆</button>
          <button class="icon-btn" id="btn-settings">⚙️</button>
        </div>
      </div>

      <div class="card">
        <div class="card-title">
          <span>Jouw Coureur & Auto</span>
          <button class="secondary-cta" id="btn-open-garage" style="padding:5px 10px;font-size:0.78rem;">🎨 Kies uit 112 + 112</button>
        </div>
        <div class="combo-hero">
          <canvas class="combo-preview-canvas" id="hero-combo-canvas" width="224" height="152"></canvas>
          <div class="combo-info">
            <div class="name-line">${driver.name} (${driver.archetypeLabel})</div>
            <div class="sub-line">in ${car.name} (${car.chassisLabel})</div>
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
          <span>Spelstand</span>
          <span style="font-size:0.72rem;color:#38bdf8;">${raceMode === 'online' ? '🌐 Online Kamer + Rivalen' : '🤖 Tegen Computer'}</span>
        </div>
        <div class="seg-row" style="margin-bottom:8px;">
          <button class="seg-btn ${raceMode === 'ai' ? 'active' : ''}" id="mode-ai">🤖 Tegen AI</button>
          <button class="seg-btn ${raceMode === 'online' ? 'active' : ''}" id="mode-online">🌐 Online Racen</button>
        </div>

        ${
          raceMode === 'ai'
            ? `<div class="seg-row">
                <button class="seg-btn diff-easy ${difficulty === 'easy' ? 'active' : ''}" data-diff="easy">Makkelijk</button>
                <button class="seg-btn diff-medium ${difficulty === 'medium' ? 'active' : ''}" data-diff="medium">Normaal</button>
                <button class="seg-btn diff-hard ${difficulty === 'hard' ? 'active' : ''}" data-diff="hard">Moeilijk</button>
              </div>`
            : `<div class="online-box">
                <span style="font-size:0.8rem;color:#94a3b8;">Kamer:</span>
                <input class="text-input" id="room-code-input" value="${roomCode}" maxlength="16" placeholder="TURBO-1" />
                <button class="secondary-cta" id="btn-rand-room" style="padding:8px 10px;font-size:0.78rem;">🎲</button>
              </div>
              <div style="font-size:0.72rem;color:#94a3b8;margin-top:6px;">
                Deel dezelfde kamercode (of open 2 tabbladen) voor live multiplayer, of race direct tegen Online Ranked Rivalen!
              </div>`
        }
      </div>

      <div class="card">
        <div class="card-title">
          <span>Kies Circuit (3 Normaal + 5 Speciaal)</span>
        </div>
        <div class="track-strip">
          ${TRACKS.map((t) => {
            const best = bests[t.id];
            return `
              <button class="track-card ${t.id === selectedTrackId ? 'active' : ''}" data-track="${t.id}">
                <div class="t-name">${t.name}</div>
                <div style="display:flex;gap:4px;flex-wrap:wrap;">
                  ${t.isSpecial ? `<span class="pill special">⭐ ${t.specialBadge}</span>` : `<span class="pill">Normaal</span>`}
                  ${best ? `<span class="pill">⏱️ ${fmtTime(best)}</span>` : ''}
                </div>
                <div class="t-desc">${t.subtitle}</div>
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <button class="primary-cta" id="btn-start-race">🏁 START RACE!</button>
      <div style="text-align:center;font-size:0.73rem;color:#94a3b8;margin-top:8px;">
        Tip: Auto-Gas staat ${autoGas ? 'AAN (alleen ◀️ ▶️ + 🔥 DRIFT)' : 'UIT (handmatig gas & rem)'}. Laat 🔥 DRIFT los als de balk Blauw/Oranje/Paars is voor een Turbo-Boost!
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

function renderGarage(): void {
  cancelAnimationFrame(heroAnimId);

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
    <div class="screen">
      <div class="header-bar">
        <button class="icon-btn" id="btn-garage-back">← Terug</button>
        <div style="font-weight:900;font-size:1rem;">🎨 GARAGE (112 + 112)</div>
        <button class="icon-btn" id="btn-garage-rand">🎲 Mix</button>
      </div>

      <div class="card">
        <div class="combo-hero">
          <canvas class="combo-preview-canvas" id="garage-combo-canvas" width="224" height="152"></canvas>
          <div class="combo-info">
            <div class="name-line">${curDriver.name} • ${curDriver.archetypeLabel}</div>
            <div class="sub-line">${curCar.name} • ${curCar.chassisLabel}</div>
            <div class="stat-pills">
              <span class="pill">⚡ ${curCar.topSpeedStat}</span>
              <span class="pill">🚀 ${curCar.accelStat}</span>
              <span class="pill">🔥 ${curCar.driftStat}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="seg-row" style="margin-bottom:8px;">
        <button class="seg-btn ${garageTab === 'drivers' ? 'active' : ''}" id="tab-drivers">🧑 Mannetjes (${DRIVERS.length})</button>
        <button class="seg-btn ${garageTab === 'cars' ? 'active' : ''}" id="tab-cars">🏎️ Auto's (${CARS.length})</button>
      </div>

      <div class="filter-scroll">
        <button class="filter-chip ${garageFilter === 'all' ? 'active' : ''}" data-filter="all">Alles</button>
        ${filterLabels
          .map(
            (lbl) =>
              `<button class="filter-chip ${garageFilter === lbl ? 'active' : ''}" data-filter="${lbl}">${lbl}</button>`
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
                  <div class="g-name">${d.name}</div>
                  <div class="g-sub">${d.archetypeLabel}</div>
                </button>
              `
                )
                .join('')
            : filteredCars
                .map(
                  (c) => `
                <button class="garage-item ${c.id === selectedCarId ? 'active' : ''}" data-pick-car="${c.id}">
                  <canvas data-draw-car="${c.id}" width="120" height="80"></canvas>
                  <div class="g-name">${c.name}</div>
                  <div class="g-sub">${c.chassisLabel}</div>
                </button>
              `
                )
                .join('')
        }
      </div>
    </div>
  `;

  // Draw top combo preview
  const preview = document.getElementById('garage-combo-canvas') as HTMLCanvasElement;
  const pctx = preview.getContext('2d')!;
  drawCarWithDriver(pctx, curCar, curDriver, 112, 76, -0.2, 0.3, 0, 0, 2.35, 1);

  // Draw all visible item thumbnails cleanly
  if (garageTab === 'drivers') {
    document.querySelectorAll<HTMLCanvasElement>('[data-draw-driver]').forEach((cv) => {
      const id = Number(cv.dataset.drawDriver);
      const drv = getDriverById(id);
      const c = cv.getContext('2d')!;
      drawDriverAvatar(c, drv, 60, 40, 3.3, 0);
    });
  } else {
    document.querySelectorAll<HTMLCanvasElement>('[data-draw-car]').forEach((cv) => {
      const id = Number(cv.dataset.drawCar);
      const cr = getCarById(id);
      const c = cv.getContext('2d')!;
      drawCarWithDriver(c, cr, curDriver, 60, 40, -0.18, 0.2, 0, 0, 1.55, 1);
    });
  }

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
      renderGarage();
    };
  });
  document.querySelectorAll<HTMLButtonElement>('[data-pick-car]').forEach((btn) => {
    btn.onclick = () => {
      racerSound.click();
      selectedCarId = Number(btn.dataset.pickCar);
      setSelectedCarId(selectedCarId);
      renderGarage();
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
  stopEngine();

  const trackDef = TRACKS.find((t) => t.id === selectedTrackId) || TRACKS[0];

  app.innerHTML = `
    <div class="race-screen">
      <canvas id="race-canvas"></canvas>

      <div class="race-hud-top">
        <div class="hud-group">
          <button class="icon-btn" id="btn-exit-race" style="padding:6px 10px;">🏠</button>
          <div class="hud-badge place" id="hud-place">1e / 6</div>
          <div class="hud-badge" id="hud-lap">Ronde 1/${trackDef.laps}</div>
        </div>
        <div class="hud-group">
          <div class="hud-badge" id="hud-timer">0:00.00</div>
          <div class="hud-badge" id="hud-speed">0 km/u</div>
          <button class="icon-btn" id="btn-autogas" style="padding:6px 8px;font-size:0.72rem;">${autoGas ? '⚡Auto' : '🦶Gas'}</button>
        </div>
      </div>

      <div class="countdown-overlay" id="countdown-overlay">3</div>

      <div class="drift-meter-wrap hidden" id="drift-wrap">
        <div class="drift-meter-bar" id="drift-bar"></div>
        <div class="drift-meter-label" id="drift-label">DRIFT!</div>
      </div>

      <div class="touch-controls">
        <div class="touch-cluster">
          <button class="ctrl-btn" id="btn-left">◀️</button>
          <button class="ctrl-btn" id="btn-right">▶️</button>
        </div>
        <div class="touch-cluster" style="align-items:flex-end;">
          <button class="ctrl-btn small-pedal ${autoGas ? 'hidden' : ''}" id="btn-gas">⚡<br/>GAS</button>
          <button class="ctrl-btn small-pedal" id="btn-brake">🛑<br/>REM</button>
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
    hudPlace.textContent = `${snap.place}e / ${snap.totalRacers}`;
    hudLap.textContent = `Ronde ${snap.lap}/${snap.totalLaps}`;
    hudTimer.textContent = fmtTime(snap.raceTimeMs);
    hudSpeed.textContent = `${snap.speedKmh} km/u`;

    if (snap.countdown > 0) {
      countdownEl.textContent = String(snap.countdown);
      countdownEl.classList.remove('hidden');
    } else if (snap.respawning) {
      countdownEl.textContent = '🛸 Drone Redding!';
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
        driftLabel.textContent = '🟣 PAARS ULTRA-TURBO!';
        driftLabel.style.color = '#e9d5ff';
      } else if (snap.driftLevel === 2) {
        driftBar.style.background = '#fb923c';
        driftLabel.textContent = '🟠 ORANJE SUPER-TURBO!';
        driftLabel.style.color = '#fed7aa';
      } else if (snap.driftLevel === 1) {
        driftBar.style.background = '#38bdf8';
        driftLabel.textContent = '🔵 BLAUW MINI-TURBO!';
        driftLabel.style.color = '#bae6fd';
      } else {
        driftBar.style.background = '#94a3b8';
        driftLabel.textContent = 'SLIPPEN...';
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
  const medal = snap.place === 1 ? '🥇 1e PLAATS!' : snap.place === 2 ? '🥈 2e PLAATS!' : snap.place === 3 ? '🥉 3e PLAATS!' : `#${snap.place} GEFINISHT`;

  modal.innerHTML = `
    <div class="modal-card">
      <h2 style="margin:0 0 4px;text-align:center;color:#facc15;">${medal}</h2>
      <div style="text-align:center;font-size:0.95rem;color:#38bdf8;font-weight:800;">
        Tijd: ${fmtTime(snap.raceTimeMs)} ${isNewRecord ? '🔥 NIEUW RECORD!' : ''}
      </div>

      <div class="standings-list">
        ${snap.standings
          .map((s) => {
            const drv = getDriverById(s.driverId);
            const car = getCarById(s.carId);
            return `
              <div class="standing-row ${s.isPlayer ? 'me' : ''}">
                <span>#${s.place} ${s.name} <small style="color:#94a3b8;">(${drv.name} • ${car.chassisLabel})</small></span>
                <span>${s.finished ? fmtTime(s.finishTimeMs) : `R${s.lap}`}</span>
              </div>
            `;
          })
          .join('')}
      </div>

      <div style="display:flex;gap:8px;margin-top:10px;">
        <button class="primary-cta" id="btn-race-again" style="padding:11px;">🔁 Opnieuw</button>
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
        <h3 style="margin:0;">🏆 Records • ${track.name}</h3>
        <button class="icon-btn" id="close-lb">✕</button>
      </div>
      <div id="lb-body" style="font-size:0.85rem;color:#94a3b8;">Laden...</div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector<HTMLButtonElement>('#close-lb')!.onclick = () => modal.remove();

  const bests = getLocalBestTimes();
  const entries: OnlineLeaderboardEntry[] = await fetchTrackLeaderboard(track.id);
  const body = modal.querySelector('#lb-body')!;

  let html = `<div class="pill" style="display:inline-block;margin-bottom:10px;">Jouw lokaal record: ${fmtTime(bests[track.id] || 0)}</div>`;
  if (entries.length === 0) {
    html += `<p>Geen online server-scores gevonden (stel eventueel je Worker URL in bij ⚙️ Instellingen).</p>`;
  } else {
    html += `<div class="standings-list">` + entries
      .map((e) => {
        const drv = getDriverById(e.driverId);
        return `<div class="standing-row"><span>#${e.rank} ${e.playerName} (${drv.name})</span><span>${fmtTime(e.bestTimeMs)}</span></div>`;
      })
      .join('') + `</div>`;
  }
  body.innerHTML = html;
}

function openSettingsModal(): void {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <h3 style="margin:0;">⚙️ Instellingen</h3>
        <button class="icon-btn" id="close-set">✕</button>
      </div>
      <label style="display:block;font-size:0.8rem;color:#94a3b8;margin-bottom:4px;">Jouw Naam</label>
      <input class="text-input" id="set-name" value="${getPlayerName()}" style="width:100%;margin-bottom:10px;" />

      <label style="display:block;font-size:0.8rem;color:#94a3b8;margin-bottom:4px;">Besturing</label>
      <button class="secondary-cta" id="set-autogas" style="width:100%;margin-bottom:10px;">
        Auto-Gas: ${autoGas ? 'AAN (Simpel: alleen ◀️ ▶️ + DRIFT)' : 'UIT (Handmatig Gas & Rem)'}
      </button>

      <label style="display:block;font-size:0.8rem;color:#94a3b8;margin-bottom:4px;">Online Worker URL (optioneel)</label>
      <input class="text-input" id="set-api" value="${getApiUrl()}" placeholder="https://jouw-worker.workers.dev" style="width:100%;margin-bottom:12px;" />

      <button class="primary-cta" id="save-set" style="padding:11px;">Opslaan</button>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector<HTMLButtonElement>('#close-set')!.onclick = () => modal.remove();
  const autoBtn = modal.querySelector<HTMLButtonElement>('#set-autogas')!;
  autoBtn.onclick = () => {
    autoGas = !autoGas;
    autoBtn.textContent = `Auto-Gas: ${autoGas ? 'AAN (Simpel: alleen ◀️ ▶️ + DRIFT)' : 'UIT (Handmatig Gas & Rem)'}`;
  };
  modal.querySelector<HTMLButtonElement>('#save-set')!.onclick = () => {
    const nm = (modal.querySelector('#set-name') as HTMLInputElement).value;
    const url = (modal.querySelector('#set-api') as HTMLInputElement).value;
    setPlayerName(nm);
    setApiUrl(url);
    setAutoGas(autoGas);
    modal.remove();
    renderHome();
  };
}

renderHome();
