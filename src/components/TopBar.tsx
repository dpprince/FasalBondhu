import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { UI_COPY } from '../lib/i18n';
import type { Language, WorkspaceTab } from '../lib/types';

interface TopBarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  language: Language;
}

const TAB_KEYS: WorkspaceTab[] = ['pulse', 'clinic', 'planner', 'irrigation', 'advisor'];

export function TopBar({ activeTab, onSelectTab, language }: TopBarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = UI_COPY[language];

  const handleNavClick = (tab: WorkspaceTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-[#FFFFFF]/95 backdrop-blur-sm border-b border-[#E2E7E0]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element Brand Wordmark */}
        <a
          href="#pulse"
          onClick={(e) => {
            e.preventDefault();
            handleNavClick('pulse');
          }}
          className="font-display text-lg font-bold tracking-tight text-[#142119] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#15803D]"
        >
          {t.brand}
        </a>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav aria-label="Primary" className="hidden md:flex items-center gap-6">
          {TAB_KEYS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => handleNavClick(tab)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative py-2 text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#15803D] ${
                  isActive
                    ? 'text-[#142119]'
                    : 'text-[#4A5B50] hover:text-[#142119]'
                }`}
              >
                {t.nav[tab]}
                <span
                  aria-hidden="true"
                  className={`absolute left-0 right-0 bottom-0 h-[2px] transition-opacity duration-150 ${
                    isActive ? 'bg-[#15803D] opacity-100' : 'bg-[#15803D] opacity-0'
                  }`}
                />
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action (+ mobile menu trigger on small screens) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleNavClick('clinic')}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#15803D] hover:bg-[#166534] rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803D]"
          >
            {t.scanCropCta}
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg text-[#142119] hover:bg-[#F3F5F2] transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile Navigation"
          className="md:hidden border-t border-[#E2E7E0] bg-white px-4 py-3 flex flex-col gap-1"
        >
          {TAB_KEYS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => handleNavClick(tab)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full text-left px-3 py-3 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#F3F5F2] text-[#15803D] font-semibold'
                    : 'text-[#4A5B50] hover:bg-[#FAFAF8] hover:text-[#142119]'
                }`}
              >
                {t.nav[tab]}
              </button>
            );
          })}
        </nav>
      )}
    </header>
  );
}
