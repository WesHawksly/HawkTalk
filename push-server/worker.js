// Hawk Talk push server: a Cloudflare Worker that sends "is calling" notifications.
// It has no dependencies, so it can be pasted straight into the Cloudflare dashboard.
// Needs one KV namespace bound as HAWK. See the "Call notifications" part of README.md.
//
// A family code is the shared secret: anyone who knows it can see the names in the
// family and ring them, so pick one that is hard to guess.

// Bump this when the server code changes, and note it in CHANGELOG.md. The address's
// home page shows it, so you can check the deployed copy is up to date.
const VERSION = '1.1.0';
const MAX_MEMBERS = 30;
const RING_TTL = 90;      // seconds a ring waits for an offline phone before it's dropped
const TEST_TTL = 600;
// Who to contact about this server, sent to Apple/Google with each push.
const DEFAULT_SUBJECT = 'https://github.com/WesHawksly/HawkTalk';

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    try {
      if (!env.HAWK) return json({ error: 'The HAWK KV namespace is not bound to this worker.' }, 500);
      const path = new URL(req.url).pathname.replace(/\/+$/, '');
      if (req.method === 'GET' && path === '/key') {
        return json({ key: (await vapidKeys(env)).publicKey });
      }
      if (req.method === 'GET' && path === '') return json({ ok: true, app: 'Hawk Talk push server', version: VERSION });
      if (req.method !== 'POST') return json({ error: 'Not found' }, 404);

      const body = await req.json().catch(() => null);
      if (!body || typeof body !== 'object') return json({ error: 'Bad request' }, 400);
      const fam = await familyKey(body.family);
      if (!fam) return json({ error: 'Family code is missing or too short.' }, 400);

      if (path === '/subscribe') return await subscribe(env, fam, body);
      if (path === '/unsubscribe') return await unsubscribe(env, fam, body);
      if (path === '/members') return json({ members: await members(env, fam) });
      if (path === '/ring') return await ring(env, fam, body);
      return json({ error: 'Not found' }, 404);
    } catch (err) {
      return json({ error: String((err && err.message) || err) }, 500);
    }
  }
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400'
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: Object.assign({ 'Content-Type': 'application/json' }, CORS)
  });
}

/* ---------- Family members ---------- */

function cleanFamily(s) {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}
function cleanName(s) {
  return typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, 30) : '';
}
function cleanCode(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
}
function validId(id) {
  return typeof id === 'string' && /^[a-z0-9]{8,40}$/.test(id);
}

// Family codes are stored hashed, so the database never holds the code itself.
async function familyKey(raw) {
  const fam = cleanFamily(raw);
  if (fam.length < 6) return null;
  const digest = await crypto.subtle.digest('SHA-256', enc(`hawktalk-family:${fam}`));
  return hex(new Uint8Array(digest)).slice(0, 32);
}
const memberKey = (fam, id) => `m:${fam}:${id}`;

function validSubscription(sub) {
  if (!sub || typeof sub !== 'object' || typeof sub.endpoint !== 'string') return false;
  if (!/^https:\/\//.test(sub.endpoint) || sub.endpoint.length > 1000) return false;
  const k = sub.keys;
  return !!k && typeof k.p256dh === 'string' && typeof k.auth === 'string' &&
    k.p256dh.length < 200 && k.auth.length < 100;
}

async function members(env, fam) {
  const out = [];
  let cursor;
  do {
    const page = await env.HAWK.list({ prefix: `m:${fam}:`, cursor });
    for (const k of page.keys) {
      out.push({ id: k.name.slice(k.name.lastIndexOf(':') + 1), name: (k.metadata && k.metadata.name) || '' });
    }
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  return out;
}

async function subscribe(env, fam, body) {
  const id = body.id;
  const name = cleanName(body.name);
  const sub = body.subscription;
  if (!validId(id) || !name || !validSubscription(sub)) return json({ error: 'Bad subscription' }, 400);

  const key = memberKey(fam, id);
  const value = JSON.stringify({ name, sub: { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } } });
  const old = await env.HAWK.get(key);
  if (old !== value) {
    if (old === null && (await members(env, fam)).length >= MAX_MEMBERS) {
      return json({ error: `A family can have up to ${MAX_MEMBERS} devices.` }, 400);
    }
    // Writes are limited on the free plan, so only write when something changed.
    await env.HAWK.put(key, value, { metadata: { name } });
  }

  if (body.test) {
    const r = await sendPush(env, JSON.parse(value).sub, { t: 'test' }, TEST_TTL);
    if (!r.ok) return json({ error: `The test notification could not be sent (${r.status}).` }, 502);
  }
  return json({ ok: true });
}

async function unsubscribe(env, fam, body) {
  if (!validId(body.id)) return json({ error: 'Bad request' }, 400);
  await env.HAWK.delete(memberKey(fam, body.id));
  return json({ ok: true });
}

async function ring(env, fam, body) {
  const from = body.from || {};
  const fromName = cleanName(from.name);
  const room = cleanCode(body.room);
  if (!fromName || !room) return json({ error: 'Bad request' }, 400);
  const only = Array.isArray(body.to) ? new Set(body.to.filter(validId)) : null;

  const targets = (await members(env, fam))
    .filter((m) => m.id !== from.id && (!only || only.has(m.id)));

  const payload = { t: 'ring', from: fromName, room };
  const results = await Promise.all(targets.map(async (m) => {
    const key = memberKey(fam, m.id);
    const raw = await env.HAWK.get(key);
    if (!raw) return { name: m.name, status: 'gone' };
    let r;
    try {
      r = await sendPush(env, JSON.parse(raw).sub, payload, RING_TTL);
    } catch (_) {
      return { name: m.name, status: 'failed' };
    }
    if (r.status === 404 || r.status === 410) {
      // The phone unsubscribed or the app was removed: forget it.
      await env.HAWK.delete(key);
      return { name: m.name, status: 'gone' };
    }
    return { name: m.name, status: r.ok ? 'sent' : 'failed' };
  }));

  return json({
    sent: results.filter((r) => r.status === 'sent').map((r) => r.name),
    failed: results.filter((r) => r.status === 'failed').map((r) => r.name)
  });
}

/* ---------- Web Push (RFC 8291 encryption + RFC 8292 VAPID) ---------- */

let cachedKeys = null;

// The server's signing key is made automatically the first time it's needed.
async function vapidKeys(env) {
  if (cachedKeys) return cachedKeys;
  let stored = await env.HAWK.get('vapid', 'json');
  if (!stored) {
    const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
    const raw = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
    stored = { jwk: { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, d: jwk.d }, publicKey: b64u(raw) };
    await env.HAWK.put('vapid', JSON.stringify(stored));
  }
  const privateKey = await crypto.subtle.importKey('jwk', stored.jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  cachedKeys = { privateKey, publicKey: stored.publicKey };
  return cachedKeys;
}

async function vapidHeader(env, endpoint) {
  const keys = await vapidKeys(env);
  const header = b64u(enc(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64u(enc(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: env.VAPID_SUBJECT || DEFAULT_SUBJECT
  })));
  const unsigned = `${header}.${claims}`;
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, keys.privateKey, enc(unsigned));
  return `vapid t=${unsigned}.${b64u(new Uint8Array(sig))}, k=${keys.publicKey}`;
}

async function hkdf(salt, ikm, info, length) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8));
}

async function encryptPayload(sub, text) {
  const uaPublic = fromB64u(sub.keys.p256dh);
  const authSecret = fromB64u(sub.keys.auth);
  const local = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, local.privateKey, 256));

  const ikm = await hkdf(authSecret, shared, concat(enc('WebPush: info\0'), uaPublic, asPublic), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc('Content-Encoding: nonce\0'), 12);

  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  // A single record: the message followed by the 0x02 "last record" delimiter.
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, concat(enc(text), new Uint8Array([2]))));

  const head = new Uint8Array(16 + 4 + 1 + asPublic.length);
  head.set(salt, 0);
  new DataView(head.buffer).setUint32(16, 4096);
  head[20] = asPublic.length;
  head.set(asPublic, 21);
  return concat(head, cipher);
}

async function sendPush(env, sub, message, ttl) {
  const body = await encryptPayload(sub, JSON.stringify(message));
  return fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidHeader(env, sub.endpoint),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(ttl),
      Urgency: 'high'
    },
    body
  });
}

/* ---------- Bytes ---------- */

function enc(s) { return new TextEncoder().encode(s); }
function concat(...parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) { out.set(p, i); i += p.length; }
  return out;
}
function hex(bytes) { return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(''); }
function b64u(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64u(s) {
  const t = String(s).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(t + '='.repeat((4 - (t.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
