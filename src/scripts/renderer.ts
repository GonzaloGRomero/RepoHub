/* =====================================================================
   renderer.ts — Canvas Drawing Engine for Universe Mode
   Draws: space background, black hole, star systems, cartoon planets, moons
   ===================================================================== */

import type { StarSystem, Planet, Moon } from './store.ts';
import { PLANET_TYPES, SIZE_MAP } from './store.ts';

// ─── TYPES ─────────────────────────────────────────────────────────────────────

export interface Camera {
  x: number;
  y: number;
  zoom: number;
  targetX: number;
  targetY: number;
  targetZoom: number;
}

export interface Star {
  x: number; y: number;
  r: number; a: number; da: number;
  color: string;
}

export interface NebulaBlob {
  x: number; y: number;
  rx: number; ry: number;
  hue: number; rot: number;
}

// ─── SPACE BACKGROUND ─────────────────────────────────────────────────────────

let bgStars: Star[] = [];
let bgNebulas: NebulaBlob[] = [];
let bgBuilt = false;

export function buildSpaceBackground(w: number, h: number): void {
  const n = Math.floor((w * h) / 2400);
  bgStars = Array.from({ length: n }, () => ({
    x: (Math.random() - 0.5) * w * 4,
    y: (Math.random() - 0.5) * h * 4,
    r: Math.random() * 1.6 + 0.2,
    a: Math.random(),
    da: (Math.random() - 0.5) * 0.006,
    color: Math.random() > 0.85
      ? `hsl(${220 + Math.random() * 60},80%,80%)`
      : '#ffffff',
  }));
  bgNebulas = [
    { x: -w * 0.6, y: -h * 0.4, rx: 350, ry: 240, hue: 270, rot: -0.3 },
    { x:  w * 0.7, y:  h * 0.5, rx: 420, ry: 280, hue: 210, rot:  0.4 },
    { x:  w * 0.1, y:  h * 0.7, rx: 300, ry: 180, hue: 300, rot:  0.1 },
    { x: -w * 0.5, y:  h * 0.6, rx: 380, ry: 260, hue: 180, rot: -0.5 },
    { x:  w * 0.3, y: -h * 0.5, rx: 260, ry: 200, hue: 240, rot:  0.2 },
  ];
  bgBuilt = true;
}

export function drawSpaceBackground(ctx: CanvasRenderingContext2D, w: number, h: number, cam: Camera): void {
  ctx.fillStyle = '#03010a';
  ctx.fillRect(0, 0, w, h);

  // Nebulas (parallax at 0.08x camera speed)
  const px = -cam.x * 0.08;
  const py = -cam.y * 0.08;
  bgNebulas.forEach(nb => {
    ctx.save();
    ctx.translate(w / 2 + px + nb.x, h / 2 + py + nb.y);
    ctx.rotate(nb.rot);
    ctx.scale(1, nb.ry / nb.rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, nb.rx);
    g.addColorStop(0,   `hsla(${nb.hue},75%,50%,0.08)`);
    g.addColorStop(0.4, `hsla(${nb.hue},65%,40%,0.04)`);
    g.addColorStop(1,   `hsla(${nb.hue},55%,30%,0)`);
    ctx.beginPath();
    ctx.arc(0, 0, nb.rx, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  });

  // Twinkling stars (parallax at 0.15x)
  const sx = -cam.x * 0.15 + w / 2;
  const sy = -cam.y * 0.15 + h / 2;
  for (const s of bgStars) {
    s.a += s.da;
    if (s.a > 1 || s.a < 0.05) s.da *= -1;
    const alpha = Math.max(0.05, Math.min(1, s.a));
    ctx.beginPath();
    ctx.arc(sx + s.x, sy + s.y, s.r, 0, Math.PI * 2);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = s.color;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// ─── BLACK HOLE ───────────────────────────────────────────────────────────────

export function drawBlackHole(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number): void {
  const r = 55;

  // Outer accretion disk glow (animated)
  for (let ring = 0; ring < 3; ring++) {
    const diskR = r * (1.8 + ring * 0.55);
    const alpha = 0.08 - ring * 0.025;
    const hue = 25 + ring * 15;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, 0.32);
    ctx.beginPath();
    ctx.arc(0, 0, diskR, 0, Math.PI * 2);
    const gDisk = ctx.createRadialGradient(0, 0, diskR * 0.65, 0, 0, diskR);
    gDisk.addColorStop(0, `hsla(${hue}, 90%, 65%, ${alpha + 0.05 * Math.sin(t * 0.8 + ring)})`);
    gDisk.addColorStop(1, `hsla(${hue}, 80%, 50%, 0)`);
    ctx.fillStyle = gDisk;
    ctx.fill();
    ctx.restore();
  }

  // Photon sphere (bright orange/white ring)
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, 0.28);
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.45, 0, Math.PI * 2);
  const gRing = ctx.createRadialGradient(0, 0, r * 1.2, 0, 0, r * 1.6);
  gRing.addColorStop(0,   'rgba(255,160,40,0.0)');
  gRing.addColorStop(0.35,'rgba(255,200,80,0.55)');
  gRing.addColorStop(0.55,'rgba(255,240,160,0.9)');
  gRing.addColorStop(0.75,'rgba(255,160,40,0.5)');
  gRing.addColorStop(1,   'rgba(255,80,0,0.0)');
  ctx.fillStyle = gRing;
  ctx.fill();
  ctx.restore();

  // Gravitational lens glow
  const gLens = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 2.2);
  gLens.addColorStop(0,   'rgba(100,40,180,0.35)');
  gLens.addColorStop(0.4, 'rgba(60,20,120,0.18)');
  gLens.addColorStop(1,   'rgba(20,5,40,0)');
  ctx.beginPath();
  ctx.arc(cx, cy, r * 2.2, 0, Math.PI * 2);
  ctx.fillStyle = gLens;
  ctx.fill();

  // Event horizon (pure black)
  const gEvent = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, 0, cx, cy, r);
  gEvent.addColorStop(0,   '#1a0a2e');
  gEvent.addColorStop(0.5, '#08030f');
  gEvent.addColorStop(1,   '#000000');
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = gEvent;
  ctx.fill();

  // Label
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = `bold ${Math.round(10)}px 'Space Mono', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Dev Hub', cx, cy);
}

// ─── ORBIT RING ───────────────────────────────────────────────────────────────

export function drawOrbitRing(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, alpha = 0.1): void {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 8]);
  ctx.stroke();
  ctx.setLineDash([]);
}

// ─── STAR SYSTEM (universe view miniature) ────────────────────────────────────

export function drawSystemDot(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  system: StarSystem,
  hovered: boolean,
  t: number
): void {
  const r = hovered ? 14 : 11;
  const pulse = 1 + 0.08 * Math.sin(t * 1.5);

  // Glow
  const gGlow = ctx.createRadialGradient(x, y, 0, x, y, r * 3.5 * pulse);
  gGlow.addColorStop(0,   system.starGlow.replace('0.8', '0.35'));
  gGlow.addColorStop(0.5, system.starGlow.replace('0.8', '0.12'));
  gGlow.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.arc(x, y, r * 3.5 * pulse, 0, Math.PI * 2);
  ctx.fillStyle = gGlow;
  ctx.fill();

  // Star body
  const gStar = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r * pulse);
  gStar.addColorStop(0, '#ffffff');
  gStar.addColorStop(0.25, system.starColor);
  gStar.addColorStop(1, system.starGlow.replace('0.8', '0.6'));
  ctx.beginPath();
  ctx.arc(x, y, r * pulse, 0, Math.PI * 2);
  ctx.fillStyle = gStar;
  ctx.fill();

  // Planet count indicator
  if (system.planets.length > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `bold 9px 'Outfit', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(system.planets.length), x, y);
  }

  // Name label
  ctx.fillStyle = hovered ? '#ffffff' : 'rgba(255,255,255,0.65)';
  ctx.font = `${hovered ? 'bold ' : ''}${hovered ? 13 : 11}px 'Outfit', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(system.name, x, y + r * pulse + 6);
}

// ─── CARTOON PLANET ───────────────────────────────────────────────────────────

export function drawCartoonPlanet(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  planet: Planet,
  axisAngle: number,   // rotates the surface bands
  hovered: boolean,
  scale: number = 1
): void {
  const r = (SIZE_MAP[planet.size] ?? 42) * scale;
  const pt = PLANET_TYPES[planet.colorIndex % PLANET_TYPES.length];

  ctx.save();
  ctx.translate(cx, cy);

  // Outer glow
  const gGlow = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 2.2);
  gGlow.addColorStop(0,   pt.primary + '55');
  gGlow.addColorStop(0.5, pt.primary + '20');
  gGlow.addColorStop(1,   'transparent');
  ctx.beginPath();
  ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2);
  ctx.fillStyle = gGlow;
  ctx.fill();

  // Clip to sphere
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();

  // Base color
  const gBase = ctx.createRadialGradient(-r * 0.15, -r * 0.15, 0, 0, 0, r * 1.1);
  gBase.addColorStop(0,   pt.light);
  gBase.addColorStop(0.4, pt.primary);
  gBase.addColorStop(1,   pt.dark);
  ctx.fillStyle = gBase;
  ctx.fillRect(-r, -r, r * 2, r * 2);

  // Rotating horizontal bands
  ctx.save();
  ctx.rotate(axisAngle * 0.3);  // slight tilt for realism
  const bandCount = 4 + (planet.colorIndex % 3);
  for (let i = 0; i < bandCount; i++) {
    const y0 = -r + (i / bandCount) * r * 2;
    const bh = r * 2 / bandCount;
    const gBand = ctx.createLinearGradient(0, y0, 0, y0 + bh);
    gBand.addColorStop(0,   'rgba(0,0,0,0)');
    gBand.addColorStop(0.3, pt.band);
    gBand.addColorStop(0.7, pt.band);
    gBand.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = gBand;
    ctx.fillRect(-r, y0, r * 2, bh);
  }
  ctx.restore();

  // Storm spot (unique per planet type)
  if (planet.colorIndex % 3 !== 2) {
    const sx = Math.cos(axisAngle) * r * 0.3;
    const sy = r * 0.2;
    const gStorm = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 0.28);
    gStorm.addColorStop(0, 'rgba(255,255,255,0.18)');
    gStorm.addColorStop(0.4, pt.band);
    gStorm.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.ellipse(sx, sy, r * 0.28, r * 0.18, axisAngle, 0, Math.PI * 2);
    ctx.fillStyle = gStorm;
    ctx.fill();
  }

  // Polar ice caps (for icy/arctic planets)
  if (planet.colorIndex === 7 || planet.colorIndex === 4 || planet.colorIndex === 11) {
    const gPolar = ctx.createRadialGradient(0, -r, 0, 0, -r, r * 0.55);
    gPolar.addColorStop(0, 'rgba(255,255,255,0.7)');
    gPolar.addColorStop(0.5, 'rgba(200,230,255,0.25)');
    gPolar.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gPolar;
    ctx.fillRect(-r, -r, r * 2, r * 0.7);
  }

  // Specular highlight (cartoon sheen)
  const gSpec = ctx.createRadialGradient(-r * 0.35, -r * 0.38, 0, -r * 0.2, -r * 0.2, r * 0.55);
  gSpec.addColorStop(0,   'rgba(255,255,255,0.55)');
  gSpec.addColorStop(0.45,'rgba(255,255,255,0.12)');
  gSpec.addColorStop(1,   'rgba(255,255,255,0)');
  ctx.fillStyle = gSpec;
  ctx.fillRect(-r, -r, r * 2, r * 2);

  // Atmospheric shadow (bottom-right dark)
  const gShadow = ctx.createRadialGradient(r * 0.3, r * 0.35, r * 0.1, r * 0.3, r * 0.35, r * 1.2);
  gShadow.addColorStop(0,   'rgba(0,0,0,0.62)');
  gShadow.addColorStop(0.55,'rgba(0,0,0,0.22)');
  gShadow.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = gShadow;
  ctx.fillRect(-r, -r, r * 2, r * 2);

  ctx.restore(); // unclip

  // Cartoon outline
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.strokeStyle = hovered
    ? 'rgba(255,255,255,0.9)'
    : `${pt.dark}cc`;
  ctx.lineWidth = hovered ? 2.5 : 1.5;
  ctx.stroke();

  // Saturn-style ring for large planets (every 3rd colorIndex)
  if (planet.size === 'large' && planet.colorIndex % 3 === 0) {
    drawPlanetRing(ctx, r, pt.primary);
  }

  ctx.restore();
}

function drawPlanetRing(ctx: CanvasRenderingContext2D, r: number, color: string): void {
  ctx.save();
  ctx.scale(1, 0.3);
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.75, 0, Math.PI * 2);
  ctx.strokeStyle = color + 'aa';
  ctx.lineWidth = r * 0.22;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.95, 0, Math.PI * 2);
  ctx.strokeStyle = color + '44';
  ctx.lineWidth = r * 0.1;
  ctx.stroke();
  ctx.restore();
}

// ─── STAR (system view center) ────────────────────────────────────────────────

export function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, system: StarSystem, t: number): void {
  const r = 38;
  const pulse = 1 + 0.06 * Math.sin(t * 1.2);

  // Outer corona
  for (let i = 3; i >= 0; i--) {
    const gr = r * (2 + i * 0.8) * pulse;
    const gCorona = ctx.createRadialGradient(cx, cy, 0, cx, cy, gr);
    gCorona.addColorStop(0,   system.starGlow.replace('0.8', String(0.22 - i * 0.04)));
    gCorona.addColorStop(0.5, system.starGlow.replace('0.8', String(0.08 - i * 0.015)));
    gCorona.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, gr, 0, Math.PI * 2);
    ctx.fillStyle = gCorona;
    ctx.fill();
  }

  // Surface
  const gStar = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.25, 0, cx, cy, r * pulse);
  gStar.addColorStop(0, '#ffffff');
  gStar.addColorStop(0.2, system.starColor);
  gStar.addColorStop(0.7, system.starGlow.replace('0.8', '0.9'));
  gStar.addColorStop(1,   system.starColor + 'aa');
  ctx.beginPath();
  ctx.arc(cx, cy, r * pulse, 0, Math.PI * 2);
  ctx.fillStyle = gStar;
  ctx.fill();

  // Highlight
  const gSpec = ctx.createRadialGradient(cx - r * 0.28, cy - r * 0.28, 0, cx - r * 0.1, cy - r * 0.1, r * 0.55);
  gSpec.addColorStop(0, 'rgba(255,255,255,0.6)');
  gSpec.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r * pulse, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = gSpec;
  ctx.fillRect(cx - r * 2, cy - r * 2, r * 4, r * 4);
  ctx.restore();

  // Label
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.font = `bold 11px 'Space Mono', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(system.name, cx, cy);
}

// ─── MOON ─────────────────────────────────────────────────────────────────────

export function drawMoon(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  moon: Moon,
  hovered: boolean
): void {
  const r = moon.size;
  ctx.save();
  ctx.translate(cx, cy);

  // Glow
  if (hovered) {
    const gGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.5);
    gGlow.addColorStop(0, moon.color + '60');
    gGlow.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = gGlow;
    ctx.fill();
  }

  // Body
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();
  const gMoon = ctx.createRadialGradient(-r * 0.25, -r * 0.25, 0, 0, 0, r);
  gMoon.addColorStop(0, moon.color);
  gMoon.addColorStop(0.6, moon.color + 'cc');
  gMoon.addColorStop(1, '#202040');
  ctx.fillStyle = gMoon;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  // Crater-style highlight
  const gSpec = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, -r * 0.2, -r * 0.2, r * 0.45);
  gSpec.addColorStop(0, 'rgba(255,255,255,0.45)');
  gSpec.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gSpec;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();

  // Outline
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.strokeStyle = hovered ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

// ─── HIT TEST HELPER ─────────────────────────────────────────────────────────

export function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}
