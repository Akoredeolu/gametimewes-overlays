// Applies the active overlay theme to the current page.
//   initTheme({ stage, onChange })  — call once per overlay page
//   tx('f-start.title', 'Starting soon') — themed wording with the Rossoneri default as fallback
//
// Theme source, in order: ?theme=<id> on the URL (pins this one OBS source) → dashboard setting (state "theme").
import { watch, params } from './state.js';
import { THEMES, resolveTheme } from '../themes/themes.js';

let current = 'rossoneri', cleanup = null, setting = 'auto';
const base = new URL('../themes/', import.meta.url);

export const themeId = () => current;
export const theme = () => THEMES[current] || {};
export const tx = (key, fallback) => theme().copy?.[key] ?? fallback;

export function initTheme({ stage = document.getElementById('stage'), onChange, ctx = {} } = {}) {
  const pinned = params.get('theme');
  const apply = async id => {
    if (id === current && document.documentElement.dataset.theme) return;
    current = id;
    const t = theme();
    document.documentElement.dataset.theme = id;
    // stylesheet
    let link = document.getElementById('theme-css');
    if (t.css) {
      if (!link) { link = document.createElement('link'); link.rel = 'stylesheet'; link.id = 'theme-css'; document.head.appendChild(link); }
      link.href = new URL(t.css, base).href;
    } else link?.remove();
    // decorations
    try { cleanup?.(); } catch {}
    cleanup = null;
    if (t.js && stage && params.get('decor') !== '0') {
      try { const m = await import(new URL(t.js, base).href); cleanup = m.mount?.(stage, { ...ctx, theme: id }) || null; }
      catch (e) { console.warn('[theme]', id, e.message); }
    }
    onChange?.(id, t);
  };
  if (pinned && pinned !== 'auto') { apply(THEMES[pinned] ? pinned : 'rossoneri'); return; }
  watch('theme', v => { setting = v?.active || 'auto'; apply(resolveTheme(setting)); });
  // Auto mode: re-check the calendar every 10 minutes so a theme flips over on its own at midnight
  setInterval(() => apply(resolveTheme(setting)), 10 * 60 * 1000);
}
