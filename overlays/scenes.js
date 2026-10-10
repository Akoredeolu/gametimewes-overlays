// Every full-screen scene of the Rossoneri pack (flight sim, Pro Clubs, watchalong), horizontal + vertical.
// Ported from the Claude Design canvases "Gametimewes Pack" and "Gametimewes Watchalong"; data comes from lib/state.js.
import { CONFIG } from '../lib/config.js';
import { watch, params } from '../lib/state.js';
import { bootStage, vertical, esc, countdownText } from '../lib/stage.js';
import { mountChatList, connectChat } from '../lib/chat.js';
import { watchSim, fmt } from '../lib/sim.js';
import { goalCard } from './cards.js';

const sceneId = params.get('scene') || 'f-game';
const stage = document.getElementById('stage');
bootStage(stage);

const S = { flight: null, match: null, countdown: null, socials: null, clubs: null, poll: null, sim: null };

// ---------- building blocks ----------
const stripe = (extra = '') => `<div class="stripe" style="${extra}"></div>`;
const field = () => `<div class="stripe-field"></div>`;
const pulse = () => `<span class="pulse"></span>`;
const cd = () => `<span class="num" data-countdown>${countdownText(S.countdown)}</span>`;
const ph = (label, style) => `<div class="ph" style="${style}">${label}</div>`;
const bg = label => `<div class="ph-bg" style="position:absolute;inset:0"><div class="ph" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#0d0c0c;padding:8px 16px;font-size:28px;align-items:center">${label}</div></div>`;
const chatSlot = style => `<div data-chat style="${style}"></div>`;
const cell = (label, value, { size = 36, pad = '18px 28px', accent = false, border = true, lsize = 16 } = {}) =>
  `<div style="padding:${pad};display:flex;flex-direction:column;gap:6px;${border ? 'border-right:2px solid var(--color-neutral-800);' : ''}${accent ? 'background:var(--color-accent);color:#fff;' : ''}">
    <div style="font-size:${lsize}px;font-weight:600;letter-spacing:.14em;${accent ? '' : 'color:var(--color-neutral-400);'}">${label}</div>
    <div style="font-size:${size}px;font-weight:800;white-space:nowrap">${value}</div></div>`;
const teleRow = (size = 26) => `<div data-telemetry class="tele hidden" style="--ts:${size}px">
  ${['ALT', 'GS', 'HDG', 'VS', 'DIST', 'ETE'].map(k => `<div><span>${k}</span><b data-t="${k.toLowerCase()}">—</b></div>`).join('')}</div>`;
const socialsGrid = (cols = 3, size = 36) => `<div style="display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));border-top:4px solid var(--color-bg);line-height:1.1;">
  ${[['TIKTOK', S.socials.tiktok], ['INSTAGRAM', S.socials.instagram], ['YOUTUBE', S.socials.youtube]].map(([k, v]) =>
    `<div style="padding:28px 0 ${cols === 1 ? 0 : 0}px;display:flex;flex-direction:column;gap:8px;${cols === 1 ? 'border-bottom:2px solid var(--color-neutral-800);padding-bottom:20px' : ''}"><div style="font-size:20px;font-weight:600;letter-spacing:.14em;color:var(--color-accent-400);">${k}</div><div style="font-size:${size}px;font-weight:800;">${esc(v)}</div></div>`).join('')}</div>`;
const big = (txt, size, extra = '') => `<div style="font-size:${size}px;font-weight:800;line-height:.88;letter-spacing:-.045em;text-transform:uppercase;${extra}">${txt}</div>`;
const full = (inner, style = '') => `<div style="position:absolute;inset:0;background:#0d0c0c;color:var(--color-bg);${style}">${inner}</div>`;
const xi = str => String(str || '').split(',').map(x => x.trim()).filter(Boolean).slice(0, 11).map(x => { const m = x.match(/^(\d+)\s+(.*)$/); return m ? { n: m[1], name: m[2] } : { n: '', name: x }; });

function phase() {
  const f = S.flight;
  if (f.phaseMode === 'auto' && S.sim?.phase) return S.sim.phase.toUpperCase();
  return String(f.phase || '').toUpperCase();
}

// ---------- flight sim pack ----------
const flightBoard = (status, destLabel, V) => {
  const f = S.flight;
  if (!V) return `<div style="display:flex;flex-direction:column;border-top:4px solid var(--color-bg);">
    <div style="display:grid;grid-template-columns:1fr 1.2fr 2fr 1.4fr 1.4fr;padding:20px 0;font-size:22px;font-weight:600;letter-spacing:.14em;color:var(--color-neutral-400);border-bottom:4px solid var(--color-neutral-800);"><div>FLIGHT</div><div>FROM</div><div>${destLabel}</div><div>AIRCRAFT</div><div>STATUS</div></div>
    <div style="display:grid;grid-template-columns:1fr 1.2fr 2fr 1.4fr 1.4fr;align-items:center;padding:28px 0;font-size:56px;font-weight:800;border-bottom:4px solid var(--color-neutral-800);"><div>${esc(f.callsign)}</div><div>${esc(f.from)}</div><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(f.toCity)}</div><div>${esc(f.aircraft)}</div><div><span style="background:var(--color-accent);color:#fff;padding:6px 18px;">${status}</span></div></div></div>`;
  const row = (k, v) => `<div style="display:grid;grid-template-columns:300px 1fr;align-items:center;padding:24px 0;border-bottom:4px solid var(--color-neutral-800);"><div style="font-size:24px;font-weight:600;letter-spacing:.14em;color:var(--color-neutral-400);">${k}</div><div style="font-size:60px;font-weight:800;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${v}</div></div>`;
  return `<div style="display:flex;flex-direction:column;border-top:4px solid var(--color-bg);">
    ${row('FLIGHT', esc(f.callsign))}${row('FROM', esc(f.from))}${row(destLabel, esc(f.toCity))}${row('AIRCRAFT', esc(f.aircraft))}
    ${row('STATUS', `<span style="background:var(--color-accent);color:#fff;padding:4px 18px;font-size:52px">${status}</span>`)}</div>`;
};
const seriesLine = () => `${esc(S.flight.series)} · LEG ${esc(S.flight.leg)} · ${esc(S.flight.network)}`;

const T = {};

T['f-start'] = V => {
  const f = S.flight;
  if (!V) return full(`<div style="display:flex;flex-direction:column;padding:80px 96px;gap:56px;height:100%">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;">
      <div style="display:flex;flex-direction:column;gap:12px;"><div style="font-size:30px;font-weight:600;letter-spacing:.14em;color:var(--color-accent-400);">DEPARTURES · GAMETIMEWES</div>${big('Starting soon', 160, 'white-space:nowrap')}</div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;"><div style="font-size:24px;font-weight:600;letter-spacing:.14em;color:var(--color-neutral-400);">GATE OPENS IN</div><div style="font-size:120px;font-weight:800;line-height:1;color:var(--color-accent);">${cd()}</div></div>
    </div>
    ${flightBoard('BOARDING', 'DESTINATION')}
    <div style="margin-top:auto;display:flex;justify-content:space-between;font-size:28px;font-weight:600;letter-spacing:.08em;color:var(--color-neutral-400);"><div>${seriesLine()}</div><div>${esc(S.socials.handle)}</div></div></div>`);
  return full(`<div style="display:flex;flex-direction:column;padding:180px 72px 120px;gap:56px;height:100%">
    <div style="display:flex;flex-direction:column;gap:16px;"><div style="font-size:28px;font-weight:600;letter-spacing:.14em;color:var(--color-accent-400);">DEPARTURES · GAMETIMEWES</div>${big('Starting<br>soon', 190)}</div>
    <div style="display:flex;flex-direction:column;gap:8px;"><div style="font-size:24px;font-weight:600;letter-spacing:.14em;color:var(--color-neutral-400);">GATE OPENS IN</div><div style="font-size:180px;font-weight:800;line-height:1;color:var(--color-accent);">${cd()}</div></div>
    ${flightBoard('BOARDING', 'TO', true)}
    <div style="margin-top:auto;display:flex;flex-direction:column;gap:12px;font-size:26px;font-weight:600;letter-spacing:.08em;color:var(--color-neutral-400);"><div>${seriesLine()}</div><div>${esc(S.socials.handle)}</div></div></div>`);
};

T['f-game'] = V => {
  const f = S.flight;
  const camBar = `<div style="display:flex;align-items:center;gap:16px;background:#0d0c0c;color:var(--color-bg);padding:14px 20px;font-size:28px;font-weight:800;">${pulse()}<span>GAMETIMEWES</span><span style="margin-left:auto;font-size:20px;font-weight:600;letter-spacing:.12em;color:var(--color-neutral-400);">${esc(f.network)}</span></div>`;
  if (!V) return `${bg('GAMEPLAY CAPTURE · MSFS 2024')}
    <div style="position:absolute;left:48px;top:48px;display:flex;flex-direction:column;">
      <div style="display:flex;background:#0d0c0c;color:var(--color-bg);border-top:8px solid var(--color-accent);line-height:1.1;">
        ${cell('FLIGHT', esc(f.callsign))}${cell('ROUTE', `${esc(f.from)} → ${esc(f.to)}`)}${cell('AIRCRAFT', esc(f.aircraft))}${cell('TOUR', `LEG ${esc(f.leg)}`)}${cell('PHASE', phase(), { accent: true, border: false })}
      </div>${teleRow()}</div>
    <div style="position:absolute;right:48px;bottom:48px;width:480px;display:flex;flex-direction:column;">${stripe()}${ph('WEBCAM', 'height:270px')}${camBar}</div>`;
  return `${bg('GAMEPLAY · MSFS 2024')}
    <div style="position:absolute;left:48px;right:48px;top:180px;display:flex;flex-direction:column;">
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));background:#0d0c0c;color:var(--color-bg);border-top:8px solid var(--color-accent);line-height:1.1;">
        ${cell('FLIGHT', esc(f.callsign), { size: 40 })}${cell('ROUTE', `${esc(f.from)} → ${esc(f.to)}`, { size: 40 })}${cell('PHASE', phase(), { accent: true, border: false, size: 40 })}
      </div>
      <div style="display:flex;justify-content:space-between;background:var(--color-text);padding:12px 28px;font-size:22px;font-weight:600;letter-spacing:.12em;color:var(--color-neutral-300)"><span>${esc(f.aircraft)}</span><span>${esc(f.series)} · LEG ${esc(f.leg)}</span></div>
      ${teleRow(24)}</div>
    <div style="position:absolute;left:48px;bottom:440px;width:560px;display:flex;flex-direction:column;">${stripe()}${ph('WEBCAM', 'height:315px')}${camBar}</div>`;
};

T['f-cockpit'] = V => {
  const f = S.flight;
  const bar = `<div style="display:flex;align-items:center;gap:20px;background:#0d0c0c;color:var(--color-bg);padding:16px 22px;font-size:28px;font-weight:800;line-height:1.1;">${pulse()}<span>${esc(f.callsign)}</span><span style="color:var(--color-neutral-400);font-weight:600;">${esc(f.from)} → ${esc(f.to)}</span><span style="margin-left:auto;background:var(--color-accent);color:#fff;padding:4px 12px;font-size:22px;letter-spacing:.08em;">${phase()}</span></div>`;
  if (!V) return `${bg('FULL-SCREEN COCKPIT VIEW')}<div style="position:absolute;left:48px;bottom:48px;display:flex;flex-direction:column;width:640px;">${stripe()}${bar}${teleRow(20)}</div>`;
  return `${bg('COCKPIT VIEW')}<div style="position:absolute;left:48px;right:48px;top:180px;display:flex;flex-direction:column;">${stripe()}${bar}${teleRow(22)}</div>`;
};

T['f-chat'] = V => {
  if (!V) return full(`<div style="display:grid;grid-template-columns:1fr 520px;grid-template-rows:auto 1fr auto;gap:40px;padding:64px 96px;height:100%">
    <div style="grid-column:1 / -1;display:flex;justify-content:space-between;align-items:flex-end;border-bottom:4px solid var(--color-bg);padding-bottom:28px;">${big('Just chatting', 96, 'line-height:.9;letter-spacing:-.04em')}<div style="display:flex;align-items:center;gap:16px;font-size:28px;font-weight:800;">${pulse()}GAMETIMEWES</div></div>
    <div style="display:flex;flex-direction:column;min-height:0;">${stripe()}${ph('WEBCAM · 16:9', 'flex:1')}</div>
    <div style="display:flex;flex-direction:column;background:var(--color-text);min-height:0;">${stripe()}<div style="padding:18px 24px;font-size:24px;font-weight:800;letter-spacing:.1em;border-bottom:2px solid var(--color-neutral-800);">CHAT</div>${chatSlot('flex:1;margin:0 24px 20px;min-height:0')}</div>
    <div style="grid-column:1 / -1;display:flex;justify-content:space-between;font-size:26px;font-weight:600;letter-spacing:.08em;color:var(--color-neutral-400);"><div>TIKTOK · INSTAGRAM · YOUTUBE</div><div>${esc(S.socials.handle)}</div></div></div>`);
  return full(`<div style="display:flex;flex-direction:column;gap:32px;padding:180px 48px 120px;height:100%">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:4px solid var(--color-bg);padding-bottom:24px;">${big('Just<br>chatting', 120, 'line-height:.9;letter-spacing:-.04em')}<div style="display:flex;align-items:center;gap:14px;font-size:26px;font-weight:800;">${pulse()}LIVE</div></div>
    <div style="display:flex;flex-direction:column;">${stripe()}${ph('WEBCAM · 16:9', 'height:553px')}</div>
    <div style="flex:1;display:flex;flex-direction:column;background:var(--color-text);min-height:0;">${stripe()}<div style="padding:16px 24px;font-size:24px;font-weight:800;letter-spacing:.1em;border-bottom:2px solid var(--color-neutral-800);">CHAT</div>${chatSlot('flex:1;margin:0 24px 16px;min-height:0')}</div>
    <div style="display:flex;justify-content:space-between;font-size:24px;font-weight:600;letter-spacing:.08em;color:var(--color-neutral-400);"><div>TIKTOK · IG · YOUTUBE</div><div>${esc(S.socials.handle)}</div></div></div>`);
};

T['f-brb'] = V => {
  const f = S.flight;
  const strip = cols => `<div style="margin-top:auto;display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));border-top:4px solid var(--color-bg);line-height:1.1;">
    ${cell('FLIGHT', esc(f.callsign), { size: 48, pad: '28px 0', border: false, lsize: 20 })}${cell('ROUTE', `${esc(f.from)} → ${esc(f.to)}`, { size: 48, pad: '28px 0', border: false, lsize: 20 })}
    ${cell('AIRCRAFT', esc(f.aircraft), { size: 48, pad: '28px 0', border: false, lsize: 20 })}${cell('PHASE', phase(), { size: 48, pad: '28px 32px', border: false, accent: true, lsize: 20 })}</div>`;
  if (!V) return full(`<div style="display:flex;flex-direction:column;padding:80px 96px;height:100%">
    <div style="font-size:30px;font-weight:600;letter-spacing:.14em;color:var(--color-accent-400);">HOLDING PATTERN</div>${big('Be right<br>back', 220, 'margin-top:24px')}
    <div style="font-size:40px;font-weight:600;color:var(--color-neutral-300);margin-top:40px;">Autopilot's got it.</div>${strip(4)}</div>`);
  return full(`<div style="display:flex;flex-direction:column;padding:180px 72px 160px;height:100%">
    <div style="font-size:28px;font-weight:600;letter-spacing:.14em;color:var(--color-accent-400);">HOLDING PATTERN</div>${big('Be<br>right<br>back', 250, 'margin-top:24px')}
    <div style="font-size:44px;font-weight:600;color:var(--color-neutral-300);margin-top:40px;">Autopilot's got it.</div>${strip(2)}</div>`);
};

T['f-end'] = V => {
  if (!V) return full(`<div style="display:flex;flex-direction:column;padding:80px 96px;gap:56px;height:100%">
    <div style="display:flex;flex-direction:column;gap:12px;"><div style="font-size:30px;font-weight:600;letter-spacing:.14em;color:var(--color-accent-400);">ARRIVALS · GAMETIMEWES</div>${big('Thanks for flying', 160, 'white-space:nowrap')}</div>
    ${flightBoard('LANDED', 'ARRIVED')}
    <div style="margin-top:auto;display:flex;justify-content:space-between;font-size:28px;font-weight:600;letter-spacing:.08em;color:var(--color-neutral-400);"><div>${esc(S.flight.next || 'NEXT LEG OF THE TBM TOUR · SAME TIME NEXT WEEK')}</div><div>${esc(S.socials.handle)}</div></div></div>`);
  return full(`<div style="display:flex;flex-direction:column;padding:180px 72px 120px;gap:56px;height:100%">
    <div style="display:flex;flex-direction:column;gap:16px;"><div style="font-size:28px;font-weight:600;letter-spacing:.14em;color:var(--color-accent-400);">ARRIVALS · GAMETIMEWES</div>${big('Thanks<br>for<br>flying', 190)}</div>
    ${flightBoard('LANDED', 'ARRIVED', true)}
    <div style="margin-top:auto;display:flex;flex-direction:column;gap:12px;font-size:26px;font-weight:600;letter-spacing:.08em;color:var(--color-neutral-400);"><div>${esc(S.flight.next || 'NEXT LEG · SAME TIME NEXT WEEK')}</div><div>${esc(S.socials.handle)}</div></div></div>`);
};

// ---------- Pro Clubs / gaming pack ----------
const fieldCard = (V, inner) => !V
  ? `<div style="position:absolute;inset:0;background:#0d0c0c;display:flex;align-items:center;padding:0 160px;">${field()}<div style="position:relative;background:#0d0c0c;color:var(--color-bg);padding:72px 80px;display:flex;flex-direction:column;gap:32px;width:1280px;">${inner}</div></div>`
  : `<div style="position:absolute;inset:0;background:#0d0c0c;display:flex;align-items:center;padding:0 72px;">${field()}<div style="position:relative;background:#0d0c0c;color:var(--color-bg);padding:64px 56px;display:flex;flex-direction:column;gap:36px;width:100%;">${inner}</div></div>`;
const headPair = (a, b, V) => `<div style="display:flex;${V ? 'flex-direction:column;gap:8px;' : 'justify-content:space-between;'}font-size:28px;font-weight:600;letter-spacing:.14em;"><div style="color:var(--color-accent-400);">${a}</div><div>${b}</div></div>`;

T['c-start'] = V => fieldCard(V, `${headPair(esc(S.clubs.label), 'GAMETIMEWES', V)}${big(V ? 'Kick-off<br>soon' : 'Kick-off soon', V ? 170 : 200)}
  <div style="display:flex;${V ? 'flex-direction:column;align-items:flex-start;gap:24px' : 'align-items:center;gap:32px'};border-top:4px solid var(--color-bg);padding-top:28px;"><div style="background:var(--color-accent);color:#fff;font-size:${V ? 110 : 72}px;font-weight:800;padding:4px 24px;">${cd()}</div><div style="font-size:30px;font-weight:600;letter-spacing:.06em;line-height:1.35;">TikTok · Instagram · YouTube<br>${esc(S.socials.tiktok)}</div></div>`);

T['c-game'] = V => {
  const camBar = `<div style="display:flex;align-items:center;gap:16px;background:#0d0c0c;color:var(--color-bg);padding:14px 20px;font-size:28px;font-weight:800;">${pulse()}<span>GAMETIMEWES</span><span style="margin-left:auto;font-size:20px;font-weight:600;letter-spacing:.12em;color:var(--color-accent-400);">PRO CLUBS</span></div>`;
  if (!V) return `${bg('GAMEPLAY CAPTURE · EA FC')}${ph('ALERT AREA', 'position:absolute;right:48px;top:48px;width:640px;height:150px;border:4px dashed #f3f2f2;align-items:center')}
    <div style="position:absolute;left:48px;bottom:48px;width:480px;display:flex;flex-direction:column;">${stripe()}${ph('WEBCAM', 'height:270px')}${camBar}</div>`;
  return `${bg('GAMEPLAY · EA FC')}<div style="position:absolute;left:48px;right:48px;top:180px;display:flex;flex-direction:column;">${stripe()}${ph('WEBCAM', 'height:553px')}${camBar}</div>`;
};

T['c-half'] = V => {
  const left = `<div style="font-size:28px;font-weight:600;letter-spacing:.14em;color:var(--color-accent-400);">${esc(S.clubs.label)} · INTERVAL</div>${big('Half-<br>time', 200, 'margin-top:32px')}
    <div style="margin-top:auto;display:flex;flex-direction:column;gap:12px;border-top:4px solid var(--color-bg);padding-top:28px;"><div style="font-size:24px;font-weight:600;letter-spacing:.14em;color:var(--color-neutral-400);">SECOND HALF IN</div><div style="font-size:120px;font-weight:800;line-height:1;color:var(--color-accent);">${cd()}</div></div>`;
  const cam = h => `${field()}<div style="position:relative;width:100%;display:flex;flex-direction:column;background:#0d0c0c;">${ph('WEBCAM', `height:${h}px`)}<div style="display:flex;align-items:center;gap:16px;padding:16px 20px;font-size:28px;font-weight:800;">${pulse()}<span>GAMETIMEWES</span></div></div>`;
  if (!V) return full(`<div style="display:grid;grid-template-columns:960px 1fr;height:100%"><div style="display:flex;flex-direction:column;padding:96px;border-right:4px solid var(--color-bg);">${left}</div>
    <div style="position:relative;display:flex;align-items:center;padding:96px;overflow:hidden;">${cam(432)}</div></div>`);
  return full(`<div style="display:grid;grid-template-rows:880px 1fr;height:100%"><div style="position:relative;display:flex;align-items:flex-end;padding:180px 48px 48px;overflow:hidden;border-bottom:4px solid var(--color-bg)">${cam(553)}</div>
    <div style="display:flex;flex-direction:column;padding:56px 72px 140px;">${left}</div></div>`);
};

T['c-brb'] = V => fieldCard(V, `${headPair('QUICK BREAK', 'GAMETIMEWES', V)}${big(V ? 'Be<br>right<br>back' : 'Be right back', V ? 190 : 200)}
  <div style="border-top:4px solid var(--color-bg);padding-top:28px;font-size:36px;font-weight:600;color:var(--color-neutral-300);">${esc(S.clubs.brbLine)}</div>`);

T['c-end'] = V => fieldCard(V, `${headPair('THANKS FOR WATCHING', 'FORZA MILAN', V)}${big(V ? 'Full<br>time' : 'Full time', 200)}${socialsGrid(V ? 1 : 3)}`);

// ---------- watchalong pack ----------
const M = () => {
  const m = S.match, neutral = m.mode === 'Neutral';
  return { ...m, neutral, H: String(m.homeShort).toUpperCase(), A: String(m.awayShort).toUpperCase(), comp: String(m.competition).toUpperCase(), tagline: neutral ? 'WATCHALONG' : 'FORZA MILAN', score: `${m.homeScore}–${m.awayScore}` };
};
const scoreBlocks = (m, size, pad, withMinute = false) => `
  <div style="display:flex;align-items:center;padding:${pad};font-size:${size}px;font-weight:800;background:var(--color-bg);color:var(--color-text);">${esc(m.H)}</div>
  <div style="display:flex;align-items:center;padding:${pad};font-size:${size}px;font-weight:800;background:var(--color-accent);color:#fff;" class="num">${m.score}</div>
  <div style="display:flex;align-items:center;padding:${pad};font-size:${size}px;font-weight:800;background:var(--color-bg);color:var(--color-text);">${esc(m.A)}</div>
  ${withMinute ? `<div class="num" style="display:flex;align-items:center;padding:0 28px;font-size:${Math.round(size * .72)}px;font-weight:800;background:var(--color-text);">${esc(m.minute)}′</div>` : ''}`;
const stripeBottom = () => `<div class="stripe" style="position:absolute;left:0;right:0;bottom:0;height:10px"></div>`;

T['w-start'] = V => {
  const m = M();
  const info = [['KICK-OFF IN', `<span style="font-size:${V ? 140 : 96}px;color:var(--color-accent)">${cd()}</span>`], ['PREDICT THE SCORE', `Type ${esc(S.poll.command)} in chat`], ['RULE 03', 'No score spoilers']];
  if (!V) return full(`<div style="display:flex;flex-direction:column;padding:80px 96px;height:100%">
    <div style="display:flex;justify-content:space-between;font-size:30px;font-weight:600;letter-spacing:.14em;"><div style="color:var(--color-accent-400);">${esc(m.comp)} · WATCHALONG</div><div>${esc(S.socials.handle)}</div></div>
    <div style="display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:end;gap:48px;margin-top:auto;">${big(esc(m.home), 150, 'line-height:.9')}<div style="font-size:48px;font-weight:600;color:var(--color-neutral-400);padding-bottom:20px;">v</div>${big(esc(m.away), 150, 'line-height:.9;text-align:right')}</div>
    <div style="margin-top:72px;border-top:4px solid var(--color-bg);display:grid;grid-template-columns:repeat(3,minmax(0,1fr));line-height:1.1;">
      ${info.map(([k, v]) => `<div style="padding:32px 0;display:flex;flex-direction:column;gap:10px;"><div style="font-size:22px;font-weight:600;letter-spacing:.14em;color:var(--color-neutral-400);">${k}</div><div style="font-size:48px;font-weight:800;">${v}</div></div>`).join('')}</div></div>${stripeBottom()}`);
  return full(`<div style="display:flex;flex-direction:column;padding:180px 72px 140px;height:100%">
    <div style="display:flex;flex-direction:column;gap:8px;font-size:28px;font-weight:600;letter-spacing:.14em;"><div style="color:var(--color-accent-400);">${esc(m.comp)} · WATCHALONG</div><div>${esc(S.socials.handle)}</div></div>
    <div style="display:flex;flex-direction:column;gap:20px;margin-top:auto;">${big(esc(m.home), 140, 'line-height:.9')}<div style="font-size:48px;font-weight:600;color:var(--color-neutral-400);">v</div>${big(esc(m.away), 140, 'line-height:.9')}</div>
    <div style="margin-top:64px;border-top:4px solid var(--color-bg);display:flex;flex-direction:column;line-height:1.1;">
      ${info.map(([k, v]) => `<div style="padding:26px 0;display:flex;flex-direction:column;gap:10px;border-bottom:2px solid var(--color-neutral-800)"><div style="font-size:22px;font-weight:600;letter-spacing:.14em;color:var(--color-neutral-400);">${k}</div><div style="font-size:52px;font-weight:800;">${v}</div></div>`).join('')}</div></div>${stripeBottom()}`);
};

T['w-live'] = V => {
  const m = M();
  const camBar = `<div style="display:flex;align-items:center;gap:16px;background:var(--color-text);padding:16px 24px;font-size:28px;font-weight:800;"><span>GAMETIMEWES</span><span style="margin-left:auto;font-size:20px;font-weight:600;letter-spacing:.12em;color:var(--color-accent-400);">${m.tagline}</span></div>`;
  const chat = `<div style="display:flex;flex-direction:column;background:var(--color-text);min-height:0;${V ? 'flex:1' : ''}">${stripe()}<div style="padding:18px 24px;font-size:24px;font-weight:800;letter-spacing:.1em;border-bottom:2px solid var(--color-neutral-800);">CHAT</div>${chatSlot('flex:1;margin:0 24px 20px;min-height:0')}</div>`;
  if (!V) return full(`<div style="display:grid;grid-template-columns:minmax(0,1fr) 520px;grid-template-rows:auto minmax(0,1fr);gap:32px;padding:48px;height:100%">
    <div style="grid-column:1 / -1;display:flex;align-items:stretch;line-height:1;">
      <div style="display:flex;align-items:center;gap:16px;background:var(--color-text);padding:0 28px;font-size:22px;font-weight:600;letter-spacing:.14em;">${pulse()}${esc(m.comp)}</div>
      ${scoreBlocks(m, 56, '22px 32px', true)}
      <div style="margin-left:auto;display:flex;align-items:center;font-size:24px;font-weight:600;letter-spacing:.12em;color:var(--color-neutral-400);">${esc(S.socials.handle)}</div></div>
    <div style="display:flex;flex-direction:column;min-height:0;">${stripe()}${ph('WEBCAM', 'flex:1')}${camBar}</div>${chat}</div>`);
  return full(`<div style="display:flex;flex-direction:column;gap:28px;padding:180px 48px 120px;height:100%">
    <div style="display:flex;flex-direction:column;line-height:1;">
      <div style="display:flex;align-items:center;gap:16px;background:var(--color-text);padding:14px 24px;font-size:22px;font-weight:600;letter-spacing:.14em;">${pulse()}${esc(m.comp)}<span style="margin-left:auto;color:var(--color-neutral-400)">${esc(S.socials.handle)}</span></div>
      <div style="display:grid;grid-template-columns:1fr auto 1fr auto;">${scoreBlocks(m, 64, '22px 28px', true)}</div></div>
    <div style="display:flex;flex-direction:column;">${stripe()}${ph('WEBCAM', 'height:553px')}${camBar}</div>${chat}</div>`);
};

T['w-lineups'] = V => {
  const m = M();
  const team = (name, form, list, accent, rowSize) => `<div style="display:flex;flex-direction:column;">
    <div style="display:flex;justify-content:space-between;align-items:center;background:${accent ? 'var(--color-accent);color:#fff' : 'var(--color-text)'};padding:12px 20px;font-size:32px;font-weight:800;text-transform:uppercase;"><span>${esc(name)}</span><span style="font-size:22px;font-weight:600;letter-spacing:.1em;${accent ? '' : 'color:var(--color-neutral-400)'}">${esc(form)}</span></div>
    ${xi(list).map(p => `<div style="display:flex;gap:20px;padding:${V ? 6 : 10}px 20px;font-size:${rowSize}px;font-weight:800;border-bottom:2px solid var(--color-neutral-800);line-height:1.1;"><span class="num" style="width:44px;color:var(--color-neutral-500);">${esc(p.n)}</span><span>${esc(p.name)}</span></div>`).join('')}</div>`;
  if (!V) return full(`<div style="display:flex;flex-direction:column;padding:64px 96px;height:100%">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:4px solid var(--color-bg);padding-bottom:24px;">${big('Lineups', 96, 'line-height:.9;letter-spacing:-.04em')}<div style="font-size:26px;font-weight:600;letter-spacing:.14em;color:var(--color-accent-400);">${esc(m.comp)} · ${esc(m.H)} v ${esc(m.A)}</div></div>
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:96px;margin-top:32px;">${team(m.home, m.homeFormation, m.homeXI, true, 32)}${team(m.away, m.awayFormation, m.awayXI, false, 32)}</div></div>`);
  return full(`<div style="display:flex;flex-direction:column;padding:160px 64px 100px;height:100%;gap:28px">
    <div style="display:flex;flex-direction:column;gap:12px;border-bottom:4px solid var(--color-bg);padding-bottom:20px;">${big('Lineups', 110, 'line-height:.9;letter-spacing:-.04em')}<div style="font-size:24px;font-weight:600;letter-spacing:.14em;color:var(--color-accent-400);">${esc(m.comp)} · ${esc(m.H)} v ${esc(m.A)}</div></div>
    ${team(m.home, m.homeFormation, m.homeXI, true, 30)}${team(m.away, m.awayFormation, m.awayXI, false, 30)}</div>`);
};

T['w-half'] = V => {
  const m = M();
  const left = `<div style="font-size:28px;font-weight:600;letter-spacing:.14em;color:var(--color-accent-400);">${esc(m.comp)} · WATCHALONG</div>${big('Half-<br>time', 200, 'margin-top:32px')}
    <div style="margin-top:auto;display:flex;align-items:stretch;line-height:1;">${scoreBlocks(m, 64, '20px 28px')}</div>`;
  const cam = h => `${field()}<div style="position:relative;width:100%;display:flex;flex-direction:column;background:#0d0c0c;">${ph('WEBCAM', `height:${h}px`)}<div style="display:flex;align-items:center;gap:16px;padding:16px 20px;font-size:28px;font-weight:800;">${pulse()}<span>SECOND HALF IN</span><span style="margin-left:auto;color:var(--color-accent);">${cd()}</span></div></div>`;
  if (!V) return full(`<div style="display:grid;grid-template-columns:960px 1fr;height:100%"><div style="display:flex;flex-direction:column;padding:96px;border-right:4px solid var(--color-bg);">${left}</div>
    <div style="position:relative;display:flex;align-items:center;padding:96px;overflow:hidden;">${cam(432)}</div></div>`);
  return full(`<div style="display:grid;grid-template-rows:880px 1fr;height:100%"><div style="position:relative;display:flex;align-items:flex-end;padding:180px 48px 48px;overflow:hidden;border-bottom:4px solid var(--color-bg)">${cam(553)}</div>
    <div style="display:flex;flex-direction:column;padding:56px 72px 140px;">${left}</div></div>`);
};

T['w-end'] = V => {
  const m = M();
  const row = !V
    ? `<div style="display:flex;align-items:center;line-height:1;background:var(--color-bg);">
        <div style="flex:1;min-width:0;padding:28px 24px;font-size:58px;font-weight:800;letter-spacing:-.03em;background:var(--color-bg);color:var(--color-text);text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(m.home)}</div>
        <div class="num" style="flex:none;white-space:nowrap;padding:28px 36px;font-size:88px;font-weight:800;background:var(--color-accent);color:#fff;">${m.score}</div>
        <div style="flex:1;min-width:0;padding:28px 24px;font-size:58px;font-weight:800;letter-spacing:-.03em;background:var(--color-bg);color:var(--color-text);text-transform:uppercase;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(m.away)}</div></div>`
    : `<div style="display:flex;flex-direction:column;line-height:1;">
        <div style="padding:24px 28px;font-size:76px;font-weight:800;letter-spacing:-.03em;background:var(--color-bg);color:var(--color-text);text-transform:uppercase;">${esc(m.home)}</div>
        <div class="num" style="padding:20px 28px;font-size:110px;font-weight:800;background:var(--color-accent);color:#fff;">${m.score}</div>
        <div style="padding:24px 28px;font-size:76px;font-weight:800;letter-spacing:-.03em;background:var(--color-bg);color:var(--color-text);text-transform:uppercase;">${esc(m.away)}</div></div>`;
  return fieldCard(V, `${headPair(`FULL TIME · ${esc(m.comp)}`, m.tagline, V)}${row}${socialsGrid(V ? 1 : 3)}`);
};

T['w-brb'] = V => {
  const m = M();
  const bar = `<div style="margin-top:auto;display:flex;${V ? 'flex-wrap:wrap;' : ''}align-items:stretch;line-height:1;border-top:4px solid var(--color-bg);padding-top:40px;">
    <div style="display:flex;align-items:center;gap:16px;background:var(--color-text);padding:${V ? '18px' : '0'} 28px;font-size:22px;font-weight:600;letter-spacing:.14em;${V ? 'flex-basis:100%' : ''}">${pulse()}LIVE</div>${scoreBlocks(m, 56, '22px 32px', true)}</div>`;
  return full(`<div style="display:flex;flex-direction:column;padding:${V ? '180px 72px 160px' : '80px 96px'};height:100%">
    <div style="font-size:30px;font-weight:600;letter-spacing:.14em;color:var(--color-accent-400);">QUICK BREAK · MATCH STILL ON</div>${big(V ? 'Be<br>right<br>back' : 'Be right<br>back', V ? 250 : 220, 'margin-top:24px')}${bar}</div>`);
};

T['w-goal'] = V => `<div style="position:absolute;${V ? 'left:160px;top:420px' : 'left:580px;top:96px'}">${goalCard(S.match, S.match.scorer || 'Scorer name', S.match.minute)}</div>`;

// Score prediction poll — tallies "!predict 2-1" from live chat while the dashboard has the poll open
const votes = new Map();
const pollKey = () => `gtw-poll-${S.poll.id}`;
function loadVotes() { votes.clear(); try { Object.entries(JSON.parse(localStorage.getItem(pollKey())) || {}).forEach(([k, v]) => votes.set(k, v)); } catch {} }
function pollRows() {
  const counts = {};
  votes.forEach(v => counts[v] = (counts[v] || 0) + 1);
  const total = votes.size;
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 3), other = sorted.slice(3).reduce((s, [, n]) => s + n, 0);
  const rows = top.map(([label, n]) => ({ label, pct: total ? Math.round(n / total * 100) : 0 }));
  while (rows.length < 3) rows.push({ label: '—', pct: 0 });
  rows.push({ label: 'Other', pct: total ? Math.round(other / total * 100) : 0 });
  return { rows, total };
}
T['w-poll'] = V => {
  const m = M(); const { rows, total } = pollRows();
  if (!S.poll.open && params.get('always') !== '1') return '';
  return `<div style="position:absolute;${V ? 'left:48px;top:180px;width:984px' : 'left:48px;top:48px;width:560px'};background:#0d0c0c;color:var(--color-bg);display:flex;flex-direction:column;animation:gw-in .5s ease">
    ${stripe()}
    <div style="padding:20px 24px 16px;display:flex;flex-direction:column;gap:6px;border-bottom:2px solid var(--color-neutral-800);"><div style="font-size:18px;font-weight:600;letter-spacing:.14em;color:var(--color-accent-400);">${esc(S.poll.title)}</div><div style="font-size:40px;font-weight:800;letter-spacing:-.02em;line-height:1.05;">${esc(m.H)} v ${esc(m.A)}</div></div>
    ${rows.map(o => `<div style="display:grid;grid-template-columns:120px minmax(0,1fr) 64px;align-items:center;gap:16px;padding:12px 24px;border-bottom:2px solid var(--color-neutral-800);">
      <div class="num" style="font-size:30px;font-weight:800;">${esc(o.label)}</div><div style="height:20px;background:var(--color-text);"><div style="height:100%;width:${o.pct}%;background:var(--color-accent);transition:width .6s"></div></div><div style="font-size:22px;font-weight:600;text-align:right;color:var(--color-neutral-300);">${o.pct}%</div></div>`).join('')}
    <div style="padding:14px 24px 18px;font-size:18px;font-weight:600;letter-spacing:.08em;color:var(--color-neutral-400);">VOTE WITH ${esc(S.poll.command.toUpperCase())} 2-1 · ${total} VOTE${total === 1 ? '' : 'S'}</div></div>`;
};

// ---------- render loop ----------
let chatEl = null, lastHtml = '';
function render() {
  if (Object.entries(S).some(([k, v]) => v == null && k !== 'sim')) return; // wait for first state
  document.body.classList.toggle('neutral', sceneId.startsWith('w-') && S.match.mode === 'Neutral');
  const tpl = T[sceneId];
  const html = tpl ? tpl(vertical) : `<div style="position:absolute;inset:0;display:grid;place-items:center;font-size:40px;background:#0d0c0c">Unknown scene "${esc(sceneId)}"</div>`;
  if (html !== lastHtml) {
    lastHtml = html;
    stage.innerHTML = html;
    const slot = stage.querySelector('[data-chat]');
    if (slot) {
      if (!chatEl) { chatEl = document.createElement('div'); chatEl.className = 'chat-list'; mountChatList(chatEl, { channel: params.get('channel') || CONFIG.channel }); }
      slot.appendChild(chatEl);
    }
  }
  paintTelemetry();
}
function paintTelemetry() {
  const box = stage.querySelector('[data-telemetry]');
  if (!box) return;
  const t = S.sim, on = !!t && S.flight.telemetry !== false && params.get('telemetry') !== '0';
  box.classList.toggle('hidden', !on);
  if (!on) return;
  const set = (k, v) => { const el = box.querySelector(`[data-t="${k}"]`); if (el) el.textContent = v; };
  set('alt', fmt.alt(t)); set('gs', fmt.gs(t)); set('hdg', fmt.hdg(t)); set('vs', fmt.vs(t)); set('dist', fmt.dist(t)); set('ete', fmt.ete(t));
}

['flight', 'match', 'countdown', 'socials', 'clubs', 'poll'].forEach(k => watch(k, v => {
  if (k === 'poll' && v.id !== S.poll?.id) { S.poll = v; loadVotes(); }
  S[k] = v; render();
}));
if (sceneId.startsWith('f-')) watchSim(t => { S.sim = t; render(); });
setInterval(() => document.querySelectorAll('[data-countdown]').forEach(el => el.textContent = countdownText(S.countdown)), 250);

if (sceneId === 'w-poll') {
  const cmd = () => (S.poll?.command || '!predict').toLowerCase();
  connectChat(params.get('channel') || CONFIG.channel, {
    onMessage(msg) {
      if (!S.poll?.open) return;
      const t = msg.text.trim().toLowerCase();
      if (!t.startsWith(cmd())) return;
      const mm = t.slice(cmd().length).match(/(\d{1,2})\s*[-:x ]\s*(\d{1,2})/);
      if (!mm) return;
      votes.set(msg.login, `${+mm[1]}–${+mm[2]}`);
      try { localStorage.setItem(pollKey(), JSON.stringify(Object.fromEntries(votes))); } catch {}
      render();
    },
  });
}
