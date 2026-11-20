import { useState } from 'react';
import type { FormEvent } from 'react';
import { Send, AlertTriangle } from 'lucide-react';
import { UI_COPY } from '../lib/i18n';
import type { AdvisorMessage, BanglaSeason, ClimatePayload, ClimateRiskAlert, DistrictProfile, Language } from '../lib/types';

interface BanglaAdvisorViewProps {
  district: DistrictProfile;
  season: BanglaSeason;
  climate: ClimatePayload;
  alerts: ClimateRiskAlert[];
  language: Language;
}

const STARTER_PROMPTS = [
  {
    bn: 'বোরো ধানের পাতা হলুদ হয়ে যাচ্ছে এবং গোড়া নরম—এখন কী করবো?',
    en: 'My Boro rice leaves are yellowing near the lower stem—what should I check first?',
  },
  {
    bn: 'ঘন কুয়াশা ও উচ্চ আর্দ্রতায় আলুর লেট ব্লাইট ঠেকাতে কী ব্যবস্থা নেবো?',
    en: 'How can I protect my Rabi potato plot from late blight during foggy weather?',
  },
  {
    bn: 'বন্যার পানি নেমে যাওয়ার পর জমিতে কোন ফসল ও সার দেওয়া নিরাপদ?',
    en: 'After floodwater recedes, what crops and soil recovery steps are safest?',
  },
  {
    bn: 'এডব্লিউডি (AWD) পাইপ ব্যবহার করে ধানে কত দিন পরপর সেচ দেবো?',
    en: 'How do I use a perforated PVC pipe for AWD irrigation in rice?',
  },
];

export function BanglaAdvisorView({
  district,
  season,
  climate,
  alerts,
  language,
}: BanglaAdvisorViewProps) {
  const t = UI_COPY[language];
  const [messages, setMessages] = useState<AdvisorMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text:
        language === 'bn'
          ? `আসসালামু আলাইকুম। আমি ফসলবন্ধু এআই। আপনার ${district.nameBn} (${district.aezCode}) জেলার বর্তমান আবহাওয়া ও ${season} মৌসুমের তথ্য বিবেচনা করে ফসলের রোগ, সেচ, সার বা আবহাওয়া ঝুঁকি নিয়ে সহজ বাংলায় প্রশ্ন করুন।`
          : `Welcome to FasalBondhu AI. I am grounded in your active ${district.nameEn} (${district.aezCode}) forecast and ${season} season profile. Ask any question in English or Bangla about crop health, soil care, irrigation, or weather precautions.`,
      createdAt: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sendQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || sending) return;

    const userMsg: AdvisorMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
      createdAt: new Date().toISOString(),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setErrorMsg(null);
    setSending(true);

    try {
      const totalRain7d = climate.daily.reduce((s, d) => s + d.rainMm, 0);
      const weatherSummary = `Temp ${climate.currentTempC.toFixed(1)}°C, RH ${climate.currentHumidityPct}%, 7d rain ${totalRain7d.toFixed(1)} mm, NASA solar ${climate.nasaSolarMjM2} MJ/m2`;
      const activeAlerts = alerts.map((a) => `${a.severity} ${a.titleEn}`).join('; ');

      const res = await fetch('/api/ai/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: nextHistory.slice(-6).map((m) => ({ role: m.role, text: m.text })),
          districtName: district.nameEn,
          aezName: `${district.aezCode} ${district.aezNameEn}`,
          season,
          weatherSummary,
          activeAlerts,
          language,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Advisor could not reply.');

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: data.reply,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to reach advisor.');
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendQuestion(input);
  };

  return (
    <div className="space-y-8">
      <header className="space-y-1.5 max-w-3xl">
        <h1 className="font-display headline-balance text-2xl sm:text-3xl font-bold text-[#142119]">
          {t.advisorTitle}
        </h1>
        <p className="text-sm sm:text-[15px] text-[#4A5B50] leading-relaxed">{t.advisorSubtitle}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 8 cols: Conversation Workspace */}
        <section className="lg:col-span-8 bg-white border border-[#E2E7E0] rounded-xl flex flex-col min-h-[500px]">
          <div className="px-6 py-3.5 border-b border-[#E2E7E0] flex flex-wrap items-center justify-between gap-2 text-xs text-[#4A5B50]">
            <span>
              {language === 'bn' ? district.nameBn : district.nameEn} · {district.aezCode} · {season}
            </span>
            <span className="font-mono-tabular">
              {climate.currentTempC.toFixed(1)}°C · RH {climate.currentHumidityPct}%
            </span>
          </div>

          <div className="flex-1 p-6 space-y-5 overflow-y-auto max-h-[520px]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <span className="text-[11px] font-medium text-[#647469] mb-1">
                  {msg.role === 'user'
                    ? language === 'bn'
                      ? 'আপনার প্রশ্ন'
                      : 'Farmer'
                    : t.brand}
                </span>
                <div
                  className={`max-w-[88%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                    msg.role === 'user'
                      ? 'bg-[#15803D] text-white'
                      : 'bg-[#F3F5F2] text-[#142119] border border-[#E2E7E0]'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex flex-col items-start">
                <span className="text-[11px] font-medium text-[#647469] mb-1">{t.brand}</span>
                <div className="rounded-xl px-4 py-3 text-sm text-[#4A5B50] bg-[#F3F5F2] border border-[#E2E7E0]">
                  {language === 'bn' ? 'পরামর্শ প্রস্তুত করা হচ্ছে...' : 'Preparing local farming advice...'}
                </div>
              </div>
            )}
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="mx-6 mb-3 flex items-start gap-2 p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B]"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-4 border-t border-[#E2E7E0] flex items-center gap-3">
            <label htmlFor="advisor-input" className="sr-only">
              {t.advisorPlaceholder}
            </label>
            <input
              id="advisor-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.advisorPlaceholder}
              className="flex-1 h-11 px-3.5 text-sm text-[#142119] bg-[#FAFAF8] border border-[#D4DCD1] rounded-lg focus:outline-none focus:border-[#15803D] focus:bg-white"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="inline-flex items-center gap-2 h-11 px-4 text-sm font-semibold text-white bg-[#15803D] hover:bg-[#166534] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{t.sendBtn}</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </section>

        {/* Right 4 cols: Curated Rural Farming Questions */}
        <aside className="lg:col-span-4 bg-white border border-[#E2E7E0] rounded-xl p-6 space-y-4">
          <h2 className="font-display text-base font-semibold text-[#142119] pb-3 border-b border-[#E2E7E0]">
            {language === 'bn' ? 'দ্রুত জিজ্ঞাসার বিষয়' : 'Common Field Questions'}
          </h2>
          <div className="divide-y divide-[#ECEFE9]">
            {STARTER_PROMPTS.map((item, idx) => {
              const prompt = language === 'bn' ? item.bn : item.en;
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={sending}
                  onClick={() => sendQuestion(prompt)}
                  className="w-full py-3 text-left text-sm text-[#142119] hover:text-[#15803D] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {prompt}
                </button>
              );
            })}
          </div>
          <p className="pt-3 border-t border-[#ECEFE9] text-xs text-[#647469] leading-relaxed">
            {language === 'bn'
              ? 'জরুরি কৃষি সহায়তার জন্য সরকারি কৃষি কল সেন্টার ১৬১২৩ নম্বরে কল করুন।'
              : 'For urgent field emergencies, contact Bangladesh DAE Krishi Call Center at 16123.'}
          </p>
        </aside>
      </div>
    </div>
  );
}
