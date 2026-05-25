/* =====================================================================
   universe.ts — Main Orchestrator for Universe Mode
   - Two views: UNIVERSE (black hole + systems) / SYSTEM (star + planets)
   - Camera: pan (drag), zoom (wheel), animated transitions
   - Interactions: hover highlights, click to zoom in, drag to reposition
   - Modals: create system, create planet, create moon, edit/delete
   - Tooltip: preview card with Microlink screenshot + URL button
   ===================================================================== */

import {
  loadUniverse, saveUniverse, uid, getScreenshotUrl,
  newPlanet, newSystem,
  PLANET_TYPES, STAR_COLORS, MOON_COLORS, SIZE_MAP, BASE_ORBIT, ORBIT_STEP,
  type UniverseData, type StarSystem, type Planet, type Moon,
} from './store.ts';

import {
  buildSpaceBackground, drawSpaceBackground,
  drawBlackHole, drawOrbitRing, drawSystemDot,
  drawCartoonPlanet, drawStar, drawMoon, drawOrbitRing as drawOrbit,
  dist,
  type Camera,
} from './renderer.ts';

// ─── CANVAS SETUP ─────────────────────────────────────────────────────────────

const canvas = document.getElementById('universe-canvas') as HTMLCanvasElement;
const ctx    = canvas.getContext('2d')!;
let W = 0, H = 0;

function resize(): void {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
  buildSpaceBackground(W, H);
}
resize();
window.addEventListener('resize', resize);

// ─── STATE ─────────────────────────────────────────────────────────────────────

type ViewMode = 'universe' | 'system';

let universe: UniverseData = loadUniverse();
let view: ViewMode = 'universe';
let activeSystem: StarSystem | null = null;

const cam: Camera = { x: 0, y: 0, zoom: 1, targetX: 0, targetY: 0, targetZoom: 1 };

// Interaction state
let isDragging  = false;
let dragStartX  = 0, dragStartY  = 0;
let camStartX   = 0, camStartY   = 0;
let dragMoved   = false;
let mouseX = 0, mouseY = 0;

// Hover & drag tracking
let hoveredSystem: StarSystem | null = null;
let hoveredPlanet: Planet    | null = null;
let hoveredMoon:   Moon      | null = null;
let hoveredPlanetSystem: StarSystem | null = null;

let draggingPlanet: Planet | null = null;
let draggingPlanetSystem: StarSystem | null = null;

// Tooltip state
let tooltipPlanet: Planet | null = null;
let tooltipVisible = false;

// Animation time
let t = 0;

// Planet axis rotation offsets (per planet id)
const axisAngles: Map<string, number> = new Map();

// Orbital angle tracking — frozen when planet is hovered
const orbitCurrentAngles: Map<string, number> = new Map();

// Precomputed screen positions (updated each frame)
const systemScreenPos: Map<string, { x: number; y: number }> = new Map();
const planetScreenPos: Map<string, { x: number; y: number }> = new Map();
const moonScreenPos:   Map<string, { x: number; y: number }> = new Map();

// Context menu state
let ctxMenuTarget: { type: 'system' | 'planet' | 'moon'; id: string; parentId?: string; grandParentId?: string } | null = null;

// ─── ELEMENT REFS ─────────────────────────────────────────────────────────────

const hud         = document.getElementById('hud')!;
const btnBack     = document.getElementById('btn-back')!;
const hudTitle    = document.getElementById('hud-title')!;
const btnAddSys   = document.getElementById('btn-add-system')!;
const btnAddPlanet= document.getElementById('btn-add-planet')!;
const systemCount = document.getElementById('system-count')!;

const tooltip        = document.getElementById('planet-tooltip')!;
const tooltipImg     = document.getElementById('tooltip-img') as HTMLImageElement;
const tooltipSkel    = document.getElementById('tooltip-skeleton')!;
const tooltipNoImg   = document.getElementById('tooltip-no-img')!;
const tooltipName    = document.getElementById('tooltip-name')!;
const tooltipDesc    = document.getElementById('tooltip-desc')!;
const tooltipUrlBtn  = document.getElementById('tooltip-url-btn') as HTMLButtonElement;
const tooltipMoons   = document.getElementById('tooltip-moons')!;

const ctxMenu      = document.getElementById('context-menu')!;
const ctxEdit      = document.getElementById('ctx-edit')!;
const ctxDelete    = document.getElementById('ctx-delete')!;
const ctxAddMoon   = document.getElementById('ctx-add-moon')!;
const ctxAddPlanet = document.getElementById('ctx-add-planet-to-system')!;

// System Modal
const sysModalOverlay = document.getElementById('system-modal-overlay')!;
const sysForm      = document.getElementById('system-form') as HTMLFormElement;
const sysFormId    = document.getElementById('sys-form-id') as HTMLInputElement;
const sysFormName  = document.getElementById('sys-form-name') as HTMLInputElement;
const sysFormDesc  = document.getElementById('sys-form-desc') as HTMLTextAreaElement;
const sysModalTitle= document.getElementById('system-modal-title')!;
const starColorEls = document.getElementById('star-color-presets')!;
let selectedStarColor = 0;

// Planet Modal
const pModalOverlay  = document.getElementById('planet-modal-overlay')!;
const pForm          = document.getElementById('planet-form') as HTMLFormElement;
const pFormId        = document.getElementById('p-form-id') as HTMLInputElement;
const pFormSysId     = document.getElementById('p-form-sys-id') as HTMLInputElement;
const pFormName      = document.getElementById('p-form-name') as HTMLInputElement;
const pFormUrl       = document.getElementById('p-form-url') as HTMLInputElement;
const pFormDesc      = document.getElementById('p-form-desc') as HTMLTextAreaElement;
const pFormOrbit     = document.getElementById('p-form-orbit') as HTMLInputElement;
const pOrbitDisplay  = document.getElementById('p-orbit-display')!;
const pModalTitle    = document.getElementById('planet-modal-title')!;
const pColorEls      = document.getElementById('planet-color-presets')!;
const pBtnSaveText   = document.getElementById('p-btn-save-text')!;
let selectedPlanetColor = 0;
let editingPlanetId: string | null = null;
let editingPlanetSysId: string | null = null;

// Moon Modal
const mModalOverlay = document.getElementById('moon-modal-overlay')!;
const mForm      = document.getElementById('moon-form') as HTMLFormElement;
const mFormPlanetId = document.getElementById('m-form-planet-id') as HTMLInputElement;
const mFormSysId    = document.getElementById('m-form-sys-id') as HTMLInputElement;
const mFormMoonId   = document.getElementById('m-form-moon-id') as HTMLInputElement;
const mFormName  = document.getElementById('m-form-name') as HTMLInputElement;
const mFormUrl   = document.getElementById('m-form-url') as HTMLInputElement;
const mColorEls  = document.getElementById('moon-color-presets')!;
const mModalTitle= document.getElementById('moon-modal-title')!;
let selectedMoonColor = 0;

// ─── CAMERA ───────────────────────────────────────────────────────────────────

function zoomToSystem(sys: StarSystem): void {
  // Find system's position in universe view
  const angle = sys.startAngle * Math.PI / 180;
  const sx = Math.cos(angle) * sys.orbitRadius;
  const sy = Math.sin(angle) * sys.orbitRadius;

  // Animate camera to center on system
  cam.targetX = -sx;
  cam.targetY = -sy;
  cam.targetZoom = 1;

  // After short delay, switch view
  setTimeout(() => {
    activeSystem = sys;
    view = 'system';
    cam.x = 0; cam.y = 0; cam.zoom = 1;
    cam.targetX = 0; cam.targetY = 0; cam.targetZoom = 1;
    updateHUD();
  }, 400);
}

function goBackToUniverse(): void {
  view = 'universe';
  activeSystem = null;
  cam.x = 0; cam.y = 0; cam.zoom = 1;
  cam.targetX = 0; cam.targetY = 0; cam.targetZoom = 1;
  updateHUD();
  hideTooltip();
}

function updateHUD(): void {
  if (view === 'universe') {
    btnBack.classList.add('hidden');
    btnAddSys.classList.remove('hidden');
    btnAddPlanet.classList.add('hidden');
    hudTitle.textContent = 'Dev Universe';
    systemCount.textContent = universe.systems.length === 1 ? '1 sistema' : `${universe.systems.length} sistemas`;
  } else {
    btnBack.classList.remove('hidden');
    btnAddSys.classList.add('hidden');
    btnAddPlanet.classList.remove('hidden');
    hudTitle.textContent = activeSystem?.name ?? '';
    systemCount.textContent = `${activeSystem?.planets.length ?? 0} planetas`;
  }
}

// ─── MAIN RENDER LOOP ─────────────────────────────────────────────────────────

function frame(): void {
  t += 0.016;

  // Smooth camera lerp
  cam.x += (cam.targetX - cam.x) * 0.1;
  cam.y += (cam.targetY - cam.y) * 0.1;
  cam.zoom += (cam.targetZoom - cam.zoom) * 0.1;

  ctx.clearRect(0, 0, W, H);
  drawSpaceBackground(ctx, W, H, cam);

  if (view === 'universe') renderUniverse();
  else                     renderSystem();

  requestAnimationFrame(frame);
}

// ─── UNIVERSE VIEW ────────────────────────────────────────────────────────────

function renderUniverse(): void {
  const cx = W / 2 + cam.x * cam.zoom;
  const cy = H / 2 + cam.y * cam.zoom;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(cam.zoom, cam.zoom);

  // Black hole orbit rings
  universe.systems.forEach(sys => {
    drawOrbitRing(ctx, 0, 0, sys.orbitRadius, 0.07);
  });

  // Black hole
  drawBlackHole(ctx, 0, 0, t);

  // Systems
  systemScreenPos.clear();
  universe.systems.forEach(sys => {
    const elapsed = t / sys.orbitSpeed * Math.PI * 2;
    const angle = sys.startAngle * Math.PI / 180 + elapsed;
    const sx = Math.cos(angle) * sys.orbitRadius;
    const sy = Math.sin(angle) * sys.orbitRadius;
    const hov = hoveredSystem === sys;
    drawSystemDot(ctx, sx, sy, sys, hov, t);

    // Store screen pos for hit testing (in canvas space before transform)
    systemScreenPos.set(sys.id, { x: sx, y: sy });
  });

  ctx.restore();
}

// ─── SYSTEM VIEW ──────────────────────────────────────────────────────────────

function renderSystem(): void {
  if (!activeSystem) return;
  const sys = activeSystem;

  const cx = W / 2 + cam.x * cam.zoom;
  const cy = H / 2 + cam.y * cam.zoom;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(cam.zoom, cam.zoom);

  // Orbit rings
  sys.planets.forEach(p => {
    drawOrbitRing(ctx, 0, 0, p.orbitRadius, 0.09);
  });

  // Star
  drawStar(ctx, 0, 0, sys, t);

  // Planets + moons
  planetScreenPos.clear();
  moonScreenPos.clear();

  sys.planets.forEach((planet, idx) => {
    const hov = hoveredPlanet === planet;

    // ── Orbital angle — freeze completely when hovered ──
    let angle: number;
    if (hov) {
      // Use last saved angle (planet stays still)
      angle = orbitCurrentAngles.get(planet.id) ?? planet.orbitAngle * Math.PI / 180;
    } else {
      const elapsed = t / planet.orbitSpeed * Math.PI * 2;
      angle = planet.orbitAngle * Math.PI / 180 + elapsed;
      orbitCurrentAngles.set(planet.id, angle); // save for freeze
    }

    // If being dragged, override position
    let px: number, py: number;
    if (draggingPlanet === planet) {
      px = (mouseX - cx) / cam.zoom;
      py = (mouseY - cy) / cam.zoom;
      planet.orbitRadius = Math.max(80, Math.sqrt(px * px + py * py));
    } else {
      px = Math.cos(angle) * planet.orbitRadius;
      py = Math.sin(angle) * planet.orbitRadius;
    }

    // ── Axis spin — also freeze when hovered ──
    let ax = axisAngles.get(planet.id) ?? Math.random() * Math.PI * 2;
    if (!hov) {
      ax += 0.008 / (planet.size === 'large' ? 1.5 : planet.size === 'small' ? 0.7 : 1);
    }
    axisAngles.set(planet.id, ax);

    const sc = hov ? 1.18 : 1;
    drawCartoonPlanet(ctx, px, py, planet, ax, hov, sc);

    // Planet label
    const r = SIZE_MAP[planet.size] ?? 42;
    ctx.fillStyle = hov ? '#fff' : 'rgba(255,255,255,0.7)';
    ctx.font = `${hov ? 'bold ' : ''}${hov ? 12 : 10}px 'Outfit', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(planet.name, px, py + r * sc + 6);

    planetScreenPos.set(planet.id, { x: px, y: py });

    // Moons
    planet.moons.forEach((moon, mi) => {
      const mOrbitR = (SIZE_MAP[planet.size] ?? 42) * 1.5 + mi * 20;
      const mAngle  = t / (8 + mi * 3) * Math.PI * 2 + mi * 2.1;
      const mx = px + Math.cos(mAngle) * mOrbitR;
      const my = py + Math.sin(mAngle) * mOrbitR;

      drawOrbitRing(ctx, px, py, mOrbitR, 0.06);
      drawMoon(ctx, mx, my, moon, hoveredMoon === moon);

      // Moon label
      if (hoveredMoon === moon) {
        ctx.fillStyle = '#fff';
        ctx.font = `10px 'Outfit', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(moon.name, mx, my + moon.size + 4);
      }

      moonScreenPos.set(moon.id, { x: mx, y: my });
    });
  });

  ctx.restore();
}

// ─── HIT TESTING ─────────────────────────────────────────────────────────────

function getCanvasPoint(e: MouseEvent | { clientX: number; clientY: number }): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const cx = W / 2 + cam.x * cam.zoom;
  const cy = H / 2 + cam.y * cam.zoom;
  return {
    x: (e.clientX - rect.left - cx) / cam.zoom,
    y: (e.clientY - rect.top  - cy) / cam.zoom,
  };
}

function hitTestUniverse(mx: number, my: number): StarSystem | null {
  for (const sys of universe.systems) {
    const pos = systemScreenPos.get(sys.id);
    if (pos && dist(mx, my, pos.x, pos.y) < 20) return sys;
  }
  return null;
}

function hitTestPlanet(mx: number, my: number): { planet: Planet; system: StarSystem } | null {
  if (!activeSystem) return null;
  for (const planet of activeSystem.planets) {
    const pos = planetScreenPos.get(planet.id);
    if (pos) {
      const r = SIZE_MAP[planet.size] ?? 42;
      if (dist(mx, my, pos.x, pos.y) < r * 1.2) return { planet, system: activeSystem };
    }
  }
  return null;
}

function hitTestMoon(mx: number, my: number): { moon: Moon; planet: Planet } | null {
  if (!activeSystem) return null;
  for (const planet of activeSystem.planets) {
    for (const moon of planet.moons) {
      const pos = moonScreenPos.get(moon.id);
      if (pos && dist(mx, my, pos.x, pos.y) < moon.size * 1.5) return { moon, planet };
    }
  }
  return null;
}

// ─── MOUSE EVENTS ─────────────────────────────────────────────────────────────

canvas.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  isDragging = true;
  dragMoved  = false;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  camStartX  = cam.x;
  camStartY  = cam.y;

  // Check if clicking on a planet to drag it
  if (view === 'system') {
    const cp = getCanvasPoint(e);
    const hit = hitTestPlanet(cp.x, cp.y);
    if (hit) {
      draggingPlanet = hit.planet;
      draggingPlanetSystem = hit.system;
    }
  }
  hideCtxMenu();
});

canvas.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;

  if (isDragging) {
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved = true;

    if (draggingPlanet) {
      // Planet drag handled in renderSystem via mouseX/mouseY
    } else {
      cam.targetX = camStartX + dx / cam.zoom;
      cam.targetY = camStartY + dy / cam.zoom;
    }
  }

  // Hover detection
  const cp = getCanvasPoint(e);

  if (view === 'universe') {
    hoveredSystem = hitTestUniverse(cp.x, cp.y);
    canvas.style.cursor = hoveredSystem ? 'pointer' : 'grab';
  } else {
    const moonHit = hitTestMoon(cp.x, cp.y);
    const planetHit = !moonHit ? hitTestPlanet(cp.x, cp.y) : null;
    hoveredMoon = moonHit?.moon ?? null;
    hoveredPlanet = planetHit?.planet ?? null;
    hoveredPlanetSystem = planetHit?.system ?? null;
    canvas.style.cursor = (hoveredPlanet || hoveredMoon) ? 'pointer' : draggingPlanet ? 'grabbing' : 'grab';
  }
});

canvas.addEventListener('mouseup', (e) => {
  if (draggingPlanet && draggingPlanetSystem) {
    // Save new orbit radius
    saveUniverse(universe);
    draggingPlanet = null;
    draggingPlanetSystem = null;
  }

  if (!dragMoved && e.button === 0) {
    handleClick(e);
  }
  isDragging = false;
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.12 : 0.89;
  cam.targetZoom = Math.max(0.25, Math.min(4, cam.targetZoom * factor));
}, { passive: false });

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const cp = getCanvasPoint(e);

  if (view === 'system') {
    const moonHit = hitTestMoon(cp.x, cp.y);
    if (moonHit) {
      showCtxMenu(e, 'moon', moonHit.moon.id, moonHit.planet.id, activeSystem!.id);
      return;
    }
    const planetHit = hitTestPlanet(cp.x, cp.y);
    if (planetHit) {
      showCtxMenu(e, 'planet', planetHit.planet.id, activeSystem!.id);
      return;
    }
  } else {
    const sysHit = hitTestUniverse(cp.x, cp.y);
    if (sysHit) {
      showCtxMenu(e, 'system', sysHit.id);
      return;
    }
  }
});

// Double-click moon → open URL
canvas.addEventListener('dblclick', (e) => {
  const cp = getCanvasPoint(e);
  if (view === 'system') {
    const moonHit = hitTestMoon(cp.x, cp.y);
    if (moonHit?.moon.url) window.open(moonHit.moon.url, '_blank', 'noopener');
  }
});

function handleClick(e: MouseEvent): void {
  const cp = getCanvasPoint(e);

  if (view === 'universe') {
    const sys = hitTestUniverse(cp.x, cp.y);
    if (sys) zoomToSystem(sys);
    else hideTooltip();
    return;
  }

  if (view === 'system') {
    const moonHit = hitTestMoon(cp.x, cp.y);
    if (moonHit) {
      // Double-click opens moon URL; single click just shows name
      return;
    }

    const planetHit = hitTestPlanet(cp.x, cp.y);
    if (planetHit) {
      showTooltip(planetHit.planet, e);
    } else {
      hideTooltip();
    }
  }
}

// ─── TOOLTIP ──────────────────────────────────────────────────────────────────

function showTooltip(planet: Planet, e: MouseEvent): void {
  tooltipPlanet = planet;
  tooltipVisible = true;

  tooltipName.textContent = planet.name;
  tooltipDesc.textContent = planet.description || 'Sin descripción';
  tooltipUrlBtn.onclick = () => window.open(planet.url, '_blank', 'noopener');

  // Moons list
  tooltipMoons.innerHTML = '';
  if (planet.moons.length > 0) {
    planet.moons.forEach(moon => {
      const el = document.createElement('a');
      el.className = 'tooltip-moon-link';
      el.textContent = `🌙 ${moon.name}`;
      el.href = moon.url;
      el.target = '_blank';
      el.rel = 'noopener';
      tooltipMoons.appendChild(el);
    });
    tooltipMoons.classList.remove('hidden');
  } else {
    tooltipMoons.classList.add('hidden');
  }

  // Screenshot
  tooltipImg.classList.remove('loaded');
  tooltipImg.style.display = 'none';
  tooltipNoImg.classList.remove('visible');
  tooltipSkel.classList.remove('hidden');

  tooltip.classList.add('visible');
  positionTooltip(e);

  const screenshotUrl = planet.screenshot || getScreenshotUrl(planet.url);
  if (!planet.screenshot) {
    planet.screenshot = screenshotUrl;
    saveUniverse(universe);
  }

  if (screenshotUrl) {
    tooltipImg.src = screenshotUrl;
    tooltipImg.onload = () => {
      tooltipSkel.classList.add('hidden');
      tooltipImg.style.display = 'block';
      tooltipImg.classList.add('loaded');
    };
    tooltipImg.onerror = () => {
      tooltipSkel.classList.add('hidden');
      tooltipNoImg.classList.add('visible');
    };
  } else {
    tooltipSkel.classList.add('hidden');
    tooltipNoImg.classList.add('visible');
  }
}

function positionTooltip(e: MouseEvent): void {
  const TW = 300, TH = 280;
  let x = e.clientX + 22;
  let y = e.clientY + 22;
  if (x + TW > window.innerWidth  - 12) x = e.clientX - TW - 22;
  if (y + TH > window.innerHeight - 12) y = e.clientY - TH - 22;
  tooltip.style.left = `${x}px`;
  tooltip.style.top  = `${y}px`;
}

function hideTooltip(): void {
  tooltipVisible = false;
  tooltip.classList.remove('visible');
}

// ─── CONTEXT MENU ─────────────────────────────────────────────────────────────

function showCtxMenu(e: MouseEvent, type: 'system' | 'planet' | 'moon', id: string, parentId?: string, grandParentId?: string): void {
  ctxMenuTarget = { type, id, parentId, grandParentId };
  const CW = 185, CH = 110;
  let x = e.clientX, y = e.clientY;
  if (x + CW > window.innerWidth)  x = window.innerWidth  - CW - 8;
  if (y + CH > window.innerHeight) y = window.innerHeight - CH - 8;
  ctxMenu.style.left = `${x}px`;
  ctxMenu.style.top  = `${y}px`;

  // Show/hide relevant actions
  ctxAddMoon.style.display   = type === 'planet' ? '' : 'none';
  ctxAddPlanet.style.display = type === 'system' ? '' : 'none';

  ctxMenu.classList.add('open');
}

function hideCtxMenu(): void {
  ctxMenu.classList.remove('open');
  ctxMenuTarget = null;
}

ctxEdit.addEventListener('click', () => {
  if (!ctxMenuTarget) { hideCtxMenu(); return; }
  const { type, id, parentId, grandParentId } = ctxMenuTarget;
  if (type === 'system') {
    const sys = universe.systems.find(s => s.id === id);
    if (sys) openSystemModal(sys);
  } else if (type === 'planet') {
    const sys = universe.systems.find(s => s.id === parentId);
    const planet = sys?.planets.find(p => p.id === id);
    if (sys && planet) openPlanetModal(sys, planet);
  } else if (type === 'moon') {
    const sys = universe.systems.find(s => s.id === grandParentId);
    const planet = sys?.planets.find(p => p.id === parentId);
    const moon = planet?.moons.find(m => m.id === id);
    if (sys && planet && moon) openMoonModal(sys, planet, moon);
  }
  hideCtxMenu();
});

ctxDelete.addEventListener('click', () => {
  if (!ctxMenuTarget) { hideCtxMenu(); return; }
  const { type, id, parentId, grandParentId } = ctxMenuTarget;
  if (type === 'system') {
    const sys = universe.systems.find(s => s.id === id);
    if (sys && confirm(`¿Eliminar el sistema "${sys.name}" y todos sus planetas?`)) {
      universe.systems = universe.systems.filter(s => s.id !== id);
      if (activeSystem?.id === id) goBackToUniverse();
      saveUniverse(universe); updateHUD();
    }
  } else if (type === 'planet') {
    const sys = universe.systems.find(s => s.id === parentId);
    const planet = sys?.planets.find(p => p.id === id);
    if (sys && planet && confirm(`¿Eliminar el planeta "${planet.name}"?`)) {
      sys.planets = sys.planets.filter(p => p.id !== id);
      saveUniverse(universe); updateHUD();
      if (tooltipPlanet?.id === id) hideTooltip();
    }
  } else if (type === 'moon') {
    const sys = universe.systems.find(s => s.id === grandParentId);
    const planet = sys?.planets.find(p => p.id === parentId);
    const moon = planet?.moons.find(m => m.id === id);
    if (sys && planet && moon && confirm(`¿Eliminar la luna "${moon.name}"?`)) {
      planet.moons = planet.moons.filter(m => m.id !== id);
      saveUniverse(universe);
    }
  }
  hideCtxMenu();
});

ctxAddMoon.addEventListener('click', () => {
  if (!ctxMenuTarget) { hideCtxMenu(); return; }
  const { parentId } = ctxMenuTarget;  // parentId = sysId, id = planetId
  const sys = universe.systems.find(s => s.id === parentId);
  const planet = sys?.planets.find(p => p.id === ctxMenuTarget!.id);
  if (sys && planet) openMoonModal(sys, planet);
  hideCtxMenu();
});

ctxAddPlanet.addEventListener('click', () => {
  if (!ctxMenuTarget) { hideCtxMenu(); return; }
  const sys = universe.systems.find(s => s.id === ctxMenuTarget!.id);
  if (sys) {
    activeSystem = sys;
    view = 'system';
    updateHUD();
    openPlanetModal(sys);
  }
  hideCtxMenu();
});

document.addEventListener('click', (e) => {
  if (!(e.target as HTMLElement).closest('#context-menu')) hideCtxMenu();
});

// ─── SYSTEM MODAL ─────────────────────────────────────────────────────────────

function buildStarColorPresets(): void {
  starColorEls.innerHTML = '';
  STAR_COLORS.forEach((sc, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `star-preset${i === 0 ? ' selected' : ''}`;
    btn.style.background = sc.color;
    btn.style.boxShadow  = `0 0 8px ${sc.glow}`;
    btn.title = sc.label;
    btn.dataset.index = String(i);
    btn.addEventListener('click', () => {
      document.querySelectorAll<HTMLElement>('.star-preset').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedStarColor = i;
    });
    starColorEls.appendChild(btn);
  });
}

function openSystemModal(sys?: StarSystem): void {
  sysFormId.value   = sys?.id ?? '';
  sysFormName.value = sys?.name ?? '';
  sysFormDesc.value = sys?.description ?? '';
  sysModalTitle.textContent = sys ? 'Editar Sistema' : 'Nuevo Sistema Estelar';

  if (sys) {
    const idx = STAR_COLORS.findIndex(c => c.color === sys.starColor);
    selectedStarColor = idx >= 0 ? idx : 0;
  } else {
    selectedStarColor = 0;
  }
  document.querySelectorAll<HTMLElement>('.star-preset').forEach((b, i) =>
    b.classList.toggle('selected', i === selectedStarColor));

  sysModalOverlay.classList.add('open');
  setTimeout(() => sysFormName.focus(), 250);
}

sysForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = sysFormName.value.trim();
  const desc = sysFormDesc.value.trim();
  if (!name) return;

  const id = sysFormId.value;
  if (id) {
    const sys = universe.systems.find(s => s.id === id);
    if (sys) {
      sys.name = name;
      sys.description = desc;
      const sc = STAR_COLORS[selectedStarColor];
      sys.starColor = sc.color;
      sys.starGlow  = sc.glow;
      if (activeSystem?.id === id) updateHUD();
    }
  } else {
    const newSys = newSystem(name, desc, selectedStarColor, universe.systems.length);
    universe.systems.push(newSys);
    updateHUD();
  }
  saveUniverse(universe);
  sysModalOverlay.classList.remove('open');
  sysForm.reset();
});

document.getElementById('sys-btn-cancel')!.addEventListener('click', () => sysModalOverlay.classList.remove('open'));
document.getElementById('sys-modal-close')!.addEventListener('click', () => sysModalOverlay.classList.remove('open'));
sysModalOverlay.addEventListener('click', e => { if (e.target === sysModalOverlay) sysModalOverlay.classList.remove('open'); });

// ─── PLANET MODAL ─────────────────────────────────────────────────────────────

function buildPlanetColorPresets(): void {
  pColorEls.innerHTML = '';
  PLANET_TYPES.forEach((pt, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `planet-preset${i === 0 ? ' selected' : ''}`;
    btn.style.background = `radial-gradient(circle at 35% 30%, ${pt.light}, ${pt.primary} 55%, ${pt.dark})`;
    btn.title = pt.name;
    btn.dataset.index = String(i);
    btn.addEventListener('click', () => {
      document.querySelectorAll<HTMLElement>('.planet-preset').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedPlanetColor = i;
    });
    pColorEls.appendChild(btn);
  });
}

function openPlanetModal(sys: StarSystem, planet?: Planet): void {
  editingPlanetId    = planet?.id ?? null;
  editingPlanetSysId = sys.id;
  pFormSysId.value   = sys.id;
  pFormId.value      = planet?.id ?? '';
  pFormName.value    = planet?.name ?? '';
  pFormUrl.value     = planet?.url  ?? '';
  pFormDesc.value    = planet?.description ?? '';
  pModalTitle.textContent = planet ? 'Editar Planeta' : `Agregar Planeta — ${sys.name}`;
  pBtnSaveText.textContent = planet ? 'Guardar Cambios' : 'Agregar Planeta';

  selectedPlanetColor = planet?.colorIndex ?? 0;
  document.querySelectorAll<HTMLElement>('.planet-preset').forEach((b, i) =>
    b.classList.toggle('selected', i === selectedPlanetColor));

  const sizeVal = planet?.size ?? 'medium';
  document.querySelectorAll<HTMLInputElement>('input[name="p-size"]').forEach(r => r.checked = r.value === sizeVal);

  // Orbit slider: default = planet's current radius, or auto-calc for new planet
  const defaultOrbit = planet?.orbitRadius ?? (BASE_ORBIT + sys.planets.length * ORBIT_STEP);
  const maxOrbit = Math.max(600, Math.round(defaultOrbit * 1.5));
  pFormOrbit.min   = '80';
  pFormOrbit.max   = String(maxOrbit);
  pFormOrbit.step  = '5';
  pFormOrbit.value = String(Math.round(defaultOrbit));
  pOrbitDisplay.textContent = String(Math.round(defaultOrbit));

  pModalOverlay.classList.add('open');
  setTimeout(() => pFormName.focus(), 250);
}

// Live orbit display update
pFormOrbit.addEventListener('input', () => {
  pOrbitDisplay.textContent = pFormOrbit.value;
});

pForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name        = pFormName.value.trim();
  const url         = pFormUrl.value.trim();
  const desc        = pFormDesc.value.trim();
  const size        = (document.querySelector<HTMLInputElement>('input[name="p-size"]:checked')?.value ?? 'medium') as Planet['size'];
  const orbitRadius = parseInt(pFormOrbit.value) || (BASE_ORBIT + (activeSystem?.planets.length ?? 0) * ORBIT_STEP);
  if (!name || !url) return;

  const sysId = pFormSysId.value;
  const sys = universe.systems.find(s => s.id === sysId);
  if (!sys) return;

  const screenshot = getScreenshotUrl(url);

  if (editingPlanetId) {
    const idx = sys.planets.findIndex(p => p.id === editingPlanetId);
    if (idx !== -1) {
      sys.planets[idx] = { ...sys.planets[idx], name, url, description: desc, size, colorIndex: selectedPlanetColor, screenshot, orbitRadius };
    }
  } else {
    const p = newPlanet(name, url, desc, size, selectedPlanetColor, sys.planets.length);
    p.orbitRadius = orbitRadius;
    p.screenshot  = screenshot;
    sys.planets.push(p);
  }

  saveUniverse(universe);
  updateHUD();
  pModalOverlay.classList.remove('open');
  pForm.reset();
  editingPlanetId = null;
});

document.getElementById('p-btn-cancel')!.addEventListener('click', () => pModalOverlay.classList.remove('open'));
document.getElementById('p-modal-close')!.addEventListener('click', () => pModalOverlay.classList.remove('open'));
pModalOverlay.addEventListener('click', e => { if (e.target === pModalOverlay) pModalOverlay.classList.remove('open'); });

// ─── MOON MODAL ──────────────────────────────────────────────────────────────

function buildMoonColorPresets(): void {
  mColorEls.innerHTML = '';
  MOON_COLORS.forEach((mc, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `moon-preset${i === 0 ? ' selected' : ''}`;
    btn.style.background = mc;
    btn.title = mc;
    btn.dataset.index = String(i);
    btn.addEventListener('click', () => {
      document.querySelectorAll<HTMLElement>('.moon-preset').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedMoonColor = i;
    });
    mColorEls.appendChild(btn);
  });
}

function openMoonModal(sys: StarSystem, planet: Planet, moon?: Moon): void {
  mFormSysId.value    = sys.id;
  mFormPlanetId.value = planet.id;
  mFormMoonId.value   = moon?.id ?? '';
  mFormName.value     = moon?.name ?? '';
  mFormUrl.value      = moon?.url  ?? '';
  mModalTitle.textContent = moon ? `Editar Luna — ${moon.name}` : `Agregar Luna a ${planet.name}`;

  const colIdx = moon ? MOON_COLORS.indexOf(moon.color) : 0;
  selectedMoonColor = colIdx >= 0 ? colIdx : 0;
  document.querySelectorAll<HTMLElement>('.moon-preset').forEach((b, i) =>
    b.classList.toggle('selected', i === selectedMoonColor));

  mModalOverlay.classList.add('open');
  setTimeout(() => mFormName.focus(), 250);
}

mForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = mFormName.value.trim();
  const url  = mFormUrl.value.trim();
  if (!name || !url) return;

  const sys    = universe.systems.find(s => s.id === mFormSysId.value);
  const planet = sys?.planets.find(p => p.id === mFormPlanetId.value);
  if (!sys || !planet) return;

  const color = MOON_COLORS[selectedMoonColor];
  const moonId = mFormMoonId.value;
  if (moonId) {
    const m = planet.moons.find(m => m.id === moonId);
    if (m) { m.name = name; m.url = url; m.color = color; }
  } else {
    planet.moons.push({ id: uid(), name, url, color, size: 8 + planet.moons.length * 3 });
  }

  saveUniverse(universe);
  mModalOverlay.classList.remove('open');
  mForm.reset();
});

document.getElementById('m-btn-cancel')!.addEventListener('click', () => mModalOverlay.classList.remove('open'));
document.getElementById('m-modal-close')!.addEventListener('click', () => mModalOverlay.classList.remove('open'));
mModalOverlay.addEventListener('click', e => { if (e.target === mModalOverlay) mModalOverlay.classList.remove('open'); });

// ─── HUD BUTTONS ──────────────────────────────────────────────────────────────

btnBack.addEventListener('click', goBackToUniverse);
btnAddSys.addEventListener('click', () => openSystemModal());
btnAddPlanet.addEventListener('click', () => {
  if (activeSystem) openPlanetModal(activeSystem);
});

// ─── KEYBOARD ─────────────────────────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (sysModalOverlay.classList.contains('open')) { sysModalOverlay.classList.remove('open'); return; }
    if (pModalOverlay.classList.contains('open'))   { pModalOverlay.classList.remove('open');   return; }
    if (mModalOverlay.classList.contains('open'))   { mModalOverlay.classList.remove('open');   return; }
    if (tooltipVisible) { hideTooltip(); return; }
    if (view === 'system') goBackToUniverse();
  }
});

// ─── BOOT ─────────────────────────────────────────────────────────────────────

buildStarColorPresets();
buildPlanetColorPresets();
buildMoonColorPresets();
updateHUD();
canvas.style.cursor = 'grab';
frame();
