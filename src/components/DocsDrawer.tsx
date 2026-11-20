import { X } from 'lucide-react';
import type { Language } from '../lib/types';

interface DocsDrawerProps {
  open: boolean;
  onClose: () => void;
  language: Language;
}

export function DocsDrawer({ open, onClose, language }: DocsDrawerProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Data Sources, Model Card, and Responsible AI"
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
    >
      <div className="w-full max-w-xl bg-white h-full overflow-y-auto border-l border-[#E2E7E0] p-6 sm:p-8 space-y-6">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#E2E7E0]">
          <div>
            <h2 className="font-display text-xl font-bold text-[#142119]">
              {language === 'bn' ? 'তথ্যসূত্র, মডেল কার্ড ও দায়িত্বশীল এআই' : 'Data Sources, Model Card & Responsible AI'}
            </h2>
            <p className="text-xs text-[#647469] mt-1">
              FasalBondhu AI · Transparency & Agricultural Governance
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close transparency panel"
            className="p-2 rounded-lg text-[#4A5B50] hover:bg-[#F3F5F2] hover:text-[#142119] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <section className="space-y-2">
          <h3 className="font-display text-sm font-semibold text-[#142119]">
            01. Agricultural & Climate Data Sources
          </h3>
          <ul className="text-sm text-[#4A5B50] space-y-1.5 list-disc list-inside leading-relaxed">
            <li>
              <strong className="text-[#142119]">NASA POWER AG API</strong> — Surface shortwave solar irradiance (
              <span className="font-mono-tabular">ALLSKY_SFC_SW_DWN</span>) and 2m relative humidity climatology.
            </li>
            <li>
              <strong className="text-[#142119]">Open-Meteo Agro-Weather</strong> — Live 7-day district forecasts including
              FAO-56 reference evapotranspiration (<span className="font-mono-tabular">ET₀</span>), rainfall, and wind gusts.
            </li>
            <li>
              <strong className="text-[#142119]">BAMIS, BRRI, BARI & BINA</strong> — Agro-Ecological Zone (AEZ) profiles,
              crop varieties (e.g., BRRI dhan89, BINA dhan-10, BARI Alu-25), and Alternate Wetting & Drying (AWD) benchmarks.
            </li>
          </ul>
        </section>

        <section className="space-y-2 pt-4 border-t border-[#ECEFE9]">
          <h3 className="font-display text-sm font-semibold text-[#142119]">
            02. AI Model Card & Limitations
          </h3>
          <p className="text-sm text-[#4A5B50] leading-relaxed">
            Multimodal crop leaf triage and Bangla farming guidance are powered server-side by Google Gemini (
            <span className="font-mono-tabular">gemini-4-hydrogen</span>), paired with deterministic unit-tested
            agro-meteorological calculators for climate risk alerts, crop ranking, and irrigation volume math.
          </p>
          <p className="text-sm text-[#4A5B50] leading-relaxed">
            Photo diagnosis is an assistive first-pass tool—not a substitute for lab testing. Blurry or dimly lit leaf photos
            can confuse nutrient stress with viral or fungal infections.
          </p>
        </section>

        <section className="space-y-2 pt-4 border-t border-[#ECEFE9]">
          <h3 className="font-display text-sm font-semibold text-[#142119]">
            03. Responsible AI Commitments
          </h3>
          <ul className="text-sm text-[#4A5B50] space-y-1.5 list-disc list-inside leading-relaxed">
            <li>
              <strong className="text-[#142119]">IPM-First Safety</strong>: Prioritizes low-cost cultural, mechanical, and
              organic practices before chemical intervention.
            </li>
            <li>
              <strong className="text-[#142119]">Extension Verification</strong>: Advises confirming severe outbreaks and
              chemical dosages with Upazila Agriculture Officers or Bangladesh Krishi Call Center (<span className="font-mono-tabular">16123</span>).
            </li>
            <li>
              <strong className="text-[#142119]">Farmer Privacy</strong>: Uploaded crop photos are analyzed in-memory and not
              stored remotely; field logs stay on the user&apos;s device.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
