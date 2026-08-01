# Sightline AI 👁️

**An intelligent, voice-guided vision assistant that helps blind and visually impaired users understand their surroundings in real time.**

Sightline AI uses a device camera and a multimodal AI vision model to detect obstacles, describe scenes, and read text aloud — announced through speech and shown on screen so users (and anyone watching) get real-time feedback.

Built as a semester AI project.

---

## Live Demo

## \*\*https://sightline-ai-assist.vercel.app/

## Features

- **Real-time Obstacle Detection** — Continuously scans the live camera feed and calls out nearby obstacles (object, approximate distance, position). Each object is announced once while it stays in view, not repeatedly.
- **Scene Description** — On demand, captures the current frame and generates a spoken _and_ on-screen description of the environment (indoor/outdoor, key objects, hazards, navigation suggestions).
- **Text Reading (OCR)** — Reads aloud (and displays on screen) any visible text in frame — signs, labels, documents, street names.
- **Voice Feedback (Text-to-Speech)** — All detections and descriptions are spoken using the browser's built-in speech synthesis, with adjustable volume and mute controls.
- **Priority-based Alerts** — High-priority, close-range obstacles are announced immediately without needing to wait.
- **Mobile-responsive UI** — Works cleanly on phones as well as desktop.

## How It Works

1. The browser captures frames from the device camera (`CameraView` component).
2. Each frame is sent as base64 image data to a Supabase Edge Function (`analyze-scene`).
3. The edge function forwards the image to [Groq's](https://groq.com) vision model (`meta-llama/llama-4-scout-17b-16e-instruct`) with a mode-specific prompt (`obstacle`, `scene`, or `text`).
4. The model's response is parsed and returned to the frontend.
5. Results are displayed on screen and spoken aloud via the Web Speech API.

## Tech Stack

- **Frontend:** Vite, React, TypeScript, shadcn-ui, Tailwind CSS
- **Backend:** Supabase Edge Functions (Deno)
- **AI:** Groq (Llama 4 Scout, vision-capable, free tier)
- **Voice:** Browser Web Speech API (SpeechSynthesis)

## Getting Started Locally

You'll need Node.js and npm installed ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)).

```sh
# 1. Clone the repository
git clone https://github.com/ajwazameer/sightline-ai-assist.git

# 2. Navigate into the project
cd sightline-ai-assist

# 3. Install dependencies
npm i

# 4. Start the dev server
npm run dev
```

### Environment Variables

Create a `.env` file in the project root:

```
VITE_SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your_supabase_anon_key"
VITE_SUPABASE_PROJECT_ID="YOUR_PROJECT_REF"
```

The edge function itself needs a Groq key, set as a Supabase secret (not in this `.env`):

```sh
supabase secrets set GROQ_API_KEY=your_groq_key_here
```

Get a free Groq key at [console.groq.com](https://console.groq.com) (no card required).

## Backend Setup (Supabase)

1. Create a free project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Update `project_id` in `supabase/config.toml` to match your project's reference ID.
3. Install the CLI and deploy the function:
   ```sh
   npm install -g supabase
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase functions deploy analyze-scene
   supabase secrets set GROQ_API_KEY=your_groq_key_here
   ```

## Deploying the Frontend to Vercel

1. Push this repo to GitHub (already done if you're reading this from there).
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import this repository.
3. Framework preset: **Vite** (should auto-detect).
4. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`
     (same values as your local `.env`)
5. Click **Deploy**.

Your Supabase project (and the `analyze-scene` function + `GROQ_API_KEY` secret) stays hosted on Supabase — Vercel only serves the frontend. No further backend setup needed once Supabase is already configured as above.

## Browser Support

Requires a browser with camera access and Web Speech API support (Chrome, Edge, Safari — recommended on desktop or mobile Chrome for best voice quality).

## Disclaimer

Sightline AI is an assistive aid, not a replacement for a cane, guide dog, or other mobility tools. Always exercise caution when navigating unfamiliar environments.
