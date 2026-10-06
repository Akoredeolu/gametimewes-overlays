// Shared live state for overlays + dashboard.
// Firebase Realtime Database when configured; otherwise BroadcastChannel + localStorage (same-browser only).
//
//   import { watch, write, patch } from '../lib/state.js';
//   watch('scene', s => render(s));         // fires immediately with current value, then on every change
//   await write('scene/title', 'MATCHDAY');  // dashboard (requires sign-in when Firebase rules are deployed)

import { CONFIG, firebaseEnabled } from './config.js';
import { DEFAULTS } from './defaults.js';

const FB_VER = '10.12.5';
const ROOT = 'gtw';
let dbApi = null; // { db, ref, onValue, set, update, push }
let authApi = null;

async function fb() {
  if (dbApi) return dbApi;
  const [{ initializeApp }, d] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-database.js`),
  ]);
  const app = initializeApp(CONFIG.firebase);
  dbApi = { app, db: d.getDatabase(app), ...d };
  return dbApi;
}

// ---------- local fallback ----------
const LS_KEY = 'gtw-state';
const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('gtw-state') : null;
const localListeners = new Set();
function localGetAll() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; }
}
function localSetAll(obj) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(obj)); } catch {}
  bc?.postMessage(obj);
  localListeners.forEach(fn => fn(obj));
}
bc && (bc.onmessage = e => localListeners.forEach(fn => fn(e.data)));
window.addEventListener?.('storage', e => { if (e.key === LS_KEY) localListeners.forEach(fn => fn(localGetAll())); });

const getPath = (obj, path) => path.split('/').filter(Boolean).reduce((o, k) => (o == null ? undefined : o[k]), obj);
function setPath(obj, path, val) {
  const keys = path.split('/').filter(Boolean);
  let o = obj;
  keys.slice(0, -1).forEach(k => { o[k] = (o[k] && typeof o[k] === 'object') ? o[k] : {}; o = o[k]; });
  o[keys.at(-1)] = val;
  return obj;
}
const withDefaults = (path, val) => {
  const def = getPath(DEFAULTS, path);
  if (val == null) return structuredClone(def ?? null);
  if (def && typeof def === 'object' && !Array.isArray(def) && typeof val === 'object') return deepMerge(structuredClone(def), val);
  return val;
};
function deepMerge(a, b) {
  for (const [k, v] of Object.entries(b)) a[k] = (v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object') ? deepMerge(a[k], v) : v;
  return a;
}

// ---------- public API ----------
export function watch(path, cb) {
  if (firebaseEnabled()) {
    let unsub = () => {};
    fb().then(({ db, ref, onValue }) => {
      unsub = onValue(ref(db, `${ROOT}/${path}`), snap => cb(withDefaults(path, snap.val())), err => console.warn('[state]', path, err.message));
    });
    return () => unsub();
  }
  const fn = all => cb(withDefaults(path, getPath(all, path)));
  localListeners.add(fn);
  fn(localGetAll());
  return () => localListeners.delete(fn);
}

export async function write(path, value) {
  if (firebaseEnabled()) { const { db, ref, set } = await fb(); return set(ref(db, `${ROOT}/${path}`), value); }
  localSetAll(setPath(localGetAll(), path, value));
}

export async function patch(path, partial) {
  if (firebaseEnabled()) { const { db, ref, update } = await fb(); return update(ref(db, `${ROOT}/${path}`), partial); }
  const all = localGetAll();
  setPath(all, path, { ...(getPath(all, path) || {}), ...partial });
  localSetAll(all);
}

// Append-only event (used for alert test-fires / manual alerts). Overlays ignore events older than 15s.
export async function emit(channel, payload) {
  const evt = { ...payload, ts: Date.now() };
  if (firebaseEnabled()) { const { db, ref, push } = await fb(); return push(ref(db, `${ROOT}/events/${channel}`), evt); }
  bc?.postMessage({ __event: channel, evt });
  localListeners.forEach(fn => fn({ __event: channel, evt }));
}

export function onEvent(channel, cb) {
  const since = Date.now() - 15000;
  if (firebaseEnabled()) {
    fb().then(({ db, ref, onChildAdded, query, orderByChild, startAt }) => {
      onChildAdded(query(ref(db, `${ROOT}/events/${channel}`), orderByChild('ts'), startAt(since)), s => cb(s.val()));
    });
    return;
  }
  const fn = msg => { if (msg?.__event === channel && msg.evt.ts >= since) cb(msg.evt); };
  localListeners.add(fn); // bc.onmessage already fans out to localListeners
}

// Delete events older than `ms` (keeps the free Firebase tier tidy). Returns number removed.
export async function pruneEvents(ms = 86400000) {
  if (!firebaseEnabled()) return 0;
  const { db, ref, get, query, orderByChild, endAt, update } = await fb();
  let n = 0;
  for (const ch of ['alert']) {
    const snap = await get(query(ref(db, `${ROOT}/events/${ch}`), orderByChild('ts'), endAt(Date.now() - ms)));
    const del = {};
    snap.forEach(c => { del[c.key] = null; n++; });
    if (n) await update(ref(db, `${ROOT}/events/${ch}`), del);
  }
  return n;
}

// ---------- auth (dashboard only) ----------
export async function auth() {
  if (!firebaseEnabled()) return { user: { displayName: 'Local mode' }, signIn() {}, signOut() {}, onChange: cb => cb({ displayName: 'Local mode' }) };
  if (authApi) return authApi;
  const { app } = await fb();
  const a = await import(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-auth.js`);
  const instance = a.getAuth(app);
  authApi = {
    get user() { return instance.currentUser; },
    signIn: () => a.signInWithPopup(instance, new a.GoogleAuthProvider()),
    signOut: () => a.signOut(instance),
    onChange: cb => a.onAuthStateChanged(instance, cb),
  };
  return authApi;
}

// Query-string helper used by overlays: ?vertical=1&scale=0.5&debug=1
export const params = new URLSearchParams(location.search);
export const hashParams = new URLSearchParams(location.hash.slice(1));
