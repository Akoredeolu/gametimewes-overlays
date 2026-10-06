// Gametimewes sim bridge — reads MSFS 2020/2024 via SimConnect and serves live telemetry to the overlays.
//   • ws://localhost:7777  → overlays running on this PC (instant)
//   • Firebase gtw/sim     → overlays on any other device (optional, needs config.json "firebase" block)
// Run: double-click start-bridge.bat (or `npm start`). Leave it open while you fly.

const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const { open, Protocol, SimConnectDataType, SimConnectPeriod, SimConnectConstants } = require('node-simconnect');

const cfgPath = path.join(__dirname, 'config.json');
const CFG = Object.assign(
  { port: 7777, simbriefUser: '', firebase: null, mirrorEveryMs: 2000 },
  fs.existsSync(cfgPath) ? JSON.parse(fs.readFileSync(cfgPath, 'utf8')) : {},
);

const log = (...a) => console.log(new Date().toLocaleTimeString(), ...a);

// ---------------- local WebSocket server ----------------
const wss = new WebSocketServer({ port: CFG.port });
let latest = null;
wss.on('connection', ws => { if (latest) ws.send(JSON.stringify(latest)); });
const broadcast = obj => { const s = JSON.stringify(obj); wss.clients.forEach(c => c.readyState === 1 && c.send(s)); };
log(`Overlays can connect to ws://localhost:${CFG.port}`);

// ---------------- destination from SimBrief ----------------
let dest = null; // { icao, lat, lon }
async function loadSimbrief() {
  if (!CFG.simbriefUser) return;
  try {
    const r = await fetch(`https://www.simbrief.com/api/xml.fetcher.php?username=${encodeURIComponent(CFG.simbriefUser)}&json=1`);
    const j = await r.json();
    if (j.destination) {
      dest = { icao: j.destination.icao_code, lat: +j.destination.pos_lat, lon: +j.destination.pos_long };
      log(`SimBrief: ${j.origin?.icao_code} → ${dest.icao}`);
    }
  } catch (e) { log('SimBrief fetch failed:', e.message); }
}
loadSimbrief(); setInterval(loadSimbrief, 5 * 60 * 1000);

const nm = (lat1, lon1, lat2, lon2) => {
  const R = 3440.065, toR = d => d * Math.PI / 180;
  const a = Math.sin(toR(lat2 - lat1) / 2) ** 2 + Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(toR(lon2 - lon1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

// ---------------- flight phase detection ----------------
let airborneOnce = false, lastPhase = 'Boarding';
function detectPhase(t) {
  if (t.onGround) {
    if (airborneOnce && t.gs < 40) return 'Landed';
    if (t.gs >= 40) return airborneOnce ? 'Landed' : 'Takeoff';
    if (t.gs >= 3) return airborneOnce ? 'Landed' : 'Taxi';
    return airborneOnce ? 'Landed' : 'Boarding';
  }
  airborneOnce = true;
  if (t.agl < 1500 && t.vs > 200 && (lastPhase === 'Takeoff' || lastPhase === 'Taxi')) return 'Takeoff';
  const nearDest = t.distToDest != null ? t.distToDest < 25 : t.agl < 3000;
  if (t.vs < -300 && nearDest && t.agl < 4000) return 'Approach';
  if (t.vs > 300) return 'Climb';
  if (t.vs < -300) return 'Descent';
  return lastPhase === 'Approach' && t.agl < 4000 ? 'Approach' : 'Cruise';
}

// ---------------- Firebase mirror (optional) ----------------
let idToken = null, refreshToken = null, tokenExp = 0;
async function fbToken() {
  const fb = CFG.firebase;
  if (Date.now() < tokenExp - 60000) return idToken;
  const url = refreshToken
    ? `https://securetoken.googleapis.com/v1/token?key=${fb.apiKey}`
    : `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${fb.apiKey}`;
  const body = refreshToken
    ? new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken })
    : JSON.stringify({ email: fb.email, password: fb.password, returnSecureToken: true });
  const r = await fetch(url, { method: 'POST', body, headers: refreshToken ? {} : { 'Content-Type': 'application/json' } });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || r.status);
  idToken = j.idToken || j.id_token; refreshToken = j.refreshToken || j.refresh_token;
  tokenExp = Date.now() + Number(j.expiresIn || j.expires_in) * 1000;
  return idToken;
}
let lastMirror = 0, mirrorWarned = false;
async function mirror(t) {
  const fb = CFG.firebase;
  if (!fb?.databaseURL || Date.now() - lastMirror < CFG.mirrorEveryMs) return;
  lastMirror = Date.now();
  try {
    const tok = await fbToken();
    const r = await fetch(`${fb.databaseURL.replace(/\/$/, '')}/gtw/sim.json?auth=${tok}`, { method: 'PUT', body: JSON.stringify({ ...t, ts: { '.sv': 'timestamp' } }) });
    if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
    mirrorWarned = false;
  } catch (e) { if (!mirrorWarned) log('Firebase mirror failed:', e.message); mirrorWarned = true; }
}

// ---------------- SimConnect ----------------
const DEF = 1, REQ = 1;
const VARS = [
  ['PLANE ALTITUDE', 'feet'], ['PLANE ALT ABOVE GROUND', 'feet'], ['AIRSPEED INDICATED', 'knots'], ['GROUND VELOCITY', 'knots'],
  ['PLANE HEADING DEGREES MAGNETIC', 'degrees'], ['VERTICAL SPEED', 'feet per minute'], ['PLANE LATITUDE', 'degrees'],
  ['PLANE LONGITUDE', 'degrees'], ['SIM ON GROUND', 'bool'],
];

async function connect() {
  try {
    const { recvOpen, handle } = await open('Gametimewes Overlay Bridge', Protocol.KittyHawk);
    log('Connected to', recvOpen.applicationName);
    VARS.forEach(([name, unit]) => handle.addToDataDefinition(DEF, name, unit, SimConnectDataType.FLOAT64));
    handle.requestDataOnSimObject(REQ, DEF, SimConnectConstants.OBJECT_ID_USER, SimConnectPeriod.SECOND);
    handle.on('simObjectData', recv => {
      if (recv.requestID !== REQ) return;
      const d = recv.data;
      const t = {
        alt: d.readFloat64(), agl: d.readFloat64(), ias: d.readFloat64(), gs: d.readFloat64(),
        hdg: d.readFloat64(), vs: d.readFloat64(), lat: d.readFloat64(), lon: d.readFloat64(), onGround: d.readFloat64() > 0.5,
      };
      t.distToDest = dest ? nm(t.lat, t.lon, dest.lat, dest.lon) : null;
      t.eteMin = t.distToDest != null && t.gs > 50 ? (t.distToDest / t.gs) * 60 : null;
      t.dest = dest?.icao || null;
      t.phase = lastPhase = detectPhase(t);
      latest = t;
      broadcast(t);
      mirror(t);
    });
    handle.on('quit', () => { log('Sim closed — waiting for it to start again'); setTimeout(connect, 5000); });
    handle.on('close', () => { log('SimConnect connection closed'); setTimeout(connect, 5000); });
    handle.on('exception', e => log('SimConnect exception', e.exception));
  } catch (e) {
    log('Sim not running yet (' + e.message + ') — retrying in 5s');
    setTimeout(connect, 5000);
  }
}
connect();

// keyboard: press "r" + Enter to reset the phase tracker before a new flight
process.stdin.on('data', b => { if (String(b).trim() === 'r') { airborneOnce = false; lastPhase = 'Boarding'; loadSimbrief(); log('Phase tracker reset, SimBrief reloaded'); } });
