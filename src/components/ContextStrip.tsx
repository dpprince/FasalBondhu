import { RefreshCw } from 'lucide-react';
import { BANGLADESH_DISTRICTS } from '../lib/bangladeshData';
import { UI_COPY } from '../lib/i18n';
import type { BanglaSeason, ClimatePayload, DistrictProfile, Language } from '../lib/types';

interface ContextStripProps {
  district: DistrictProfile;
  onChangeDistrict: (districtId: string) => void;
  season: BanglaSeason;
  language: Language;
  onChangeLanguage: (lang: Language) => void;
  climate: ClimatePayload | null;
  loadingClimate: boolean;
  onRefreshClimate: () => void;
}

const SEASON_BN: Record<BanglaSeason, string> = {
  Rabi: 'রবি মৌসুম',
  'Kharif-1': 'খরিপ-১ (আউশ)',
  'Kharif-2': 'খরিপ-২ (আমন)',
};

export function ContextStrip({
  district,
  onChangeDistrict,
  season,
  language,
  onChangeLanguage,
  climate,
  loadingClimate,
  onRefreshClimate,
}: ContextStripProps) {
  const t = UI_COPY[language];

  return (
    <section
      aria-label="Active farm location and language"
      className="bg-[#F3F5F2] border-b border-[#E2E7E0]"
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* Left: District picker + clean unboxed metadata */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2">
            <label htmlFor="district-select" className="text-xs font-medium text-[#4A5B50] whitespace-nowrap">
              {t.districtLabel}
            </label>
            <select
              id="district-select"
              value={district.id}
              onChange={(e) => onChangeDistrict(e.target.value)}
              className="h-10 px-3 text-sm font-semibold text-[#142119] bg-white border border-[#D4DCD1] rounded-lg focus:outline-none focus:border-[#15803D] cursor-pointer"
            >
              {BANGLADESH_DISTRICTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {language === 'bn' ? `${d.nameBn} (${d.aezCode})` : `${d.nameEn} — ${d.aezCode}`}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#4A5B50]">
            <span className="font-medium text-[#142119]">
              {language === 'bn' ? district.aezNameBn : district.aezNameEn}
            </span>
            <span aria-hidden="true">·</span>
            <span>{language === 'bn' ? SEASON_BN[season] : `${season} Season`}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">
              {district.lat.toFixed(2)}°N, {district.lon.toFixed(2)}°E
            </span>
            {climate && (
              <span className="w-full sm:w-auto text-[#4A5B50] sm:before:content-['·'] sm:before:mr-2">
                {climate.sourceLabel}
              </span>
            )}
          </div>
        </div>

        {/* Right: Refresh + EN/বাংলা Segmented Switch */}
        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onRefreshClimate}
            disabled={loadingClimate}
            aria-label={language === 'bn' ? 'আবহাওয়া তথ্য হালনাগাদ করুন' : 'Refresh climate telemetry'}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#4A5B50] hover:text-[#142119] bg-white border border-[#D4DCD1] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingClimate ? 'animate-spin' : ''}`} />
            <span>{language === 'bn' ? 'হালনাগাদ' : 'Refresh'}</span>
          </button>

          <div
            role="group"
            aria-label="Interface language"
            className="inline-flex items-center p-0.5 bg-[#E6ECE4] rounded-lg border border-[#D4DCD1]"
          >
            <button
              type="button"
              onClick={() => onChangeLanguage('en')}
              aria-pressed={language === 'en'}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                language === 'en'
                  ? 'bg-white text-[#142119] shadow-xs'
                  : 'text-[#4A5B50] hover:text-[#142119]'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => onChangeLanguage('bn')}
              aria-pressed={language === 'bn'}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                language === 'bn'
                  ? 'bg-white text-[#142119] shadow-xs'
                  : 'text-[#4A5B50] hover:text-[#142119]'
              }`}
            >
              বাংলা
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
