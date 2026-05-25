/* =====================================================================
   store.ts — Universe Data Model & LocalStorage
   ===================================================================== */

export const STORAGE_KEY = 'devhub_universe_v1';
export const MICROLINK_API = 'https://api.microlink.io';

// ─── TYPES ─────────────────────────────────────────────────────────────────────

export interface Moon {
  id: string;
  name: string;
  url: string;
  color: string;       // hex color
  size: number;        // radius in canvas px (6-14)
}

export interface Planet {
  id: string;
  name: string;
  url: string;
  description: string;
  screenshot: string;  // Microlink URL (generated on save)
  size: 'small' | 'medium' | 'large';
  colorIndex: number;  // 0-11 → maps to PLANET_TYPES
  orbitRadius: number; // px from star center (set automatically)
  orbitSpeed: number;  // seconds per orbit
  orbitAngle: number;  // starting angle offset (golden angle)
  moons: Moon[];
  createdAt: number;
}

export interface StarSystem {
  id: string;
  name: string;
  description: string;
  starColor: string;   // hex like '#ffd580'
  starGlow: string;    // rgba glow color
  orbitRadius: number; // px from black hole center
  orbitSpeed: number;  // seconds per orbit
  startAngle: number;  // starting angle
  planets: Planet[];
  createdAt: number;
}

export interface UniverseData {
  systems: StarSystem[];
}

// ─── DEFAULTS ──────────────────────────────────────────────────────────────────

export const PLANET_TYPES = [
  { name: 'Nebula Purple', primary: '#b86fff', dark: '#3a0a8c', light: '#e8c0ff', band: 'rgba(80,0,160,0.4)' },
  { name: 'Ocean Blue',    primary: '#3a9fff', dark: '#0a3a8c', light: '#a0d8ff', band: 'rgba(0,60,180,0.35)' },
  { name: 'Solar Ember',   primary: '#ff8c32', dark: '#8c2a00', light: '#ffd0a0', band: 'rgba(180,60,0,0.4)' },
  { name: 'Emerald',       primary: '#3ad47a', dark: '#0a5c2a', light: '#a0ffcc', band: 'rgba(0,100,40,0.35)' },
  { name: 'Rose Quartz',   primary: '#ff4a88', dark: '#8c0a2a', light: '#ffaac8', band: 'rgba(180,0,60,0.4)' },
  { name: 'Teal Aura',     primary: '#22d4c8', dark: '#0a5060', light: '#a0fff4', band: 'rgba(0,120,130,0.35)' },
  { name: 'Golden',        primary: '#f0c020', dark: '#7a5a00', light: '#fff0a0', band: 'rgba(160,100,0,0.4)' },
  { name: 'Arctic',        primary: '#c0d8ff', dark: '#4060a0', light: '#ffffff', band: 'rgba(80,120,200,0.3)' },
  { name: 'Crimson Dwarf', primary: '#ff3030', dark: '#8c0000', light: '#ffa0a0', band: 'rgba(160,0,0,0.5)' },
  { name: 'Cosmic Teal',   primary: '#20b8e0', dark: '#083c60', light: '#a0f0ff', band: 'rgba(0,100,180,0.35)' },
  { name: 'Mint Galaxy',   primary: '#40e880', dark: '#0d5020', light: '#b0ffcc', band: 'rgba(0,140,60,0.35)' },
  { name: 'Violet Storm',  primary: '#8822e0', dark: '#2a0a7a', light: '#d4a0ff', band: 'rgba(100,0,200,0.45)' },
];

export const STAR_COLORS = [
  { label: 'Sol Amarillo',   color: '#ffe066', glow: 'rgba(255,200,0,0.8)' },
  { label: 'Gigante Roja',   color: '#ff6030', glow: 'rgba(255,80,0,0.8)' },
  { label: 'Enana Blanca',   color: '#d0e8ff', glow: 'rgba(180,220,255,0.8)' },
  { label: 'Estrella Azul',  color: '#60a0ff', glow: 'rgba(60,120,255,0.8)' },
  { label: 'Pulsar Verde',   color: '#40ff90', glow: 'rgba(0,220,80,0.8)' },
  { label: 'Nebulosa Rosa',  color: '#ff80c0', glow: 'rgba(255,80,160,0.8)' },
];

export const MOON_COLORS = ['#c8c8d8','#b0c8e0','#e0c8b0','#b0e0c8','#d0b0e0','#e0d0b0'];

export const SIZE_MAP = { small: 28, medium: 42, large: 58 };
export const BASE_ORBIT = 130;
export const ORBIT_STEP  = 95;
export const PLANET_SPEEDS = [22, 33, 47, 62, 80, 100, 122, 147, 175, 205];

// ─── STORAGE ───────────────────────────────────────────────────────────────────

export function loadUniverse(): UniverseData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UniverseData) : { systems: [] };
  } catch { return { systems: [] }; }
}

export function saveUniverse(data: UniverseData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ─── HELPERS ───────────────────────────────────────────────────────────────────

export function uid(): string {
  return crypto.randomUUID();
}

export function getScreenshotUrl(url: string): string {
  if (!url) return '';
  return `${MICROLINK_API}?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`;
}

export function newPlanet(name: string, url: string, desc: string, size: Planet['size'], colorIndex: number, index: number): Planet {
  return {
    id: uid(),
    name, url, description: desc,
    screenshot: getScreenshotUrl(url),
    size, colorIndex,
    orbitRadius: BASE_ORBIT + index * ORBIT_STEP,
    orbitSpeed: PLANET_SPEEDS[index % PLANET_SPEEDS.length],
    orbitAngle: (index * 137.5) % 360,
    moons: [],
    createdAt: Date.now(),
  };
}

export function newSystem(name: string, description: string, starColorIdx: number, systemCount: number): StarSystem {
  const sc = STAR_COLORS[starColorIdx % STAR_COLORS.length];
  const systemOrbits = [260, 380, 500, 620, 740, 860];
  const systemSpeeds = [60, 90, 120, 155, 190, 230];
  return {
    id: uid(),
    name, description,
    starColor: sc.color,
    starGlow: sc.glow,
    orbitRadius: systemOrbits[systemCount % systemOrbits.length],
    orbitSpeed: systemSpeeds[systemCount % systemSpeeds.length],
    startAngle: (systemCount * 137.5) % 360,
    planets: [],
    createdAt: Date.now(),
  };
}
