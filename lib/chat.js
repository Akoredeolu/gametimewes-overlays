// Read-only Twitch chat over the public IRC WebSocket. No token needed (anonymous "justinfan" login).
//   connectChat('gametimewes', { onMessage(msg){}, onClear(){}, onDelete(id){} })
// msg = { id, user, login, color, badges:[{set,version}], html, text, ts, isMod, isSub, isBroadcaster, isAction }

const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function parseTags(raw) {
  const tags = {};
  raw.slice(1).split(';').forEach(kv => {
    const i = kv.indexOf('=');
    tags[kv.slice(0, i)] = kv.slice(i + 1).replace(/\\s/g, ' ').replace(/\\:/g, ';').replace(/\\\\/g, '\\');
  });
  return tags;
}

// Replace Twitch emote ranges with <img>. Ranges are in UTF-16 code points of the message.
function renderEmotes(text, emotesTag) {
  const chars = Array.from(text);
  if (!emotesTag) return esc(text);
  const ranges = [];
  emotesTag.split('/').forEach(e => {
    const [id, pos] = e.split(':');
    pos?.split(',').forEach(p => { const [a, b] = p.split('-').map(Number); ranges.push({ id, a, b }); });
  });
  ranges.sort((x, y) => x.a - y.a);
  let out = '', i = 0;
  for (const r of ranges) {
    out += esc(chars.slice(i, r.a).join(''));
    const name = esc(chars.slice(r.a, r.b + 1).join(''));
    out += `<img class="emote" alt="${name}" src="https://static-cdn.jtvnw.net/emoticons/v2/${r.id}/default/dark/2.0">`;
    i = r.b + 1;
  }
  return out + esc(chars.slice(i).join(''));
}

export function connectChat(channel, { onMessage, onClear, onDelete, onStatus } = {}) {
  let ws, retry = 1000, closed = false;
  const open = () => {
    ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
    ws.onopen = () => {
      retry = 1000;
      ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
      ws.send('PASS SCHMOOPIIE');
      ws.send(`NICK justinfan${Math.floor(10000 + Math.random() * 80000)}`);
      ws.send(`JOIN #${channel.toLowerCase()}`);
      onStatus?.('connected');
    };
    ws.onmessage = e => e.data.split('\r\n').filter(Boolean).forEach(line => {
      if (line.startsWith('PING')) return ws.send('PONG :tmi.twitch.tv');
      let tags = {}, rest = line;
      if (line[0] === '@') { const sp = line.indexOf(' '); tags = parseTags(line.slice(0, sp)); rest = line.slice(sp + 1); }
      const m = rest.match(/^:(\w+)!\S+ PRIVMSG #\S+ :(.*)$/);
      if (m) {
        let text = m[2], isAction = false;
        const act = text.match(/^\u0001ACTION (.*)\u0001$/);
        if (act) { text = act[1]; isAction = true; }
        const badges = (tags.badges || '').split(',').filter(Boolean).map(b => { const [set, version] = b.split('/'); return { set, version }; });
        const has = s => badges.some(b => b.set === s);
        onMessage?.({
          id: tags.id, login: m[1], user: tags['display-name'] || m[1], color: tags.color || '',
          badges, text, html: renderEmotes(text, tags.emotes), ts: Number(tags['tmi-sent-ts']) || Date.now(),
          isMod: has('moderator'), isSub: has('subscriber') || has('founder'), isBroadcaster: has('broadcaster'), isVip: has('vip'), isAction,
        });
        return;
      }
      if (/ CLEARCHAT /.test(rest)) onClear?.(tags['target-user-id'] ? rest.split(':').pop() : null);
      if (/ CLEARMSG /.test(rest)) onDelete?.(tags['target-msg-id']);
    });
    ws.onclose = () => { onStatus?.('disconnected'); if (!closed) setTimeout(open, retry = Math.min(retry * 2, 30000)); };
  };
  open();
  return { close() { closed = true; ws?.close(); } };
}

// Shared renderer used by the chat box overlay and the scenes that embed chat.
export function mountChatList(container, { channel, max = 30, fadeAfter = 0, hideCommands = true, hideBots = ['streamelements', 'nightbot', 'streamlabs', 'moobot', 'fossabot'] } = {}) {
  const BADGE = { broadcaster: 'HOST', moderator: 'MOD', vip: 'VIP', subscriber: 'SUB', founder: 'SUB' };
  return connectChat(channel, {
    onMessage(m) {
      if (hideCommands && m.text.startsWith('!')) return;
      if (hideBots.includes(m.login)) return;
      const tag = m.badges.map(b => BADGE[b.set]).find(Boolean);
      const row = document.createElement('div');
      row.className = 'chat-msg' + (m.isBroadcaster ? ' is-host' : '') + (m.isAction ? ' is-action' : '');
      row.dataset.id = m.id; row.dataset.login = m.login;
      row.innerHTML = `<div class="chat-who">${tag ? `<span class="chat-badge">${tag}</span>` : ''}<span class="chat-name">${esc(m.user)}</span></div><div class="chat-text">${m.html}</div>`;
      container.appendChild(row);
      while (container.children.length > max) container.firstElementChild.remove();
      if (fadeAfter) setTimeout(() => row.classList.add('chat-out'), fadeAfter * 1000);
    },
    onClear(login) { [...container.children].forEach(r => { if (!login || r.dataset.login === login) r.remove(); }); },
    onDelete(id) { container.querySelector(`[data-id="${id}"]`)?.remove(); },
  });
}
