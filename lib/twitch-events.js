// Twitch EventSub over WebSocket — follows, subs, resubs, gift subs, cheers, raids, channel-point redemptions.
// Needs a user access token for the broadcaster (made on /auth/) with scopes:
//   moderator:read:followers channel:read:subscriptions bits:read channel:read:redemptions
// The token lives only in the OBS URL hash (#token=...), which browsers never send to any server.
//
//   connectEventSub({ clientId, token, onAlert(a){}, onStatus(s){} })
//   a = { type: 'follow'|'sub'|'resub'|'gift'|'cheer'|'raid'|'redeem', name, amount, message, tier }

const HELIX = 'https://api.twitch.tv/helix';

async function validate(token) {
  const r = await fetch('https://id.twitch.tv/oauth2/validate', { headers: { Authorization: `OAuth ${token}` } });
  if (!r.ok) throw new Error('Twitch token invalid or expired — make a new one on the /auth/ page');
  return r.json(); // { client_id, login, user_id, scopes, expires_in }
}

export async function tokenInfo(token) { try { return await validate(token); } catch { return null; } }

export function connectEventSub({ clientId, token, onAlert, onStatus }) {
  let ws, keepaliveTimer, closed = false, userId;
  const status = s => onStatus?.(s);

  const subscribe = async (sessionId, type, version, condition) => {
    const r = await fetch(`${HELIX}/eventsub/subscriptions`, {
      method: 'POST',
      headers: { 'Client-Id': clientId, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, version, condition, transport: { method: 'websocket', session_id: sessionId } }),
    });
    if (!r.ok) console.warn('[eventsub]', type, r.status, await r.text());
  };

  const subscribeAll = sessionId => {
    const me = { broadcaster_user_id: userId };
    return Promise.all([
      subscribe(sessionId, 'channel.follow', '2', { ...me, moderator_user_id: userId }),
      subscribe(sessionId, 'channel.subscribe', '1', me),
      subscribe(sessionId, 'channel.subscription.message', '1', me),
      subscribe(sessionId, 'channel.subscription.gift', '1', me),
      subscribe(sessionId, 'channel.cheer', '1', me),
      subscribe(sessionId, 'channel.raid', '1', { to_broadcaster_user_id: userId }),
      subscribe(sessionId, 'channel.channel_points_custom_reward_redemption.add', '1', me),
    ]);
  };

  const map = (type, e) => {
    switch (type) {
      case 'channel.follow': return { type: 'follow', name: e.user_name };
      case 'channel.subscribe': return e.is_gift ? null : { type: 'sub', name: e.user_name, amount: 1, tier: e.tier };
      case 'channel.subscription.message': return { type: 'resub', name: e.user_name, amount: e.cumulative_months, message: e.message?.text, tier: e.tier };
      case 'channel.subscription.gift': return { type: 'gift', name: e.is_anonymous ? 'Anonymous' : e.user_name, amount: e.total, tier: e.tier };
      case 'channel.cheer': return { type: 'cheer', name: e.is_anonymous ? 'Anonymous' : e.user_name, amount: e.bits, message: e.message };
      case 'channel.raid': return { type: 'raid', name: e.from_broadcaster_user_name, amount: e.viewers };
      case 'channel.channel_points_custom_reward_redemption.add': return { type: 'redeem', name: e.user_name, message: e.reward?.title, amount: e.reward?.cost };
    }
    return null;
  };

  const open = (url = 'wss://eventsub.wss.twitch.tv/ws', isReconnect = false) => {
    const sock = new WebSocket(url);
    sock.onmessage = async ev => {
      const msg = JSON.parse(ev.data);
      const t = msg.metadata?.message_type;
      clearTimeout(keepaliveTimer);
      if (t === 'session_welcome') {
        const s = msg.payload.session;
        keepaliveTimer = setTimeout(() => sock.close(), (s.keepalive_timeout_seconds + 5) * 1000);
        if (isReconnect) { ws?.close(); ws = sock; status('connected'); return; } // subs carry over on reconnect
        ws = sock;
        await subscribeAll(s.id);
        status('connected');
      } else if (t === 'session_keepalive') {
        keepaliveTimer = setTimeout(() => sock.close(), 15000);
      } else if (t === 'notification') {
        keepaliveTimer = setTimeout(() => sock.close(), 15000);
        const a = map(msg.metadata.subscription_type, msg.payload.event);
        if (a) onAlert?.(a);
      } else if (t === 'session_reconnect') {
        open(msg.payload.session.reconnect_url, true);
      } else if (t === 'revocation') {
        status('revoked: ' + msg.payload.subscription.type);
      }
    };
    sock.onclose = () => { if (sock === ws && !closed) { status('reconnecting'); setTimeout(() => open(), 3000); } };
  };

  validate(token)
    .then(info => { userId = info.user_id; open(); })
    .catch(err => status(err.message));

  return { close() { closed = true; ws?.close(); } };
}
