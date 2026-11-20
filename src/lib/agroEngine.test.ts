import test from 'node:test';
import assert from 'node:assert/strict';
import { BANGLADESH_DISTRICTS } from './bangladeshData';
import {
  buildFallbackClimate,
  calculateIrrigationPlan,
  computeClimateRisks,
  getCurrentBanglaSeason,
  scoreCropSuitability,
} from './agroEngine';
import type { DailyForecast } from './types';

test('getCurrentBanglaSeason maps calendar months to Rabi, Kharif-1, and Kharif-2', () => {
  assert.equal(getCurrentBanglaSeason(0), 'Rabi'); // January
  assert.equal(getCurrentBanglaSeason(10), 'Rabi'); // November
  assert.equal(getCurrentBanglaSeason(3), 'Kharif-1'); // April
  assert.equal(getCurrentBanglaSeason(7), 'Kharif-2'); // August
});

test('computeClimateRisks triggers Critical flood alert during heavy haor rainfall', () => {
  const sylhet = BANGLADESH_DISTRICTS.find((d) => d.id === 'sylhet')!;
  const heavyRainDays: DailyForecast[] = Array.from({ length: 7 }, (_, i) => ({
    date: `2026-07-0${i + 1}`,
    tempMax: 31,
    tempMin: 24,
    rainMm: i === 2 ? 75 : 22,
    humidityPct: 90,
    et0Mm: 3.1,
    windMaxKmh: 20,
  }));

  const alerts = computeClimateRisks(heavyRainDays, sylhet);
  const floodAlert = alerts.find((a) => a.category === 'Flood');
  assert.ok(floodAlert, 'Expected a Flood alert');
  assert.equal(floodAlert.severity, 'Critical');
  assert.ok(alerts.some((a) => a.category === 'Fungal'), 'Expected high-humidity Fungal alert');
});

test('computeClimateRisks detects Heat Stress and Drought Deficit in dry Rajshahi spell', () => {
  const rajshahi = BANGLADESH_DISTRICTS.find((d) => d.id === 'rajshahi')!;
  const hotDryDays: DailyForecast[] = Array.from({ length: 7 }, (_, i) => ({
    date: `2026-04-1${i + 1}`,
    tempMax: 39.2,
    tempMin: 25.4,
    rainMm: 0,
    humidityPct: 52,
    et0Mm: 5.5,
    windMaxKmh: 18,
  }));

  const alerts = computeClimateRisks(hotDryDays, rajshahi);
  const heatAlert = alerts.find((a) => a.category === 'Heat');
  const droughtAlert = alerts.find((a) => a.category === 'Drought');
  assert.equal(heatAlert?.severity, 'Critical');
  assert.equal(droughtAlert?.severity, 'Critical');
});

test('calculateIrrigationPlan applies AWD savings for vegetative Boro rice and pauses AWD during flowering', () => {
  const vegPlan = calculateIrrigationPlan({
    cropId: 'boro-rice',
    stage: 'Vegetative',
    soilTexture: 'Loamy',
    areaDecimals: 33, // 1 bigha
    daysSinceLastIrrigation: 5,
    recentRainMm: 0,
    dailyEt0Mm: 4.5,
    forecastRainNext3dMm: 0,
  });

  const flowerPlan = calculateIrrigationPlan({
    cropId: 'boro-rice',
    stage: 'Flowering',
    soilTexture: 'Loamy',
    areaDecimals: 33,
    daysSinceLastIrrigation: 5,
    recentRainMm: 0,
    dailyEt0Mm: 4.5,
    forecastRainNext3dMm: 0,
  });

  assert.equal(vegPlan.areaBigha, 1);
  assert.equal(vegPlan.estimatedWaterSavingPct, 22);
  assert.equal(flowerPlan.estimatedWaterSavingPct, 0);
  assert.ok(flowerPlan.netIrrigationMm > vegPlan.netIrrigationMm);
  assert.ok(vegPlan.totalLiters > 0);
  assert.ok(vegPlan.awdGuidanceBn && vegPlan.awdGuidanceBn.includes('AWD'));
});

test('calculateIrrigationPlan recommends skipping irrigation when sufficient rainfall is imminent', () => {
  const plan = calculateIrrigationPlan({
    cropId: 'potato',
    stage: 'Vegetative',
    soilTexture: 'Loamy',
    areaDecimals: 20,
    daysSinceLastIrrigation: 3,
    recentRainMm: 8,
    dailyEt0Mm: 3.5,
    forecastRainNext3dMm: 35,
  });

  assert.equal(plan.urgency, 'Nominal');
  assert.ok(plan.nextActionEn.toLowerCase().includes('skip irrigation'));
});

test('scoreCropSuitability ranks salt-tolerant BINA dhan-10 first in high-salinity coastal Khulna', () => {
  const khulna = BANGLADESH_DISTRICTS.find((d) => d.id === 'khulna')!;
  const ranked = scoreCropSuitability(
    {
      season: 'Rabi',
      soilTexture: 'Silty Clay',
      soilPh: 7.4,
      salinity: 'High',
      waterAccess: 'Flood-prone',
    },
    khulna
  );

  assert.equal(ranked[0].variety.id, 'bina-dhan10');
  assert.ok(ranked[0].score >= 85);
});

test('buildFallbackClimate produces 7 days of valid telemetry for every Bangladesh district', () => {
  for (const district of BANGLADESH_DISTRICTS) {
    const climate = buildFallbackClimate(district);
    assert.equal(climate.daily.length, 7);
    assert.ok(climate.nasaSolarMjM2 > 10);
    assert.ok(climate.soilMoistureIndex >= 20 && climate.soilMoistureIndex <= 100);
  }
});
