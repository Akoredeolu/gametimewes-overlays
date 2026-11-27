// Gametimewes holiday layer — shared by the DC packs and the live watchalong overlays.
(function () {
  const RED = '#ec3013', WHITE = '#f3f2f2', BLACK = '#0d0c0c', GOLD = '#e3b341';
  // 135deg candy stripe; 42.426px axis period = 60px horizontal, so it tiles at 60x60 and loops with the existing 60px drift.
  const CANDY = `repeating-linear-gradient(135deg,${RED} 0 15px,${WHITE} 15px 21.213px,${BLACK} 21.213px 36.213px,${WHITE} 36.213px 42.426px)`;
  const CANDY_N = `repeating-linear-gradient(135deg,${RED} 0 15px,${WHITE} 15px 21.213px,${RED} 21.213px 36.213px,${WHITE} 36.213px 42.426px)`;
  const uri = s => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
  const HAT = uri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 70"><polygon points="10,52 36,8 62,16 70,52" fill="${RED}"/><polygon points="36,8 62,16 50,30" fill="#ae1800"/><rect x="2" y="50" width="76" height="16" fill="${WHITE}"/><rect x="55" y="9" width="15" height="15" fill="${WHITE}" transform="rotate(45 62.5 16.5)"/></svg>`);
  const CAP = uri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 12" preserveAspectRatio="none"><path d="M0 12V6h20V3h30v4h25V2h35v5h20V4h40v3h30V5h40v7z" fill="${WHITE}"/></svg>`);

  const css = `
@keyframes gwx-fall{to{transform:translate(var(--dx),1160px) rotate(var(--r))}}
@keyframes gwx-twinkle{0%,100%{opacity:1}50%{opacity:.3}}
.gwx-layer{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:50}
.gwx-lights{position:absolute;left:0;right:0;top:0;height:44px;pointer-events:none}
.gwx-wire{position:absolute;left:0;right:0;top:9px;height:2px;background:#444141}
.gwx-b{position:absolute;top:10px;width:6px;height:8px;background:#444141;animation:gwx-twinkle 2s ease-in-out infinite}
.gwx-b::after{content:"";position:absolute;left:-5px;top:11px;width:16px;height:16px;background:var(--c);transform:rotate(45deg);box-shadow:0 0 14px var(--c)}
.gwx-f{position:absolute;top:-40px;left:0;color:${WHITE};font-style:normal;line-height:1;animation:gwx-fall linear infinite;will-change:transform}
.gwx-f.sq{width:var(--s);height:var(--s);background:${WHITE}}
.gwx-still .gwx-f{animation:none;top:var(--y)}
.gwx-still .gwx-b,.gwx-still .gwx-o{animation:none}
.gwx-cap{position:absolute;left:0;right:0;bottom:100%;height:12px;background:${CAP} repeat-x left bottom/240px 12px;pointer-events:none}
.gwx-hat{position:absolute;left:-34px;top:-62px;width:96px;height:84px;background:${HAT} no-repeat center/contain;transform:rotate(-16deg);pointer-events:none;z-index:3}
.gwx-tree{position:absolute;pointer-events:none;z-index:1}
html.gwx-on-dc:has(#gw-obs) [data-card]{margin-top:14px}
.gwx-o{animation:gwx-twinkle 2.4s ease-in-out infinite}
body.gwx-on{--stripe:${CANDY}}
body.gwx-on.neutral{--stripe:${CANDY_N}}
body.gwx-on .scorebug::before,body.gwx-on .slipcard::before,body.gwx-on .cam::before{background-size:60px 60px}
body.gwx-on.neutral:not(.still) .scorebug::before,body.gwx-on.neutral:not(.still) .slipcard::before,body.gwx-on.neutral:not(.still) .cam::before{animation:drift 3s linear infinite}
body.gwx-on .scorebug::after{content:"";position:absolute;left:-24px;top:-32px;width:68px;height:60px;background:${HAT} no-repeat center/contain;transform:rotate(-16deg)}
body.gwx-on .cam::after{content:"";position:absolute;left:-40px;top:-76px;width:96px;height:84px;background:${HAT} no-repeat center/contain;transform:rotate(-16deg)}
body.gwx-on .lu-head{position:relative}
body.gwx-on .lu-head::after,body.gwx-on .slipcard::after{content:"";position:absolute;left:0;right:0;bottom:100%;height:12px;background:${CAP} repeat-x left bottom/240px 12px}
body.gwx-on .lineup.away .lu-head::after{bottom:calc(100% + 6px)}
body.gwx-on #goalBanner{border-image:${CANDY} 14;border-image-slice:14 0 0 0;border-image-width:14px 0 0 0}
body.gwx-on.neutral #goalBanner{border-image-source:${CANDY_N}}
`;
  const st = document.createElement('style'); st.id = 'gwx-css'; st.textContent = css; document.head.appendChild(st);

  function rng(seed) { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function lightsHtml() {
    const cols = [RED, WHITE, GOLD];
    let s = '<div class="gwx-wire"></div>';
    for (let i = 0; i < 30; i++) s += `<i class="gwx-b" style="left:${29 + i * 64}px;--c:${cols[i % 3]};animation-delay:${-((i * 7) % 10) * 0.2}s"></i>`;
    return s;
  }
  function snowHtml(n, seed) {
    const r = rng(seed), glyphs = ['❄', '❅', '❆'];
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = Math.round(r() * 1900), dur = (9 + r() * 12).toFixed(1), delay = (-r() * 21).toFixed(1);
      const dx = Math.round(-80 + r() * 160), rot = Math.round(-180 + r() * 360), op = (0.35 + r() * 0.55).toFixed(2), y = Math.round(r() * 1040);
      const base = `left:${x}px;--dx:${dx}px;--r:${rot}deg;--y:${y}px;opacity:${op};animation-duration:${dur}s;animation-delay:${delay}s`;
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

  const cache = {};
  const memo = (k, f) => cache[k] || (cache[k] = f());
  const layerHtml = motion => memo('layer' + motion, () => `<div class="gwx-layer${motion ? '' : ' gwx-still'}"><div class="gwx-lights">${lightsHtml()}</div>${snowHtml(40, 7)}</div>`);
  const treeHtml = (motion, box) => memo('tree' + motion + box, () => `<div class="gwx-tree${motion ? '' : ' gwx-still'}" style="${box}">${treeSvg()}</div>`);

  window.GWHoliday = {
    // Design Components: decorate renderVals() output.
    dc(v, props, React) {
      const h = React.createElement, qs = new URLSearchParams(location.search);
      const on = qs.has('holiday') ? qs.get('holiday') === '1' : (qs.has('scene') ? false : (props.holiday ?? true));
      document.documentElement.classList.toggle('gwx-on-dc', on);
      const none = h(React.Fragment);
      if (!on) return Object.assign(v, { camStripe: v.stripe, xmas: none, xmasTreeL: none, xmasTreeS: none });
      const motion = props.motion ?? true, bg = props.mode === 'Neutral' ? CANDY_N : CANDY;
      const html = s => h('div', { style: { display: 'contents' }, dangerouslySetInnerHTML: { __html: s } });
      const restripe = (el, extra) => el && React.cloneElement(el, {
        style: Object.assign({}, el.props.style, { position: el.props.style.position || 'relative', background: bg, backgroundSize: '60px 60px', animation: motion ? 'gw-drift 3s linear infinite' : 'none' })
      }, html('<div class="gwx-cap"></div>' + (extra || '')));
      const base = v.stripe;
      const gc = v.goalCard, kids = gc && gc.props && gc.props.children;
      if (Array.isArray(kids) && kids[0] && kids[0].props && kids[0].props.style) v.goalCard = React.cloneElement(gc, {}, restripe(kids[0]), ...kids.slice(1));
      return Object.assign(v, {
        stripe: restripe(base), stripeBottom: restripe(v.stripeBottom),
        camStripe: restripe(base, '<span class="gwx-hat"></span>'),
        xmas: html(layerHtml(motion)),
        xmasTreeL: html(treeHtml(motion, 'right:150px;top:150px;width:420px;height:532px')),
        xmasTreeS: html(treeHtml(motion, 'right:96px;bottom:140px;width:220px;height:279px'))
      });
    },
    // Live overlays: toggle on the 1920x1080 stage.
    live(on, stage, motion) {
      document.body.classList.toggle('gwx-on', !!on);
      stage.querySelectorAll('.gwx-keep').forEach(n => n.remove());
      if (!on) return;
      const lights = document.createElement('div');
      lights.className = 'gwx-lights gwx-keep' + (motion ? '' : ' gwx-still'); lights.style.zIndex = 0; lights.innerHTML = lightsHtml();
      stage.insertBefore(lights, stage.firstChild);
      const snow = document.createElement('div');
      snow.className = 'gwx-layer gwx-keep' + (motion ? '' : ' gwx-still'); snow.style.zIndex = 60; snow.innerHTML = snowHtml(60, 11);
      stage.appendChild(snow);
    }
  };
})();
