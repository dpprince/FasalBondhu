# AGENTS.md — FasalBondhu AI Engineering Guidelines

## Architectural Principles

1. **Decoupled Pure Agro-Logic**: Keep deterministic agro-meteorological calculations (climate risk triggers, $ET_c$ irrigation math, crop suitability scoring) in `src/lib/agroEngine.ts` with zero DOM/React imports so they remain fast-testable via `node:test`.
2. **Server-Side AI Isolation**: All `@google/genai` calls must live in `server.ts`. Never import `@google/genai` or reference `GEMINI_API_KEY` in client components.
3. **Bilingual Clarity (Bangla & English)**: Every farmer-facing advisory should prioritize plain, actionable Bangla (using `Hind Siliguri` for legibility) alongside clear English labels for researchers and extension officers.
4. **Honest Provenance & Error Handling**: Never silently fabricate AI diagnosis results if Gemini fails. Always display the active climate data provenance (`Open-Meteo + NASA POWER` vs. `BAMIS Seasonal Baseline`).

## UI & Design Standards

- Maintain daylight-readable high contrast (WCAG AA 4.5:1+), tabular numerals (`IBM Plex Mono`, `tabular-nums`) for all weather/soil/irrigation metrics, and generous mobile touch targets (`>= 44px`).
- Never signal critical climate or pest risk by color alone; pair every severity tone with explicit text labels (`Nominal`, `Watch`, `Critical`).
- Avoid nested card clutter, decorative pulsing dots, or fake telemetry counters.

## Verification Checklist

1. Run unit tests: `npx tsx --test src/lib/agroEngine.test.ts`
2. Run TypeScript lint & production build: `npm run lint && npm run build`
3. Verify primary journeys in headless Chromium across desktop (1440x900) and mobile (390x844).
