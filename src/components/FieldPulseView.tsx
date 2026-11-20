import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { HERO_BANNER_URL } from '../lib/bangladeshData';
import { UI_COPY } from '../lib/i18n';
import type { ClimatePayload, ClimateRiskAlert, DistrictProfile, Language, WorkspaceTab } from '../lib/types';
import { ClimateChart } from './ClimateChart';

interface FieldPulseViewProps {
  district: DistrictProfile;
  climate: ClimatePayload;
  loadingClimate: boolean;
  alerts: ClimateRiskAlert[];
  language: Language;
  onNavigate: (tab: WorkspaceTab) => void;
}

const SEVERITY_TEXT_STYLES = {
  Critical: 'text-[#B91C1C]',
  Watch: 'text-[#B45309]',
  Nominal: 'text-[#15803D]',
} as const;

const SEVERITY_GLYPH = {
  Critical: '▲',
  Watch: '◆',
  Nominal: '●',
} as const;

export function FieldPulseView({
  district,
  climate,
  loadingClimate,
  alerts,
  language,
  onNavigate,
}: FieldPulseViewProps) {
  const t = UI_COPY[language];
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});

  const totalRain7d = climate.daily.reduce((sum, d) => sum + d.rainMm, 0);
  const avgEt0 = climate.daily.reduce((sum, d) => sum + d.et0Mm, 0) / Math.max(1, climate.daily.length);
  const peakTemp = Math.max(...climate.daily.map((d) => d.tempMax));

  const checklistItems = [
    {
      id: 'drainage-or-mulch',
      textEn:
        totalRain7d >= 50
          ? `Inspect field bunds and clear water drainage channels in ${district.nameEn} before heavy showers.`
          : `Check topsoil moisture around young roots in ${district.nameEn}; schedule evening irrigation if crusting starts.`,
      textBn:
        totalRain7d >= 50
          ? `${district.nameBn} এলাকায় বৃষ্টির আগেই জমির আইল ও পানি নিষ্কাশনের নালা পরিষ্কার করুন।`
          : `${district.nameBn} এলাকায় গাছের গোড়ার রস পরীক্ষা করুন; মাটি শুকিয়ে গেলে সন্ধ্যায় হালকা সেচ দিন।`,
    },
    {
      id: 'scout-leaves',
      textEn: 'Walk two diagonal rows at dawn to inspect lower leaves for spots, curling, or stem-base insects.',
      textBn: 'ভোরে জমির দুই কোণা ধরে হেঁটে নিচের পাতায় দাগ, কুঁকড়ানো বা গোড়ায় পোকার উপস্থিতি পরীক্ষা করুন।',
    },
    {
      id: 'fertilizer-timing',
      textEn:
        climate.daily[0]?.rainMm >= 12
          ? 'Delay urea top-dressing today to prevent fertilizer runoff in rain.'
          : 'Weather is suitable for split urea or potash application on moist soil.',
      textBn:
        climate.daily[0]?.rainMm >= 12
          ? 'বৃষ্টির পানিতে ধুয়ে যাওয়ার ঝুঁকি থাকায় আজ ইউরিয়া উপরি প্রয়োগ স্থগিত রাখুন।'
          : 'ভেজা মাটিতে সুষম ইউরিয়া বা পটাশ সার উপরি প্রয়োগের জন্য আজকের আবহাওয়া উপযোগী।',
    },
  ];

  const toggleTask = (id: string) => {
    setCompletedTasks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const completedCount = checklistItems.filter((item) => completedTasks[item.id]).length;

  return (
    <div className="space-y-8">
      {/* Editorial Field Hero Strip */}
      <section className="relative overflow-hidden rounded-xl border border-[#DCE2DA] bg-[#142119] min-h-[250px] sm:min-h-[270px] flex items-end">
        {!heroImgFailed ? (
          <img
            src={HERO_BANNER_URL}
            alt="Early morning green rice paddy fields and irrigation canal in rural Bangladesh"
            referrerPolicy="no-referrer"
            onError={() => setHeroImgFailed(true)}
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#132A1B] via-[#1C3B26] to-[#0F1F15]" />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#0B1910]/92 via-[#0B1910]/76 to-[#0B1910]/45 lg:bg-gradient-to-r lg:from-[#0C1A11]/90 lg:via-[#0C1A11]/72 lg:to-[#0C1A11]/25"
        />

        <div className="relative z-10 w-full p-6 sm:p-8 lg:p-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-2xl space-y-2.5">
            <p className="text-xs font-medium tracking-wide text-[#D1E7D8]">
              {t.heroKicker} · {language === 'bn' ? district.nameBn : district.nameEn} ({district.aezCode})
            </p>
            <h1 className="font-display headline-balance text-2xl sm:text-3xl lg:text-[34px] font-bold leading-tight text-white">
              {t.heroTitle}
            </h1>
            <p className="text-sm sm:text-[15px] leading-relaxed text-[#E3ECE5] max-w-xl">
              {t.heroSubtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('clinic')}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#142119] bg-white hover:bg-[#F3F5F2] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{t.scanCropCta}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('advisor')}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-white/12 hover:bg-white/20 border border-white/25 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{t.nav.advisor}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Full-Width 6-Metric Agro-Telemetry Strip (Flat hairline dividers, no nested cards) */}
      <section aria-label="Local climate and agro-meteorological metrics">
        <div
          className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 bg-white border border-[#E2E7E0] rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-[#E2E7E0] ${
            loadingClimate ? 'opacity-65' : ''
          }`}
        >
          <div className="p-4 sm:p-5">
            <p className="text-xs text-[#4A5B50]">{t.telemetry.temp}</p>
            <p className="mt-1.5 font-mono-tabular text-2xl font-semibold text-[#142119]">
              {climate.currentTempC.toFixed(1)}
              <span className="text-xs font-normal text-[#647469] ml-1">°C</span>
            </p>
            <p className="mt-1 text-xs text-[#647469] font-mono-tabular">
              7d peak {peakTemp.toFixed(1)}°C
            </p>
          </div>

          <div className="p-4 sm:p-5">
            <p className="text-xs text-[#4A5B50]">{t.telemetry.rain7d}</p>
            <p className="mt-1.5 font-mono-tabular text-2xl font-semibold text-[#142119]">
              {totalRain7d.toFixed(1)}
              <span className="text-xs font-normal text-[#647469] ml-1">mm</span>
            </p>
            <p className="mt-1 text-xs text-[#647469] font-mono-tabular">
              Today {climate.daily[0]?.rainMm.toFixed(1) ?? '0.0'} mm
            </p>
          </div>

          <div className="p-4 sm:p-5">
            <p className="text-xs text-[#4A5B50]">{t.telemetry.humidity}</p>
            <p className="mt-1.5 font-mono-tabular text-2xl font-semibold text-[#142119]">
              {climate.currentHumidityPct}
              <span className="text-xs font-normal text-[#647469] ml-1">%</span>
            </p>
            <p className="mt-1 text-xs text-[#647469] font-mono-tabular">
              Wind {climate.currentWindKmh} km/h
            </p>
          </div>

          <div className="p-4 sm:p-5">
            <p className="text-xs text-[#4A5B50]">{t.telemetry.et0}</p>
            <p className="mt-1.5 font-mono-tabular text-2xl font-semibold text-[#142119]">
              {avgEt0.toFixed(1)}
              <span className="text-xs font-normal text-[#647469] ml-1">mm/d</span>
            </p>
            <p className="mt-1 text-xs text-[#647469]">FAO-56 Reference</p>
          </div>

          <div className="p-4 sm:p-5">
            <p className="text-xs text-[#4A5B50]">{t.telemetry.solar}</p>
            <p className="mt-1.5 font-mono-tabular text-2xl font-semibold text-[#142119]">
              {climate.nasaSolarMjM2.toFixed(1)}
              <span className="text-xs font-normal text-[#647469] ml-1">MJ/m²</span>
            </p>
            <p className="mt-1 text-xs text-[#647469]">
              {climate.isLiveNasaPower ? 'NASA POWER live' : 'NASA climatology'}
            </p>
          </div>

          <div className="p-4 sm:p-5">
            <p className="text-xs text-[#4A5B50]">{t.telemetry.moisture}</p>
            <p className="mt-1.5 font-mono-tabular text-2xl font-semibold text-[#142119]">
              {climate.soilMoistureIndex}
              <span className="text-xs font-normal text-[#647469] ml-1">%</span>
            </p>
            <p className="mt-1 text-xs text-[#647469]">{district.dominantSoil}</p>
          </div>
        </div>
      </section>

      {/* Main 2-Column Analytical Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 cols: 7-Day Rainfall vs ET0 Chart + Today's Field Checklist */}
        <div className="lg:col-span-7 space-y-8">
          <section className="bg-white border border-[#E2E7E0] rounded-xl p-6">
            <div className="mb-5">
              <h2 className="font-display text-lg font-semibold text-[#142119]">{t.chartTitle}</h2>
              <p className="mt-1 text-sm text-[#4A5B50]">{t.chartSubtitle}</p>
            </div>
            <ClimateChart
              daily={climate.daily}
              language={language}
              rainLegend={t.rainLegend}
              et0Legend={t.et0Legend}
            />
          </section>

          <section className="bg-white border border-[#E2E7E0] rounded-xl p-6">
            <div className="flex items-baseline justify-between gap-4 pb-4 border-b border-[#E2E7E0]">
              <h2 className="font-display text-lg font-semibold text-[#142119]">{t.actionsHeading}</h2>
              <span className="font-mono-tabular text-xs text-[#4A5B50]">
                {completedCount}/{checklistItems.length} {language === 'bn' ? 'সম্পন্ন' : 'done'}
              </span>
            </div>
            <ul className="divide-y divide-[#ECEFE9]">
              {checklistItems.map((item) => {
                const checked = Boolean(completedTasks[item.id]);
                return (
                  <li key={item.id} className="py-3.5">
                    <button
                      type="button"
                      onClick={() => toggleTask(item.id)}
                      aria-pressed={checked}
                      className="w-full flex items-start gap-3 text-left cursor-pointer group"
                    >
                      <span
                        className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                          checked
                            ? 'bg-[#15803D] border-[#15803D] text-white'
                            : 'bg-white border-[#BCC7B8] group-hover:border-[#15803D]'
                        }`}
                      >
                        {checked && <Check className="w-3.5 h-3.5" />}
                      </span>
                      <span
                        className={`text-sm leading-relaxed ${
                          checked ? 'line-through text-[#647469]' : 'text-[#142119]'
                        }`}
                      >
                        {language === 'bn' ? item.textBn : item.textEn}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {/* Right 5 cols: Active Climate-Risk Advisories + Quick Links */}
        <div className="lg:col-span-5 space-y-8">
          <section className="bg-white border border-[#E2E7E0] rounded-xl p-6">
            <div className="pb-4 border-b border-[#E2E7E0]">
              <h2 className="font-display text-lg font-semibold text-[#142119]">{t.alertsHeading}</h2>
              <p className="mt-1 text-xs text-[#4A5B50]">{t.alertsSubheading}</p>
            </div>

            <div className="divide-y divide-[#ECEFE9]">
              {alerts.map((alert) => (
                <article key={alert.id} className="py-4 first:pt-4 last:pb-0 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`text-xs font-semibold ${SEVERITY_TEXT_STYLES[alert.severity]}`}>
                      {SEVERITY_GLYPH[alert.severity]} {t.severityLabels[alert.severity]}
                    </span>
                    <span className="font-mono-tabular text-xs text-[#647469]">{alert.metricSummary}</span>
                  </div>

                  <h3 className="font-display text-[15px] font-semibold text-[#142119]">
                    {language === 'bn' ? alert.titleBn : alert.titleEn}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#4A5B50]">
                    {language === 'bn' ? alert.detailBn : alert.detailEn}
                  </p>
                  <p className="text-sm leading-relaxed text-[#142119] pt-1">
                    <span className="font-semibold">
                      {language === 'bn' ? 'করণীয়: ' : 'Action: '}
                    </span>
                    {language === 'bn' ? alert.actionBn : alert.actionEn}
                  </p>
                </article>
              ))}
            </div>
          </section>

          {/* Compact District Agronomic Profile */}
          <section className="bg-white border border-[#E2E7E0] rounded-xl p-6 space-y-4">
            <h2 className="font-display text-base font-semibold text-[#142119]">
              {language === 'bn'
                ? `${district.nameBn} জেলার মাটি ও ফসল তথ্য`
                : `${district.nameEn} Soil & AEZ Profile`}
            </h2>
            <dl className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
              <div>
                <dt className="text-xs text-[#647469]">{language === 'bn' ? 'প্রধান মাটি' : 'Dominant Soil'}</dt>
                <dd className="font-medium text-[#142119] mt-0.5">{district.dominantSoil}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#647469]">{language === 'bn' ? 'মাটির গড় pH' : 'Typical Soil pH'}</dt>
                <dd className="font-mono-tabular font-medium text-[#142119] mt-0.5">{district.typicalPh.toFixed(1)}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#647469]">{language === 'bn' ? 'লবণাক্ততা' : 'Salinity Baseline'}</dt>
                <dd className="font-medium text-[#142119] mt-0.5">{district.salinityBaseline}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#647469]">{language === 'bn' ? 'বন্যার ঝুঁকি' : 'Flood Exposure'}</dt>
                <dd className="font-medium text-[#142119] mt-0.5">{district.floodRiskBaseline}</dd>
              </div>
            </dl>
            <div className="pt-3 border-t border-[#ECEFE9] flex items-center justify-between gap-3">
              <p className="text-xs text-[#4A5B50]">
                {language === 'bn'
                  ? district.primaryCropsBn.join(' · ')
                  : district.primaryCropsEn.join(' · ')}
              </p>
              <button
                type="button"
                onClick={() => onNavigate('planner')}
                className="text-xs font-semibold text-[#15803D] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                {language === 'bn' ? 'ফসল পরিকল্পনা →' : 'Open Planner →'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
