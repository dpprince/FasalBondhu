export type Language = 'en' | 'bn';

export type WorkspaceTab = 'pulse' | 'clinic' | 'planner' | 'irrigation' | 'advisor';

export type BanglaSeason = 'Rabi' | 'Kharif-1' | 'Kharif-2';

export type SoilTexture = 'Loamy' | 'Clay Loam' | 'Sandy Loam' | 'Silty Clay';

export type SalinityLevel = 'None' | 'Moderate' | 'High';

export type WaterAccess = 'Irrigated' | 'Rainfed' | 'Flood-prone';

export type CropStage = 'Initial' | 'Vegetative' | 'Flowering' | 'Maturity';

export type RiskSeverity = 'Nominal' | 'Watch' | 'Critical';

export interface DistrictProfile {
  id: string;
  nameEn: string;
  nameBn: string;
  divisionEn: string;
  divisionBn: string;
  aezCode: string;
  aezNameEn: string;
  aezNameBn: string;
  lat: number;
  lon: number;
  dominantSoil: SoilTexture;
  typicalPh: number;
  salinityBaseline: SalinityLevel;
  floodRiskBaseline: 'Low' | 'Moderate' | 'High';
  droughtRiskBaseline: 'Low' | 'Moderate' | 'High';
  primaryCropsEn: string[];
  primaryCropsBn: string[];
  seasonalBaseline: {
    tempMax: number;
    tempMin: number;
    humidity: number;
    rain7d: number;
    et0Daily: number;
    windMaxKmh: number;
    solarMjM2: number;
  };
}

export interface DailyForecast {
  date: string;
  tempMax: number;
  tempMin: number;
  rainMm: number;
  humidityPct: number;
  et0Mm: number;
  windMaxKmh: number;
}

export interface ClimatePayload {
  districtId: string;
  fetchedAt: string;
  sourceLabel: string;
  isLiveWeather: boolean;
  isLiveNasaPower: boolean;
  nasaSolarMjM2: number;
  nasaHumidityPct: number;
  currentTempC: number;
  currentHumidityPct: number;
  currentWindKmh: number;
  soilMoistureIndex: number; // 0 to 100 normalized %
  daily: DailyForecast[];
}

export interface ClimateRiskAlert {
  id: string;
  category: 'Flood' | 'Heat' | 'Drought' | 'Fungal' | 'Storm' | 'Salinity';
  severity: RiskSeverity;
  titleEn: string;
  titleBn: string;
  metricSummary: string;
  detailEn: string;
  detailBn: string;
  actionEn: string;
  actionBn: string;
}

export interface CropVariety {
  id: string;
  nameEn: string;
  nameBn: string;
  cropGroupEn: string;
  cropGroupBn: string;
  institute: 'BRRI' | 'BARI' | 'BINA' | 'DAE';
  seasons: BanglaSeason[];
  soils: SoilTexture[];
  phMin: number;
  phMax: number;
  maxSalinity: SalinityLevel;
  floodTolerant: boolean;
  droughtTolerant: boolean;
  waterNeed: 'Low' | 'Medium' | 'High';
  maturityDays: number;
  expectedYieldTonHa: string;
  notesEn: string;
  notesBn: string;
}

export interface CropSuitabilityCriteria {
  season: BanglaSeason;
  soilTexture: SoilTexture;
  soilPh: number;
  salinity: SalinityLevel;
  waterAccess: WaterAccess;
}

export interface RankedCropRecommendation {
  variety: CropVariety;
  score: number;
  fitLabelEn: 'High Fit' | 'Good Fit' | 'Conditional';
  fitLabelBn: 'উপযুক্ত' | 'ভালো মানানসই' | 'শর্তসাপেক্ষ';
  reasonsEn: string[];
  reasonsBn: string[];
}

export interface IrrigationInput {
  cropId: string;
  stage: CropStage;
  soilTexture: SoilTexture;
  areaDecimals: number;
  daysSinceLastIrrigation: number;
  recentRainMm: number;
  dailyEt0Mm: number;
  forecastRainNext3dMm: number;
}

export interface DailyWaterBalance {
  date: string;
  etCropMm: number;
  effectiveRainMm: number;
  netDeficitMm: number;
}

export interface IrrigationPlan {
  kcFactor: number;
  dailyEtcMm: number;
  cumulativeEtcMm: number;
  effectiveRainMm: number;
  netIrrigationMm: number;
  totalLiters: number;
  areaBigha: number;
  urgency: RiskSeverity;
  nextActionEn: string;
  nextActionBn: string;
  awdGuidanceEn: string | null;
  awdGuidanceBn: string | null;
  estimatedWaterSavingPct: number;
  dailyBalance: DailyWaterBalance[];
}

export interface CropSpecimen {
  id: string;
  cropEn: string;
  cropBn: string;
  labelEn: string;
  labelBn: string;
  hintEn: string;
  hintBn: string;
  imageUrl: string;
}

export interface DiagnosisResult {
  id?: string;
  createdAt?: string;
  districtName?: string;
  cropName?: string;
  imageUrl?: string;
  conditionEn: string;
  conditionBn: string;
  category: 'Fungal Disease' | 'Bacterial Disease' | 'Viral Disease' | 'Insect Pest' | 'Nutrient Deficiency' | 'Healthy';
  severity: RiskSeverity;
  confidencePct: number;
  observedSymptomsEn: string;
  observedSymptomsBn: string;
  summaryBn: string;
  summaryEn: string;
  immediateOrganicStepsBn: string[];
  immediateOrganicStepsEn: string[];
  safeTreatmentGuidanceBn: string;
  safeTreatmentGuidanceEn: string;
  preventionTipsBn: string[];
  preventionTipsEn: string[];
  consultExtensionOfficer: boolean;
}

export interface AiCropBrief {
  headlineBn: string;
  headlineEn: string;
  plantingWindowBn: string;
  plantingWindowEn: string;
  soilPreparationBn: string[];
  soilPreparationEn: string[];
  climateCautionBn: string;
  climateCautionEn: string;
}

export interface AdvisorMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
}
