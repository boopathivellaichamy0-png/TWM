import React, { useMemo } from 'react';
import { 
  Drop, 
  CurrencyInr, 
  WarningCircle, 
  Printer, 
  ArrowClockwise, 
  UserPlus,
  CalendarCheck,
  ClockCounterClockwise,
  ArrowRight
} from '@phosphor-icons/react';

export function Header({ 
  customers, 
  onPrintRoute, 
  onResetData, 
  activeTab, 
  setActiveTab 
}) {
  // Today's metrics
  const todayDeliveredCans = customers.reduce((sum, c) => sum + (c.todayEntry?.cansBought || 0), 0);
  const todayCollectedCash = customers.reduce((sum, c) => sum + (c.todayEntry?.amountPaid || 0), 0);
  
  // Total pending/bending across all customers
  const totalBendingAmount = customers.reduce((sum, c) => {
    const todayCans = c.todayEntry?.cansBought || 0;
    const rate = c.amountPerCane || 0;
    const todayPaid = c.todayEntry?.amountPaid || 0;
    const todayBending = Math.max(0, (todayCans * rate) - todayPaid);
    const prevBending = c.previousBendingAmount || 0;
    return sum + todayBending + prevBending;
  }, 0);

  const bendingCount = customers.filter(c => {
    const todayCans = c.todayEntry?.cansBought || 0;
    const rate = c.amountPerCane || 0;
    const todayPaid = c.todayEntry?.amountPaid || 0;
    const todayBending = (todayCans * rate) - todayPaid;
    const total = (c.previousBendingAmount || 0) + todayBending;
    return total > 0;
  }).length;

  const todayDeliveredCount = customers.filter(c => (c.todayEntry?.cansBought || 0) > 0).length;

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
      label: "All Dates & Months",
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

  return (
    <header className="relative z-10 pt-5 pb-3 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-3">
      {/* 1. TOP BRAND & ACTION BAR: Logo and Brand on Left, Utility Actions on Right */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200/80">
        {/* Brand identity on the left */}
        <div className="flex items-center gap-3">
          <div className="p-1 rounded-2xl bg-ocean-100/60 ring-1 ring-ocean-200 shadow-sm flex items-center justify-center shrink-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-ocean-500 to-ocean-700 flex items-center justify-center text-white shadow-glow-cyan">
              <Drop weight="fill" className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 font-sans">
                Tamilan Waters
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-ocean-100 text-ocean-800 border border-ocean-200">
                20L
              </span>
            </div>
            <p className="text-[11px] sm:text-xs font-medium text-slate-500 mt-0.5 flex items-center gap-1.5">
              <span>தமிழன் வாட்டர்ஸ்</span>
              <span>•</span>
              <span>{todayDateFormatted}</span>
            </p>
          </div>
        </div>

        {/* Quick action buttons on the right */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            onClick={onPrintRoute}
            className="tactile-btn inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50 hover:text-slate-900"
            title="Print daily delivery and collection sheet"
          >
            <Printer weight="bold" className="w-3.5 h-3.5 text-ocean-600" />
            <span>Delivery Sheet</span>
          </button>

          <button
            onClick={onResetData}
            className="tactile-btn inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800"
            title="Reset to default Tamilan Waters sample customers"
          >
            <ArrowClockwise weight="bold" className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* 2. DEDICATED NAVIGATION BAR: Clean, ordered, centered, never overlapping */}
      <div className="w-full flex items-center justify-start sm:justify-center overflow-x-auto pb-1 scrollbar-none">
        <nav className="inline-flex p-1.5 rounded-2xl bg-white border border-slate-200/90 shadow-sm items-center gap-1 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tactile-btn relative flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon
                  weight={isActive ? 'fill' : 'regular'}
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-ocean-400' : 'text-slate-500'
                  }`}
                />
                <span>{tab.label}</span>

                {tab.badge && (
                  <span
                    className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
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

      {/* DASHBOARD TWO-PART CARDS (Click to switch to dedicated view) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
        {/* PART 1 CARD: Today's Update */}
        <div 
          onClick={() => setActiveTab('todayUpdate')}
          className={`p-1 rounded-2xl border transition-all cursor-pointer shadow-bezel-outer hover:shadow-bezel-inner ${
            activeTab === 'todayUpdate' 
              ? 'bg-ocean-100/70 border-ocean-300 ring-2 ring-ocean-400/30' 
              : 'bg-white border-slate-200 hover:border-ocean-300'
          }`}
        >
          <div className="rounded-xl bg-white p-4 bezel-core flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-ocean-100 text-ocean-700 flex items-center justify-center shrink-0 shadow-sm">
                <CalendarCheck weight="bold" className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-ocean-700">
                    Today's Update
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-ocean-100 text-ocean-800">
                    {todayDeliveredCount} Served
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-xl font-black text-slate-900 num-tabular">
                    {todayDeliveredCans} Cans
                  </span>
                  <span className="text-xs font-extrabold text-emerald-700 num-tabular">
                    • ₹{todayCollectedCash} Collected
                  </span>
                </div>
                <p className="text-xs text-ocean-700 font-medium flex items-center gap-1 mt-1">
                  <span>View customer names and amounts</span>
                  <ArrowRight weight="bold" className="w-3.5 h-3.5" />
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* PART 2 CARD: Data of All Dates & Months */}
        <div 
          onClick={() => setActiveTab('allDates')}
          className={`p-1 rounded-2xl border transition-all cursor-pointer shadow-bezel-outer hover:shadow-bezel-inner ${
            activeTab === 'allDates' 
              ? 'bg-amber-100/70 border-amber-300 ring-2 ring-amber-400/30' 
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="rounded-xl bg-white p-4 bezel-core flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 shadow-sm">
                <ClockCounterClockwise weight="bold" className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-700">
                    All Dates & Months
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                    {distinctDateCount} Days Logged
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-xl font-black text-slate-900 num-tabular">
                    All Dates & Months
                  </span>
                  <span className="text-xs font-extrabold text-amber-700 num-tabular">
                    • ₹{totalBendingAmount} Total Bending
                  </span>
                </div>
                <p className="text-xs text-amber-700 font-medium flex items-center gap-1 mt-1">
                  <span>View date-wise ledger and breakdown</span>
                  <ArrowRight weight="bold" className="w-3.5 h-3.5" />
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
