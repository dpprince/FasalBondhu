import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';
import { BANGLADESH_DISTRICTS } from './src/lib/bangladeshData.ts';
import { buildFallbackClimate } from './src/lib/agroEngine.ts';
import type { ClimatePayload, DailyForecast, DistrictProfile } from './src/lib/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT ?? 3000);
const PRIMARY_MODEL_ID = 'gemini-4-hydrogen';
const FALLBACK_MODEL_ID = 'gemini-3.1-flash-lite';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function isTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('overloaded') || msg.includes('high demand');
}

async function generateWithResilience(
  ai: GoogleGenAI,
  params: Omit<Parameters<GoogleGenAI['models']['generateContent']>[0], 'model'>
) {
  const attempts: Array<{ model: string; delayMs: number }> = [
    { model: PRIMARY_MODEL_ID, delayMs: 0 },
    { model: PRIMARY_MODEL_ID, delayMs: 900 },
    { model: FALLBACK_MODEL_ID, delayMs: 400 },
  ];

  let lastErr: unknown;
  for (const attempt of attempts) {
    if (attempt.delayMs > 0) {
      await new Promise((r) => setTimeout(r, attempt.delayMs));
    }
    try {
      return await ai.models.generateContent({
        model: attempt.model,
        ...params,
      });
    } catch (err) {
      lastErr = err;
      if (!isTransientError(err)) {
        throw err;
      }
    }
  }
  throw lastErr;
}

function formatGeminiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('GEMINI_API_KEY is not configured')) {
    return {
      status: 503,
      message: 'AI service key is not configured. Please check GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (raw.includes('PERMISSION_DENIED') || raw.includes('API_KEY_INVALID') || raw.includes('403')) {
    return {
      status: 403,
      message: 'Gemini API key was rejected. Please verify your API key in Settings > Secrets.',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message: 'Gemini API quota or rate limit reached. Please wait a moment and try again.',
    };
  }
  if (isTransientError(err)) {
    return {
      status: 503,
      message: 'The AI service is temporarily busy. Please try again in a few seconds.',
    };
  }
  return {
    status: 502,
    message: 'Unable to complete the AI request right now. Please try again shortly.',
  };
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 4500): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchNasaPowerMetrics(district: DistrictProfile): Promise<{
  solarMjM2: number;
  humidityPct: number;
  live: boolean;
}> {
  try {
    const end = new Date();
    end.setDate(end.getDate() - 3);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
    const url =
      `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=ALLSKY_SFC_SW_DWN,RH2M` +
      `&community=AG&longitude=${district.lon}&latitude=${district.lat}` +
      `&start=${fmt(start)}&end=${fmt(end)}&format=JSON`;

    const data = (await fetchJsonWithTimeout(url, 4200)) as {
      properties?: {
        parameter?: {
          ALLSKY_SFC_SW_DWN?: Record<string, number>;
          RH2M?: Record<string, number>;
        };
      };
    };

    const solarMap = data?.properties?.parameter?.ALLSKY_SFC_SW_DWN ?? {};
    const rhMap = data?.properties?.parameter?.RH2M ?? {};

    const validSolar = Object.values(solarMap).filter((v) => typeof v === 'number' && v > 0 && v < 40);
    const validRh = Object.values(rhMap).filter((v) => typeof v === 'number' && v > 0 && v <= 100);

    if (validSolar.length > 0 && validRh.length > 0) {
      const avgSolar = validSolar.reduce((a, b) => a + b, 0) / validSolar.length;
      const avgRh = validRh.reduce((a, b) => a + b, 0) / validRh.length;
      return {
        solarMjM2: Number(avgSolar.toFixed(1)),
        humidityPct: Math.round(avgRh),
        live: true,
      };
    }
  } catch {
    // Fall back silently to district NASA/BAMIS climatology
  }
  return {
    solarMjM2: district.seasonalBaseline.solarMjM2,
    humidityPct: district.seasonalBaseline.humidity,
    live: false,
  };
}

interface OpenMeteoResponse {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
  };
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_sum?: number[];
    relative_humidity_2m_mean?: number[];
    et0_fao_evapotranspiration?: number[];
    wind_speed_10m_max?: number[];
  };
}

async function fetchDistrictClimate(district: DistrictProfile): Promise<ClimatePayload> {
  const fallback = buildFallbackClimate(district);
  const nasaPromise = fetchNasaPowerMetrics(district);

  let weatherData: OpenMeteoResponse | null = null;

  try {
    const omUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${district.lat}&longitude=${district.lon}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean,et0_fao_evapotranspiration,wind_speed_10m_max` +
      `&timezone=Asia%2FDhaka&forecast_days=7`;
    weatherData = (await fetchJsonWithTimeout(omUrl, 4200)) as OpenMeteoResponse;
  } catch {
    weatherData = null;
  }

  const nasa = await nasaPromise;

  if (weatherData?.daily?.time && weatherData.daily.time.length >= 7) {
    const dailyData = weatherData.daily;
    const daily: DailyForecast[] = dailyData.time!.slice(0, 7).map((date: string, i: number) => ({
      date,
      tempMax: Number((dailyData.temperature_2m_max?.[i] ?? fallback.daily[i].tempMax).toFixed(1)),
      tempMin: Number((dailyData.temperature_2m_min?.[i] ?? fallback.daily[i].tempMin).toFixed(1)),
      rainMm: Number((dailyData.precipitation_sum?.[i] ?? 0).toFixed(1)),
      humidityPct: Math.round(dailyData.relative_humidity_2m_mean?.[i] ?? nasa.humidityPct),
      et0Mm: Number((dailyData.et0_fao_evapotranspiration?.[i] ?? fallback.daily[i].et0Mm).toFixed(2)),
      windMaxKmh: Math.round(dailyData.wind_speed_10m_max?.[i] ?? fallback.daily[i].windMaxKmh),
    }));

    const totalRain = daily.reduce((s, d) => s + d.rainMm, 0);
    const avgEt0 = daily.reduce((s, d) => s + d.et0Mm, 0) / daily.length;
    const soilMoistureIndex = Math.min(95, Math.max(22, Math.round(48 + totalRain * 0.45 - avgEt0 * 3.8)));

    const sourceLabel = nasa.live
      ? 'Open-Meteo Live + NASA POWER AG'
      : 'Open-Meteo Live + BAMIS Climatology';

    return {
      districtId: district.id,
      fetchedAt: new Date().toISOString(),
      sourceLabel,
      isLiveWeather: true,
      isLiveNasaPower: nasa.live,
      nasaSolarMjM2: nasa.solarMjM2,
      nasaHumidityPct: nasa.humidityPct,
      currentTempC: Number((weatherData.current?.temperature_2m ?? daily[0].tempMax).toFixed(1)),
      currentHumidityPct: Math.round(weatherData.current?.relative_humidity_2m ?? daily[0].humidityPct),
      currentWindKmh: Math.round(weatherData.current?.wind_speed_10m ?? daily[0].windMaxKmh),
      soilMoistureIndex,
      daily,
    };
  }

  return {
    ...fallback,
    isLiveNasaPower: nasa.live,
    nasaSolarMjM2: nasa.solarMjM2,
    nasaHumidityPct: nasa.humidityPct,
    sourceLabel: nasa.live ? 'NASA POWER AG + BAMIS Seasonal Baseline' : 'BAMIS / AEZ Seasonal Baseline',
  };
}

async function createApp() {
  const app = express();
  app.use(express.json({ limit: '12mb' }));

  // Simple in-memory cache (10 min TTL) for district climate fetches
  const climateCache = new Map<string, { expires: number; data: ClimatePayload }>();

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'FasalBondhu AI' });
  });

  app.get('/api/climate', async (req, res) => {
    const districtId = String(req.query.districtId ?? 'rajshahi').toLowerCase();
    const district = BANGLADESH_DISTRICTS.find((d) => d.id === districtId) ?? BANGLADESH_DISTRICTS[0];

    const cached = climateCache.get(district.id);
    if (cached && cached.expires > Date.now()) {
      res.json(cached.data);
      return;
    }

    const payload = await fetchDistrictClimate(district);
    climateCache.set(district.id, {
      expires: Date.now() + 10 * 60 * 1000,
      data: payload,
    });
    res.json(payload);
  });

  app.post('/api/ai/diagnose', async (req, res) => {
    try {
      const { imageBase64, mimeType, cropName, districtName, weatherSummary, farmerNotes } = req.body ?? {};
      if (!imageBase64 || typeof imageBase64 !== 'string') {
        res.status(400).json({ error: 'Please provide a crop photograph to analyze.' });
        return;
      }

      const ai = getGeminiClient();
      const safeMime = typeof mimeType === 'string' && mimeType.startsWith('image/') ? mimeType : 'image/jpeg';

      const prompt = [
        `Examine this crop photograph from a farm in ${districtName || 'Bangladesh'}.`,
        `Reported crop: ${cropName || 'Unknown crop'}.`,
        weatherSummary ? `Local 7-day climate context: ${weatherSummary}.` : '',
        farmerNotes ? `Farmer observation: ${farmerNotes}.` : '',
        `Identify the most likely plant disease, insect pest, or nutrient issue visible in the image.`,
        `Prioritize practical, low-cost Integrated Pest Management (IPM), cultural practices, and organic methods first.`,
        `If mentioning a chemical treatment, refer to active ingredient class aligned with Bangladesh DAE/BRRI/BARI practices and remind the farmer to confirm dosage with the local Upazila Agriculture Officer or Krishi Call Center (16123) and observe pre-harvest safety intervals.`,
        `Provide clear, plain, everyday Bangla in all *Bn fields (natural for rural Bangladeshi farmers) and accurate English in all *En fields.`,
      ]
        .filter(Boolean)
        .join('\n');

      const response = await generateWithResilience(ai, {
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: safeMime,
                data: imageBase64,
              },
            },
            { text: prompt },
          ],
        },
        config: {
          systemInstruction:
            'You are FasalBondhu AI, an agricultural plant pathology and IPM assistant supporting smallholder farmers in Bangladesh. Be honest about visual uncertainty, prioritize farmer safety, and write clear everyday Bangla.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              conditionEn: { type: Type.STRING, description: 'Primary disease, pest, or condition name in English' },
              conditionBn: { type: Type.STRING, description: 'Primary disease, pest, or condition name in simple Bangla' },
              category: {
                type: Type.STRING,
                enum: ['Fungal Disease', 'Bacterial Disease', 'Viral Disease', 'Insect Pest', 'Nutrient Deficiency', 'Healthy'],
              },
              severity: {
                type: Type.STRING,
                enum: ['Nominal', 'Watch', 'Critical'],
              },
              confidencePct: { type: Type.INTEGER, description: 'Confidence percentage from 40 to 98' },
              observedSymptomsEn: { type: Type.STRING, description: 'Specific visual symptoms observed in the photo' },
              observedSymptomsBn: { type: Type.STRING, description: 'Visual symptoms observed in simple Bangla' },
              summaryBn: { type: Type.STRING, description: '2-3 sentence plain Bangla summary for the farmer' },
              summaryEn: { type: Type.STRING, description: '2-3 sentence English summary' },
              immediateOrganicStepsBn: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 practical low-cost cultural/organic/IPM actions in Bangla',
              },
              immediateOrganicStepsEn: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 practical low-cost cultural/organic/IPM actions in English',
              },
              safeTreatmentGuidanceBn: {
                type: Type.STRING,
                description: 'Safe targeted treatment & PPE/pre-harvest guidance in Bangla aligned with DAE/16123',
              },
              safeTreatmentGuidanceEn: {
                type: Type.STRING,
                description: 'Safe targeted treatment & PPE/pre-harvest guidance in English aligned with DAE/16123',
              },
              preventionTipsBn: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '2-3 climate-smart prevention tips in Bangla',
              },
              preventionTipsEn: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '2-3 climate-smart prevention tips in English',
              },
              consultExtensionOfficer: { type: Type.BOOLEAN },
            },
            required: [
              'conditionEn',
              'conditionBn',
              'category',
              'severity',
              'confidencePct',
              'observedSymptomsEn',
              'observedSymptomsBn',
              'summaryBn',
              'summaryEn',
              'immediateOrganicStepsBn',
              'immediateOrganicStepsEn',
              'safeTreatmentGuidanceBn',
              'safeTreatmentGuidanceEn',
              'preventionTipsBn',
              'preventionTipsEn',
              'consultExtensionOfficer',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/ai/crop-advice', async (req, res) => {
    try {
      const { districtName, aezName, season, soilTexture, soilPh, salinity, waterAccess, topVarieties, weatherSummary } =
        req.body ?? {};
      if (!districtName || !season) {
        res.status(400).json({ error: 'District and season are required for crop guidance.' });
        return;
      }

      const ai = getGeminiClient();
      const prompt = [
        `Prepare a concise, practical climate-smart planting brief for a farmer in ${districtName} (${aezName || 'Bangladesh'}).`,
        `Season: ${season}. Soil: ${soilTexture}, pH ${soilPh}, Salinity: ${salinity}, Water Access: ${waterAccess}.`,
        weatherSummary ? `Current 7-day weather summary: ${weatherSummary}.` : '',
        Array.isArray(topVarieties) && topVarieties.length
          ? `Top suitable Bangladesh varieties identified: ${topVarieties.join(', ')}.`
          : '',
        `Write clear everyday Bangla for rural farmers in *Bn fields and concise English in *En fields.`,
      ]
        .filter(Boolean)
        .join('\n');

      const response = await generateWithResilience(ai, {
        contents: prompt,
        config: {
          systemInstruction:
            'You are FasalBondhu AI, an agronomy advisor aligned with Bangladesh BRRI, BARI, BINA, and DAE guidance. Keep advice practical, concise, and climate-resilient.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headlineBn: { type: Type.STRING },
              headlineEn: { type: Type.STRING },
              plantingWindowBn: { type: Type.STRING },
              plantingWindowEn: { type: Type.STRING },
              soilPreparationBn: { type: Type.ARRAY, items: { type: Type.STRING } },
              soilPreparationEn: { type: Type.ARRAY, items: { type: Type.STRING } },
              climateCautionBn: { type: Type.STRING },
              climateCautionEn: { type: Type.STRING },
            },
            required: [
              'headlineBn',
              'headlineEn',
              'plantingWindowBn',
              'plantingWindowEn',
              'soilPreparationBn',
              'soilPreparationEn',
              'climateCautionBn',
              'climateCautionEn',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/ai/advisor', async (req, res) => {
    try {
      const { message, history, districtName, aezName, season, weatherSummary, activeAlerts, language } = req.body ?? {};
      if (!message || typeof message !== 'string' || !message.trim()) {
        res.status(400).json({ error: 'Please enter a farming question.' });
        return;
      }

      const ai = getGeminiClient();
      const langInstruction =
        language === 'bn'
          ? 'Respond primarily in simple, warm, practical Bangla that a village farmer in Bangladesh can immediately understand and follow. Use short numbered steps when giving field actions.'
          : 'Respond clearly in practical English, and include a brief 2-line simple Bangla takeaway at the end labeled "বাংলা সারসংক্ষেপ:" so local farmers can also read it easily.';

      const systemInstruction = [
        'You are FasalBondhu AI (ফসলবন্ধু এআই), a trusted agricultural companion for farmers in Bangladesh.',
        `Active Farm Context: District=${districtName || 'Rajshahi'} (${aezName || 'Bangladesh'}), Season=${season || 'Rabi'}.`,
        weatherSummary ? `Live Forecast Context: ${weatherSummary}.` : '',
        activeAlerts ? `Active Climate Alerts: ${activeAlerts}.` : '',
        'Ground your advice in Bangladesh DAE, BRRI, BARI, and BINA climate-resilient practices (AWD irrigation, IPM first, balanced fertilization, flood/salinity safety).',
        'Keep answers concise (under 180 words), practical, and never invent unverified pesticide dosages; encourage calling Bangladesh Krishi Call Center (16123) for severe emergencies.',
        langInstruction,
      ]
        .filter(Boolean)
        .join('\n');

      const transcript = Array.isArray(history)
        ? history
            .slice(-6)
            .map((m: { role?: string; text?: string }) => `${m.role === 'user' ? 'Farmer' : 'FasalBondhu'}: ${m.text ?? ''}`)
            .join('\n')
        : '';

      const prompt = transcript ? `${transcript}\nFarmer: ${message.trim()}` : message.trim();

      const response = await generateWithResilience(ai, {
        contents: prompt,
        config: {
          systemInstruction,
        },
      });

      const reply = (response.text ?? '').trim();
      if (!reply) {
        throw new Error('Empty response received from AI advisor.');
      }
      res.json({ reply });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';
  const distDir = path.resolve(__dirname, 'dist');

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FasalBondhu AI server running on http://0.0.0.0:${PORT}`);
  });
}

createApp().catch((err) => {
  console.error('Failed to start FasalBondhu AI server:', err);
  process.exit(1);
});
