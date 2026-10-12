import React, { useState, useMemo } from 'react';
import { 
  Drop, 
  CurrencyInr, 
  WarningCircle, 
  Printer, 
  UserPlus,
  CalendarCheck,
  ClockCounterClockwise,
  DeviceMobile,
  Cloud,
  CloudCheck,
  List,
  X
} from '@phosphor-icons/react';

export function Sidebar({ 
  customers, 
  onPrintRoute, 
  activeTab, 
  setActiveTab,
  onTriggerInstall,
  isInstallable,
  isCloudConnected,
  onOpenCloudSync
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Today's metrics
  const todayDeliveredCans = customers.reduce((sum, c) => sum + (c.todayCans ?? (c.todayEntry?.cansBought || 0)), 0);
  
  // Pending bending count
  const bendingCount = customers.filter(c => (c.totalOutstandingBending ?? 0) > 0).length;

  const todayDeliveredCount = customers.filter(c => (c.todayCans ?? (c.todayEntry?.cansBought || 0)) > 0).length;

  const todayDateFormatted = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date());

  // Aggregate distinct dates
  const distinctDateCount = useMemo(() => {
    const dates = new Set();
    customers.forEach(c => {
      if (Array.isArray(c.entries)) {
        c.entries.forEach(e => {
          if (e.date) dates.add(e.date);
        });
      }
      if (c.todayEntry?.date) dates.add(c.todayEntry.date);
      if (Array.isArray(c.history)) {
        c.history.forEach(h => {
          if (h.date) dates.add(h.date);
        });
      }
    });
    return dates.size;
  }, [customers]);

  const tabs = [
    {
      id: 'entries',
      label: 'Cane Entries',
      icon: Drop,
      badge: todayDeliveredCount > 0 ? `${todayDeliveredCount} logged` : null,
      badgeColor: 'bg-ocean-100 text-ocean-800 border-ocean-200'
    },
    {
      id: 'todayUpdate',
      label: "Today's Update",
      icon: CalendarCheck,
      badge: `${todayDeliveredCans} cans`,
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300'
    },
    {
      id: 'allDates',
      label: 'On Date & Customer Details',
      icon: ClockCounterClockwise,
      badge: `${distinctDateCount} dates`,
      badgeColor: 'bg-slate-100 text-slate-800 border-slate-300'
    },
    {
      id: 'bending',
      label: 'Bending Customers',
      icon: WarningCircle,
      badge: bendingCount > 0 ? `${bendingCount}` : null,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300'
    },
    {
      id: 'addCustomer',
      label: 'Add New Customer',
      icon: UserPlus,
      badge: null,
      badgeColor: ''
    }
  ];

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  };

  const navContent = (
    <div className="flex flex-col h-full justify-between">
      {/* 1. BRAND SECTION (Top of Left Sidebar) */}
      <div>
        <div className="flex items-center gap-3 pb-5 mb-5 border-b border-slate-200/80">
          <div className="p-1 rounded-2xl bg-ocean-100/60 ring-1 ring-ocean-200 shadow-sm flex items-center justify-center shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ocean-500 to-ocean-700 flex items-center justify-center text-white shadow-glow-cyan">
              <Drop weight="fill" className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900 truncate">
                Tamilan Waters
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-ocean-100 text-ocean-800 border border-ocean-200">
                20L
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5">
              <span>தமிழன் வாட்டர்ஸ்</span>
              <span className="mx-1">•</span>
              <span>{todayDateFormatted}</span>
            </p>
          </div>
        </div>

        {/* 2. VERTICAL NAVIGATION ITEMS */}
        <div className="space-y-1">
          <p className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Navigation Menu
          </p>
          <nav className="space-y-1.5" aria-label="Main Navigation">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`w-full tactile-btn relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 text-left ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      weight={isActive ? 'fill' : 'regular'}
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-ocean-400' : 'text-slate-500'
                      }`}
                    />
                    <span className="truncate">{tab.label}</span>
                  </div>

                  {tab.badge && (
                    <span
                      className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors shrink-0 ${
                        isActive
                          ? 'bg-slate-800 text-ocean-300 border-slate-700'
                          : tab.badgeColor
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* 3. UTILITY ACTIONS & CLOUD SYNC (Bottom of Left Sidebar) */}
      <div className="pt-5 mt-5 border-t border-slate-200/80 space-y-2">
        <p className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
          Actions & Cloud
        </p>

        {/* Cloud Sync Status */}
        <button
          onClick={() => {
            onOpenCloudSync();
            setIsMobileMenuOpen(false);
          }}
          className={`w-full tactile-btn flex items-center justify-between px-3.5 py-2 text-xs font-bold rounded-xl transition-colors shadow-2xs ${
            isCloudConnected
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
              : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
          }`}
          title={isCloudConnected ? "Live multi-phone cloud sync active" : "Connect cloud database for multiple phones"}
        >
          <div className="flex items-center gap-2">
            {isCloudConnected ? (
              <CloudCheck weight="fill" className="w-4 h-4 text-emerald-600" />
            ) : (
              <Cloud weight="bold" className="w-4 h-4 text-amber-600" />
            )}
            <span>{isCloudConnected ? 'Cloud Synced' : 'Connect Cloud'}</span>
          </div>
          {isCloudConnected ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          ) : (
            <span className="text-[10px] bg-amber-200/80 px-1.5 py-0.2 rounded text-amber-900 font-bold">Setup</span>
          )}
        </button>

        {/* Install Mobile App */}
        <button
          onClick={() => {
            onTriggerInstall();
            setIsMobileMenuOpen(false);
          }}
          className="w-full tactile-btn flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-ocean-50 text-ocean-800 border border-ocean-200 shadow-2xs hover:bg-ocean-100 transition-colors"
        >
          <DeviceMobile weight="bold" className="w-4 h-4 text-ocean-600" />
          <span>Install Mobile App</span>
        </button>

        {/* Printable Delivery Sheet */}
        <button
          onClick={() => {
            onPrintRoute();
            setIsMobileMenuOpen(false);
          }}
          className="w-full tactile-btn flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white text-slate-700 border border-slate-200 shadow-2xs hover:bg-slate-50 hover:text-slate-900"
        >
          <Printer weight="bold" className="w-4 h-4 text-ocean-600" />
          <span>Print Delivery Sheet</span>
        </button>

        <div className="px-3 pt-2 text-[10px] text-slate-400">
          Tamilan Waters • v1.0 Live
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. DESKTOP & TABLET: Permanent Vertical Left Sidebar */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-white border-r border-slate-200/90 h-[100dvh] sticky top-0 shrink-0 p-4 shadow-xs overflow-y-auto z-30">
        {navContent}
      </aside>

      {/* 2. MOBILE: Compact Top Bar with Hamburger Trigger */}
      <header className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center hover:bg-slate-200 active:scale-95 transition-all"
            aria-label="Open navigation menu"
          >
            <List weight="bold" className="w-5 h-5 text-slate-800" />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-ocean-600 flex items-center justify-center text-white">
              <Drop weight="fill" className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-sm text-slate-900">Tamilan Waters</span>
          </div>
        </div>

        {/* Mobile Quick Action Pill */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenCloudSync}
            className={`p-1.5 rounded-lg text-xs font-bold ${
              isCloudConnected ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'
            }`}
            title="Cloud Status"
          >
            {isCloudConnected ? (
              <CloudCheck weight="fill" className="w-4 h-4 text-emerald-600" />
            ) : (
              <Cloud weight="bold" className="w-4 h-4 text-amber-600" />
            )}
          </button>
          <button
            onClick={onPrintRoute}
            className="p-1.5 rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200"
            title="Print Delivery Sheet"
          >
            <Printer weight="bold" className="w-4 h-4 text-ocean-600" />
          </button>
        </div>
      </header>

      {/* 3. MOBILE: Slide-Out Vertical Left Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-2xl p-4 flex flex-col justify-between overflow-y-auto animate-slide-right">
            <div className="flex items-center justify-end pb-1">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                aria-label="Close menu"
              >
                <X weight="bold" className="w-4 h-4" />
              </button>
            </div>
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
