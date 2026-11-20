import { BANGLADESH_CROP_CATALOG, IRRIGATION_CROPS } from './bangladeshData';
import type {
  BanglaSeason,
  ClimatePayload,
  ClimateRiskAlert,
  CropSuitabilityCriteria,
  DailyForecast,
  DailyWaterBalance,
  DistrictProfile,
  IrrigationInput,
  IrrigationPlan,
  RankedCropRecommendation,
  RiskSeverity,
  SalinityLevel,
  SoilTexture,
} from './types';

const SALINITY_RANK: Record<SalinityLevel, number> = {
  None: 0,
  Moderate: 1,
  High: 2,
};

const SOIL_EFFICIENCY_FACTOR: Record<SoilTexture, number> = {
  'Sandy Loam': 1.15, // Faster drainage requires slightly more frequent replenishment
  Loamy: 1.0,
  'Clay Loam': 0.92,
  'Silty Clay': 0.88,
};

/**
 * Maps calendar month (0 = Jan ... 11 = Dec) to Bangladesh agricultural seasons.
 * Rabi: Mid-Oct to Mid-Mar (Oct..Feb)
 * Kharif-1 (Pre-monsoon/Aus): Mar..Jun
 * Kharif-2 (Monsoon/Aman): Jul..Sep
 */
export function getCurrentBanglaSeason(monthIndex: number): BanglaSeason {
  if (monthIndex >= 2 && monthIndex <= 5) return 'Kharif-1';
  if (monthIndex >= 6 && monthIndex <= 8) return 'Kharif-2';
  return 'Rabi';
}

/**
 * Builds deterministic BAMIS/AEZ seasonal baseline climate data when external APIs cannot be reached.
 */
export function buildFallbackClimate(district: DistrictProfile, referenceDate = new Date()): ClimatePayload {
  const base = district.seasonalBaseline;
  const daily: DailyForecast[] = [];
  const rainWeights = [0.18, 0.25, 0.14, 0.08, 0.15, 0.12, 0.08];
  const tempOffsets = [0, 0.6, -0.4, 0.8, 0.3, -0.7, 0.2];

  for (let i = 0; i < 7; i++) {
    const d = new Date(referenceDate);
    d.setDate(referenceDate.getDate() + i);
    const isoDate = d.toISOString().slice(0, 10);
    daily.push({
      date: isoDate,
      tempMax: Number((base.tempMax + tempOffsets[i]).toFixed(1)),
      tempMin: Number((base.tempMin + tempOffsets[i] * 0.6).toFixed(1)),
      rainMm: Number((base.rain7d * rainWeights[i]).toFixed(1)),
      humidityPct: Math.min(96, Math.max(45, Math.round(base.humidity + (i % 3 === 1 ? 3 : -1)))),
      et0Mm: Number(Math.max(1.8, base.et0Daily + tempOffsets[i] * 0.15).toFixed(2)),
      windMaxKmh: Math.round(base.windMaxKmh + (i % 2 === 0 ? 1 : -1)),
    });
  }

  const moisture = Math.min(92, Math.max(24, Math.round(45 + base.rain7d * 0.45 - base.et0Daily * 3.5)));

  return {
    districtId: district.id,
    fetchedAt: referenceDate.toISOString(),
    sourceLabel: 'BAMIS / AEZ Seasonal Baseline',
    isLiveWeather: false,
    isLiveNasaPower: false,
    nasaSolarMjM2: base.solarMjM2,
    nasaHumidityPct: base.humidity,
    currentTempC: daily[0].tempMax,
    currentHumidityPct: daily[0].humidityPct,
    currentWindKmh: daily[0].windMaxKmh,
    soilMoistureIndex: moisture,
    daily,
  };
}

/**
 * Evaluates 7-day forecast + district AEZ baseline to generate transparent, threshold-driven climate risk alerts.
 */
export function computeClimateRisks(daily: DailyForecast[], district: DistrictProfile): ClimateRiskAlert[] {
  const alerts: ClimateRiskAlert[] = [];
  if (!daily.length) return alerts;

  const totalRain7d = daily.reduce((sum, d) => sum + d.rainMm, 0);
  const maxSingleDayRain = Math.max(...daily.map((d) => d.rainMm));
  const peakTemp = Math.max(...daily.map((d) => d.tempMax));
  const avgHumidity = daily.reduce((sum, d) => sum + d.humidityPct, 0) / daily.length;
  const totalEt0 = daily.reduce((sum, d) => sum + d.et0Mm, 0);
  const maxWind = Math.max(...daily.map((d) => d.windMaxKmh));
  const humidDays = daily.filter((d) => d.humidityPct >= 82 && d.tempMin >= 16).length;

  // 1. Flood / Waterlogging Risk
  if (totalRain7d >= 120 || maxSingleDayRain >= 55 || (district.floodRiskBaseline === 'High' && totalRain7d >= 70)) {
    const severity: RiskSeverity = totalRain7d >= 140 || maxSingleDayRain >= 65 ? 'Critical' : 'Watch';
    alerts.push({
      id: 'flood-risk',
      category: 'Flood',
      severity,
      titleEn: 'Heavy Rainfall & Waterlogging Risk',
      titleBn: 'ভারী বৃষ্টি ও জলাবদ্ধতার ঝুঁকি',
      metricSummary: `${totalRain7d.toFixed(0)} mm / 7d · Peak ${maxSingleDayRain.toFixed(0)} mm/day`,
      detailEn: `Projected 7-day rainfall (${totalRain7d.toFixed(0)} mm) in ${district.nameEn} (${district.aezCode}) may submerge low-lying seedbeds and delay fertilizer uptake.`,
      detailBn: `${district.nameBn} (${district.aezCode}) এলাকায় আগামী ৭ দিনে ${totalRain7d.toFixed(0)} মিমি বৃষ্টিপাতের সম্ভাবনা রয়েছে, যা নিচু জমিতে জলাবদ্ধতা তৈরি করতে পারে।`,
      actionEn: 'Clear field drainage channels today, harvest 80% ripe paddy early, and pause urea top-dressing until rain passes.',
      actionBn: 'আজই জমির পানি নিষ্কাশনের নালা পরিষ্কার করুন, ৮০% পাকা ধান দ্রুত কাটুন এবং বৃষ্টি না থামা পর্যন্ত ইউরিয়া সার প্রয়োগ স্থগিত রাখুন।',
    });
  }

  // 2. Heat Stress Risk
  if (peakTemp >= 35) {
    const severity: RiskSeverity = peakTemp >= 38 ? 'Critical' : 'Watch';
    alerts.push({
      id: 'heat-risk',
      category: 'Heat',
      severity,
      titleEn: 'Daytime Heat Stress on Flowering Crops',
      titleBn: 'তীব্র তাপপ্রবাহ ও ফুল ঝরে পড়ার ঝুঁকি',
      metricSummary: `Peak ${peakTemp.toFixed(1)} °C · ET0 ${totalEt0.toFixed(1)} mm/7d`,
      detailEn: `Temperatures reaching ${peakTemp.toFixed(1)} °C can cause spikelet sterility in flowering rice and wilting in vegetables.`,
      detailBn: `তাপমাত্রা ${peakTemp.toFixed(1)}° সে. পর্যন্ত ওঠায় ধানের ফুলের পরাগায়ন ব্যাহত হতে পারে এবং সবজি গাছ নেতিয়ে পড়তে পারে।`,
      actionEn: 'Maintain 2–3 cm standing water in flowering rice, irrigate vegetables strictly after sunset, and avoid midday spraying.',
      actionBn: 'ধানের ফুল আসার সময় জমিতে ২–৩ সেমি পানি ধরে রাখুন, সবজিতে বিকেল বা সন্ধ্যায় সেচ দিন এবং দুপুরে স্প্রে করা থেকে বিরত থাকুন।',
    });
  }

  // 3. Fungal Blight & Blast Pressure
  if (avgHumidity >= 80 || humidDays >= 3) {
    const severity: RiskSeverity = avgHumidity >= 86 && humidDays >= 4 ? 'Critical' : 'Watch';
    alerts.push({
      id: 'fungal-risk',
      category: 'Fungal',
      severity,
      titleEn: 'Elevated Fungal Disease Pressure (Blast / Late Blight)',
      titleBn: 'ছত্রাকজনিত রোগের ঝুঁকি (ব্লাস্ট ও লেট ব্লাইট)',
      metricSummary: `Avg RH ${Math.round(avgHumidity)}% · ${humidDays} high-humidity days`,
      detailEn: `Prolonged humidity (${Math.round(avgHumidity)}% avg) favors rice blast and potato late blight spore germination overnight.`,
      detailBn: `দীর্ঘস্থায়ী উচ্চ আর্দ্রতা (গড় ${Math.round(avgHumidity)}%) ধানের ব্লাস্ট এবং আলুর মড়ক (লেট ব্লাইট) ছড়ানোর জন্য অনুকূল।`,
      actionEn: 'Inspect lower leaves at dawn, avoid excess nitrogen fertilizer, and keep crop rows ventilated.',
      actionBn: 'ভোরে ফসলের নিচের পাতা পরীক্ষা করুন, অতিরিক্ত ইউরিয়া সার দেবেন না এবং জমিতে বাতাস চলাচল বজায় রাখুন।',
    });
  }

  // 4. Moisture Deficit / Drought Watch
  const netBalance = totalRain7d - totalEt0;
  if (netBalance <= -18 || (district.droughtRiskBaseline === 'High' && totalRain7d < 12)) {
    const severity: RiskSeverity = netBalance <= -28 ? 'Critical' : 'Watch';
    alerts.push({
      id: 'drought-risk',
      category: 'Drought',
      severity,
      titleEn: 'Soil Moisture Deficit & Dry Spell',
      titleBn: 'মাটির রস ঘাটতি ও খরার সতর্কতা',
      metricSummary: `Deficit ${Math.abs(netBalance).toFixed(1)} mm · Rain ${totalRain7d.toFixed(1)} mm`,
      detailEn: `Evapotranspiration (${totalEt0.toFixed(1)} mm) exceeds expected rainfall (${totalRain7d.toFixed(1)} mm) in ${district.nameEn}.`,
      detailBn: `${district.nameBn} এলাকায় বৃষ্টির চেয়ে বাষ্পীভবন (${totalEt0.toFixed(1)} মিমি) বেশি হওয়ায় মাটির রস দ্রুত শুকিয়ে যাচ্ছে।`,
      actionEn: 'Schedule evening irrigation, apply straw mulch around vegetable beds, and follow AWD water saving for rice.',
      actionBn: 'সন্ধ্যায় হালকা সেচ দিন, সবজির গোড়ায় খড়ের মালচিং ব্যবহার করুন এবং ধানে পর্যায়ক্রমে ভেজানো ও শুকানো (AWD) পদ্ধতি অনুসরণ করুন।',
    });
  }

  // 5. High Wind / Squall Warning
  if (maxWind >= 35) {
    alerts.push({
      id: 'storm-risk',
      category: 'Storm',
      severity: maxWind >= 50 ? 'Critical' : 'Watch',
      titleEn: 'Strong Wind & Crop Lodging Risk',
      titleBn: 'ঝোড়ো বাতাস ও ফসল হেলে পড়ার ঝুঁকি',
      metricSummary: `Gusts up to ${Math.round(maxWind)} km/h`,
      detailEn: `Wind gusts up to ${Math.round(maxWind)} km/h can lodge tall paddy, maize, and staked vegetable trellises.`,
      detailBn: `ঘণ্টায় ${Math.round(maxWind)} কিমি বেগে ঝোড়ো হাওয়ায় লম্বা ধান, ভুট্টা ও সবজির মাচা ক্ষতিগ্রস্ত হতে পারে।`,
      actionEn: 'Reinforce bamboo stakes on vegetable plots and delay foliar spraying until winds drop below 15 km/h.',
      actionBn: 'সবজির মাচা ও খুঁটি শক্ত করে বাঁধুন এবং বাতাসের গতি কমার আগে কীটনাশক বা সার স্প্রে করবেন না।',
    });
  }

  // 6. Coastal Salinity Advisory (for coastal saline districts during dry periods)
  if (district.salinityBaseline === 'High' && totalRain7d < 35) {
    alerts.push({
      id: 'salinity-risk',
      category: 'Salinity',
      severity: 'Watch',
      titleEn: 'Root-Zone Salinity Concentration Watch',
      titleBn: 'মাটিতে লবণাক্ততা বৃদ্ধির সতর্কতা',
      metricSummary: `${district.aezCode} Coastal Tidal Zone`,
      detailEn: `Low freshwater rainfall in ${district.nameEn} increases capillary salt rise in top soil layers.`,
      detailBn: `${district.nameBn} উপকূলীয় এলাকায় কম বৃষ্টির কারণে মাটির উপরের স্তরে লবণাক্ততা বেড়ে যেতে পারে।`,
      actionEn: 'Use stored pond freshwater for irrigation, mulch soil to slow evaporation, and prioritize salt-tolerant varieties.',
      actionBn: 'সেচের জন্য পুকুরের মিঠা পানি ব্যবহার করুন, মাটিতে মালচিং দিন এবং লবণাক্ততা সহনশীল জাত নির্বাচন করুন।',
    });
  }

  // Ensure a clear Nominal advisory when conditions are favorable
  if (alerts.length === 0) {
    alerts.push({
      id: 'nominal-window',
      category: 'Drought',
      severity: 'Nominal',
      titleEn: 'Favorable Field Work Window',
      titleBn: 'মাঠ পর্যায়ের কাজের অনুকূল আবহাওয়া',
      metricSummary: `Rain ${totalRain7d.toFixed(1)} mm · Peak ${peakTemp.toFixed(1)} °C`,
      detailEn: `Balanced temperature and rainfall forecast across ${district.nameEn} with no acute climate hazard thresholds crossed.`,
      detailBn: `${district.nameBn} এলাকায় আগামী ৭ দিন তাপমাত্রা ও বৃষ্টিপাত স্বাভাবিক রয়েছে; বড় কোনো আবহাওয়া ঝুঁকি নেই।`,
      actionEn: 'Ideal window for weeding, balanced top-dressing, and preventive pest scouting.',
      actionBn: 'আগাছা দমন, সুষম সার প্রয়োগ এবং পোকামাকড় পর্যবেক্ষণের জন্য এটি উপযুক্ত সময়।',
    });
  }

  // Sort Critical first, then Watch, then Nominal
  const weight: Record<RiskSeverity, number> = { Critical: 0, Watch: 1, Nominal: 2 };
  return alerts.sort((a, b) => weight[a.severity] - weight[b.severity]);
}

/**
 * Pure FAO-56 inspired water balance & irrigation planner tailored to Bangladesh units (decimals & bigha).
 * 1 decimal = 40.4686 m²; 1 bigha (standard Bangladesh) = 33 decimals.
 * 1 mm water depth over 1 m² = 1 Liter.
 */
export function calculateIrrigationPlan(input: IrrigationInput, forecastDaily?: DailyForecast[]): IrrigationPlan {
  const crop = IRRIGATION_CROPS.find((c) => c.id === input.cropId) ?? IRRIGATION_CROPS[0];
  const kcFactor = crop.kc[input.stage];
  const soilFactor = SOIL_EFFICIENCY_FACTOR[input.soilTexture];

  const safeAreaDecimals = Math.max(1, input.areaDecimals);
  const safeDays = Math.max(1, input.daysSinceLastIrrigation);
  const areaSqMeters = safeAreaDecimals * 40.4686;
  const areaBigha = Number((safeAreaDecimals / 33).toFixed(2));

  const dailyEtcMm = Number((input.dailyEt0Mm * kcFactor).toFixed(2));
  const cumulativeEtcMm = Number((dailyEtcMm * safeDays).toFixed(1));

  // Effective rainfall is ~75% of recent rainfall (accounting for runoff/interception)
  const effectiveRainMm = Number((Math.max(0, input.recentRainMm) * 0.75).toFixed(1));
  const rawDeficit = Math.max(0, cumulativeEtcMm - effectiveRainMm);

  // If significant rain is forecast within 72 hours, reduce immediate irrigation demand
  const upcomingEffectiveRain = Math.max(0, input.forecastRainNext3dMm) * 0.65;
  const adjustedDeficit = Math.max(0, rawDeficit - upcomingEffectiveRain * 0.5);

  // Apply soil drainage efficiency; for rice under AWD, save ~22% compared to continuous flooding
  const awdSavingPct = crop.isRice && input.stage !== 'Flowering' ? 22 : 0;
  const netIrrigationMm = Number((adjustedDeficit * soilFactor * (1 - awdSavingPct / 100)).toFixed(1));
  const totalLiters = Math.round(netIrrigationMm * areaSqMeters);

  let urgency: RiskSeverity = 'Nominal';
  let nextActionEn = 'Soil moisture is adequate; re-check plot in 2–3 days.';
  let nextActionBn = 'মাটিতে পর্যাপ্ত রস রয়েছে; ২–৩ দিন পর পুনরায় জমি পরীক্ষা করুন।';

  if (upcomingEffectiveRain >= 18 && netIrrigationMm < 15) {
    urgency = 'Nominal';
    nextActionEn = `Skip irrigation now — ${input.forecastRainNext3dMm.toFixed(0)} mm rain is forecast within 3 days.`;
    nextActionBn = `এখন সেচ স্থগিত রাখুন — আগামী ৩ দিনে ${input.forecastRainNext3dMm.toFixed(0)} মিমি বৃষ্টির সম্ভাবনা রয়েছে।`;
  } else if (netIrrigationMm >= 28) {
    urgency = 'Critical';
    nextActionEn = `Irrigate within 24 hours (${netIrrigationMm.toFixed(0)} mm depth) preferably early morning or evening.`;
    nextActionBn = `আগামী ২৪ ঘণ্টার মধ্যে ভোরে বা সন্ধ্যায় ${netIrrigationMm.toFixed(0)} মিমি গভীরতায় সেচ দিন।`;
  } else if (netIrrigationMm >= 12) {
    urgency = 'Watch';
    nextActionEn = `Plan light irrigation (${netIrrigationMm.toFixed(0)} mm) within 48 hours to avoid root stress.`;
    nextActionBn = `গাছের পানিশূন্যতা এড়াতে আগামী ৪৮ ঘণ্টার মধ্যে হালকা সেচ (${netIrrigationMm.toFixed(0)} মিমি) দিন।`;
  }

  let awdGuidanceEn: string | null = null;
  let awdGuidanceBn: string | null = null;
  if (crop.isRice) {
    if (input.stage === 'Flowering') {
      awdGuidanceEn = 'Flowering stage active: pause AWD drying and keep 2–5 cm standing water to protect grain filling.';
      awdGuidanceBn = 'ধানের ফুল আসার সময় AWD শুকানো বন্ধ রাখুন এবং দানা পুষ্ট করতে ২–৫ সেমি পানি ধরে রাখুন।';
    } else {
      awdGuidanceEn = 'AWD (Alternate Wetting & Drying) active: re-flood to 5 cm only when water in your perforated PVC pipe drops 15 cm below soil surface, saving ~22% irrigation water and pump fuel.';
      awdGuidanceBn = 'পর্যায়ক্রমে ভেজানো ও শুকানো (AWD) পদ্ধতি অনুসরণ করুন: ছিদ্রযুক্ত পাইপের পানি মাটির ১৫ সেমি নিচে নামলে তবেই ৫ সেমি সেচ দিন। এতে প্রায় ২২% পানি ও জ্বালানি সাশ্রয় হয়।';
    }
  }

  const dailyBalance: DailyWaterBalance[] = (forecastDaily ?? []).map((day) => {
    const dayEtc = Number((day.et0Mm * kcFactor).toFixed(2));
    const dayEffRain = Number((day.rainMm * 0.75).toFixed(2));
    return {
      date: day.date,
      etCropMm: dayEtc,
      effectiveRainMm: dayEffRain,
      netDeficitMm: Number(Math.max(0, dayEtc - dayEffRain).toFixed(2)),
    };
  });

  return {
    kcFactor,
    dailyEtcMm,
    cumulativeEtcMm,
    effectiveRainMm,
    netIrrigationMm,
    totalLiters,
    areaBigha,
    urgency,
    nextActionEn,
    nextActionBn,
    awdGuidanceEn,
    awdGuidanceBn,
    estimatedWaterSavingPct: awdSavingPct,
    dailyBalance,
  };
}

/**
 * Deterministic Bangladesh crop suitability ranker weighing Season, Soil, pH, Salinity, and Water Access.
 */
export function scoreCropSuitability(
  criteria: CropSuitabilityCriteria,
  district: DistrictProfile
): RankedCropRecommendation[] {
  const results: RankedCropRecommendation[] = BANGLADESH_CROP_CATALOG.map((variety) => {
    let score = 0;
    const reasonsEn: string[] = [];
    const reasonsBn: string[] = [];

    // 1. Season match (35 pts)
    if (variety.seasons.includes(criteria.season)) {
      score += 35;
      reasonsEn.push(`Matches ${criteria.season} cropping window`);
      reasonsBn.push(`${criteria.season} মৌসুমের জন্য সরাসরি উপযুক্ত`);
    } else {
      score += 4;
      reasonsEn.push(`Off-season for ${criteria.season}`);
      reasonsBn.push(`${criteria.season} মৌসুমের বাইরের ফসল`);
    }

    // 2. Salinity resilience (25 pts)
    const requiredSalinity = SALINITY_RANK[criteria.salinity];
    const varietySalinityCap = SALINITY_RANK[variety.maxSalinity];
    if (varietySalinityCap >= requiredSalinity) {
      score += 25;
      if (requiredSalinity > 0) {
        reasonsEn.push(`Tolerates ${criteria.salinity.toLowerCase()} coastal soil salinity`);
        reasonsBn.push(`${criteria.salinity === 'High' ? 'অধিক' : 'মাঝারি'} লবণাক্ত মাটিতে টিকে থাকে`);
      }
    } else {
      score += Math.max(0, 8 - (requiredSalinity - varietySalinityCap) * 8);
      reasonsEn.push(`Sensitive to ${criteria.salinity.toLowerCase()} salinity`);
      reasonsBn.push(`লবণাক্ততায় সংবেদনশীল`);
    }

    // 3. Soil texture fit (15 pts)
    if (variety.soils.includes(criteria.soilTexture)) {
      score += 15;
      reasonsEn.push(`Thrives in ${criteria.soilTexture.toLowerCase()} soil`);
      reasonsBn.push(`${criteria.soilTexture} মাটিতে ভালো ফলন হয়`);
    } else {
      score += 6;
    }

    // 4. Soil pH fit (10 pts)
    if (criteria.soilPh >= variety.phMin && criteria.soilPh <= variety.phMax) {
      score += 10;
      reasonsEn.push(`Within ideal pH (${variety.phMin}–${variety.phMax})`);
      reasonsBn.push(`মাটির অম্লত্ব (pH ${variety.phMin}–${variety.phMax}) অনুকূল`);
    } else {
      const dist = Math.min(Math.abs(criteria.soilPh - variety.phMin), Math.abs(criteria.soilPh - variety.phMax));
      score += Math.max(0, Math.round(10 - dist * 6));
    }

    // 5. Water access & climate hazard resilience (15 pts)
    if (criteria.waterAccess === 'Flood-prone') {
      if (variety.floodTolerant) {
        score += 15;
        reasonsEn.push('Flood / early-harvest resilient for low-lying fields');
        reasonsBn.push('বন্যা বা আগাম ঢল মোকাবেলায় সক্ষম');
      } else {
        score += 3;
        reasonsEn.push('Needs raised beds or drainage in flood-prone plots');
        reasonsBn.push('নিচু জমিতে পানি নিষ্কাশন প্রয়োজন');
      }
    } else if (criteria.waterAccess === 'Rainfed') {
      if (variety.droughtTolerant || variety.waterNeed === 'Low') {
        score += 15;
        reasonsEn.push('Low irrigation requirement suited to rainfed plots');
        reasonsBn.push('কম সেচেই বৃষ্টি-নির্ভর জমিতে চাষযোগ্য');
      } else if (variety.waterNeed === 'Medium') {
        score += 9;
      } else {
        score += 3;
      }
    } else {
      // Irrigated
      score += 14;
      if (district.droughtRiskBaseline === 'High' && variety.droughtTolerant) {
        score += 1;
      }
    }

    const clamped = Math.min(100, Math.max(0, score));
    const fitLabelEn = clamped >= 80 ? 'High Fit' : clamped >= 60 ? 'Good Fit' : 'Conditional';
    const fitLabelBn = clamped >= 80 ? 'উপযুক্ত' : clamped >= 60 ? 'ভালো মানানসই' : 'শর্তসাপেক্ষ';

    return {
      variety,
      score: clamped,
      fitLabelEn,
      fitLabelBn,
      reasonsEn: reasonsEn.slice(0, 3),
      reasonsBn: reasonsBn.slice(0, 3),
    };
  });

  return results.sort((a, b) => b.score - a.score);
}
