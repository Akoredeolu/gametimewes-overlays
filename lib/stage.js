// Common overlay boot: layout + flags from the URL, and scaling the fixed stage to the browser source.
//   ?layout=vertical (or ?v=1)  → 1080×1920 stage
//   ?preview=1                  → show gameplay/webcam placeholders (for checking layouts in a normal browser)
//   ?safe=1 (with preview)      → show the TikTok/Shorts vertical safe zone
//   ?motion=0                   → stop stripe/pulse animation
import { params } from './state.js';

export const vertical = params.get('layout') === 'vertical' || params.get('v') === '1';
export const preview = params.get('preview') === '1';

export function bootStage(stageEl = document.getElementById('stage')) {
  document.body.classList.toggle('vertical', vertical);
  document.body.classList.toggle('preview', preview);
  document.body.classList.toggle('safe', params.get('safe') === '1');
  document.body.classList.toggle('still', params.get('motion') === '0');
  const W = vertical ? 1080 : 1920, H = vertical ? 1920 : 1080;
  const fit = () => {
    const s = Math.min(innerWidth / W, innerHeight / H);
    stageEl.style.transform = `scale(${s})`;
    stageEl.style.left = (innerWidth - W * s) / 2 + 'px';
    stageEl.style.top = (innerHeight - H * s) / 2 + 'px';
  };
  addEventListener('resize', fit); fit();
  return { W, H };
}

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function countdownText(cd) {
  const left = cd?.endsAt ? Math.max(0, Math.round((cd.endsAt - Date.now()) / 1000)) : (cd?.minutes ?? 5) * 60;
  return String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0');
}
