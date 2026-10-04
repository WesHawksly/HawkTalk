# Setting up call notifications and family chat on Cloudflare

This guide sets up the small server that sends the "Wes is calling" notifications when you tap **Ring** in Hawk Talk, and stores the family chat. You only do it once. It takes about 15 minutes and is free.

You don't need to install anything. Everything happens in your web browser, on the Cloudflare website and on GitHub.

**What you'll end up with:** a web address like `https://hawktalk-push.your-name.workers.dev`. You paste it into the app, and Ring starts working.

> Cloudflare changes its website from time to time, so a button or menu might be named slightly differently from what's written here. The steps stay the same.

> **Already set up call notifications before family chat existed?** You only need two things: paste in the new code (Step 4), then add the chat database (Step 6). Step 7 shows how to check it worked.

---

## Before you start

You need:

- A computer. The Cloudflare dashboard is much easier to use on a computer than on a phone.
- An email address for the Cloudflare account.
- Access to this GitHub repository, to change one line in `index.html` at the end.

---

## Step 1: Make a Cloudflare account

1. Go to **https://dash.cloudflare.com/sign-up**.
2. Sign up with your email and a password, then confirm your email when Cloudflare sends the link.
3. If Cloudflare asks what you want to do or offers to add a website (a "domain"), skip it. You don't need a website or domain for this.

The free plan is all you need. You won't be asked for a credit card.

---

## Step 2: Create the storage (KV namespace)

The server needs a small place to remember which phones belong to your family. Cloudflare calls this a **KV namespace**.

1. In the Cloudflare dashboard, find **Storage & Databases** in the left menu, then click **KV**. (In some versions of the dashboard it's under **Workers & Pages → KV**.)
2. Click **Create** (or **Create a namespace**).
3. Name it `hawktalk` and click **Add** / **Create**.

That's all for now. You'll connect it to the server in Step 5.

---

## Step 3: Create the worker

A "worker" is Cloudflare's name for a small program that runs on its servers.

1. In the left menu, click **Workers & Pages** (it may be under **Compute**).
2. Click **Create** (or **Create application**).
3. Choose to start from the **Hello World** worker, sometimes called **Start with Hello World!**.
4. Change the name to `hawktalk-push`. The name becomes part of the web address.
5. Click **Deploy**.

Cloudflare shows a success page with your worker's address, something like `https://hawktalk-push.your-name.workers.dev`. You'll need it later, and you can always find it again on the worker's page.

---

## Step 4: Paste in the Hawk Talk code

1. On the worker's page, click **Edit code**. An editor opens with a small "Hello World" program in a file called `worker.js` (or `index.js`).
2. Open this repository on GitHub in another tab and go to **`push-server/worker.js`**. Click the **Copy raw file** button (two overlapping squares, top right of the file).
3. Back in the Cloudflare editor, select everything (**Ctrl+A** on Windows, **⌘+A** on Mac), delete it, and paste the Hawk Talk code.
4. Click **Deploy** (top right), and confirm if it asks.

---

## Step 5: Connect the storage to the worker

This tells the worker to use the `hawktalk` storage you made in Step 2.

1. Go back to the worker's page. You can click **hawktalk-push** at the top of the editor, or find it again under **Workers & Pages**.
2. Open the **Settings** tab, then find **Bindings**.
3. Click **Add**, choose **KV namespace**, and fill it in:
   - **Variable name:** `HAWK`, in capital letters, spelled exactly like that.
   - **KV namespace:** pick `hawktalk`.
4. Click **Save** (or **Deploy**, if that's what the button says).

> ⚠️ The variable name must be exactly `HAWK`. If it's anything else, the server will say *"The HAWK KV namespace is not bound to this worker."*

---

## Step 6: Add the chat database

The family chat keeps its messages in a small database. Cloudflare calls it **D1**. Messages are scrambled on the phones before they're sent, so the database only ever holds unreadable text.

**Create the database:**

1. In the left menu, find **Storage & Databases**, then click **D1 SQL Database**.
2. Click **Create** (or **Create database**).
3. Name it `hawktalk-chat` and click **Create**.

You don't need to type anything into the database. The server sets it up the first time someone opens the chat.

**Connect it to the worker:**

1. Go back to the **hawktalk-push** worker's page (under **Workers & Pages**).
2. Open the **Settings** tab, then find **Bindings**, and click **Add**.
3. Cloudflare shows a list of binding types. Pick **D1 database**, then click the blue **Add Binding** button at the bottom.
4. Fill it in:
   - **Variable name:** `DB`, in capital letters, spelled exactly like that.
   - **D1 database:** pick `hawktalk-chat`.
5. Click **Add Binding** (or **Save** / **Deploy**).

> ⚠️ The variable name must be exactly `DB`. If it's anything else, the chat will say *"Family chat needs a D1 database bound to this worker as DB."*

---

## Step 7: Check that it works

1. Open your worker's address in a browser, e.g. `https://hawktalk-push.your-name.workers.dev`.
   You should see:

   ```
   {"ok":true,"app":"Hawk Talk push server","version":"1.2.0","chat":true}
   ```

   If it says `"chat":false`, the chat database isn't connected yet. Check Step 6.

2. Now add `/key` to the end of the address, e.g. `https://hawktalk-push.your-name.workers.dev/key`.
   You should see a long jumble of letters, like:

   ```
   {"key":"BOx7...long string...Q4"}
   ```

   That's your server's public key, which it made for itself the first time you opened this page. If you see an error instead, check Step 5.

Copy your worker's address, the part **without** `/key` at the end, for the next step.

---

## Step 8: Point the app at your server

1. On GitHub, open **`index.html`** in this repository.
2. Click the **pencil icon** (Edit this file).
3. Find this line near the top of the script. You can search the page for `PUSH_SERVER`:

   ```js
   const PUSH_SERVER = '';
   ```

4. Put your worker's address between the quotes:

   ```js
   const PUSH_SERVER = 'https://hawktalk-push.your-name.workers.dev';
   ```

5. Click **Commit changes…**, make sure **Commit directly to the main branch** is selected, and click **Commit changes**.

GitHub Pages updates the live app in a minute or two. Reload Hawk Talk and you'll see a **Family chat** button and a **Get rung for calls** section on the home screen.

---

## Step 9: Turn on notifications on each phone

Each sibling does this once, on the phone they want to be rung on.

**iPhone (iOS 16.4 or newer):**

1. Open the app link in **Safari**.
2. Tap the **Share** button, then **Add to Home Screen**, then **Add**.
3. Close Safari and open **Hawk Talk from the new Home Screen icon**. This matters: iPhones only allow notifications for apps opened this way.
4. Enter your name. Under **Get rung for calls**, type the family code and tap **Turn on**. Tap **Allow** when asked.

**Android:**

1. Open the app link in **Chrome**.
2. Optional but handy: tap **⋮** and then **Add to Home screen** / **Install app**.
3. Enter your name. Under **Get rung for calls**, type the family code and tap **Turn on**. Tap **Allow** when asked.

**Computer (Chrome, Edge, Firefox or Safari):** same as Android. Notifications only arrive while the browser is running.

A test notification should arrive within a few seconds. If it does, that phone is set up.

### About the family code

- Everyone types the **exact same** family code. It's how the server knows who's in your family.
- Anyone who knows the code can see your family's names, ring you and read the family chat, so make it hard to guess: `garcia-hawks-4821`, not `garcia`. A longer code, like a few words and a number, keeps the chat safer still.
- It needs at least 6 letters or numbers. Capital letters and spaces don't matter, so `Garcia Hawks 4821` and `garcia-hawks-4821` are the same code.

---

## Using it

1. Start a call (or join one).
2. Tap **Ring** at the top, or **Ring the family** if you're the first one there.
3. Untick anyone you don't want to ring, then tap **Ring**.
4. Their phones show **"Your name is calling — Tap to join the video call."** Tapping it opens Hawk Talk on your call, and they tap **Join the call**.

If someone's phone is off or offline, the ring is dropped after about 90 seconds, so they don't get an old call alert hours later.

**Family chat:**

1. On the home screen, tap **Family chat**. The first time, type your family code and tap **Open**. (If you've turned on call notifications, it already knows the code.)
2. Type a message and tap **Send**.
3. Everyone else who turned on notifications gets one showing who wrote and what they said. The home screen's **Family chat** button shows how many new messages are waiting.

Messages are kept until you delete them (see *Good to know* below).

---

## Troubleshooting

| What you see | What to do |
| --- | --- |
| No **Get rung for calls** section in the app | `PUSH_SERVER` in `index.html` is still empty, or GitHub Pages hasn't updated yet. Wait two minutes and reload. |
| *"The HAWK KV namespace is not bound to this worker."* | Redo Step 5. The variable name must be exactly `HAWK`. |
| *"Family chat needs a D1 database bound to this worker as DB."* | Do Step 6. The variable name must be exactly `DB`. |
| Chat says *"Not found"* | The worker is running old code. Repeat Step 4 to paste in the latest `push-server/worker.js`. |
| A message says *"This message could not be unscrambled."* | It was written with a different family code, for example one with a typo. Everyone needs the exact same code. |
| *"The notification server could not be reached."* | Check the address in `PUSH_SERVER`: it must start with `https://` and have no `/key` or extra slash at the end. Open it in a browser to check it shows `{"ok":true,...}`. |
| iPhone shows *"On iPhone, first add Hawk Talk to your Home Screen…"* | Do the iPhone steps above, and open the app from the Home Screen icon, not from Safari. |
| *"Notifications are blocked for Hawk Talk."* | iPhone: **Settings → Notifications → Hawk Talk → Allow Notifications**. Android: long-press the app or open Chrome's **Site settings → Notifications** and allow it. |
| Ring says *"Nobody else has turned on call notifications yet."* | Your siblings need to turn notifications on with the **same** family code. It can take up to a minute for a new phone to show up in the list. |
| Someone stopped getting rung | Have them open Hawk Talk once. The app re-registers itself every time it opens. If that doesn't help, tap **Turn off** and then **Turn on** again. |

---

## Good to know

- **Cost:** the Cloudflare free plan easily covers a family. Its daily limits are about 100,000 requests, 1,000 KV storage writes and 1,000 KV list lookups. Hawk Talk only writes to KV when a phone turns notifications on or changes its name. Each chat message and each ring uses one list lookup, so a family can send roughly 1,000 chat messages a day before notifications pause until the next day (the messages themselves are still saved). The chat database allows 100,000 new messages a day.
- **What's stored:** each phone's name and the push address its phone company gave it, and the chat messages. Messages are scrambled on the phones with a key made from the family code, so the server can't read them; it does see when each message was sent, how long it is, and which phone sent it. The family code isn't stored; only a scrambled (hashed) version is used to group your phones together.
- **Deleting chat history:** open the `hawktalk-chat` database in Cloudflare, go to its **Console** tab, and run `DELETE FROM messages;`. That deletes every family's messages on this server.
- **Updating the server later:** if `push-server/worker.js` changes in this repository, repeat Step 4 (paste in the new code and click **Deploy**). Nothing else needs redoing. To check which version your server is running, open its address in a browser and look at `"version"`; [CHANGELOG.md](CHANGELOG.md) says what changed.
- **Starting over:** to wipe everything, open the `hawktalk` KV namespace in Cloudflare and delete its entries, including the one called `vapid` (the server's key). The server makes a new key automatically. Every phone then needs to tap **Turn off** and then **Turn on** again.
- **Optional contact setting:** Apple and Google like to know who runs a push server. By default it reports this GitHub repository. To use your own email instead, go to the worker's **Settings → Variables and Secrets** and add a text variable named `VAPID_SUBJECT` with the value `mailto:you@example.com`.
