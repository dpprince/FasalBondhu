import { useCallback, useEffect, useMemo, useState } from 'react';
import { BANGLADESH_DISTRICTS } from './lib/bangladeshData';
import { buildFallbackClimate, computeClimateRisks, getCurrentBanglaSeason } from './lib/agroEngine';
import { UI_COPY } from './lib/i18n';
import type { ClimatePayload, DiagnosisResult, Language, WorkspaceTab } from './lib/types';
import { TopBar } from './components/TopBar';
import { ContextStrip } from './components/ContextStrip';
import { FieldPulseView } from './components/FieldPulseView';
import { CropClinicView } from './components/CropClinicView';
import { CropPlannerView } from './components/CropPlannerView';
import { IrrigationView } from './components/IrrigationView';
import { BanglaAdvisorView } from './components/BanglaAdvisorView';
import { DocsDrawer } from './components/DocsDrawer';

const FIELD_LOG_STORAGE_KEY = 'fasalbondhu_field_logs_v1';

function loadSavedLogs(): DiagnosisResult[] {
  try {
    const raw = window.localStorage.getItem(FIELD_LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('pulse');
  const [language, setLanguage] = useState<Language>('en');
  const [districtId, setDistrictId] = useState<string>('rajshahi');
  const [docsOpen, setDocsOpen] = useState<boolean>(false);

  const district = useMemo(
    () => BANGLADESH_DISTRICTS.find((d) => d.id === districtId) ?? BANGLADESH_DISTRICTS[0],
    [districtId]
  );

  const season = useMemo(() => getCurrentBanglaSeason(new Date().getMonth()), []);

  const [climate, setClimate] = useState<ClimatePayload>(() => buildFallbackClimate(district));
  const [loadingClimate, setLoadingClimate] = useState<boolean>(false);
  const [savedLogs, setSavedLogs] = useState<DiagnosisResult[]>(() => loadSavedLogs());

  const fetchClimate = useCallback(async (targetDistrictId: string) => {
    const target = BANGLADESH_DISTRICTS.find((d) => d.id === targetDistrictId) ?? BANGLADESH_DISTRICTS[0];
    setLoadingClimate(true);
    try {
      const res = await fetch(`/api/climate?districtId=${encodeURIComponent(target.id)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ClimatePayload = await res.json();
      setClimate(data);
    } catch {
      setClimate(buildFallbackClimate(target));
    } finally {
      setLoadingClimate(false);
    }
  }, []);

  useEffect(() => {
    setClimate(buildFallbackClimate(district));
    fetchClimate(district.id);
  }, [district, fetchClimate]);

  const alerts = useMemo(() => computeClimateRisks(climate.daily, district), [climate.daily, district]);

  const handleSaveLog = (entry: DiagnosisResult) => {
    setSavedLogs((prev) => {
      const updated = [entry, ...prev].slice(0, 12);
      try {
        window.localStorage.setItem(FIELD_LOG_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage quota issues
      }
      return updated;
    });
  };

  const handleClearLogs = () => {
    setSavedLogs([]);
    try {
      window.localStorage.removeItem(FIELD_LOG_STORAGE_KEY);
    } catch {
      // Ignore
    }
  };

  const handleSelectTab = (tab: WorkspaceTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const t = UI_COPY[language];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF8] text-[#142119]">
      <TopBar activeTab={activeTab} onSelectTab={handleSelectTab} language={language} />

      <ContextStrip
        district={district}
        onChangeDistrict={setDistrictId}
        season={season}
        language={language}
        onChangeLanguage={setLanguage}
        climate={climate}
        loadingClimate={loadingClimate}
        onRefreshClimate={() => fetchClimate(district.id)}
      />

      <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'pulse' && (
          <FieldPulseView
            district={district}
            climate={climate}
            loadingClimate={loadingClimate}
            alerts={alerts}
            language={language}
            onNavigate={handleSelectTab}
          />
        )}

        {activeTab === 'clinic' && (
          <CropClinicView
            district={district}
            climate={climate}
            language={language}
            savedLogs={savedLogs}
            onSaveLog={handleSaveLog}
            onClearLogs={handleClearLogs}
          />
        )}

        {activeTab === 'planner' && (
          <CropPlannerView
            district={district}
            season={season}
            climate={climate}
            language={language}
          />
        )}

        {activeTab === 'irrigation' && (
          <IrrigationView
            district={district}
            climate={climate}
            language={language}
          />
        )}

        {activeTab === 'advisor' && (
          <BanglaAdvisorView
            district={district}
            season={season}
            climate={climate}
            alerts={alerts}
            language={language}
          />
        )}
      </main>

      <footer className="border-t border-[#E2E7E0] bg-white">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#647469]">
          <p>
            {t.brand} · {t.daeHelpline}
          </p>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setDocsOpen(true)}
              className="font-medium text-[#4A5B50] hover:text-[#15803D] transition-colors cursor-pointer"
            >
              {t.docsLink}
            </button>
          </div>
        </div>
      </footer>

      <DocsDrawer open={docsOpen} onClose={() => setDocsOpen(false)} language={language} />
    </div>
  );
}
