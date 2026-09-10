# SayRight

A personal English pronunciation coach. Read a sentence (or answer a question) out loud and see
which words and sounds were right or wrong, hear how a native speaker says it, and track the
sounds you keep missing. Tips are written for Vietnamese speakers learning American English.

## What it does

- **Scores every word and sound** with Azure Pronunciation Assessment: accuracy, fluency,
  completeness, and rhythm/intonation (prosody), plus a 0–100 score for each phoneme and what
  it sounded like instead (e.g. /θ/ heard as /t/).
- **Shows the right way:** natural neural voice at normal and slow speed, tap any word to hear
  it alone, replay your own recording of that word next to it, IPA with stress marks, and
  mouth/tongue tips for each sound.
- **Three ways to practice:** built-in lessons (everyday topics and tricky-sound drills), your
  own sentences, and conversation mode (answer a question freely; your own words get scored).
- **Progress:** score trend, streak, and your weakest sounds with one-tap drills. Stored in the
  browser on each device (IndexedDB).

Without an Azure key the app runs in **demo mode** with simulated scores, so you can try the UI.

## Run it locally

```bash
npm install
cp .env.example .env.local   # then fill in your Azure key and region
npm run dev
```

Open http://localhost:3000. The microphone works on `localhost`; other devices on your network
need HTTPS, so use the deployed version on your phone.

## Get an Azure Speech key (free)

1. Sign up at https://portal.azure.com.
2. Create a **Speech service** resource. Pick a nearby region (e.g. `southeastasia`) and the
   **Free F0** tier: 5 audio hours of scoring and 500k characters of neural voice a month.
3. Open the resource → **Keys and Endpoint** → copy **KEY 1** and the **Location/Region**.
4. Put them in `.env.local` as `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION`, then restart.

The `/setup` page in the app shows which variables are set.

## Deploy (to use it on your phone)

1. Push this folder to a GitHub repository.
2. Import it at https://vercel.com/new (framework: Next.js, defaults are fine).
3. Add environment variables: `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`, and `APP_PASSWORD`
   (any password you choose; it protects your Azure quota).
4. Deploy, open the URL on your phone, sign in, and use **Add to Home Screen** for an app-like icon.

## How it works

| Piece | Where |
|---|---|
| Mic capture → 16 kHz PCM, streamed to Azure while you speak | `src/lib/audio/recorder.ts`, `public/pcm-worklet.js` |
| Azure scoring + neural voice (browser SDK, short-lived token) | `src/lib/speech/azure.ts`, `src/app/api/speech-token` |
| Result parsing, word alignment, score combining | `src/lib/speech/normalize.ts` |
| IPA + stress from the CMU dictionary | `src/lib/phonemes.ts`, `src/app/api/ipa` |
| Lessons, questions, sound tips | `src/data/` |
| Password gate | `src/proxy.ts`, `src/app/api/login` |
| Practice history | `src/lib/progress.ts` |

The Azure key never reaches the browser: the server exchanges it for a 10-minute token.
