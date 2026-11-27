// Christmas decorations: twinkling lights along the top, falling snow, and trees on the holding screens.
// Ported from the Claude Design "holiday.js" layer. mount() returns a cleanup so the dashboard can switch themes live.
const RED = '#ec3013', WHITE = '#f3f2f2', BLACK = '#0d0c0c', GOLD = '#e3b341';

function rng(seed) { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function lightsHtml(width) {
  const cols = [RED, WHITE, GOLD];
  let s = '<div class="gwx-wire"></div>';
  for (let i = 0; i < Math.ceil(width / 64); i++) s += `<i class="gwx-b" style="left:${29 + i * 64}px;--c:${cols[i % 3]};animation-delay:${-((i * 7) % 10) * 0.2}s"></i>`;
  return s;
}
function snowHtml(n, seed, W, H) {
  const r = rng(seed), glyphs = ['❄', '❅', '❆'];
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = Math.round(r() * (W - 20)), dur = ((9 + r() * 12) * H / 1080).toFixed(1), delay = (-r() * 21).toFixed(1);
    const dx = Math.round(-80 + r() * 160), rot = Math.round(-180 + r() * 360), op = (0.35 + r() * 0.55).toFixed(2), y = Math.round(r() * (H - 40));
    const base = `left:${x}px;--dx:${dx}px;--r:${rot}deg;--y:${y}px;--fall:${H + 80}px;opacity:${op};animation-duration:${dur}s;animation-delay:${delay}s`;
    if (r() < 0.45) s += `<i class="gwx-f" style="${base};font-size:${Math.round(16 + r() * 16)}px">${glyphs[i % 3]}</i>`;
    else s += `<i class="gwx-f sq" style="${base};--s:${Math.round(5 + r() * 7)}px"></i>`;
  }
  return s;
}
function treeSvg() {
  const o = [[120, 96, RED], [170, 122, GOLD], [100, 178, GOLD], [150, 194, RED], [200, 198, WHITE], [80, 262, RED], [140, 270, WHITE], [200, 278, GOLD], [234, 298, RED]];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 380" width="100%" height="100%">
<rect x="132" y="318" width="36" height="34" fill="#605d5d"/>
<polygon points="150,170 18,322 282,322" fill="#1f6b3f"/><polygon points="150,100 44,236 256,236" fill="#237a48"/><polygon points="150,36 72,150 228,150" fill="#288a52"/>
<path d="M96 122L214 146M78 200L236 226M58 284L262 312" stroke="${WHITE}" stroke-width="4"/>
${o.map(([x, y, c], i) => `<rect class="gwx-o" x="${x - 7}" y="${y - 7}" width="14" height="14" fill="${c}" style="animation-delay:${-i * 0.3}s"/>`).join('')}
<rect class="gwx-o" x="138" y="12" width="24" height="24" fill="${GOLD}" transform="rotate(45 150 24)"/>
<rect x="28" y="336" width="72" height="44" fill="${RED}"/><rect x="46" y="336" width="18" height="44" fill="${BLACK}"/><rect x="82" y="336" width="18" height="44" fill="${BLACK}"/><rect x="28" y="352" width="72" height="8" fill="${GOLD}"/>
<rect x="198" y="344" width="60" height="36" fill="${WHITE}"/><rect x="223" y="344" width="10" height="36" fill="${RED}"/><rect x="198" y="356" width="60" height="8" fill="${RED}"/>
</svg>`;
}

// Where the trees go (from the design: small tree on start/ending screens, large tree on the BRB screens)
const TREES = {
  'f-start': 'S', 'f-end': 'S', 'f-brb': 'L', 'w-brb': 'L',
};
const TREE_BOX = {
  S: { h: 'right:96px;bottom:140px;width:220px;height:279px', v: 'right:72px;bottom:250px;width:200px;height:254px' },
  L: { h: 'right:150px;top:150px;width:420px;height:532px', v: 'right:64px;top:1020px;width:280px;height:355px' },
};
// Card-only overlays get the candy stripes from theme.css but no lights/snow layer
const NO_LAYER = new Set(['w-goal', 'w-poll']);

export function mount(stage, { sceneId = '', vertical = false, layer = true } = {}) {
  if (!stage) return null;
  const still = document.body.classList.contains('still');
  const W = vertical ? 1080 : 1920, H = vertical ? 1920 : 1080;
  const els = [];
  if (sceneId === 'watchalong') {
    // live API overlay: lights sit behind the scorebug, snow falls in front
    const lights = document.createElement('div');
    lights.className = 'gwx-lights theme-keep' + (still ? ' gwx-still' : ''); lights.style.zIndex = 0; lights.innerHTML = lightsHtml(W);
    stage.insertBefore(lights, stage.firstChild); els.push(lights);
    const snow = document.createElement('div');
    snow.className = 'gwx-layer theme-keep' + (still ? ' gwx-still' : ''); snow.style.zIndex = 60; snow.innerHTML = snowHtml(60, 11, W, H);
    stage.appendChild(snow); els.push(snow);
    return () => els.forEach(e => e.remove());
  }
  if (layer && !NO_LAYER.has(sceneId)) {
    const lay = document.createElement('div');
    lay.className = 'gwx-layer theme-keep' + (still ? ' gwx-still' : '');
    lay.innerHTML = `<div class="gwx-lights">${lightsHtml(W)}</div>${snowHtml(vertical ? 46 : 50, 7, W, H)}`;
    stage.appendChild(lay); els.push(lay);
  }
  const t = TREES[sceneId];
  if (t) {
    const tree = document.createElement('div');
    tree.className = 'gwx-tree theme-keep' + (still ? ' gwx-still' : '');
    tree.style.cssText = TREE_BOX[t][vertical ? 'v' : 'h'];
    tree.innerHTML = treeSvg();
    stage.appendChild(tree); els.push(tree);
  }
  return () => els.forEach(e => e.remove());
}
