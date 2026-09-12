# SolarGrid Advisor — Frontend

React + TypeScript + Vite web app for **SolarGrid Advisor** (سولر گرڈ ایڈوائزر):
chat with your NEPRA/DISCO documents, manage uploads, analyze electricity bills,
and explore solar savings — in English or Urdu, with light/dark themes.

Backend API: see `../backend/README.md`.

## Pages

| Route | Page | What it does |
|---|---|---|
| `/` | Home | Landing/overview. |
| `/chat` | Chat Assistant | RAG chat with cited sources, confidence badge, model settings (provider, key, model, temperature) and search filters (DISCO, status, date, top-k). |
| `/documents` | Documents | Upload PDFs (preview stats → index), list/edit/delete, rebuild index. |
| `/bills` | Bill Analyzer | Upload a bill PDF → 11 extracted fields, insights, raw text, save-to-history. |
| `/dashboard` | Savings Dashboard | Bill-savings computation and charts. |
| `/solar` | Solar Toolkit | System sizing, generation, payback and plan recommendations. |

Uses `HashRouter`, so the built app can be served from any static host without rewrites.

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · React Router · Recharts ·
Lucide icons · Oxlint

## Project structure

```
frontend/
├── index.html
├── vite.config.ts       # Tailwind plugin + dev proxy: /api → 127.0.0.1:8000
├── package.json         # scripts: dev / build / lint / preview
└── src/
    ├── main.tsx         # entry: providers (theme, LLM, i18n) + router
    ├── App.tsx          # routes (see table above)
    ├── index.css        # Tailwind + CSS variables for theming
    ├── api/client.ts    # typed API client, LLM defaults (Groq), response types
    ├── pages/           # Home, Chat, Documents, Bills, Dashboard, Solar
    ├── components/      # Layout, Shared, Forms, LLMSettingsPanel
    ├── theme/           # ThemeContext (light/dark), LLMContext (settings store)
    ├── i18n/            # en.ts, ur.ts, context + `t()` helper
    └── assets/          # static images
```

## Quickstart (local)

Requirements: Node 18+. The backend must run first (default `http://127.0.0.1:8000`).

```bash
cd frontend
npm install
npm run dev      # → http://localhost:5173 (API calls proxied to :8000)
```

| Script | Command | Purpose |
|---|---|---|
| `npm run dev` | `vite` | Dev server with HMR. |
| `npm run build` | `tsc -b && vite build` | Type-check + production build into `dist/`. |
| `npm run lint` | `oxlint` | Lint. |
| `npm run preview` | `vite preview` | Serve the production build locally. |

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `VITE_API_URL` | production only | Backend origin **without** trailing `/api`, e.g. `VITE_API_URL=https://solargrid-backend.up.railway.app`. When unset, the app calls same-origin `/api` (used with the Vite dev proxy). |

Set it in a `.env.production` file or in the host's environment settings, then rebuild.

## Deployment (Railway)

1. Push this folder as the frontend (static) service.
2. Set `VITE_API_URL` to the backend service URL.
3. Build command `npm run build`, output directory `dist`.
4. After deploy, hard-refresh the app (Ctrl+Shift+R) to pick up new versions.

Also add the frontend URL to the backend's `SGA_CORS_ORIGINS` variable.

## Notes & behavior

- **LLM defaults**: Groq + `openai/gpt-oss-120b` is pre-selected with the URL and
  model filled in — paste an API key and chat. The provider dropdown itself is
  populated from the backend's `/api/health` response.
- **API keys are never persisted**: provider/URL/model/temperature are saved to
  `localStorage` (`sga_llm_config_v2`), but the key lives in memory only, so it
  must be re-pasted each fresh session. This is deliberate.
- **i18n**: English + Urdu via `src/i18n` (`en.ts`, `ur.ts`); `useI18n()` provides `t()`.
- **Theming**: CSS variables (`--bg-*`, `--text`, `--accent`, …) switch light/dark.
- API errors surface the server's `detail` message (see `api/client.ts`).
