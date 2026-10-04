# Changelog

What changed in each version of Hawk Talk. The app shows its version at the bottom of the home screen, and the push server shows its version when you open its address in a browser.

## 1.2.0 (2026-10-03)

- **Family chat.** A group chat for the family on the home screen, with saved history and a notification for each new message. Messages are scrambled on the phones with the family code, so the server only stores unreadable text. Needs the push server updated to 1.2.0 and a D1 database connected to it. See step 6 of [CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md).
- The **Family chat** button shows how many new messages are waiting.

## 1.1.0 (2026-10-03)

- **Call notifications.** Tap **Ring** during a call and your siblings' phones get a "… is calling" notification. Tapping it opens the call. Needs the free push server in `push-server/worker.js`. See [CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md).
- Hawk Talk can be added to the Home Screen as an app, with its own icon.
- The version number now shows at the bottom of the home screen.

## 1.0.0 (2026-10-03)

- First version: video calls for up to 6 people between iPhones and Androids, with no accounts or installs. Start a call, share the code or link, and join.
