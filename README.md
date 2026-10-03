# HawkTalk
app to talk to siblings

Hawk Talk is a simple video calling app that works between iPhones, Androids, and computers. There's nothing to download from an app store and no accounts — it runs in the web browser. Calls work best with up to 6 people.

**Open the app:** https://weshawksly.github.io/HawkTalk/

Or scan this with your phone's camera:

<img src="qr-code.png" alt="QR code linking to Hawk Talk" width="200">

## Install

Hawk Talk is a single file (`index.html`). The camera and microphone only work when the page is opened from a secure `https://` address, so it needs to be hosted online. GitHub Pages is free and the easiest option:

1. Open this repository on GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**, pick the `main` branch and the `/ (root)` folder, then click **Save**.
4. After a minute or two, the app is live at https://weshawksly.github.io/HawkTalk/.
5. Send that link to your siblings.

(Netlify or any other host that serves `https` works too — just upload `index.html`.)

### Put it on your home screen

So it opens like a regular app:

- **iPhone (Safari):** open the link, tap the **Share** button, then **Add to Home Screen**.
- **Android (Chrome):** open the link, tap the **⋮** menu, then **Add to Home screen** (or **Install app**).

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
| **Invite** | Shares the call link with someone else |
| **Leave** | Ends the call for you |

If the sound is off when you join, tap **Tap to turn on sound**.

## Troubleshooting

- **"Camera access only works from a secure web address"** — you opened the file directly from your computer. Open the `https://` link instead (see [Install](#install)).
- **"Camera and microphone are blocked"** — allow camera and microphone for this site in your browser's settings, then try again.
- **"This call already has 6 people"** — the call is full. Wait for someone to leave, or start a call with a different code.
- **"Reconnecting…"** — your internet dropped. It reconnects on its own when your connection is back.
- **Nothing loads** — check your internet connection and reload the page. Hawk Talk uses the free [PeerJS](https://peerjs.com/) server to connect people, so it needs internet access.
