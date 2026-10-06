import { CONFIG, firebaseEnabled } from '../lib/config.js';
import { watch, write, patch, emit, auth, pruneEvents } from '../lib/state.js';
import { watchSim, fmt } from '../lib/sim.js';
import { connectChat } from '../lib/chat.js';
import { tokenInfo } from '../lib/twitch-events.js';

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const ls = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
const toast = msg => { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2200); };
const save = (path, value) => write(path, value).catch(e => toast('Not saved: ' + (e.code === 'PERMISSION_DENIED' ? 'sign in with an admin account' : e.message)));
const savePatch = (path, obj) => patch(path, obj).catch(e => toast('Not saved: ' + (e.code === 'PERMISSION_DENIED' ? 'sign in with an admin account' : e.message)));
const S = {};
let sim = null, twitch = null, uid = null, signedIn = !firebaseEnabled();

// ---------- tabs ----------
function showTab(name) {
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
  $$('[data-pane]').forEach(p => p.classList.toggle('hidden', p.dataset.pane !== name));
  ls.set('gtw_tab', name);
}
$$('#tabs button').forEach(b => b.onclick = () => showTab(b.dataset.tab));
showTab(ls.get('gtw_tab') || 'flight');

// ---------- auth ----------
$('#mode').textContent = firebaseEnabled() ? 'Firebase · live' : 'Local mode';
$('#mode').classList.toggle('live', firebaseEnabled());
auth().then(a => {
  a.onChange(u => {
    signedIn = !!u; uid = u?.uid || null;
    $('#user').textContent = u ? (u.displayName || u.email || 'Signed in') : 'Not signed in';
    $('#signin').textContent = u ? 'Sign out' : 'Sign in';
    $('#signin').classList.toggle('hidden', !firebaseEnabled());
    renderSteps();
  });
  $('#signin').onclick = () => (a.user ? a.signOut() : a.signIn().catch(e => toast(e.message)));
});

// ---------- generic two-way bindings: data-bind="section.field" ----------
const timers = {};
$$('[data-bind]').forEach(el => {
  const path = el.dataset.bind.replace('.', '/');
  const val = () => el.type === 'checkbox' ? el.checked : el.type === 'number' ? Number(el.value) : el.classList.contains('u') ? el.value.toUpperCase() : el.value;
  const ev = el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input';
  el.addEventListener(ev, () => { clearTimeout(timers[path]); timers[path] = setTimeout(() => save(path, val()), ev === 'input' ? 350 : 0); });
});
const fill = (section, obj) => $$(`[data-bind^="${section}."]`).forEach(el => {
  if (el === document.activeElement) return;
  const v = obj?.[el.dataset.bind.split('.')[1]];
  if (el.type === 'checkbox') el.checked = v !== false && v != null; else el.value = v ?? '';
});
// subscribe after the whole module has initialised (local mode fires callbacks synchronously)
queueMicrotask(() => ['flight', 'match', 'watchalong', 'poll', 'clubs', 'socials', 'countdown'].forEach(sec => watch(sec, v => { S[sec] = v; fill(sec, v); onState(sec); })));

function onState(sec) {
  if (sec === 'flight') paintPhase();
  if (sec === 'match') { $('#hs').textContent = S.match.homeScore; $('#as').textContent = S.match.awayScore; $('#hsN').textContent = String(S.match.homeShort).toUpperCase(); $('#asN').textContent = String(S.match.awayShort).toUpperCase(); }
  if (sec === 'watchalong') paintSlips();
  if (sec === 'poll') { $('#pollState').textContent = S.poll.open ? 'Open' : 'Closed'; $('#pollState').classList.toggle('live', !!S.poll.open); resetTally(); }
}

// ---------- flight ----------
const PHASES = ['Boarding', 'Taxi', 'Takeoff', 'Climb', 'Cruise', 'Descent', 'Approach', 'Landed'];
$('#phaseBtns').innerHTML = PHASES.map(p => `<button data-p="${p}">${p}</button>`).join('');
$$('#phaseBtns button').forEach(b => b.onclick = () => savePatch('flight', { phase: b.dataset.p, phaseMode: 'manual' }));
function paintPhase() {
  const cur = S.flight?.phaseMode === 'auto' && sim?.phase ? sim.phase : S.flight?.phase;
  $$('#phaseBtns button').forEach(b => b.classList.toggle('on', b.dataset.p === cur));
}
watchSim(t => {
  sim = t;
  $('#simState').textContent = t ? `live · ${t.phase}` : 'bridge offline';
  $('#tele').innerHTML = t ? [['ALT', fmt.alt(t)], ['GS', fmt.gs(t)], ['IAS', `${Math.round(t.ias)} KT`], ['HDG', fmt.hdg(t)], ['VS', fmt.vs(t)], ['PHASE', t.phase], ['DEST', t.dest || '—'], ['DIST', fmt.dist(t)], ['ETE', fmt.ete(t)]]
    .map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('') : '';
  paintPhase(); renderSteps();
});

const tidyCity = s => String(s || '').replace(/\b(intl|international|airport|regional|rgnl|muni|municipal|field)\b/gi, '').replace(/\s+/g, ' ').trim()
  .toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
$('#sbImport').onclick = async () => {
  const user = S.flight?.simbrief || $('[data-bind="flight.simbrief"]').value;
  if (!user) return toast('Add your SimBrief username first');
  $('#sbMsg').textContent = 'Fetching latest OFP…';
  try {
    const r = await fetch(`https://www.simbrief.com/api/xml.fetcher.php?username=${encodeURIComponent(user)}&json=1`);
    const j = await r.json();
    if (!j.origin) throw new Error(j.fetch?.status || 'No OFP found');
    const upd = { from: j.origin.icao_code, to: j.destination.icao_code, toCity: tidyCity(j.destination.name), aircraft: j.aircraft?.name || S.flight.aircraft, simbrief: user };
    if (j.atc?.callsign) upd.callsign = j.atc.callsign;
    await savePatch('flight', upd);
    $('#sbMsg').textContent = `Imported ${upd.callsign || ''} ${upd.from} → ${upd.to} (${upd.toCity}), ${upd.aircraft}. Restart the bridge (press r) so distance/ETE use the new destination.`;
  } catch (e) { $('#sbMsg').textContent = 'SimBrief: ' + e.message; }
};

// ---------- match ----------
$$('[data-score]').forEach(b => b.onclick = () => {
  const k = b.dataset.score, v = Math.max(0, (Number(S.match[k]) || 0) + Number(b.dataset.d));
  save(`match/${k}`, v);
});
const fireGoal = (m = S.match) => emit('alert', { type: 'goal', scorer: m.scorer || '', minute: m.minute, match: { homeScore: m.homeScore, awayScore: m.awayScore, homeShort: m.homeShort, awayShort: m.awayShort, mode: m.mode } }).then(() => toast('GOAL alert fired'));
$('#goalBtn').onclick = () => fireGoal();
$('#htBtn').onclick = () => startCountdown(Number(S.match.secondHalfMinutes) || 15);

// API-Football sync (runs only while this dashboard tab is open)
const AF = 'https://v3.football.api-sports.io';
$('#afKey').value = ls.get('apisports_key') || '';
$('#afKey').onchange = () => ls.set('apisports_key', $('#afKey').value.trim());
$('#afFixture').value = ls.get('gtw_af_fixture') || '';
$('#afFixture').onchange = () => ls.set('gtw_af_fixture', $('#afFixture').value.trim());
const af = async (path, q) => {
  const r = await fetch(`${AF}/${path}?${new URLSearchParams(q)}`, { headers: { 'x-apisports-key': $('#afKey').value.trim() } });
  const j = await r.json();
  if (j.errors && Object.keys(j.errors).length) throw new Error(Object.values(j.errors).join(' '));
  return j.response || [];
};
const SHORT = { 'AC Milan': 'MIL', 'Inter': 'INT', 'Juventus': 'JUV', 'Napoli': 'NAP', 'AS Roma': 'ROM', 'Lazio': 'LAZ', 'Atalanta': 'ATA', 'Fiorentina': 'FIO', 'Bologna': 'BOL', 'Torino': 'TOR' };
const shortOf = n => SHORT[n] || String(n).replace(/^(AC|FC|AS|SS|SSC|US|ACF|CF|SC|AFC|RC|VfB|VfL|TSG|RB|1\.)\s+/i, '').slice(0, 3).toUpperCase();
$('#afFind').onclick = async () => {
  try {
    const [live, next] = await Promise.all([af('fixtures', { team: 489, live: 'all' }).catch(() => []), af('fixtures', { team: 489, next: 5 })]);
    const all = [...live, ...next];
    $('#afList').innerHTML = '<option value="">— pick a match —</option>' + all.map(f => `<option value="${f.fixture.id}">${f.teams.home.name} v ${f.teams.away.name} · ${new Date(f.fixture.date).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} (${f.fixture.status.short})</option>`).join('');
    $('#afList').classList.remove('hidden');
  } catch (e) { $('#afMsg').textContent = e.message; }
};
$('#afList').onchange = e => { if (e.target.value) { $('#afFixture').value = e.target.value; ls.set('gtw_af_fixture', e.target.value); } };
let afTimer = null, lineupsDone = null;
async function afPull() {
  const id = $('#afFixture').value.trim();
  if (!id) return $('#afMsg').textContent = 'Pick a fixture first';
  try {
    const [f] = await af('fixtures', { id });
    if (!f) throw new Error('Fixture not found');
    const m = S.match, upd = {
      competition: f.league.name, home: f.teams.home.name, away: f.teams.away.name,
      homeScore: f.goals.home ?? 0, awayScore: f.goals.away ?? 0,
      minute: f.fixture.status.short === 'HT' ? 'HT' : f.fixture.status.short === 'FT' ? 'FT' : String((f.fixture.status.elapsed ?? 0) + (f.fixture.status.extra ? '+' + f.fixture.status.extra : '')),
    };
    if (m.home !== upd.home || m.away !== upd.away) {
      upd.homeShort = shortOf(upd.home); upd.awayShort = shortOf(upd.away);
      upd.mode = /AC Milan/i.test(upd.home + ' ' + upd.away) ? 'Milan' : 'Neutral';
    }
    const scored = upd.homeScore + upd.awayScore > (Number(m.homeScore) || 0) + (Number(m.awayScore) || 0) && m.home === upd.home;
    if (scored || !m.scorer) {
      const ev = (await af('fixtures/events', { fixture: id })).filter(e => e.type === 'Goal' && e.detail !== 'Missed Penalty');
      const last = ev.at(-1);
      if (last) upd.scorer = last.player?.name + (last.detail === 'Own Goal' ? ' (OG)' : last.detail === 'Penalty' ? ' (P)' : '');
    }
    if (lineupsDone !== id) {
      const lu = await af('fixtures/lineups', { fixture: id });
      if (lu.length === 2) {
        const xi = t => t.startXI.map(p => `${p.player.number ?? ''} ${p.player.name}`.trim()).join(', ');
        Object.assign(upd, { homeFormation: lu[0].formation, awayFormation: lu[1].formation, homeXI: xi(lu[0]), awayXI: xi(lu[1]) });
        lineupsDone = id;
      }
    }
    await savePatch('match', upd);
    if (scored && $('#afGoal').checked) fireGoal({ ...m, ...upd });
    $('#afMsg').textContent = `Synced ${new Date().toLocaleTimeString()} · ${upd.home} ${upd.homeScore}–${upd.awayScore} ${upd.away} (${upd.minute}′)`;
  } catch (e) { $('#afMsg').textContent = 'API-Football: ' + e.message; }
}
$('#afPull').onclick = afPull;
$('#afAuto').onchange = e => { clearInterval(afTimer); afTimer = e.target.checked ? setInterval(afPull, 60000) : null; if (afTimer) afPull(); };

// ---------- watchalong slips ----------
function parseSlips(text) {
  const out = []; let cur = null;
  text.split('\n').forEach(line => {
    const t = line.trim(); if (!t) return;
    if (t.startsWith('#')) { const [n, st] = t.slice(1).split('|'); cur = { name: n.trim(), stake: parseFloat(st) || 0, legs: [] }; out.push(cur); return; }
    let odds = null, text = t; const m = t.match(/@\s*([\d.]+)\s*$/); if (m) { odds = parseFloat(m[1]); text = t.slice(0, m.index).trim(); }
    if (!cur) { cur = { name: '', stake: 0, legs: [] }; out.push(cur); }
    cur.legs.push({ text, odds, status: 'pending' });
  });
  return out.filter(s => s.legs.length);
}
const slipsToText = slips => (slips || []).map(s => `${s.name || s.stake ? `# ${s.name || 'Slip'}${s.stake ? ' | ' + s.stake : ''}\n` : ''}${s.legs.map(l => l.text + (l.odds ? ' @ ' + l.odds : '')).join('\n')}`).join('\n');
$('#slipSave').onclick = () => {
  const prev = S.watchalong.slips || [];
  const slips = parseSlips($('#slipText').value);
  slips.forEach(ns => { const ps = prev.find(p => p.name === ns.name); ps && ns.legs.forEach(l => { const pl = ps.legs.find(x => x.text === l.text); if (pl) l.status = pl.status; }); });
  save('watchalong/slips', slips).then(() => toast('Slips updated'));
};
$('#slipClear').onclick = () => save('watchalong/slips', []);
let slipTextInit = false;
function paintSlips() {
  const slips = S.watchalong.slips || [];
  if (!slipTextInit || document.activeElement !== $('#slipText')) { $('#slipText').value = slipsToText(slips); slipTextInit = true; }
  $('#slipLive').innerHTML = slips.map((s, si) => `<div class="slip"><b>${s.name || 'Slip ' + (si + 1)}</b> <span class="hint">tap a leg: pending → won → lost</span><div class="legs">${s.legs.map((l, li) =>
    `<button class="leg ${l.status || 'pending'}" data-s="${si}" data-l="${li}">${l.status === 'won' ? '✓ ' : l.status === 'lost' ? '✕ ' : ''}${l.text}${l.odds ? ' @ ' + l.odds : ''}</button>`).join('')}</div></div>`).join('');
  $$('#slipLive .leg').forEach(b => b.onclick = () => {
    const order = ['pending', 'won', 'lost'], l = slips[b.dataset.s].legs[b.dataset.l];
    save(`watchalong/slips/${b.dataset.s}/legs/${b.dataset.l}/status`, order[(order.indexOf(l.status || 'pending') + 1) % 3]);
  });
}

// ---------- countdown ----------
function startCountdown(min) { save('countdown', { minutes: min, endsAt: Date.now() + min * 60000 }).then(() => toast(`${min}-minute countdown started`)); }
$('#cdStart').onclick = () => startCountdown(Number($('#cdMin').value) || 5);
$('#cdAdd').onclick = () => { const base = Math.max(Date.now(), S.countdown?.endsAt || Date.now()); save('countdown/endsAt', base + 60000); };
$('#cdStop').onclick = () => save('countdown', { minutes: Number($('#cdMin').value) || 5, endsAt: null });
setInterval(() => {
  const cd = S.countdown; if (!cd) return;
  const left = cd.endsAt ? Math.max(0, Math.round((cd.endsAt - Date.now()) / 1000)) : (cd.minutes || 5) * 60;
  $('#clock').textContent = String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0');
}, 250);

// ---------- poll (dashboard keeps its own live tally from chat) ----------
const votes = new Map();
function resetTally() { if (resetTally.id !== S.poll.id) { votes.clear(); resetTally.id = S.poll.id; } paintTally(); }
function paintTally() {
  const c = {}; votes.forEach(v => c[v] = (c[v] || 0) + 1);
  const tot = votes.size || 1;
  $('#pollTally').innerHTML = Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => `<div><span>${k}</span><i style="width:${Math.round(n / tot * 100)}%"></i><span>${n}</span></div>`).join('') || '<p class="hint">No votes yet.</p>';
}
connectChat(CONFIG.channel, { onMessage(msg) {
  if (!S.poll?.open) return;
  const cmd = (S.poll.command || '!predict').toLowerCase(), t = msg.text.trim().toLowerCase();
  if (!t.startsWith(cmd)) return;
  const mm = t.slice(cmd.length).match(/(\d{1,2})\s*[-:x ]\s*(\d{1,2})/); if (!mm) return;
  votes.set(msg.login, `${+mm[1]}–${+mm[2]}`); paintTally();
} });
$('#pollOpen').onclick = () => savePatch('poll', { id: Date.now().toString(36), open: true }).then(() => toast('Poll open — chat can vote'));
$('#pollClose').onclick = () => save('poll/open', false);

// ---------- test alerts ----------
const TESTS = { follow: 'Follow', sub: 'Sub', resub: 'Resub', gift: 'Gift subs', cheer: 'Cheer', raid: 'Raid', redeem: 'Redeem' };
$('#testBtns').innerHTML = Object.entries(TESTS).map(([k, v]) => `<button data-t="${k}">${v}</button>`).join('');
$$('#testBtns button').forEach(b => b.onclick = () => {
  const t = b.dataset.t, amt = Number($('#tAmt').value) || 1;
  emit('alert', { type: t, name: $('#tName').value || 'Tester', amount: t === 'cheer' ? amt * 100 : t === 'raid' ? amt * 10 : amt, message: t === 'redeem' ? 'Hydrate!' : t === 'resub' ? 'Forza Milan!' : '' }).then(() => toast(`Test ${TESTS[t]} sent`));
});

// ---------- OBS links ----------
const SCENES = [
  ['Flight sim', [['f-start', 'Starting soon'], ['f-game', 'Gameplay + webcam'], ['f-cockpit', 'Cockpit · minimal'], ['f-chat', 'Just chatting'], ['f-brb', 'Be right back'], ['f-end', 'Ending']]],
  ['Pro Clubs', [['c-start', 'Starting soon'], ['c-game', 'Gameplay + webcam'], ['c-half', 'Half-time'], ['c-brb', 'Be right back'], ['c-end', 'Ending']]],
  ['Watchalong', [['w-start', 'Pre-match'], ['w-live', 'Live match'], ['w-lineups', 'Lineups'], ['w-half', 'Half-time'], ['w-end', 'Full-time'], ['w-brb', 'Be right back'], ['w-poll', 'Prediction poll (shows while open)']]],
];
let layout = 'h';
function renderLinks() {
  const V = layout === 'v', base = new URL('../overlays/', location.href).href, size = V ? '1080 × 1920' : '1920 × 1080';
  const prev = $('#prevToggle').checked ? '&preview=1' : '';
  const lay = V ? '&layout=vertical' : '';
  const token = ls.get('gtw_twitch_token'), key = ls.get('apisports_key');
  const row = (title, sub, url, sz) => `<div class="link"><div><b>${title}</b><small>${sub} · ${sz}</small></div><input readonly value="${url}"><button class="btn-sm" data-copy="${url}">Copy</button><a href="${url}" target="_blank" rel="noopener">Open ↗</a></div>`;
  let html = '';
  SCENES.forEach(([group, list]) => { html += `<h3>${group}</h3>` + list.map(([id, name]) => row(name, id, `${base}scenes.html?scene=${id}${lay}${prev}`, size)).join(''); });
  html += '<h3>Shared</h3>';
  html += row('Alerts', token ? 'Twitch connected' : 'dashboard tests only — connect Twitch in Setup', `${base}alerts.html?x=1${lay}${prev}${token ? '#token=' + token : ''}`, size);
  html += row('Chat box', 'Twitch chat, no login needed', `${base}chat.html`, V ? '1000 × 900' : '520 × 760');
  html += row('Watchalong API overlay', 'follows the Watchalong API tab', `${base}watchalong.html?obs=1${lay}${key ? '#key=' + encodeURIComponent(key) : ''}`, size);
  html += row('Goal card (static)', 'w-goal preview', `${base}scenes.html?scene=w-goal${lay}${prev}`, size);
  $('#links').innerHTML = html;
  $$('[data-copy]').forEach(b => b.onclick = () => navigator.clipboard.writeText(b.dataset.copy).then(() => toast('Copied')));
}
$$('#layoutSeg button').forEach(b => b.onclick = () => { layout = b.dataset.l; $$('#layoutSeg button').forEach(x => x.classList.toggle('on', x === b)); renderLinks(); });
$('#prevToggle').onchange = renderLinks;
renderLinks();

// ---------- setup checklist + Twitch ----------
const tok = ls.get('gtw_twitch_token');
(tok ? tokenInfo(tok) : Promise.resolve(null)).then(i => {
  twitch = i;
  $('#twitchState').textContent = i ? `Connected as ${i.login} · token expires in ${Math.round(i.expires_in / 86400)} days` : tok ? 'Saved token expired — reconnect.' : 'Not connected. Alerts will only show dashboard tests.';
  renderSteps();
});
function renderSteps() {
  const steps = [
    [firebaseEnabled(), 'Firebase project created and its web config pasted into <code>lib/config.js</code> (see README → Firebase).'],
    [firebaseEnabled() && signedIn, 'Signed in to this dashboard.'],
    [firebaseEnabled() && signedIn && uid, uid ? `Your UID <code>${uid}</code> added under <code>admins</code> in the Realtime Database (value <code>true</code>).` : 'Add your UID under <code>admins</code> in the Realtime Database.'],
    [!!CONFIG.twitchClientId, 'Twitch app registered and Client ID pasted into <code>lib/config.js</code>.'],
    [!!twitch, 'Twitch connected for real alerts (Setup → Connect Twitch).'],
    [!!sim, 'Sim bridge running on the sim PC (<code>bridge/start-bridge.bat</code>).'],
  ];
  $('#steps').innerHTML = steps.map(([ok, t]) => `<li class="${ok ? 'done' : ''}">${ok ? '✓ ' : ''}${t}</li>`).join('');
}
$('#prune').onclick = async () => { try { const n = await pruneEvents(); $('#pruneMsg').textContent = `Removed ${n} old events.`; } catch (e) { $('#pruneMsg').textContent = e.message; } };
renderSteps();
