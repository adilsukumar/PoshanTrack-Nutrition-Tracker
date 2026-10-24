# Private photo-analysis backend

The Android diary and food search work offline. Photo analysis needs your own HTTPS Node server and provider credentials. The provider projects must remain on their Free plans without billing; this code cannot inspect their billing status. No OpenAI account is required.

## Local setup

1. Install Node 22.13+ and pnpm.
2. In `server`, run `pnpm install --frozen-lockfile`.
3. Copy `.env.example` to `.env`. Set `GEMINI_API_KEY`, optional `GROQ_API_KEY`, a random 32- or 64-character hexadecimal `PRIVATE_CLIENT_KEY`, and `MAX_DAILY_ANALYSES=30`.
4. Run `node --test *.test.mjs`, then `node index.mjs`.

Never commit `.env` or paste provider keys into chat. Production secrets belong in the hosting platform's environment settings.

## Render

Use `render.yaml`, or create a Node Web Service with root `server`, the lockfile-based pnpm build command and start command `node index.mjs`. Choose the Free plan if available; do not select a paid plan or attach billing without considering the charges. Set environment variables privately. Free instances may sleep and provider quotas may change.

Enter the resulting HTTPS origin and private client code in the app's Profile. Do not enter a provider key in the app. Save/check connection confirms server authentication and key configuration; only a real food-photo request checks actual provider availability.

## Reliability and diagnostics

Gemini receives up to 25 seconds. Configured Groq receives up to 20 seconds after recoverable Gemini failures, including quota exhaustion, timeout, malformed output or invalid nutrient estimates. Both outputs pass the same strict validator. No-analysis/safety responses and cancelled requests do not trigger automatic fallback. There is no indefinite retry loop. The enclosing request budget is 52 seconds, below the app's 65-second analysis timeout; waking the host occurs separately.

`/health` includes a non-sensitive build marker. The `meal_analysis_failed` log reports fixed diagnostic labels such as `stage`, `code`, numeric status and elapsed time. `meal_analysis_fallback` records provider routing without the food/photo. Do not log raw provider messages, keys, photos or user descriptions. Tests use mocked providers; they do not establish photo-calorie accuracy or production uptime.

## Privacy and limitations

The server authenticates before multipart parsing; accepts JPEG/PNG/WebP up to 6 MB; bounds concurrency and request rates; and does not intentionally retain uploads. Google and, during fallback, Groq process the selected photo and context under their current data policies. Tell users both providers may receive a photo when fallback is needed. A shared client code is for trusted personal use, not a substitute for individual user authentication.

Daily limits are in memory and reset on restart, so they are not a financial control. Keep the diary local and avoid publicly distributing the private client code. Food estimates need confirmation: oil, recipe and portion depth cannot be measured reliably from a photograph.
