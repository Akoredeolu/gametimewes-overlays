// Cards shared between scenes.js and alerts.html
import { esc } from '../lib/stage.js';

export function goalCard(m, scorer, minute) {
  return `<div style="display:flex;flex-direction:column;width:760px">
    <div style="height:14px;background:${m.mode === 'Neutral' ? '#0d0c0c' : 'var(--stripe)'}"></div>
    <div style="display:flex;align-items:stretch;background:var(--color-accent);color:#fff;">
      <div style="flex:1;padding:20px 28px 24px;display:flex;flex-direction:column;gap:4px;"><div style="font-size:112px;font-weight:800;line-height:.9;letter-spacing:-.045em;">GOAL</div><div style="font-size:30px;font-weight:800;margin-top:8px;">${esc(scorer)} ${esc(minute)}′</div></div>
      <div style="background:#0d0c0c;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px 28px;min-width:220px;"><div style="font-size:18px;font-weight:600;letter-spacing:.14em;color:var(--color-neutral-400);">${esc(String(m.homeShort).toUpperCase())} v ${esc(String(m.awayShort).toUpperCase())}</div><div class="num" style="font-size:64px;font-weight:800;line-height:1;">${m.homeScore}–${m.awayScore}</div></div>
    </div></div>`;
}
