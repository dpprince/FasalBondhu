import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Upload, Camera, Trash2, BookmarkCheck, Bookmark, AlertTriangle } from 'lucide-react';
import { DIAGNOSTIC_SPECIMENS } from '../lib/bangladeshData';
import { UI_COPY } from '../lib/i18n';
import type { ClimatePayload, CropSpecimen, DiagnosisResult, DistrictProfile, Language } from '../lib/types';

interface CropClinicViewProps {
  district: DistrictProfile;
  climate: ClimatePayload;
  language: Language;
  savedLogs: DiagnosisResult[];
  onSaveLog: (entry: DiagnosisResult) => void;
  onClearLogs: () => void;
}

const CROP_OPTIONS = [
  { value: 'Rice', labelEn: 'Rice (Boro / Aman / Aus)', labelBn: 'ধান (বোরো / আমন / আউশ)' },
  { value: 'Potato', labelEn: 'Potato', labelBn: 'আলু' },
  { value: 'Tomato', labelEn: 'Tomato', labelBn: 'টমেটো' },
  { value: 'Wheat', labelEn: 'Wheat', labelBn: 'গম' },
  { value: 'Mustard', labelEn: 'Mustard', labelBn: 'সরিষা' },
  { value: 'Maize', labelEn: 'Maize', labelBn: 'ভুট্টা' },
  { value: 'Chili / Vegetables', labelEn: 'Chili / Winter Vegetables', labelBn: 'মরিচ / শাকসবজি' },
];

const SEVERITY_STYLES = {
  Critical: 'text-[#B91C1C]',
  Watch: 'text-[#B45309]',
  Nominal: 'text-[#15803D]',
} as const;

async function urlToBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not read specimen image bytes.');
  const blob = await res.blob();
  const mimeType = blob.type || 'image/jpeg';
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = String(reader.result ?? '');
      const commaIdx = dataUrl.indexOf(',');
      if (commaIdx === -1) {
        reject(new Error('Failed to encode image.'));
        return;
      }
      resolve({ base64: dataUrl.slice(commaIdx + 1), mimeType });
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(blob);
  });
}

export function CropClinicView({
  district,
  climate,
  language,
  savedLogs,
  onSaveLog,
  onClearLogs,
}: CropClinicViewProps) {
  const t = UI_COPY[language];
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [selectedSpecimenId, setSelectedSpecimenId] = useState<string | null>(null);
  const [cropName, setCropName] = useState<string>('Rice');
  const [farmerNotes, setFarmerNotes] = useState<string>('');

  const [analyzing, setAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [brokenThumbs, setBrokenThumbs] = useState<Record<string, boolean>>({});

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg(language === 'bn' ? 'দয়া করে একটি বৈধ ছবি (JPG/PNG) নির্বাচন করুন।' : 'Please select a valid image file (JPG, PNG, or WebP).');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg(language === 'bn' ? 'ছবির আকার ৮ মেগাবাইটের কম হতে হবে।' : 'Image file must be under 8 MB.');
      return;
    }

    setErrorMsg(null);
    setSelectedSpecimenId(null);
    setResult(null);
    setIsSaved(false);

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = String(reader.result ?? '');
      const commaIdx = dataUrl.indexOf(',');
      if (commaIdx !== -1) {
        setPreviewUrl(dataUrl);
        setImageBase64(dataUrl.slice(commaIdx + 1));
        setMimeType(file.type || 'image/jpeg');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectSpecimen = async (specimen: CropSpecimen) => {
    setErrorMsg(null);
    setResult(null);
    setIsSaved(false);
    setSelectedSpecimenId(specimen.id);
    setPreviewUrl(specimen.imageUrl);
    setCropName(specimen.cropEn);
    setFarmerNotes(language === 'bn' ? specimen.hintBn : specimen.hintEn);
    try {
      const encoded = await urlToBase64(specimen.imageUrl);
      setImageBase64(encoded.base64);
      setMimeType(encoded.mimeType);
    } catch {
      setImageBase64(null);
    }
  };

  const handleAnalyze = async () => {
    if (!previewUrl) {
      setErrorMsg(
        language === 'bn'
          ? 'বিশ্লেষণের আগে একটি ফসলের ছবি আপলোড করুন অথবা নমুনা ছবি বেছে নিন।'
          : 'Please upload a crop photograph or choose a field specimen before analyzing.'
      );
      return;
    }

    setAnalyzing(true);
    setErrorMsg(null);
    setIsSaved(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      let b64 = imageBase64;
      let mime = mimeType;
      if (!b64 && previewUrl) {
        const encoded = await urlToBase64(previewUrl);
        b64 = encoded.base64;
        mime = encoded.mimeType;
        setImageBase64(b64);
        setMimeType(mime);
      }

      const totalRain7d = climate.daily.reduce((s, d) => s + d.rainMm, 0);
      const weatherSummary = `Temp ${climate.currentTempC.toFixed(1)}°C, Humidity ${climate.currentHumidityPct}%, 7-day rain ${totalRain7d.toFixed(1)} mm`;

      const res = await fetch('/api/ai/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: b64,
          mimeType: mime,
          cropName,
          districtName: `${district.nameEn} (${district.aezNameEn})`,
          weatherSummary,
          farmerNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Crop diagnosis request failed.');
      }

      const enriched: DiagnosisResult = {
        ...data,
        id: `diag-${Date.now()}`,
        createdAt: new Date().toISOString(),
        districtName: language === 'bn' ? district.nameBn : district.nameEn,
        cropName,
        imageUrl: previewUrl,
      };
      setResult(enriched);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to complete diagnosis right now.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = () => {
    if (!result || isSaved) return;
    onSaveLog(result);
    setIsSaved(true);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <header className="space-y-1.5 max-w-3xl">
        <h1 className="font-display headline-balance text-2xl sm:text-3xl font-bold text-[#142119]">
          {t.clinicTitle}
        </h1>
        <p className="text-sm sm:text-[15px] text-[#4A5B50] leading-relaxed">{t.clinicSubtitle}</p>
      </header>

      {/* Main 2-Column Clinic Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 5 cols: Upload + Specimens + Context Form */}
        <section className="lg:col-span-5 bg-white border border-[#E2E7E0] rounded-xl p-6 space-y-6">
          {/* Upload Dropzone / Preview */}
          <div className="space-y-3">
            <label htmlFor="crop-photo-input" className="block text-sm font-semibold text-[#142119]">
              {t.uploadLabel}
            </label>
            <input
              ref={fileInputRef}
              id="crop-photo-input"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="sr-only"
            />

            {previewUrl ? (
              <div className="space-y-3">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-[#E2E7E0] bg-[#F3F5F2]">
                  <img
                    src={previewUrl}
                    alt="Selected crop leaf for disease diagnosis"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#142119] bg-[#F3F5F2] hover:bg-[#E6ECE4] rounded-lg transition-colors cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'অন্য ছবি বেছে নিন' : 'Change Photo'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewUrl(null);
                      setImageBase64(null);
                      setSelectedSpecimenId(null);
                      setResult(null);
                      setIsSaved(false);
                    }}
                    className="text-xs font-medium text-[#647469] hover:text-[#B91C1C] cursor-pointer"
                  >
                    {language === 'bn' ? 'ছবি সরান' : 'Remove'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-[4/3] rounded-lg border border-dashed border-[#B7C4B4] hover:border-[#15803D] bg-[#FAFAF8] hover:bg-[#F3F5F2] transition-colors flex flex-col items-center justify-center p-6 text-center gap-2.5 cursor-pointer"
              >
                <Upload className="w-7 h-7 text-[#15803D]" />
                <span className="text-sm font-semibold text-[#142119]">{t.uploadLabel}</span>
                <span className="text-xs text-[#647469] max-w-xs">{t.uploadHint}</span>
              </button>
            )}
          </div>

          {/* Curated Bangladesh Field Specimens */}
          <div className="space-y-3 pt-4 border-t border-[#ECEFE9]">
            <p className="text-xs font-semibold text-[#4A5B50]">{t.specimenHeading}</p>
            <div className="grid grid-cols-2 gap-3">
              {DIAGNOSTIC_SPECIMENS.map((spec) => {
                const active = selectedSpecimenId === spec.id;
                return (
                  <button
                    key={spec.id}
                    type="button"
                    onClick={() => handleSelectSpecimen(spec)}
                    aria-pressed={active}
                    className={`group text-left rounded-lg border overflow-hidden transition-colors cursor-pointer ${
                      active
                        ? 'border-[#15803D] bg-[#F3F8F4]'
                        : 'border-[#E2E7E0] hover:border-[#B7C4B4] bg-white'
                    }`}
                  >
                    <div className="aspect-[4/3] w-full bg-[#ECEFE9] overflow-hidden">
                      {!brokenThumbs[spec.id] ? (
                        <img
                          src={spec.imageUrl}
                          alt={language === 'bn' ? spec.labelBn : spec.labelEn}
                          referrerPolicy="no-referrer"
                          onError={() => setBrokenThumbs((prev) => ({ ...prev, [spec.id]: true }))}
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-[#647469] p-2">
                          {spec.cropEn}
                        </div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-semibold text-[#142119] truncate">
                        {language === 'bn' ? spec.labelBn : spec.labelEn}
                      </p>
                      <p className="text-[11px] text-[#647469] truncate mt-0.5">
                        {language === 'bn' ? spec.cropBn : spec.cropEn}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Crop Name & Observation Inputs */}
          <div className="space-y-4 pt-4 border-t border-[#ECEFE9]">
            <div>
              <label htmlFor="clinic-crop-select" className="block text-xs font-semibold text-[#4A5B50] mb-1.5">
                {t.cropSelectLabel}
              </label>
              <select
                id="clinic-crop-select"
                value={cropName}
                onChange={(e) => setCropName(e.target.value)}
                className="w-full h-10 px-3 text-sm text-[#142119] bg-white border border-[#D4DCD1] rounded-lg focus:outline-none focus:border-[#15803D]"
              >
                {CROP_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {language === 'bn' ? opt.labelBn : opt.labelEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="clinic-notes" className="block text-xs font-semibold text-[#4A5B50] mb-1.5">
                {t.notesLabel}
              </label>
              <textarea
                id="clinic-notes"
                rows={2}
                value={farmerNotes}
                onChange={(e) => setFarmerNotes(e.target.value)}
                placeholder={t.notesPlaceholder}
                className="w-full px-3 py-2 text-sm text-[#142119] bg-white border border-[#D4DCD1] rounded-lg focus:outline-none focus:border-[#15803D]"
              />
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B]"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={analyzing}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
            >
              {analyzing ? t.analyzingBtn : t.analyzeBtn}
            </button>
          </div>
        </section>

        {/* Right 7 cols: Diagnostic Report + Saved Field Log */}
        <div className="lg:col-span-7 space-y-8">
          <section
            aria-live="polite"
            className="bg-white border border-[#E2E7E0] rounded-xl p-6 min-h-[360px]"
          >
            {analyzing ? (
              <div className="space-y-4 py-8">
                <p className="text-sm font-semibold text-[#15803D]">{t.analyzingBtn}</p>
                <div className="space-y-2.5 animate-pulse">
                  <div className="h-6 bg-[#ECEFE9] rounded w-2/3" />
                  <div className="h-4 bg-[#F3F5F2] rounded w-full" />
                  <div className="h-4 bg-[#F3F5F2] rounded w-5/6" />
                  <div className="h-24 bg-[#F3F5F2] rounded w-full mt-4" />
                </div>
              </div>
            ) : result ? (
              <div className="space-y-6">
                {/* Report Header */}
                <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-[#E2E7E0]">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#4A5B50]">
                      <span className={`font-semibold ${SEVERITY_STYLES[result.severity]}`}>
                        {t.severityLabels[result.severity]}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{result.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">
                        {language === 'bn' ? `আস্থা ${result.confidencePct}%` : `${result.confidencePct}% confidence`}
                      </span>
                    </div>
                    <h2 className="font-display text-xl sm:text-2xl font-bold text-[#142119]">
                      {result.conditionBn}
                    </h2>
                    <p className="text-sm text-[#4A5B50] font-medium">{result.conditionEn}</p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaved}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isSaved
                        ? 'bg-[#F3F8F4] border-[#BBF7D0] text-[#15803D]'
                        : 'bg-white border-[#D4DCD1] text-[#142119] hover:bg-[#F3F5F2]'
                    }`}
                  >
                    {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                    <span>{isSaved ? t.savedBtn : t.saveLogBtn}</span>
                  </button>
                </div>

                {/* Plain Bangla Farmer Summary + English Reference */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-[#4A5B50]">
                    {language === 'bn' ? 'সহজ বাংলায় সারসংক্ষেপ' : 'Farmer Summary (Simple Bangla & English)'}
                  </h3>
                  <p className="text-[15px] leading-relaxed text-[#142119]">{result.summaryBn}</p>
                  {language === 'en' && (
                    <p className="text-sm leading-relaxed text-[#4A5B50]">{result.summaryEn}</p>
                  )}
                  <p className="text-xs text-[#647469]">
                    <span className="font-semibold text-[#4A5B50]">
                      {language === 'bn' ? 'দৃশ্যমান লক্ষণ: ' : 'Observed symptoms: '}
                    </span>
                    {language === 'bn' ? result.observedSymptomsBn : result.observedSymptomsEn}
                  </p>
                </div>

                {/* Immediate IPM & Low-Cost Organic Actions */}
                <div className="pt-5 border-t border-[#ECEFE9] space-y-3">
                  <h3 className="font-display text-sm font-semibold text-[#142119]">
                    {language === 'bn'
                      ? '০১. তাৎক্ষণিক জৈব ও সমন্বিত বালাই ব্যবস্থাপনা (IPM)'
                      : '01. Immediate Organic & IPM Field Steps'}
                  </h3>
                  <ol className="space-y-2 list-decimal list-inside text-sm text-[#142119] leading-relaxed">
                    {(language === 'bn' ? result.immediateOrganicStepsBn : result.immediateOrganicStepsEn).map(
                      (step, idx) => (
                        <li key={idx}>
                          <span>{step}</span>
                          {language === 'en' && result.immediateOrganicStepsBn[idx] && (
                            <span className="block pl-5 text-xs text-[#4A5B50] mt-0.5">
                              {result.immediateOrganicStepsBn[idx]}
                            </span>
                          )}
                        </li>
                      )
                    )}
                  </ol>
                </div>

                {/* Safe Chemical / DAE Guidance */}
                <div className="pt-5 border-t border-[#ECEFE9] space-y-2">
                  <h3 className="font-display text-sm font-semibold text-[#142119]">
                    {language === 'bn'
                      ? '০২. নিরাপদ চিকিৎসা ও কৃষি সম্প্রসারণ নির্দেশিকা'
                      : '02. Safe Treatment & Pre-Harvest Precaution'}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#142119]">
                    {language === 'bn' ? result.safeTreatmentGuidanceBn : result.safeTreatmentGuidanceEn}
                  </p>
                  {language === 'en' && (
                    <p className="text-xs leading-relaxed text-[#4A5B50]">{result.safeTreatmentGuidanceBn}</p>
                  )}
                </div>

                {/* Prevention Tips */}
                <div className="pt-5 border-t border-[#ECEFE9] space-y-2">
                  <h3 className="font-display text-sm font-semibold text-[#142119]">
                    {language === 'bn' ? '০৩. ভবিষ্যতে প্রতিরোধের উপায়' : '03. Climate-Smart Prevention'}
                  </h3>
                  <ul className="space-y-1.5 list-disc list-inside text-sm text-[#4A5B50]">
                    {(language === 'bn' ? result.preventionTipsBn : result.preventionTipsEn).map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>

                {/* Responsible AI Footer Notice */}
                <div className="pt-4 border-t border-[#ECEFE9] text-xs text-[#647469]">
                  {language === 'bn'
                    ? 'নিরাপত্তা পরামর্শ: মারাত্মক সংক্রমণের ক্ষেত্রে স্থানীয় উপ-সহকারী কৃষি কর্মকর্তা বা কৃষি কল সেন্টার ১৬১২৩ নম্বরে যোগাযোগ করে মাত্রা নিশ্চিত করুন।'
                    : 'Responsible AI Advisory: Confirm severe outbreaks and exact spray dosages with your Upazila Agriculture Office or Bangladesh Krishi Call Center (16123).'}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col justify-center py-10 space-y-4">
                <h2 className="font-display text-lg font-semibold text-[#142119]">
                  {language === 'bn'
                    ? 'ছবি নির্বাচন করে বিশ্লেষণ শুরু করুন'
                    : 'Ready to inspect your crop leaf or stem'}
                </h2>
                <p className="text-sm text-[#4A5B50] max-w-lg leading-relaxed">
                  {language === 'bn'
                    ? 'বাম পাশ থেকে আক্রান্ত পাতার পরিষ্কার ছবি আপলোড করুন অথবা যেকোনো একটি নমুনা ছবি বেছে নিয়ে "এআই দিয়ে রোগ শনাক্ত করুন" বোতামে চাপুন।'
                    : 'Upload a daylight close-up photo on the left, or click any of the four Bangladesh field specimens and press Analyze Crop with AI to receive a structured Bangla & English IPM plan.'}
                </p>
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-[#4A5B50] border-t border-[#ECEFE9]">
                  <div>
                    <p className="font-semibold text-[#142119]">
                      {language === 'bn' ? 'সমন্বিত দমন অগ্রাধিকার' : 'IPM-First Triage'}
                    </p>
                    <p className="mt-1">
                      {language === 'bn'
                        ? 'রাসায়নিকের আগে কম খরচের জৈব ও পরিচর্যা পদ্ধতি।'
                        : 'Cultural and low-cost organic steps before chemicals.'}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-[#142119]">
                      {language === 'bn' ? 'আবহাওয়া-ভিত্তিক বিশ্লেষণ' : 'Weather-Grounded'}
                    </p>
                    <p className="mt-1">
                      {language === 'bn'
                        ? `${district.nameBn} জেলার আর্দ্রতা ও তাপমাত্রা বিবেচনা করে।`
                        : `Uses ${district.nameEn} humidity and rainfall context.`}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-[#142119]">
                      {language === 'bn' ? 'সরাসরি মাঠের খাতা' : 'Local Field Log'}
                    </p>
                    <p className="mt-1">
                      {language === 'bn'
                        ? 'প্রতিটি রিপোর্ট আপনার ডিভাইসে সংরক্ষণ করা যাবে।'
                        : 'Save reports locally to track plots across the season.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Saved Field Log */}
          <section className="bg-white border border-[#E2E7E0] rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-[#E2E7E0]">
              <h2 className="font-display text-base font-semibold text-[#142119]">
                {t.fieldLogHeading}{' '}
                <span className="font-mono-tabular text-xs font-normal text-[#647469] ml-1">
                  ({savedLogs.length})
                </span>
              </h2>
              {savedLogs.length > 0 && (
                <button
                  type="button"
                  onClick={onClearLogs}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#647469] hover:text-[#B91C1C] cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t.clearLogBtn}</span>
                </button>
              )}
            </div>

            {savedLogs.length === 0 ? (
              <p className="text-sm text-[#647469] py-2">{t.fieldLogEmpty}</p>
            ) : (
              <ul className="divide-y divide-[#ECEFE9]">
                {savedLogs.map((entry) => (
                  <li key={entry.id ?? entry.conditionEn} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#142119] truncate">
                        {language === 'bn' ? entry.conditionBn : entry.conditionEn}
                      </p>
                      <p className="text-xs text-[#647469] mt-0.5">
                        {entry.cropName} · {entry.districtName} ·{' '}
                        <span className={SEVERITY_STYLES[entry.severity]}>{t.severityLabels[entry.severity]}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setResult(entry);
                        if (entry.imageUrl) setPreviewUrl(entry.imageUrl);
                        setIsSaved(true);
                      }}
                      className="text-xs font-semibold text-[#15803D] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {language === 'bn' ? 'দেখুন' : 'View'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
