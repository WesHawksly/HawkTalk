// Hawk Talk service worker: shows the "is calling" and family chat notifications sent by
// the push server, and opens the call or the chat when one is tapped.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

function cleanCode(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
}
function cleanName(s) {
  return typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, 30) : '';
}

// The page keeps the chat key here (see saveChatKey in index.html), so a notification can
// show the message. The key can't be copied out; it can only be used to unscramble.
function chatKey() {
  return new Promise((resolve) => {
    const req = indexedDB.open('hawktalk', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onerror = () => resolve(null);
    req.onsuccess = () => {
      const db = req.result;
      try {
        const get = db.transaction('kv').objectStore('kv').get('chatKey');
        get.onsuccess = () => { db.close(); resolve((get.result && get.result.key) || null); };
        get.onerror = () => { db.close(); resolve(null); };
      } catch (_) { db.close(); resolve(null); }
    };
  });
}

function fromB64u(s) {
  const t = String(s).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(t + '='.repeat((4 - (t.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function readChat(c) {
  if (typeof c !== 'string' || !c) return null;
  const key = await chatKey();
  if (!key) return null;
  const bytes = fromB64u(c);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, key, bytes.slice(12));
  const m = JSON.parse(new TextDecoder().decode(plain));
  return m && typeof m.x === 'string' ? m : null;
}

async function showChat(d) {
  let title = cleanName(d.from) || 'Family chat';
  let body = 'New message in Hawk Talk.';
  const m = await readChat(d.c).catch(() => null);
  if (m) {
    title = cleanName(m.n) || title;
    body = m.x.length > 200 ? `${m.x.slice(0, 199)}…` : m.x;
  }
  // An open copy of the app fetches the new message straight away.
  const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  open.forEach((c) => c.postMessage({ t: 'chat' }));
  await self.registration.showNotification(title, {
    body,
    tag: 'hawktalk-chat',
    renotify: true,
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    data: { chat: true }
  });
}

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (_) {}
  if (d.t === 'chat') {
    event.waitUntil(showChat(d));
    return;
  }

  let title = 'Hawk Talk';
  let body = 'Open Hawk Talk.';
  let room = '';
  let tag = 'hawktalk';
  if (d.t === 'ring') {
    room = cleanCode(d.room);
    title = `${cleanName(d.from) || 'Someone'} is calling`;
    body = 'Tap to join the video call.';
    tag = `call-${room}`;
  } else if (d.t === 'test') {
    body = "Call notifications are on. You'll get one like this when someone rings you.";
    tag = 'hawktalk-test';
  }

  event.waitUntil(self.registration.showNotification(title, {
    body,
    tag,
    renotify: true,
    requireInteraction: d.t === 'ring',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    vibrate: [400, 200, 400, 200, 400],
    data: { room }
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const room = data.room || '';
  const chat = !!data.chat;
  const url = new URL(room ? `#room=${encodeURIComponent(room)}` : chat ? '#chat' : '', self.registration.scope).href;

  event.waitUntil((async () => {
    const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of open) {
      if (!('focus' in c)) continue;
      await c.focus();
      // The page shows "You're invited" for this call, unless you're already in one.
      if (room) c.postMessage({ t: 'open', room });
      else if (chat) c.postMessage({ t: 'openChat' });
      return;
    }
    await self.clients.openWindow(url);
  })());
});
