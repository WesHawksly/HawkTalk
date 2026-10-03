# HawkTalk
app to talk to siblings

Hawk Talk is a simple video calling app that works between iPhones, Androids, and computers. There's nothing to download from an app store and no accounts — it runs in the web browser. Calls work best with up to 6 people.

**Open the app:** https://weshawksly.github.io/HawkTalk/

Or scan this with your phone's camera:

<img src="qr-code.png" alt="QR code linking to Hawk Talk" width="200">

## Install

Hawk Talk is a small static website: `index.html` plus a few supporting files (`sw.js`, `manifest.webmanifest` and the icons). The camera and microphone only work when the page is opened from a secure `https://` address, so it needs to be hosted online. GitHub Pages is free and the easiest option:

1. Open this repository on GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**, pick the `main` branch and the `/ (root)` folder, then click **Save**.
4. After a minute or two, the app is live at https://weshawksly.github.io/HawkTalk/.
5. Send that link to your siblings.

(Netlify or any other host that serves `https` works too — upload all the files in this repository except the `push-server` folder.)

### Put it on your home screen

So it opens like a regular app:

- **iPhone (Safari):** open the link, tap the **Share** button, then **Add to Home Screen**.
- **Android (Chrome):** open the link, tap the **⋮** menu, then **Add to Home screen** (or **Install app**).

## Call notifications (optional)

With this set up, you can tap **Ring** during a call, and your siblings' phones get a notification like "Wes is calling". Tapping it opens the call. It needs a small free server to send the notifications, and you set it up once.

### 1. Set up the push server (one time, about 10 minutes)

The server is the file `push-server/worker.js`. It runs for free on Cloudflare Workers.

**Full step-by-step guide with troubleshooting: [CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md).** The short version:

1. Make a free account at https://dash.cloudflare.com/sign-up.
2. In the dashboard, open **Storage & Databases → KV** (Workers KV). Create a namespace named `hawktalk`.
3. Open **Workers & Pages** and click **Create**. Start from the **Hello World** worker, name it `hawktalk-push`, then click **Deploy**.
4. Click **Edit code**. Delete what's there, paste in everything from `push-server/worker.js`, then click **Deploy**.
5. Go to the worker's **Settings → Bindings**. Click **Add**, then **KV namespace**. Set the variable name to `HAWK` (capital letters) and pick the `hawktalk` namespace. Save, and deploy again if it asks.
6. Copy the worker's address. It looks like `https://hawktalk-push.your-name.workers.dev`. If you open it in a browser, you should see `{"ok":true,"app":"Hawk Talk push server"}`.

### 2. Point the app at it

In `index.html`, find this line near the top of the script:

```js
const PUSH_SERVER = '';
```

Put your worker's address between the quotes and commit:

```js
const PUSH_SERVER = 'https://hawktalk-push.your-name.workers.dev';
```

GitHub Pages updates on its own after a minute or two.

### 3. Turn on notifications on each phone

Each sibling does this once on their phone:

1. **iPhone only:** open the app link in Safari, tap **Share**, then **Add to Home Screen**. From then on, open Hawk Talk from the Home Screen icon. iPhones only allow notifications for apps added this way, and need iOS 16.4 or newer.
2. Enter your name. Under **Get rung for calls**, type the family code and tap **Turn on**. Allow notifications when asked.
3. A test notification arrives within a few seconds.

Everyone uses the **same family code**, which is how the app knows who's in your family. Anyone who knows the code can see the names and ring you, so make it hard to guess, like `garcia-hawks-4821`, rather than just `garcia`.

## How to use it

### Start a call

1. Type your name in **Your name** (it's remembered for next time).
2. Tap **Start a call**. Allow camera and microphone access when your phone asks.
3. Tap **Invite** to send the call link to your siblings by text, or copy it. When they open the link, they just tap **Join the call**.

### Join a call

- **From an invite link:** open the link, enter your name, and tap **Join the call**.
- **With a code:** type the call code under **Or join with a code** and tap **Join**.

**Tip:** a code works like a meeting spot. Pick one your family always uses, like `garcia-kids`, and anyone can join with it whenever they want — no invite needed.

After you've been in a call, a **Rejoin** button on the home screen takes you back to the last code you used.

### During a call

| Button | What it does |
| --- | --- |
| **Mute** | Turns your microphone off and on |
| **Stop video** | Turns your camera off and on |
| **Flip** | Switches between front and back camera (phones only) |
| **Ring** | Sends a "you're being called" notification to the siblings you pick (only shown once call notifications are set up) |
| **Invite** | Shares the call link with someone else |
| **Leave** | Ends the call for you |

If the sound is off when you join, tap **Tap to turn on sound**.

## Troubleshooting

- **"Camera access only works from a secure web address"** — you opened the file directly from your computer. Open the `https://` link instead (see [Install](#install)).
- **"Camera and microphone are blocked"** — allow camera and microphone for this site in your browser's settings, then try again.
- **"This call already has 6 people"** — the call is full. Wait for someone to leave, or start a call with a different code.
- **"Reconnecting…"** — your internet dropped. It reconnects on its own when your connection is back.
- **No "Get rung for calls" section on the home screen** — the push server address isn't set in `index.html` yet (see [Call notifications](#call-notifications-optional)).
- **Ring says "Nobody else has turned on call notifications yet"** — your siblings need to turn them on with the exact same family code.
- **Not getting rung on iPhone** — open Hawk Talk from the Home Screen icon, not from Safari, and turn notifications on from there. Also check **Settings → Notifications → Hawk Talk**.
- **Nothing loads** — check your internet connection and reload the page. Hawk Talk uses the free [PeerJS](https://peerjs.com/) server to connect people, so it needs internet access.
