// Live flight-sim telemetry for overlays.
// Prefers the local bridge (ws://localhost:7777 — instant, works with no internet round-trip) and falls back to
// the copy the bridge mirrors into Firebase (state path "sim"), so OBS on another device still gets it.
//
//   watchSim(t => ...)  t = { alt, agl, ias, gs, hdg, vs, lat, lon, onGround, phase, distToDest, eteMin, ts } | null

import { CONFIG } from './config.js';
import { watch } from './state.js';

const STALE_MS = 15000;

export function watchSim(cb) {
  let local = null, remote = null, ws, retry;
  const emit = () => {
    const now = Date.now();
    const fresh = [local, remote].filter(t => t && now - t.ts < STALE_MS).sort((a, b) => b.ts - a.ts)[0] || null;
    cb(fresh);
  };
  const open = () => {
    try { ws = new WebSocket(CONFIG.simBridgeUrl); } catch { return; }
    ws.onmessage = e => { try { local = { ...JSON.parse(e.data), ts: Date.now() }; emit(); } catch {} };
    ws.onclose = () => { local = null; clearTimeout(retry); retry = setTimeout(open, 5000); };
  };
  open();
  watch('sim', t => { remote = t; emit(); });
  setInterval(emit, 5000); // expire stale data even when nothing new arrives
}

export const fmt = {
  alt: t => t.alt >= 18000 ? `FL${String(Math.round(t.alt / 100)).padStart(3, '0')}` : `${Math.round(t.alt / 10) * 10 | 0} FT`,
  gs: t => `${Math.round(t.gs)} KT`,
  hdg: t => `${String(Math.round(t.hdg) % 360 || 360).padStart(3, '0')}°`,
  vs: t => `${t.vs > 0 ? '+' : ''}${Math.round(t.vs / 50) * 50} FPM`,
  dist: t => t.distToDest == null ? '—' : `${Math.round(t.distToDest)} NM`,
  ete: t => t.eteMin == null ? '—' : `${Math.floor(t.eteMin / 60)}:${String(Math.round(t.eteMin % 60)).padStart(2, '0')}`,
};
