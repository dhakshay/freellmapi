# FreeLLM Chat

A chat app for your own FreeLLMAPI server. One file (`www/index.html`), no build step.

Features: streaming replies, saved chats, model picker (`auto`, `auto:smart`, `auto:fast`, `auto:reliable`, `auto:balanced`, plus every model the server reports as ready), system prompt, stop button, light/dark theme. Settings and chats stay in the browser's local storage.

## Run in a browser
1. Start the server (`npm run dev` at the repo root).
2. Allow the app's origin, then restart the server: `DASHBOARD_ORIGINS=http://localhost:8080 npm run dev -w server`
3. `cd apps/llm-chat && npm run serve`, open http://localhost:8080.
4. In Settings enter the server URL (`http://localhost:3001`) and your unified API key from the dashboard's Keys page.

## Android
1. `npm install && npx cap add android && npx cap sync android && npx cap open android`
2. Allow the app's origin on the server: `DASHBOARD_ORIGINS=https://localhost`
3. On a phone the server URL must be reachable from the phone: use your computer's LAN address (for example `http://192.168.1.20:3001`, start with `npm run dev:lan`) or a public HTTPS URL. `localhost` on the phone means the phone itself.
4. Change `appId` in `capacitor.config.json` before publishing. For the Play Store steps see `games/serpent-rush/README.md`.

Note: the unified key grants full access to your router. Keep the app's server URL on a network you trust, or use a revocable key.
