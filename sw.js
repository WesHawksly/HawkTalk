// Hawk Talk service worker: shows the "is calling" notifications sent by the push server,
// and opens the call when one is tapped.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

function cleanCode(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
}
function cleanName(s) {
  return typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, 30) : '';
}

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (_) {}

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
  const room = (event.notification.data && event.notification.data.room) || '';
  const url = new URL(room ? `#room=${encodeURIComponent(room)}` : '', self.registration.scope).href;

  event.waitUntil((async () => {
    const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of open) {
      if (!('focus' in c)) continue;
      await c.focus();
      // The page shows "You're invited" for this call, unless you're already in one.
      if (room) c.postMessage({ t: 'open', room });
      return;
    }
    await self.clients.openWindow(url);
  })());
});
