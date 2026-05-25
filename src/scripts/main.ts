/* =====================================================================
   main.ts — Dev Hub Solar System
   - Procedural canvas space background (nebulas + twinkling stars)
   - Animated orbiting planets with localStorage persistence
   - Hover → freeze orbit via CSS :has() + tooltip with Microlink screenshot
   - Add / Edit / Delete projects via modal + right-click context menu
   ===================================================================== */

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'devhub_projects_v2';
const MICROLINK_API = 'https://api.microlink.io';

const COLOR_PRESETS = [
  { label: 'Nebula Purple',  g: 'radial-gradient(circle at 20% 40%, rgba(255,255,255,0.15) 0%, transparent 12%), radial-gradient(circle at 120% 40%, rgba(255,255,255,0.15) 0%, transparent 12%), radial-gradient(circle at 60% 60%, rgba(0,0,0,0.25) 0%, transparent 15%), radial-gradient(circle at 160% 60%, rgba(0,0,0,0.25) 0%, transparent 15%), linear-gradient(90deg, #d4a0ff, #8b3dff, #4a1a8c, #8b3dff, #d4a0ff)' },
  { label: 'Ocean Blue',     g: 'radial-gradient(circle at 30% 35%, rgba(255,255,255,0.35) 0%, transparent 15%), radial-gradient(circle at 130% 35%, rgba(255,255,255,0.35) 0%, transparent 15%), radial-gradient(circle at 75% 65%, rgba(100,220,100,0.25) 0%, transparent 20%), radial-gradient(circle at 175% 65%, rgba(100,220,100,0.25) 0%, transparent 20%), linear-gradient(90deg, #80d4ff, #2280e0, #0d3d7a, #2280e0, #80d4ff)' },
  { label: 'Solar Ember',    g: 'radial-gradient(circle at 25% 55%, rgba(255,240,150,0.35) 0%, transparent 18%), radial-gradient(circle at 125% 55%, rgba(255,240,150,0.35) 0%, transparent 18%), radial-gradient(circle at 80% 30%, rgba(0,0,0,0.3) 0%, transparent 12%), radial-gradient(circle at 180% 30%, rgba(0,0,0,0.3) 0%, transparent 12%), linear-gradient(90deg, #ffd580, #ff7220, #a32e00, #ff7220, #ffd580)' },
  { label: 'Emerald Frost',  g: 'radial-gradient(circle at 40% 40%, rgba(255,255,255,0.2) 0%, transparent 14%), radial-gradient(circle at 140% 40%, rgba(255,255,255,0.2) 0%, transparent 14%), radial-gradient(circle at 70% 70%, rgba(0,0,0,0.2) 0%, transparent 10%), radial-gradient(circle at 170% 70%, rgba(0,0,0,0.2) 0%, transparent 10%), linear-gradient(90deg, #a0ffd4, #22d48a, #0a6644, #22d48a, #a0ffd4)' },
  { label: 'Rose Quartz',    g: 'radial-gradient(circle at 15% 60%, rgba(255,255,255,0.25) 0%, transparent 10%), radial-gradient(circle at 115% 60%, rgba(255,255,255,0.25) 0%, transparent 10%), radial-gradient(circle at 55% 30%, rgba(122,13,48,0.3) 0%, transparent 16%), radial-gradient(circle at 155% 30%, rgba(122,13,48,0.3) 0%, transparent 16%), linear-gradient(90deg, #ffa0c8, #e03870, #7a0d30, #e03870, #ffa0c8)' },
  { label: 'Teal Aura',      g: 'radial-gradient(circle at 35% 50%, rgba(255,255,255,0.2) 0%, transparent 12%), radial-gradient(circle at 135% 50%, rgba(255,255,255,0.2) 0%, transparent 12%), radial-gradient(circle at 85% 25%, rgba(0,0,0,0.2) 0%, transparent 15%), radial-gradient(circle at 185% 25%, rgba(0,0,0,0.2) 0%, transparent 15%), linear-gradient(90deg, #a0fff4, #22c8d4, #0a5060, #22c8d4, #a0fff4)' },
  { label: 'Golden Hour',    g: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.3) 0%, transparent 15%), radial-gradient(circle at 120% 30%, rgba(255,255,255,0.3) 0%, transparent 15%), radial-gradient(circle at 65% 65%, rgba(122,92,0,0.3) 0%, transparent 12%), radial-gradient(circle at 165% 65%, rgba(122,92,0,0.3) 0%, transparent 12%), linear-gradient(90deg, #fff3a0, #e0b822, #7a5c00, #e0b822, #fff3a0)' },
  { label: 'Arctic White',   g: 'radial-gradient(circle at 30% 45%, rgba(112,144,192,0.25) 0%, transparent 15%), radial-gradient(circle at 130% 45%, rgba(112,144,192,0.25) 0%, transparent 15%), radial-gradient(circle at 80% 60%, rgba(255,255,255,0.4) 0%, transparent 12%), radial-gradient(circle at 180% 60%, rgba(255,255,255,0.4) 0%, transparent 12%), linear-gradient(90deg, #ffffff, #c8d8f0, #7090c0, #c8d8f0, #ffffff)' },
  { label: 'Crimson Dwarf',  g: 'radial-gradient(circle at 45% 35%, rgba(0,0,0,0.35) 0%, transparent 14%), radial-gradient(circle at 145% 35%, rgba(0,0,0,0.35) 0%, transparent 14%), radial-gradient(circle at 15% 55%, rgba(255,200,200,0.25) 0%, transparent 12%), radial-gradient(circle at 115% 55%, rgba(255,200,200,0.25) 0%, transparent 12%), linear-gradient(90deg, #ffa0a0, #e02222, #7a0000, #e02222, #ffa0a0)' },
  { label: 'Cosmic Teal',    g: 'radial-gradient(circle at 25% 45%, rgba(255,255,255,0.2) 0%, transparent 12%), radial-gradient(circle at 125% 45%, rgba(255,255,255,0.2) 0%, transparent 12%), radial-gradient(circle at 75% 65%, rgba(0,0,0,0.2) 0%, transparent 15%), radial-gradient(circle at 175% 65%, rgba(0,0,0,0.2) 0%, transparent 15%), linear-gradient(90deg, #a0f0ff, #22a8d4, #0a3c60, #22a8d4, #a0f0ff)' },
  { label: 'Mint Galaxy',    g: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.25) 0%, transparent 14%), radial-gradient(circle at 135% 30%, rgba(255,255,255,0.25) 0%, transparent 14%), radial-gradient(circle at 80% 60%, rgba(0,0,0,0.25) 0%, transparent 12%), radial-gradient(circle at 180% 60%, rgba(0,0,0,0.25) 0%, transparent 12%), linear-gradient(90deg, #b0ffcc, #3ad47a, #0d5430, #3ad47a, #b0ffcc)' },
  { label: 'Violet Storm',   g: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.25) 0%, transparent 15%), radial-gradient(circle at 120% 50%, rgba(255,255,255,0.25) 0%, transparent 15%), radial-gradient(circle at 70% 30%, rgba(0,0,0,0.3) 0%, transparent 12%), radial-gradient(circle at 170% 30%, rgba(0,0,0,0.3) 0%, transparent 12%), linear-gradient(90deg, #e0a0ff, #7022e0, #2a0a7a, #7022e0, #e0a0ff)' },
];

const GLOW_COLORS = [
  'rgba(139,61,255,.75)',  'rgba(34,128,224,.75)', 'rgba(255,114,32,.75)',
  'rgba(34,212,138,.75)',  'rgba(224,56,112,.75)', 'rgba(34,200,212,.75)',
  'rgba(224,184,34,.75)',  'rgba(144,160,192,.75)','rgba(224,34,34,.75)',
  'rgba(34,168,212,.75)', 'rgba(58,212,122,.75)',  'rgba(112,34,224,.75)',
];

const SIZE_MAP: Record<string, number> = { small: 36, medium: 52, large: 70 };
const BASE_RADIUS = 115;
const RADIUS_STEP  = 82;
const SPEEDS = [18, 28, 40, 55, 70, 88, 108, 130, 155, 180, 210, 240];

// ─── TYPES ─────────────────────────────────────────────────────────────────────

interface Project {
  id:          string;
  name:        string;
  url:         string;
  description: string;
  screenshot:  string;   // cached microlink URL or manual URL
  size:        'small' | 'medium' | 'large';
  colorIndex:  number;
  gradient:    string;
  createdAt:   number;
}

// ─── STATE ─────────────────────────────────────────────────────────────────────

let projects: Project[] = [];
let selectedColor  = 0;
let contextTarget: string | null = null;
let editingId: string | null     = null;
const screenshotCache = new Map<string, string>(); // url → screenshot url

// ─── ELEMENT REFS ──────────────────────────────────────────────────────────────

const orbitsContainer = document.getElementById('orbits-container')!;
const emptyState      = document.getElementById('empty-state')!;
const planetCount     = document.getElementById('planet-count')!;
const tooltip         = document.getElementById('planet-tooltip')!;
const tooltipImg      = document.getElementById('tooltip-img') as HTMLImageElement;
const tooltipSkeleton = document.getElementById('tooltip-skeleton')!;
const tooltipNoImg    = document.getElementById('tooltip-no-img')!;
const tooltipName     = document.getElementById('tooltip-name')!;
const tooltipDesc     = document.getElementById('tooltip-desc')!;
const modalOverlay    = document.getElementById('modal-overlay')!;
const projectForm     = document.getElementById('project-form') as HTMLFormElement;
const formId          = document.getElementById('form-id') as HTMLInputElement;
const formName        = document.getElementById('form-name') as HTMLInputElement;
const formUrl         = document.getElementById('form-url')  as HTMLInputElement;
const formDesc        = document.getElementById('form-desc') as HTMLTextAreaElement;
const colorPresetsEl  = document.getElementById('color-presets')!;
const modalTitle      = document.getElementById('modal-title')!;
const btnSaveText     = document.getElementById('btn-save-text')!;
const btnSpinner      = document.getElementById('btn-spinner')!;
const btnSave         = document.getElementById('btn-save') as HTMLButtonElement;
const contextMenu     = document.getElementById('context-menu')!;

// ─── PROCEDURAL SPACE BACKGROUND ──────────────────────────────────────────────

(function initSpaceBackground() {
  const canvas = document.getElementById('stars-canvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;

  interface Star { x: number; y: number; r: number; a: number; da: number; }
  interface Nebula { x: number; y: number; rx: number; ry: number; hue: number; rot: number; }

  let stars: Star[]   = [];
  let nebulas: Nebula[] = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    build();
  }

  function build() {
    // Stars
    const n = Math.floor((canvas.width * canvas.height) / 2800);
    stars = Array.from({ length: n }, () => ({
      x:  Math.random() * canvas.width,
      y:  Math.random() * canvas.height,
      r:  Math.random() * 1.6 + 0.2,
      a:  Math.random(),
      da: (Math.random() - 0.5) * 0.007,
    }));

    // Nebula blobs
    nebulas = [
      { x: canvas.width  * 0.15, y: canvas.height * 0.25, rx: 280, ry: 200, hue: 270, rot: -0.3 },
      { x: canvas.width  * 0.80, y: canvas.height * 0.65, rx: 320, ry: 210, hue: 220, rot:  0.5 },
      { x: canvas.width  * 0.50, y: canvas.height * 0.85, rx: 250, ry: 150, hue: 300, rot:  0.1 },
      { x: canvas.width  * 0.90, y: canvas.height * 0.15, rx: 200, ry: 180, hue: 190, rot: -0.6 },
    ];
  }

  function drawNebulas() {
    nebulas.forEach(nb => {
      ctx.save();
      ctx.translate(nb.x, nb.y);
      ctx.rotate(nb.rot);
      ctx.scale(1, nb.ry / nb.rx);

      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, nb.rx);
      grad.addColorStop(0,   `hsla(${nb.hue},80%,50%,0.07)`);
      grad.addColorStop(0.4, `hsla(${nb.hue},70%,40%,0.04)`);
      grad.addColorStop(1,   `hsla(${nb.hue},60%,30%,0)`);

      ctx.beginPath();
      ctx.arc(0, 0, nb.rx, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    });
  }

  function draw() {
    ctx.fillStyle = '#03010a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawNebulas();

    // Twinkling stars
    for (const s of stars) {
      s.a += s.da;
      if (s.a > 1 || s.a < 0.05) s.da *= -1;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${Math.max(0.05, Math.min(1, s.a))})`;
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }

  resize();
  draw();
  window.addEventListener('resize', resize);
})();

// ─── STORAGE ───────────────────────────────────────────────────────────────────

function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Project[]) : [];
  } catch { return []; }
}

function saveProjects() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

// ─── MICROLINK ─────────────────────────────────────────────────────────────────

function getScreenshotUrl(url: string): string {
  if (!url) return '';
  // Si ya es una URL de Microlink o personalizada, la devolvemos tal cual
  if (url.startsWith('http') && (url.includes('microlink.io') || url.includes('screenshot'))) {
    return url;
  }
  return `${MICROLINK_API}?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`;
}

// ─── RENDER SOLAR SYSTEM ───────────────────────────────────────────────────────

function renderSolarSystem() {
  orbitsContainer.innerHTML = '';
  planetCount.textContent = projects.length === 1 ? '1 proyecto' : `${projects.length} proyectos`;

  if (projects.length === 0) {
    emptyState.classList.add('visible');
    return;
  }
  emptyState.classList.remove('visible');

  projects.forEach((project, index) => {
    const radius     = BASE_RADIUS + index * RADIUS_STEP;
    const speed      = SPEEDS[index % SPEEDS.length];
    const size       = SIZE_MAP[project.size] ?? 52;
    const startAngle = (index * 137.5) % 360; // golden angle

    // Orbit ring
    const orbit = document.createElement('div');
    orbit.className = 'orbit';
    orbit.style.cssText = `
      width: ${radius * 2}px;
      height: ${radius * 2}px;
      animation-duration: ${speed}s;
      animation-delay: -${(startAngle / 360) * speed}s;
    `;

    // Planet wrapper
    const pw = document.createElement('div');
    pw.className = 'planet-wrapper';
    pw.style.cssText = `
      width: ${size}px;
      margin-left: -${size / 2}px;
      height: ${radius}px;
    `;

    // Planet
    const planet = document.createElement('div');
    planet.className = `planet planet--${project.size ?? 'medium'}`;
    planet.id = `planet-${project.id}`;
    planet.style.cssText = `
      animation-duration: ${speed}s;
      animation-delay: -${(startAngle / 360) * speed}s;
      width: ${size}px;
      height: ${size}px;
    `;

    // 3D Sphere Body (holds the shadow masking)
    const pBody = document.createElement('div');
    pBody.className = 'planet-body';
    pBody.style.cssText = `
      box-shadow: 0 0 ${size * 0.5}px ${GLOW_COLORS[project.colorIndex % GLOW_COLORS.length]},
                  0 0 ${size}px ${GLOW_COLORS[project.colorIndex % GLOW_COLORS.length].replace('.75', '.3')};
    `;

    // Rotating Texture Element
    const pTexture = document.createElement('div');
    pTexture.className = 'planet-texture';
    pTexture.style.background = project.gradient;
    // Each planet gets an independent axis-spin speed for added cosmic realism
    const spinDuration = 10 + (index % 4) * 4;
    pTexture.style.animationDuration = `${spinDuration}s`;
    pTexture.style.animationDelay = `-${Math.random() * 20}s`;

    pBody.appendChild(pTexture);
    planet.appendChild(pBody);

    // Ring on select large planets
    if (project.size === 'large' && index % 3 === 0) {
      const ring = document.createElement('div');
      ring.className = 'planet-ring';
      ring.style.cssText = `width:${size * 1.7}px; height:${size * 0.5}px;`;
      planet.appendChild(ring);
    }

    // Label
    const label = document.createElement('span');
    label.className = 'planet-label';
    label.textContent = project.name;
    planet.appendChild(label);

    // ── Events ──
    planet.addEventListener('click', () => {
      window.open(project.url, '_blank', 'noopener,noreferrer');
    });
    planet.addEventListener('mouseenter', (e) => showTooltip(project, e as MouseEvent));
    planet.addEventListener('mousemove',  (e) => positionTooltip(e as MouseEvent));
    planet.addEventListener('mouseleave', hideTooltip);
    planet.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openContextMenu(project.id, e as MouseEvent);
    });

    pw.appendChild(planet);
    orbit.appendChild(pw);
    orbitsContainer.appendChild(orbit);
  });
}

// ─── TOOLTIP ───────────────────────────────────────────────────────────────────

let tooltipProjectUrl = '';

function showTooltip(project: Project, e: MouseEvent) {
  tooltipName.textContent = project.name;
  tooltipDesc.textContent = project.description || 'Sin descripción';
  tooltipProjectUrl = project.url;

  // Reset state
  tooltipImg.classList.remove('loaded');
  tooltipImg.style.display  = 'none';
  tooltipNoImg.classList.remove('visible');
  tooltipSkeleton.classList.remove('hidden');

  tooltip.classList.add('visible');
  positionTooltip(e);

  // Load screenshot URL (generated synchronously)
  const screenshotUrl = project.screenshot || getScreenshotUrl(project.url);

  if (screenshotUrl) {
    // Cache it back on the project so next time it's instant
    if (!project.screenshot) {
      project.screenshot = screenshotUrl;
      saveProjects();
    }
    tooltipImg.src = screenshotUrl;
    tooltipImg.onload = () => {
      tooltipSkeleton.classList.add('hidden');
      tooltipImg.style.display = 'block';
      tooltipImg.classList.add('loaded');
    };
    tooltipImg.onerror = () => {
      tooltipSkeleton.classList.add('hidden');
      tooltipNoImg.classList.add('visible');
    };
  } else {
    tooltipSkeleton.classList.add('hidden');
    tooltipNoImg.classList.add('visible');
  }
}

function positionTooltip(e: MouseEvent) {
  const TW = 290, TH = 230;
  let x = e.clientX + 22;
  let y = e.clientY + 22;
  if (x + TW > window.innerWidth  - 12) x = e.clientX - TW - 22;
  if (y + TH > window.innerHeight - 12) y = e.clientY - TH - 22;
  tooltip.style.left = `${x}px`;
  tooltip.style.top  = `${y}px`;
}

function hideTooltip() {
  tooltip.classList.remove('visible');
}

// ─── COLOR PRESETS ─────────────────────────────────────────────────────────────

function buildColorPresets() {
  colorPresetsEl.innerHTML = '';
  COLOR_PRESETS.forEach((cp, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `color-preset${i === 0 ? ' selected' : ''}`;
    btn.style.background = cp.g;
    btn.title = cp.label;
    btn.dataset.index = String(i);
    btn.setAttribute('aria-label', cp.label);
    btn.addEventListener('click', () => {
      document.querySelectorAll<HTMLElement>('.color-preset').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedColor = i;
    });
    colorPresetsEl.appendChild(btn);
  });
}

function randomUnusedColor(): number {
  const used = new Set(projects.map(p => p.colorIndex));
  for (let i = 0; i < COLOR_PRESETS.length; i++) {
    if (!used.has(i)) return i;
  }
  return Math.floor(Math.random() * COLOR_PRESETS.length);
}

// ─── MODAL ─────────────────────────────────────────────────────────────────────

function openModal(project?: Project) {
  editingId = project?.id ?? null;
  modalTitle.textContent = project ? 'Editar Proyecto' : 'Nuevo Proyecto';
  btnSaveText.textContent = project ? 'Guardar Cambios' : 'Agregar Planeta';

  formId.value   = project?.id   ?? '';
  formName.value = project?.name ?? '';
  formUrl.value  = project?.url  ?? '';
  formDesc.value = project?.description ?? '';

  selectedColor = project ? (project.colorIndex ?? 0) : randomUnusedColor();
  document.querySelectorAll<HTMLElement>('.color-preset').forEach((b, i) =>
    b.classList.toggle('selected', i === selectedColor));

  const sizeVal = project?.size ?? 'medium';
  document.querySelectorAll<HTMLInputElement>('input[name="planet-size"]').forEach(r => {
    r.checked = r.value === sizeVal;
  });

  modalOverlay.classList.add('open');
  setTimeout(() => formName.focus(), 250);
}

function closeModal() {
  modalOverlay.classList.remove('open');
  projectForm.reset();
  editingId = null;
  setBusy(false);
}

function setBusy(busy: boolean) {
  btnSave.disabled = busy;
  btnSpinner.classList.toggle('hidden', !busy);
}

// ─── SAVE ──────────────────────────────────────────────────────────────────────

projectForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name        = formName.value.trim();
  const url         = formUrl.value.trim();
  const description = formDesc.value.trim();
  const size        = (document.querySelector<HTMLInputElement>('input[name="planet-size"]:checked')?.value ?? 'medium') as Project['size'];

  if (!name || !url) return;

  // Generamos la URL de screenshot de Microlink instantáneamente
  const screenshot = getScreenshotUrl(url);

  if (editingId) {
    const idx = projects.findIndex(p => p.id === editingId);
    if (idx !== -1) {
      projects[idx] = {
        ...projects[idx],
        name, url, description, size,
        colorIndex: selectedColor,
        gradient:   COLOR_PRESETS[selectedColor].g,
        screenshot: screenshot,
      };
    }
  } else {
    projects.push({
      id:         crypto.randomUUID(),
      name, url, description, size,
      colorIndex: selectedColor,
      gradient:   COLOR_PRESETS[selectedColor].g,
      screenshot,
      createdAt:  Date.now(),
    });
  }

  saveProjects();
  renderSolarSystem();
  closeModal();
});

// ─── CONTEXT MENU ──────────────────────────────────────────────────────────────

function openContextMenu(id: string, e: MouseEvent) {
  contextTarget = id;
  const CW = 155, CH = 80;
  let x = e.clientX, y = e.clientY;
  if (x + CW > window.innerWidth)  x = window.innerWidth  - CW - 8;
  if (y + CH > window.innerHeight) y = window.innerHeight - CH - 8;
  contextMenu.style.left = `${x}px`;
  contextMenu.style.top  = `${y}px`;
  contextMenu.classList.add('open');
}

function closeContextMenu() {
  contextMenu.classList.remove('open');
  contextTarget = null;
}

document.getElementById('ctx-edit')!.addEventListener('click', () => {
  const p = projects.find(p => p.id === contextTarget);
  if (p) openModal(p);
  closeContextMenu();
});

document.getElementById('ctx-delete')!.addEventListener('click', () => {
  if (!contextTarget) return;
  const p = projects.find(p => p.id === contextTarget);
  if (p && confirm(`¿Eliminar el proyecto "${p.name}"?`)) {
    projects = projects.filter(pr => pr.id !== contextTarget);
    saveProjects();
    renderSolarSystem();
  }
  closeContextMenu();
});

// ─── GLOBAL LISTENERS ──────────────────────────────────────────────────────────

document.getElementById('btn-open-modal')!.addEventListener('click', () => openModal());
document.getElementById('btn-empty-add')!.addEventListener('click', () => openModal());
document.getElementById('btn-cancel')!.addEventListener('click', closeModal);
document.getElementById('modal-close')!.addEventListener('click', closeModal);

modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener('click',      () => closeContextMenu());
document.addEventListener('contextmenu', e => {
  if (!(e.target as HTMLElement).closest('#context-menu')) closeContextMenu();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeContextMenu(); }
});

// ─── BOOT ──────────────────────────────────────────────────────────────────────

buildColorPresets();
projects = loadProjects();
renderSolarSystem();
