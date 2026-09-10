# English Speaking Coach: Build Plan

Here's the plan, based on your answers. Nothing is built yet.

## What it does
1. **Pick a sentence** from a built-in lesson, or type your own.
2. **Listen first:** a natural American voice reads it, at normal or slow speed. You also see the IPA and stress marks.
3. **Record yourself** reading it.
4. **Get scored:** Azure grades accuracy, fluency, completeness and rhythm, down to each word and each sound.
5. **See what went wrong:** every word is colored green, yellow or red. Tap a word to hear your version next to the native one. Each sound you missed comes with a mouth/tongue tip.
6. **Conversation mode:** the app asks a question out loud, you answer freely, and it scores how you pronounced your own answer.
7. **Track progress:** see your score trend and your weakest sounds, then do a drill that targets them.

## Tech stack
| Part | Choice | Why |
|---|---|---|
| App | Next.js with TypeScript and Tailwind | One project holds the pages and the server code, and it deploys easily to Vercel |
| Scoring | Azure Speech Pronunciation Assessment (en-US) | Scores each sound and word, and can score free speech in conversation mode |
| Voice | Azure neural voice, from the same key | Natural sound, and it can slow down |
| IPA and stress | CMU Pronouncing Dictionary converted to IPA | Shows how a sentence should sound before you speak |
| Database | Postgres, free tier on Neon | Stores your attempts and weak sounds |
| Login | Password gate | Stops strangers from using up your Azure quota |
| Hosting | Vercel, free tier | Lets you practice from your phone |

**Keeping the key safe:** your Azure key stays on the server. The browser only gets a token that expires after 10 minutes.

## Vietnamese-speaker focus
Tips and drills will target the most common problems:
- Dropped final sounds: /t/, /d/, /s/, /z/, /k/, and endings like **-ed** and **-s**
- **th** sounds: /θ/ in *think*, /ð/ in *this*
- Word stress and sentence rhythm
- Consonant clusters: *str-*, *-sts*, *-lk*
- Short vs long vowels: *ship* vs *sheep*
- /ʃ/ vs /s/: *she* vs *see*

## Build phases
1. **Foundation:** set up the project, the password login, and the Azure token route. A **demo mode** uses fake scores so you can try it before you have a key.
2. **Core practice screen:** listen, record, score, and color-coded results.
3. **Model voice features:** IPA and stress marks, tap-a-word replay (yours vs native), and per-sound tips.
4. **Content:** built-in lessons (daily life, work, travel, tricky sounds), the custom sentence box, and conversation mode with a question bank.
5. **Progress:** save attempts, a dashboard with score trend and weakest sounds, and a "practice my weak sounds" drill.
6. **Go live:** a step-by-step guide to create your free Azure Speech resource (about 5 minutes), connect the database, and deploy to Vercel.

## Cost
All free tiers:
- **Azure:** about 5 hours of scoring and 500K characters of voice per month
- **Vercel and Neon:** free for one person's use

## Still open
- **Your recordings:** the plan keeps them only in the browser for replay and saves just the scores to the database. Saving the audio too is possible but uses more storage.
- **Mobile layout first?** Since you'll practice on your phone, the screens can be designed for phone first.

Reply with any changes, like dropping a phase, adding a feature, or changing the order, and the build will follow your updated plan.