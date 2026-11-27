// Overlay themes. Every overlay follows the theme picked on the dashboard (or ?theme=<id> to pin one OBS source).
//
// Adding a theme:
//   1. make themes/<id>/ with theme.css (colour/decoration overrides) and, optionally,
//      theme.js (export function mount(stage, ctx) { …; return cleanup }) and copy overrides below
//   2. add an entry here. `dates` lets "Auto" pick it by calendar (MM-DD, inclusive, can wrap the year end).
//
// `copy` replaces on-screen wording by key — see the keys used with tx() in overlays/scenes.js.
// Anything not listed keeps the Rossoneri wording.

export const THEMES = {
  rossoneri: {
    name: 'Rossoneri',
    note: 'The standard red & black pack',
  },
  christmas: {
    name: 'Christmas',
    note: 'Rossoneri with a festive touch',
    dates: [['12-01', '12-26']],
    css: 'christmas/theme.css',
    js: 'christmas/theme.js',
    copy: {},
  },
};

export const DEFAULT_THEME = 'rossoneri';

const md = d => String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const inRange = (today, [from, to]) => from <= to ? today >= from && today <= to : today >= from || today <= to;

// Theme Auto mode should show on a given date (first match wins, else Rossoneri)
export function autoTheme(date = new Date()) {
  const today = md(date);
  const hit = Object.entries(THEMES).find(([, t]) => t.dates?.some(r => inRange(today, r)));
  return hit ? hit[0] : DEFAULT_THEME;
}

// Resolve the dashboard setting ('auto' | theme id) to a concrete theme id
export const resolveTheme = (active, date) => (!active || active === 'auto') ? autoTheme(date) : (THEMES[active] ? active : DEFAULT_THEME);
