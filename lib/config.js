// Gametimewes overlay config — the ONLY file you need to edit after setup.
// Values here are public by design (they ship to every browser that loads an overlay).
// Write protection comes from Firebase security rules (firebase/database.rules.json), not from hiding these.

export const CONFIG = {
  channel: 'gametimewes',

  // Twitch app (dev.twitch.tv/console/apps). Client ID is public; never put a client SECRET here.
  twitchClientId: '15xzr7hyrsmp9lwwpwui05pc9xa34x',

  // Firebase project (console.firebase.google.com → Project settings → Your apps → Web app config).
  // Leave apiKey empty to run in "local mode" (state only syncs between tabs in the same browser).
  firebase: {
    apiKey: "AIzaSyAonvcOiIyXh-NLJE50DRt3KkMJitkqpi0",
    authDomain: "gametimewes-stream-dashboard.firebaseapp.com",
    databaseURL: "https://gametimewes-stream-dashboard-default-rtdb.firebaseio.com",
    projectId: "gametimewes-stream-dashboard",
    appId: "1:1049276459549:web:b1c985ed8b3be8274cb4f4",
  },

  // Local flight-sim bridge (bridge/bridge.js). Overlays on the sim PC read this directly;
  // overlays elsewhere get the same data through Firebase.
  simBridgeUrl: 'ws://localhost:7777',
};

export const firebaseEnabled = () => !!(CONFIG.firebase.apiKey && CONFIG.firebase.databaseURL);
