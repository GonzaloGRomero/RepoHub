/* =====================================================================
   monitoring.ts — Background monitoring engine
   Checks planet URLs, updates status in store, dispatches events
   ===================================================================== */

import {
  loadUniverse, saveUniverse, addLog,
  type Planet, type StarSystem, type PlanetStatus
} from './store.ts';

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const TIMEOUT_MS = 10_000;               // 10 seconds timeout per ping

// ─── CORE PING ────────────────────────────────────────────────────────────────

async function pingUrl(url: string): Promise<{ online: boolean; ms: number }> {
  const t0 = performance.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    await fetch(url, {
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timer);
    return { online: true, ms: Math.round(performance.now() - t0) };
  } catch {
    return { online: false, ms: Math.round(performance.now() - t0) };
  }
}

// ─── CHECK ONE PLANET ─────────────────────────────────────────────────────────

export async function checkPlanet(planet: Planet, systemName: string): Promise<void> {
  if (!planet.url) return;

  const prevStatus = planet.status;
  planet.status = 'checking';
  dispatchStatusEvent(planet.id, 'checking', 0);

  const { online, ms } = await pingUrl(planet.url);
  const newStatus: PlanetStatus = online ? 'online' : 'offline';

  planet.status       = newStatus;
  planet.responseTime = ms;
  planet.lastChecked  = new Date().toISOString();
  planet.uptimeHistory = [...(planet.uptimeHistory ?? []), online].slice(-20);

  // Log on status change or first check
  if (prevStatus === 'unknown' || prevStatus !== newStatus) {
    addLog({
      planetId:   planet.id,
      planetName: planet.name,
      systemName,
      type:    online ? 'success' : 'error',
      message: online
        ? `Proyecto online — ${ms}ms de respuesta`
        : `No se pudo contactar el servidor. Tiempo: ${ms}ms`,
      responseTime: ms,
    });
  }

  dispatchStatusEvent(planet.id, newStatus, ms);
}

// ─── CHECK ALL PLANETS ────────────────────────────────────────────────────────

export async function checkAllPlanets(): Promise<void> {
  const data = loadUniverse();
  let dirty = false;

  for (const sys of data.systems) {
    for (const planet of sys.planets) {
      if (!planet.url) continue;
      await checkPlanet(planet, sys.name);
      dirty = true;
    }
  }

  if (dirty) saveUniverse(data);
}

// ─── SIMULATE STATUS (for testing) ────────────────────────────────────────────

export function simulateStatus(planetId: string, status: PlanetStatus): void {
  const data = loadUniverse();
  for (const sys of data.systems) {
    for (const planet of sys.planets) {
      if (planet.id !== planetId) continue;
      const prevStatus = planet.status;
      planet.status       = status;
      planet.lastChecked  = new Date().toISOString();
      planet.responseTime = status === 'online' ? Math.round(Math.random() * 200 + 50) : 0;
      planet.uptimeHistory = [...(planet.uptimeHistory ?? []), status === 'online'].slice(-20);

      if (prevStatus !== status) {
        addLog({
          planetId:   planet.id,
          planetName: planet.name,
          systemName: sys.name,
          type:    status === 'online' ? 'info' : 'warning',
          message: status === 'online'
            ? `[SIMULADO] Proyecto marcado como ONLINE`
            : `[SIMULADO] Proyecto marcado como OFFLINE`,
          responseTime: planet.responseTime,
        });
      }

      dispatchStatusEvent(planetId, status, planet.responseTime);
      saveUniverse(data);
      return;
    }
  }
}

// ─── CUSTOM EVENT ─────────────────────────────────────────────────────────────

function dispatchStatusEvent(planetId: string, status: PlanetStatus, ms: number): void {
  window.dispatchEvent(new CustomEvent('planet-status-update', {
    detail: { planetId, status, ms }
  }));
}

// ─── AUTO-START PERIODIC CHECK ────────────────────────────────────────────────

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startMonitoring(): void {
  if (intervalId) return;
  // First check shortly after load
  setTimeout(() => checkAllPlanets(), 2000);
  intervalId = setInterval(checkAllPlanets, CHECK_INTERVAL_MS);
}

export function stopMonitoring(): void {
  if (intervalId) { clearInterval(intervalId); intervalId = null; }
}
