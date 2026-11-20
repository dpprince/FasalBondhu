import { useEffect, useMemo, useState } from 'react';
import { calculateIrrigationPlan } from '../lib/agroEngine';
import { IRRIGATION_CROPS } from '../lib/bangladeshData';
import { UI_COPY } from '../lib/i18n';
import type { ClimatePayload, CropStage, DistrictProfile, Language, SoilTexture } from '../lib/types';

interface IrrigationViewProps {
  district: DistrictProfile;
  climate: ClimatePayload;
  language: Language;
}

const STAGES: { value: CropStage; labelEn: string; labelBn: string }[] = [
  { value: 'Initial', labelEn: 'Initial / Seedling', labelBn: 'চারা ও প্রাথমিক ধাপ' },
  { value: 'Vegetative', labelEn: 'Vegetative / Tillering', labelBn: 'কুশি ও অঙ্গজ বৃদ্ধি' },
  { value: 'Flowering', labelEn: 'Flowering / Panicle', labelBn: 'ফুল ও দানা গঠন' },
  { value: 'Maturity', labelEn: 'Ripening / Maturity', labelBn: 'পাকার পর্যায়' },
];

const SOILS: { value: SoilTexture; labelBn: string }[] = [
  { value: 'Loamy', labelBn: 'দোআঁশ মাটি' },
  { value: 'Clay Loam', labelBn: 'এঁটেল দোআঁশ' },
  { value: 'Sandy Loam', labelBn: 'বেলে দোআঁশ' },
  { value: 'Silty Clay', labelBn: 'পলি এঁটেল মাটি' },
];

const URGENCY_COLOR = {
  Critical: 'text-[#B91C1C]',
  Watch: 'text-[#B45309]',
  Nominal: 'text-[#15803D]',
} as const;

export function IrrigationView({ district, climate, language }: IrrigationViewProps) {
  const t = UI_COPY[language];

  const [cropId, setCropId] = useState<string>('boro-rice');
  const [stage, setStage] = useState<CropStage>('Vegetative');
  const [soilTexture, setSoilTexture] = useState<SoilTexture>(district.dominantSoil);
  const [areaDecimals, setAreaDecimals] = useState<number>(33); // 1 Bigha = 33 decimals
  const [daysSinceLast, setDaysSinceLast] = useState<number>(5);
  const [recentRainMm, setRecentRainMm] = useState<number>(Math.round(climate.daily[0]?.rainMm ?? 0));

  useEffect(() => {
    setSoilTexture(district.dominantSoil);
  }, [district]);

  const avgEt0 = useMemo(
    () => climate.daily.reduce((s, d) => s + d.et0Mm, 0) / Math.max(1, climate.daily.length),
    [climate.daily]
  );

  const forecastRainNext3dMm = useMemo(
    () => climate.daily.slice(0, 3).reduce((s, d) => s + d.rainMm, 0),
    [climate.daily]
  );

  const plan = useMemo(
    () =>
      calculateIrrigationPlan(
        {
          cropId,
          stage,
          soilTexture,
          areaDecimals,
          daysSinceLastIrrigation: daysSinceLast,
          recentRainMm,
          dailyEt0Mm: avgEt0,
          forecastRainNext3dMm,
        },
        climate.daily
      ),
    [cropId, stage, soilTexture, areaDecimals, daysSinceLast, recentRainMm, avgEt0, forecastRainNext3dMm, climate.daily]
  );

  const maxDailyEtc = Math.max(6, ...plan.dailyBalance.map((d) => Math.max(d.etCropMm, d.effectiveRainMm)));

  return (
    <div className="space-y-8">
      <header className="space-y-1.5 max-w-3xl">
        <h1 className="font-display headline-balance text-2xl sm:text-3xl font-bold text-[#142119]">
          {t.irrigationTitle}
        </h1>
        <p className="text-sm sm:text-[15px] text-[#4A5B50] leading-relaxed">{t.irrigationSubtitle}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 5 cols: Plot & Crop Inputs */}
        <section className="lg:col-span-5 bg-white border border-[#E2E7E0] rounded-xl p-6 space-y-5">
          <h2 className="font-display text-base font-semibold text-[#142119] pb-3 border-b border-[#E2E7E0]">
            {language === 'bn' ? 'জমি ও ফসলের তথ্য' : 'Plot & Crop Parameters'}
          </h2>

          <div>
            <label htmlFor="irr-crop" className="block text-xs font-semibold text-[#4A5B50] mb-1.5">
              {language === 'bn' ? 'ফসল নির্বাচন করুন' : 'Crop Type'}
            </label>
            <select
              id="irr-crop"
              value={cropId}
              onChange={(e) => setCropId(e.target.value)}
              className="w-full h-10 px-3 text-sm font-medium text-[#142119] bg-white border border-[#D4DCD1] rounded-lg focus:outline-none focus:border-[#15803D]"
            >
              {IRRIGATION_CROPS.map((c) => (
                <option key={c.id} value={c.id}>
                  {language === 'bn' ? c.nameBn : c.nameEn}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="irr-stage" className="block text-xs font-semibold text-[#4A5B50] mb-1.5">
                {language === 'bn' ? 'ফসলের ধাপ' : 'Growth Stage'}
              </label>
              <select
                id="irr-stage"
                value={stage}
                onChange={(e) => setStage(e.target.value as CropStage)}
                className="w-full h-10 px-3 text-sm text-[#142119] bg-white border border-[#D4DCD1] rounded-lg focus:outline-none focus:border-[#15803D]"
              >
                {STAGES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {language === 'bn' ? st.labelBn : st.labelEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="irr-soil" className="block text-xs font-semibold text-[#4A5B50] mb-1.5">
                {language === 'bn' ? 'মাটির ধরন' : 'Soil Type'}
              </label>
              <select
                id="irr-soil"
                value={soilTexture}
                onChange={(e) => setSoilTexture(e.target.value as SoilTexture)}
                className="w-full h-10 px-3 text-sm text-[#142119] bg-white border border-[#D4DCD1] rounded-lg focus:outline-none focus:border-[#15803D]"
              >
                {SOILS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {language === 'bn' ? s.labelBn : s.value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="irr-area" className="text-xs font-semibold text-[#4A5B50]">
                {language === 'bn' ? 'জমির পরিমাণ (শতাংশ)' : 'Plot Area (Decimals)'}
              </label>
              <span className="font-mono-tabular text-xs font-semibold text-[#142119]">
                {areaDecimals} {language === 'bn' ? 'শতাংশ' : 'dec'} ({plan.areaBigha} {language === 'bn' ? 'বিঘা' : 'bigha'})
              </span>
            </div>
            <input
              id="irr-area"
              type="number"
              min={1}
              max={1000}
              value={areaDecimals}
              onChange={(e) => setAreaDecimals(Math.max(1, Number(e.target.value) || 1))}
              className="w-full h-10 px-3 font-mono-tabular text-sm text-[#142119] bg-white border border-[#D4DCD1] rounded-lg focus:outline-none focus:border-[#15803D]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="irr-days" className="text-xs font-semibold text-[#4A5B50]">
                  {language === 'bn' ? 'শেষ সেচের পর দিন' : 'Days Since Irrigation'}
                </label>
                <span className="font-mono-tabular text-xs font-semibold text-[#142119]">{daysSinceLast} d</span>
              </div>
              <input
                id="irr-days"
                type="range"
                min={1}
                max={14}
                value={daysSinceLast}
                onChange={(e) => setDaysSinceLast(Number(e.target.value))}
                className="w-full h-9 accent-[#15803D] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="irr-rain" className="text-xs font-semibold text-[#4A5B50]">
                  {language === 'bn' ? 'সাম্প্রতিক বৃষ্টি (মিমি)' : 'Recent Rain (mm)'}
                </label>
                <span className="font-mono-tabular text-xs font-semibold text-[#142119]">{recentRainMm} mm</span>
              </div>
              <input
                id="irr-rain"
                type="range"
                min={0}
                max={60}
                value={recentRainMm}
                onChange={(e) => setRecentRainMm(Number(e.target.value))}
                className="w-full h-9 accent-[#15803D] cursor-pointer"
              />
            </div>
          </div>

          <p className="text-xs text-[#647469] pt-3 border-t border-[#ECEFE9] font-mono-tabular">
            {district.nameEn} ET₀ {avgEt0.toFixed(2)} mm/d · K_c {plan.kcFactor.toFixed(2)} · 3d forecast rain{' '}
            {forecastRainNext3dMm.toFixed(1)} mm
          </p>
        </section>

        {/* Right 7 cols: Calculated Schedule, AWD Savings & 7-Day Deficit Chart */}
        <div className="lg:col-span-7 space-y-8">
          <section className="bg-white border border-[#E2E7E0] rounded-xl overflow-hidden">
            {/* Primary Recommendation */}
            <div className="p-6 border-b border-[#E2E7E0] space-y-2">
              <div className="flex items-center justify-between gap-4">
                <span className={`text-xs font-semibold ${URGENCY_COLOR[plan.urgency]}`}>
                  {t.severityLabels[plan.urgency]} · {language === 'bn' ? 'সেচের সুপারিশ' : 'Irrigation Status'}
                </span>
                {plan.estimatedWaterSavingPct > 0 && (
                  <span className="font-mono-tabular text-xs font-semibold text-[#15803D]">
                    {language === 'bn'
                      ? `AWD ${plan.estimatedWaterSavingPct}% পানি সাশ্রয়`
                      : `AWD -${plan.estimatedWaterSavingPct}% water`}
                  </span>
                )}
              </div>
              <p className="font-display text-lg sm:text-xl font-bold text-[#142119]">
                {language === 'bn' ? plan.nextActionBn : plan.nextActionEn}
              </p>
              {language === 'en' && <p className="text-sm text-[#4A5B50]">{plan.nextActionBn}</p>}
            </div>

            {/* 4 Key Quantitative Water Outputs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E2E7E0]">
              <div className="p-4 sm:p-5">
                <p className="text-xs text-[#647469]">
                  {language === 'bn' ? 'প্রয়োজনীয় সেচ গভীরতা' : 'Net Depth'}
                </p>
                <p className="mt-1 font-mono-tabular text-2xl font-semibold text-[#142119]">
                  {plan.netIrrigationMm.toFixed(1)}
                  <span className="text-xs font-normal text-[#647469] ml-1">mm</span>
                </p>
              </div>
              <div className="p-4 sm:p-5">
                <p className="text-xs text-[#647469]">
                  {language === 'bn' ? 'মোট পানির পরিমাণ' : 'Plot Volume'}
                </p>
                <p className="mt-1 font-mono-tabular text-2xl font-semibold text-[#142119]">
                  {plan.totalLiters.toLocaleString()}
                  <span className="text-xs font-normal text-[#647469] ml-1">L</span>
                </p>
              </div>
              <div className="p-4 sm:p-5">
                <p className="text-xs text-[#647469]">
                  {language === 'bn' ? 'দৈনিক ফসলের চাহিদা' : 'Daily ET_c'}
                </p>
                <p className="mt-1 font-mono-tabular text-2xl font-semibold text-[#142119]">
                  {plan.dailyEtcMm.toFixed(1)}
                  <span className="text-xs font-normal text-[#647469] ml-1">mm/d</span>
                </p>
              </div>
              <div className="p-4 sm:p-5">
                <p className="text-xs text-[#647469]">
                  {language === 'bn' ? 'কার্যকর বৃষ্টি' : 'Effective Rain'}
                </p>
                <p className="mt-1 font-mono-tabular text-2xl font-semibold text-[#142119]">
                  {plan.effectiveRainMm.toFixed(1)}
                  <span className="text-xs font-normal text-[#647469] ml-1">mm</span>
                </p>
              </div>
            </div>

            {plan.awdGuidanceEn && (
              <div className="p-5 bg-[#F3F8F4] border-t border-[#D6E8DA] space-y-1">
                <p className="text-xs font-semibold text-[#15803D]">
                  {language === 'bn'
                    ? 'বোরো ও আমন ধানে AWD (পানি সাশ্রয়ী) নির্দেশিকা'
                    : 'BRRI Alternate Wetting & Drying (AWD) Guidance'}
                </p>
                <p className="text-sm text-[#142119] leading-relaxed">
                  {language === 'bn' ? plan.awdGuidanceBn : plan.awdGuidanceEn}
                </p>
              </div>
            )}
          </section>

          {/* 7-Day Daily Water Demand Breakdown */}
          <section className="bg-white border border-[#E2E7E0] rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-base font-semibold text-[#142119]">
                {language === 'bn'
                  ? 'আগামী ৭ দিনের দৈনিক পানির ঘাটতি (ফসলের চাহিদা বনাম বৃষ্টি)'
                  : '7-Day Crop Water Demand vs. Effective Rain'}
              </h2>
              <span className="text-xs text-[#647469]">{language === 'bn' ? 'মিমি / দিন' : 'mm / day'}</span>
            </div>

            <div className="space-y-3">
              {plan.dailyBalance.map((day) => {
                const etcPct = Math.min(100, (day.etCropMm / maxDailyEtc) * 100);
                const rainPct = Math.min(100, (day.effectiveRainMm / maxDailyEtc) * 100);
                return (
                  <div key={day.date} className="grid grid-cols-12 items-center gap-3 text-xs">
                    <span className="col-span-3 sm:col-span-2 font-mono-tabular text-[#4A5B50]">
                      {day.date.slice(5)}
                    </span>
                    <div className="col-span-6 sm:col-span-7 space-y-1">
                      <div className="h-2 w-full bg-[#F3F5F2] rounded-sm overflow-hidden">
                        <div
                          className="h-full bg-[#B45309]/80 rounded-sm"
                          style={{ width: `${etcPct}%` }}
                          title={`ETc ${day.etCropMm} mm`}
                        />
                      </div>
                      <div className="h-2 w-full bg-[#F3F5F2] rounded-sm overflow-hidden">
                        <div
                          className="h-full bg-[#15803D]/80 rounded-sm"
                          style={{ width: `${rainPct}%` }}
                          title={`Effective rain ${day.effectiveRainMm} mm`}
                        />
                      </div>
                    </div>
                    <span className="col-span-3 text-right font-mono-tabular text-[#142119]">
                      {day.netDeficitMm > 0 ? `-${day.netDeficitMm.toFixed(1)} mm` : '0.0 mm'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex items-center gap-5 text-xs text-[#647469]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[#B45309]/80" />
                {language === 'bn' ? 'ফসলের পানির চাহিদা (ET_c)' : 'Crop Demand (ET_c)'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[#15803D]/80" />
                {language === 'bn' ? 'কার্যকর বৃষ্টিপাত' : 'Effective Rain'}
              </span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
