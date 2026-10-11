import React from 'react';
import { Drop, UserPlus, WarningCircle, ClipboardText } from '@phosphor-icons/react';

export function Navigation({ activeTab, setActiveTab, bendingCount, todayDeliveredCount }) {
  const tabs = [
    {
      id: 'entries',
      label: 'Cane Entries',
      icon: Drop,
      badge: todayDeliveredCount > 0 ? `${todayDeliveredCount} logged` : null,
      badgeColor: 'bg-ocean-100 text-ocean-800 border-ocean-200'
    },
    {
      id: 'addCustomer',
      label: 'Add New Customer',
      icon: UserPlus,
      badge: null,
      badgeColor: ''
    },
    {
      id: 'bending',
      label: 'Bending Customers',
      icon: WarningCircle,
      badge: bendingCount > 0 ? `${bendingCount}` : null,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300'
    }
  ];

  return (
    <nav className="sticky top-4 z-40 px-4 sm:px-6 max-w-7xl mx-auto my-3 pointer-events-none">
      <div className="pointer-events-auto mx-auto w-fit p-1.5 rounded-full bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-float-pill flex items-center gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tactile-btn relative flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 ${
                isActive
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <Icon
                weight={isActive ? 'fill' : 'regular'}
                className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${
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
      </div>
    </nav>
  );
}
