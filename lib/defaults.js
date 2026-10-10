// Default values for every piece of live state. Overlays render these until the dashboard writes something.
export const DEFAULTS = {
  countdown: { minutes: 5, endsAt: null, label: '' }, // endsAt = epoch ms; shared so every device shows the same clock

  flight: {
    callsign: 'GTW07', from: 'KDEN', to: 'KSLC', toCity: 'Salt Lake City',
    aircraft: 'TBM 850', leg: '07', series: 'TBM TOUR OF AMERICA', network: 'VATSIM',
    phase: 'Cruise', phaseMode: 'auto', // 'auto' = from sim bridge when it is running
    simbrief: '', telemetry: true,
    next: '', // f-end footer line; empty = default "next leg" wording
  },

  match: {
    mode: 'Milan', competition: 'Serie A',
    home: 'AC Milan', homeShort: 'MIL', away: 'Opponent', awayShort: 'OPP',
    homeScore: 0, awayScore: 0, minute: '0', scorer: '',
    homeFormation: '4-3-3', awayFormation: '4-3-3',
    homeXI: '1 Player, 2 Player, 3 Player, 4 Player, 5 Player, 6 Player, 7 Player, 8 Player, 9 Player, 10 Player, 11 Player',
    awayXI: '1 Player, 2 Player, 3 Player, 4 Player, 5 Player, 6 Player, 7 Player, 8 Player, 9 Player, 10 Player, 11 Player',
    secondHalfMinutes: 15,
  },

  clubs: { label: 'EA FC PRO CLUBS', brbLine: 'Back before the next match.' },

  // API-Football watchalong overlay (overlays/watchalong.html)
  watchalong: { fixtureId: '', theme: 'SA', mode: 'milan', handle: 'Gametimewes', badge: '', lineups: true, cams: false, host: 'Gametimewes', guest: 'Guest', slips: [], cur: '$' },

  poll: { id: '', open: false, title: 'PREDICT THE SCORE', command: '!predict' },

  // Alert audio: per-type source '' = built-in sound, 'none' = silent, or a URL / path like 'sounds/goal.mp3'
  audio: {
    enabled: true, volume: 0.6, tts: false, ttsTypes: 'cheer,resub,redeem',
    sounds: { follow: '', sub: '', resub: '', gift: '', cheer: '', raid: '', redeem: '', goal: '' },
  },

  socials: { tiktok: '@gametimewes', instagram: '@gametimewes', youtube: '@gametimewes', handle: '@GAMETIMEWES' },

  sim: null, // live telemetry written by bridge/bridge.js
};
