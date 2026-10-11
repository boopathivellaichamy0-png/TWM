import React, { useState, useMemo } from 'react';
import { 
  ClockCounterClockwise, 
  Calendar, 
  MagnifyingGlass, 
  X, 
  Drop, 
  CurrencyInr, 
  WarningCircle, 
  Phone,
  CheckCircle,
  Funnel
} from '@phosphor-icons/react';

export function AllDatesHistory({ customers, onNavigateToEntries }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');

  // Aggregate all date-wise data across all customers
  const allDateData = useMemo(() => {
    const dateMap = {};

    customers.forEach(c => {
      const rate = c.amountPerCane || 35;
      
      // 1. Today's entry
      if (c.todayEntry && ((c.todayEntry.cansBought || 0) > 0 || (c.todayEntry.amountPaid || 0) > 0)) {
        const d = c.todayEntry.date || new Date().toISOString().split('T')[0];
        if (!dateMap[d]) {
          dateMap[d] = { 
            date: d, 
            isToday: true,
            records: [] 
          };
        }
        dateMap[d].records.push({
          id: c.id,
          name: c.name,
          phone: c.phone,
          address: c.address,
          cans: c.todayEntry.cansBought || 0,
          paid: c.todayEntry.amountPaid || 0,
          rate: rate,
          total: (c.todayEntry.cansBought || 0) * rate,
          bending: Math.max(0, ((c.todayEntry.cansBought || 0) * rate) - (c.todayEntry.amountPaid || 0))
        });
      }

      // 2. Past dates history
      if (Array.isArray(c.history)) {
        c.history.forEach(h => {
          if (h.date) {
            if (!dateMap[h.date]) {
              dateMap[h.date] = { 
                date: h.date, 
                isToday: false,
                records: [] 
              };
            }
            const hCans = h.cans || 0;
            const hRate = h.rate || rate;
            const hTotal = h.total != null ? h.total : (hCans * hRate);
            const hPaid = h.paid || 0;
            const hBending = h.bending != null ? h.bending : Math.max(0, hTotal - hPaid);

            dateMap[h.date].records.push({
              id: `${c.id}-${h.date}`,
              name: c.name,
              phone: c.phone,
              address: c.address,
              cans: hCans,
              paid: hPaid,
              rate: hRate,
              total: hTotal,
              bending: hBending
            });
          }
        });
      }
    });

    return Object.values(dateMap).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [customers]);

  // Extract distinct months
  const availableMonths = useMemo(() => {
    const set = new Set();
    allDateData.forEach(d => {
      const dt = new Date(d.date);
      if (!isNaN(dt.getTime())) {
        const monthKey = dt.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
        set.add(monthKey);
      }
    });
    return Array.from(set);
  }, [allDateData]);

  // Filter by month and search query
  const filteredDates = useMemo(() => {
    let list = allDateData;

    if (selectedMonth !== 'all') {
      list = list.filter(d => {
        const dt = new Date(d.date);
        const mKey = dt.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
        return mKey === selectedMonth;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.map(d => {
        const matchesDate = d.date.includes(q);
        const matchingRecords = d.records.filter(r => 
          r.name.toLowerCase().includes(q) ||
          (r.phone && r.phone.includes(q))
        );

        if (matchesDate) return d;
        if (matchingRecords.length > 0) {
          return { ...d, records: matchingRecords };
        }
        return null;
      }).filter(Boolean);
    }

    return list;
  }, [allDateData, selectedMonth, searchQuery]);

  const grandTotalCans = filteredDates.reduce((s, d) => s + d.records.reduce((rS, r) => rS + r.cans, 0), 0);
  const grandTotalPaid = filteredDates.reduce((s, d) => s + d.records.reduce((rS, r) => rS + r.paid, 0), 0);
  const grandTotalBending = filteredDates.reduce((s, d) => s + d.records.reduce((rS, r) => rS + r.bending, 0), 0);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        {/* Month Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedMonth('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedMonth === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Months ({allDateData.length} Dates)
          </button>
          {availableMonths.map(m => (
            <button
              key={m}
              onClick={() => setSelectedMonth(m)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedMonth === m
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative flex-1 max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <MagnifyingGlass weight="bold" className="w-4 h-4 text-amber-600" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search date or customer..."
            className="w-full pl-9 pr-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X weight="bold" className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Date-By-Date Cards List */}
      {filteredDates.length === 0 ? (
        <div className="p-1 rounded-2xl bg-slate-100/70 ring-1 ring-slate-200 shadow-sm text-center py-14">
          <div className="rounded-xl bg-white p-8 max-w-md mx-auto bezel-core">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center mb-3">
              <Calendar weight="bold" className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No Records Found</h3>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              No dates match your selected filter or search query.
            </p>
            <button
              onClick={() => { setSelectedMonth('all'); setSearchQuery(''); }}
              className="tactile-btn inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
            >
              <span>Reset Filters</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDates.map((dItem, dIdx) => {
            const dateObj = new Date(dItem.date);
            const formattedDisplayDate = !isNaN(dateObj.getTime())
              ? dateObj.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
              : dItem.date;

            const dateCansTotal = dItem.records.reduce((s, r) => s + r.cans, 0);
            const datePaidTotal = dItem.records.reduce((s, r) => s + r.paid, 0);
            const dateBendingTotal = dItem.records.reduce((s, r) => s + r.bending, 0);

            return (
              <div 
                key={dIdx}
                className="p-1 rounded-2xl bg-white border border-slate-200/90 shadow-bezel-outer overflow-hidden"
              >
                <div className="rounded-xl bg-white bezel-core overflow-hidden">
                  {/* EACH ENTRY PROMINENTLY CONTAINS THE EXACT DATE */}
                  <div className="px-4 sm:px-5 py-3.5 bg-slate-50/90 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
                        <Calendar weight="bold" className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm sm:text-base text-slate-900">
                            {formattedDisplayDate}
                          </span>
                          {dItem.isToday && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-ocean-100 text-ocean-800 border border-ocean-200">
                              Today's Entry
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {dItem.records.length} Customers logged on this date
                        </span>
                      </div>
                    </div>

                    {/* Date-level summary chips */}
                    <div className="flex items-center gap-2.5 font-mono text-xs">
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-extrabold text-ocean-700">
                        {dateCansTotal} cans
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-extrabold text-emerald-700">
                        ₹{datePaidTotal} paid
                      </span>
                      {dateBendingTotal > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 font-extrabold text-amber-700">
                          ₹{dateBendingTotal} due
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Customer Records Table for this specific date */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-white border-b border-slate-100 font-bold uppercase text-slate-400 text-[10px] tracking-wider">
                          <th className="py-2.5 px-4">Customer Name</th>
                          <th className="py-2.5 px-4 text-center">No. of Cane Delivered</th>
                          <th className="py-2.5 px-4 text-center">Rate</th>
                          <th className="py-2.5 px-4 text-right">Amount Collected</th>
                          <th className="py-2.5 px-4 text-right">Bending Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {dItem.records.map((r, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-4 font-bold text-slate-900">
                              {r.name}
                              {r.phone && <span className="block text-[10px] text-slate-400 font-mono">{r.phone}</span>}
                            </td>
                            <td className="py-2.5 px-4 text-center font-extrabold text-ocean-700 font-mono">
                              {r.cans} cans
                            </td>
                            <td className="py-2.5 px-4 text-center font-mono text-slate-500">
                              ₹{r.rate}
                            </td>
                            <td className="py-2.5 px-4 text-right font-extrabold text-emerald-700 font-mono">
                              ₹{r.paid}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono">
                              {r.bending > 0 ? (
                                <span className="font-extrabold text-amber-600">₹{r.bending}</span>
                              ) : (
                                <span className="text-emerald-600 font-sans font-semibold text-[11px]">Paid ✅</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
