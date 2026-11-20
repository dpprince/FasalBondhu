# FasalBondhu AI (ফসলবন্ধু এআই)

FasalBondhu AI is a digital farming companion built for farmers across Bangladesh. It brings together real-time agro-meteorological telemetry, location-specific crop suitability models, water-saving irrigation planning, and Gemini-powered Bangla agricultural guidance to reduce avoidable crop losses and strengthen climate resilience.

## Core Capabilities

1. **Field Pulse & Climate-Risk Alerts**: Live 7-day weather forecasts and agro-meteorological telemetry (temperature, rainfall, relative humidity, FAO reference evapotranspiration $ET_0$, and NASA POWER solar radiation) across 12 major Bangladesh districts and Agro-Ecological Zones (AEZ), paired with deterministic flood, heat stress, drought, fungal blight, and wind risk warnings.
2. **Crop Clinic (AI Disease & Pest Identification)**: Upload field photographs (or test curated Bangladesh crop specimens) for multimodal disease and pest identification via Google Gemini, returning structured symptoms, severity, low-cost Integrated Pest Management (IPM) steps, and safe DAE-aligned guidance in simple Bangla and English.
3. **Climate-Smart Crop Planner**: Ranks BRRI, BARI, and BINA varieties by Bangladesh cropping season (Rabi, Kharif-1, Kharif-2), soil texture, pH, salinity, and water access, with optional on-demand Gemini localized planting briefs.
4. **Irrigation & AWD Advisor**: Calculates crop evapotranspiration ($ET_c$), effective rainfall, net water deficit in millimeters and liters per Bangladeshi decimal/bigha, and Alternate Wetting and Drying (AWD) guidance for Boro rice.
5. **Simple Bangla Field Advisor**: Context-aware conversational companion grounded in the farmer's active district, weather forecast, and field alerts.

## Architecture & Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS v4
- **Backend**: Express (`server.ts`) hosting server-side `@google/genai` endpoints and live climate aggregation
- **AI Engine**: Google Gemini API (`@google/genai`, `gemini-4-hydrogen`) invoked exclusively server-side
- **Climate Data**: NASA POWER Daily Point API, Open-Meteo Agro-Weather API, and BAMIS/AEZ seasonal baselines
- **Testing**: Deterministic domain unit tests via `node:test` (`npx tsx --test src/lib/agroEngine.test.ts`)

## Local Development

```bash
npm install
npm run dev
```

Set `GEMINI_API_KEY` in the runtime environment (see `.env.example`). Never commit secrets.

## Project Documentation

- [AGENTS.md](./AGENTS.md) — Engineering standards, architecture rules, and coding guidelines
- [docs/data-sources.md](./docs/data-sources.md) — Agricultural datasets, AEZ profiles, and climate APIs
- [docs/model-card.md](./docs/model-card.md) — AI model scope, inputs/outputs, limitations, and evaluation
- [docs/responsible-ai.md](./docs/responsible-ai.md) — Farmer safety, privacy, chemical disclaimer, and fairness guidelines
