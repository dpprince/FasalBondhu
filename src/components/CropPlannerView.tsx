import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { scoreCropSuitability } from '../lib/agroEngine';
import { UI_COPY } from '../lib/i18n';
import type {
  AiCropBrief,
  BanglaSeason,
  ClimatePayload,
  DistrictProfile,
  Language,
  SalinityLevel,
  SoilTexture,
  WaterAccess,
} from '../lib/types';

interface CropPlannerViewProps {
  district: DistrictProfile;
  season: BanglaSeason;
  climate: ClimatePayload;
  language: Language;
}

const SEASONS: BanglaSeason[] = ['Rabi', 'Kharif-1', 'Kharif-2'];
const SOILS: SoilTexture[] = ['Loamy', 'Clay Loam', 'Sandy Loam', 'Silty Clay'];
const SALINITIES: SalinityLevel[] = ['None', 'Moderate', 'High'];
const WATER_MODES: WaterAccess[] = ['Irrigated', 'Rainfed', 'Flood-prone'];

export function CropPlannerView({ district, season: initialSeason, climate, language }: CropPlannerViewProps) {
  const t = UI_COPY[language];

  const [season, setSeason] = useState<BanglaSeason>(initialSeason);
  const [soilTexture, setSoilTexture] = useState<SoilTexture>(district.dominantSoil);
  const [soilPh, setSoilPh] = useState<number>(district.typicalPh);
  const [salinity, setSalinity] = useState<SalinityLevel>(district.salinityBaseline);
  const [waterAccess, setWaterAccess] = useState<WaterAccess>(
    district.floodRiskBaseline === 'High' ? 'Flood-prone' : district.droughtRiskBaseline === 'High' ? 'Rainfed' : 'Irrigated'
  );

  const [loadingBrief, setLoadingBrief] = useState(false);
  const [brief, setBrief] = useState<AiCropBrief | null>(null);
  const [briefError, setBriefError] = useState<string | null>(null);

  // Sync defaults cleanly when the farmer switches districts
  useEffect(() => {
    setSoilTexture(district.dominantSoil);
    setSoilPh(district.typicalPh);
    setSalinity(district.salinityBaseline);
    setWaterAccess(
      district.floodRiskBaseline === 'High' ? 'Flood-prone' : district.droughtRiskBaseline === 'High' ? 'Rainfed' : 'Irrigated'
    );
    setBrief(null);
    setBriefError(null);
  }, [district]);

  const ranked = useMemo(
    () =>
      scoreCropSuitability(
        { season, soilTexture, soilPh, salinity, waterAccess },
        district
      ),
    [season, soilTexture, soilPh, salinity, waterAccess, district]
  );

  const handleGenerateBrief = async () => {
    setLoadingBrief(true);
    setBriefError(null);
    try {
      const totalRain7d = climate.daily.reduce((s, d) => s + d.rainMm, 0);
      const res = await fetch('/api/ai/crop-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          districtName: district.nameEn,
          aezName: `${district.aezCode} ${district.aezNameEn}`,
          season,
          soilTexture,
          soilPh,
          salinity,
          waterAccess,
          topVarieties: ranked.slice(0, 3).map((r) => r.variety.nameEn),
          weatherSummary: `Temp ${climate.currentTempC.toFixed(1)}°C, 7-day rain ${totalRain7d.toFixed(1)} mm, Humidity ${climate.currentHumidityPct}%`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not generate planting brief.');
      setBrief(data);
    } catch (err) {
      setBriefError(err instanceof Error ? err.message : 'Unable to generate brief.');
    } finally {
      setLoadingBrief(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-1.5 max-w-3xl">
        <h1 className="font-display headline-balance text-2xl sm:text-3xl font-bold text-[#142119]">
          {t.plannerTitle}
        </h1>
        <p className="text-sm sm:text-[15px] text-[#4A5B50] leading-relaxed">{t.plannerSubtitle}</p>
      </header>

      {/* Parameter Control Panel */}
      <section className="bg-white border border-[#E2E7E0] rounded-xl p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {/* Season */}
          <div>
            <label htmlFor="planner-season" className="block text-xs font-semibold text-[#4A5B50] mb-1.5">
              {language === 'bn' ? 'চাষের মৌসুম' : 'Cropping Season'}
            </label>
            <select
              id="planner-season"
              value={season}
              onChange={(e) => setSeason(e.target.value as BanglaSeason)}
              className="w-full h-10 px-3 text-sm font-medium text-[#142119] bg-white border border-[#D4DCD1] rounded-lg focus:outline-none focus:border-[#15803D]"
            >
              {SEASONS.map((s) => (
                <option key={s} value={s}>
                  {s === 'Rabi'
                    ? language === 'bn'
                      ? 'রবি (শীতকালীন)'
                      : 'Rabi (Oct–Mar)'
                    : s === 'Kharif-1'
                      ? language === 'bn'
                        ? 'খরিপ-১ (আউশ / গ্রীষ্ম)'
                        : 'Kharif-1 (Mar–Jun)'
                      : language === 'bn'
                        ? 'খরিপ-২ (আমন / বর্ষা)'
                        : 'Kharif-2 (Jul–Oct)'}
                </option>
              ))}
            </select>
          </div>

          {/* Soil Texture */}
          <div>
            <label htmlFor="planner-soil" className="block text-xs font-semibold text-[#4A5B50] mb-1.5">
              {language === 'bn' ? 'মাটির ধরন' : 'Soil Texture'}
            </label>
            <select
              id="planner-soil"
              value={soilTexture}
              onChange={(e) => setSoilTexture(e.target.value as SoilTexture)}
              className="w-full h-10 px-3 text-sm font-medium text-[#142119] bg-white border border-[#D4DCD1] rounded-lg focus:outline-none focus:border-[#15803D]"
            >
              {SOILS.map((soil) => (
                <option key={soil} value={soil}>
                  {soil}
                </option>
              ))}
            </select>
          </div>

          {/* Salinity */}
          <div>
            <label htmlFor="planner-salinity" className="block text-xs font-semibold text-[#4A5B50] mb-1.5">
              {language === 'bn' ? 'মাটির লবণাক্ততা' : 'Soil Salinity'}
            </label>
            <select
              id="planner-salinity"
              value={salinity}
              onChange={(e) => setSalinity(e.target.value as SalinityLevel)}
              className="w-full h-10 px-3 text-sm font-medium text-[#142119] bg-white border border-[#D4DCD1] rounded-lg focus:outline-none focus:border-[#15803D]"
            >
              {SALINITIES.map((sal) => (
                <option key={sal} value={sal}>
                  {sal === 'None'
                    ? language === 'bn'
                      ? 'নেই (স্বাভাবিক)'
                      : 'None (Non-saline)'
                    : sal === 'Moderate'
                      ? language === 'bn'
                        ? 'মাঝারি (৪–৮ dS/m)'
                        : 'Moderate (4–8 dS/m)'
                      : language === 'bn'
                        ? 'অধিক (> ৮ dS/m)'
                        : 'High (> 8 dS/m)'}
                </option>
              ))}
            </select>
          </div>

          {/* Water Access */}
          <div>
            <label htmlFor="planner-water" className="block text-xs font-semibold text-[#4A5B50] mb-1.5">
              {language === 'bn' ? 'পানি ও জমির ধরন' : 'Water Regime'}
            </label>
            <select
              id="planner-water"
              value={waterAccess}
              onChange={(e) => setWaterAccess(e.target.value as WaterAccess)}
              className="w-full h-10 px-3 text-sm font-medium text-[#142119] bg-white border border-[#D4DCD1] rounded-lg focus:outline-none focus:border-[#15803D]"
            >
              {WATER_MODES.map((w) => (
                <option key={w} value={w}>
                  {w === 'Irrigated'
                    ? language === 'bn'
                      ? 'সেচ সুবিধাযুক্ত'
                      : 'Irrigated'
                    : w === 'Rainfed'
                      ? language === 'bn'
                        ? 'বৃষ্টি-নির্ভর (খরাপ্রবণ)'
                        : 'Rainfed / Dry'
                      : language === 'bn'
                        ? 'নিচু / বন্যাপ্রবণ'
                        : 'Flood-prone / Haor'}
                </option>
              ))}
            </select>
          </div>

          {/* Soil pH Slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="planner-ph" className="text-xs font-semibold text-[#4A5B50]">
                {language === 'bn' ? 'মাটির অম্লত্ব (pH)' : 'Soil pH'}
              </label>
              <span className="font-mono-tabular text-xs font-semibold text-[#142119]">
                {soilPh.toFixed(1)}
              </span>
            </div>
            <input
              id="planner-ph"
              type="range"
              min="4.5"
              max="8.5"
              step="0.1"
              value={soilPh}
              onChange={(e) => setSoilPh(Number(e.target.value))}
              className="w-full h-10 accent-[#15803D] cursor-pointer"
            />
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-[#ECEFE9] flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-[#4A5B50]">
            {language === 'bn'
              ? `শীর্ষ পছন্দ (${district.nameBn}): ${ranked[0]?.variety.nameBn}`
              : `Top match for ${district.nameEn}: ${ranked[0]?.variety.nameEn} (${ranked[0]?.score}/100)`}
          </p>
          <button
            type="button"
            onClick={handleGenerateBrief}
            disabled={loadingBrief}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {loadingBrief ? t.aiBriefLoading : t.aiBriefBtn}
          </button>
        </div>
      </section>

      {/* Optional Gemini AI Localized Planting Brief */}
      {briefError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#991B1B]"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{briefError}</span>
        </div>
      )}

      {brief && (
        <section className="bg-[#F3F8F4] border border-[#CBE4D1] rounded-xl p-6 space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-[#15803D]">
              {language === 'bn' ? 'এআই এলাকাভিত্তিক চাষাবাদ নির্দেশিকা' : 'AI Localized Planting Brief'}
            </p>
            <h2 className="font-display text-lg font-bold text-[#142119]">
              {language === 'bn' ? brief.headlineBn : brief.headlineEn}
            </h2>
            {language === 'en' && <p className="text-sm text-[#35523E]">{brief.headlineBn}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3 border-t border-[#D6E8DA] text-sm">
            <div className="space-y-2">
              <h3 className="font-semibold text-[#142119]">
                {language === 'bn' ? 'রোপণ ও জমি প্রস্তুতি' : 'Planting Window & Soil Prep'}
              </h3>
              <p className="text-[#142119]">
                {language === 'bn' ? brief.plantingWindowBn : brief.plantingWindowEn}
              </p>
              <ul className="list-disc list-inside space-y-1 text-[#35523E]">
                {(language === 'bn' ? brief.soilPreparationBn : brief.soilPreparationEn).map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-[#142119]">
                {language === 'bn' ? 'জলবায়ু সতর্কতা' : 'Climate Resilience Note'}
              </h3>
              <p className="text-[#142119]">
                {language === 'bn' ? brief.climateCautionBn : brief.climateCautionEn}
              </p>
              {language === 'en' && (
                <p className="text-xs text-[#35523E] pt-1">{brief.climateCautionBn}</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Ranked Bangladesh Varieties Data Table */}
      <section className="bg-white border border-[#E2E7E0] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E7E0] flex items-center justify-between gap-4">
          <h2 className="font-display text-base font-semibold text-[#142119]">
            {language === 'bn'
              ? 'উপযোগিতা অনুযায়ী ব্রি / বারি / বিনা জাতের তালিকা'
              : 'Ranked BRRI, BARI & BINA Varieties'}
          </h2>
          <span className="font-mono-tabular text-xs text-[#647469]">
            {ranked.length} {language === 'bn' ? 'টি জাত' : 'varieties'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E7E0] bg-[#FAFAF8] text-xs font-semibold text-[#4A5B50]">
                <th className="py-3 pl-6 pr-4">{language === 'bn' ? 'জাত ও প্রতিষ্ঠান' : 'Variety & Institute'}</th>
                <th className="py-3 px-4">{language === 'bn' ? 'উপযোগিতা' : 'Suitability'}</th>
                <th className="py-3 px-4 text-right">{language === 'bn' ? 'জীবনকাল' : 'Maturity'}</th>
                <th className="py-3 px-4 text-right">{language === 'bn' ? 'সম্ভাব্য ফলন' : 'Est. Yield'}</th>
                <th className="py-3 pl-4 pr-6">{language === 'bn' ? 'মাঠের উপযুক্ততা' : 'Agronomic Rationale'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECEFE9] text-sm">
              {ranked.slice(0, 8).map((item, idx) => {
                const scoreColor =
                  item.score >= 80
                    ? 'text-[#15803D]'
                    : item.score >= 60
                      ? 'text-[#B45309]'
                      : 'text-[#647469]';
                return (
                  <tr key={item.variety.id} className="hover:bg-[#FAFAF8] transition-colors align-top">
                    <td className="py-4 pl-6 pr-4">
                      <p className="font-semibold text-[#142119]">
                        <span className="font-mono-tabular text-xs text-[#647469] mr-2">
                          {String(idx + 1).padStart(2, '0')}.
                        </span>
                        {language === 'bn' ? item.variety.nameBn : item.variety.nameEn}
                      </p>
                      <p className="text-xs text-[#647469] mt-0.5 pl-6">
                        {item.variety.institute} · {item.variety.seasons.join(' / ')} · Water: {item.variety.waterNeed}
                      </p>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className={`font-mono-tabular font-semibold ${scoreColor}`}>
                        {item.score}/100
                      </span>
                      <span className="block text-xs text-[#647469]">
                        {language === 'bn' ? item.fitLabelBn : item.fitLabelEn}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-mono-tabular text-[#142119] whitespace-nowrap">
                      {item.variety.maturityDays} {language === 'bn' ? 'দিন' : 'd'}
                    </td>
                    <td className="py-4 px-4 text-right font-mono-tabular text-[#142119] whitespace-nowrap">
                      {item.variety.expectedYieldTonHa}
                    </td>
                    <td className="py-4 pl-4 pr-6 max-w-md">
                      <p className="text-xs text-[#142119] leading-relaxed">
                        {language === 'bn' ? item.variety.notesBn : item.variety.notesEn}
                      </p>
                      <p className="text-xs text-[#647469] mt-1">
                        {(language === 'bn' ? item.reasonsBn : item.reasonsEn).join(' · ')}
                      </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
