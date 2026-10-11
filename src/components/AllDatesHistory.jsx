import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  User, 
  MagnifyingGlass, 
  X, 
  Drop, 
  CurrencyInr, 
  CheckCircle, 
  WarningCircle, 
  Phone,
  MapPin,
  ClockCounterClockwise,
  ArrowRight
} from '@phosphor-icons/react';

export function AllDatesHistory({ customers, onNavigateToEntries }) {
  // Toggle between 'onDate' and 'customer' views
  const [viewMode, setViewMode] = useState('onDate'); // 'onDate' | 'customer'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all'); // 'all' | 'due' | 'active'

  // Extract all entries normalized across all customers
  const customerLedgers = useMemo(() => {
    return customers.map(c => {
      const rate = c.amountPerCane || 35;
      const entries = [];

      // 1. Today's entry if any activity exists
      if (c.todayEntry && (
        (c.todayEntry.cansBought || 0) > 0 || 
        (c.todayEntry.emptyCansReturned || 0) > 0 || 
        (c.todayEntry.amountPaid || 0) > 0
      )) {
        const d = c.todayEntry.date || new Date().toISOString().split('T')[0];
        const cans = c.todayEntry.cansBought || 0;
        const empty = c.todayEntry.emptyCansReturned || 0;
        const paid = c.todayEntry.amountPaid || 0;
        const total = cans * rate;
        const bending = Math.max(0, total - paid);

        entries.push({
          id: `${c.id}-today`,
          date: d,
          isToday: true,
          cans,
          empty,
          rate,
          total,
          paid,
          bending
        });
      }

      // 2. Past history entries
      if (Array.isArray(c.history)) {
        c.history.forEach((h, hIdx) => {
          if (h && h.date) {
            const hCans = h.cans != null ? h.cans : (h.cansBought || 0);
            const hEmpty = h.emptyCansReturned != null 
              ? h.emptyCansReturned 
              : (h.emptyCans != null ? h.emptyCans : (h.empty || 0));
            const hRate = h.rate || rate;
            const hPaid = h.paid != null ? h.paid : (h.amountPaid || 0);
            const hTotal = h.total != null ? h.total : (hCans * hRate);
            const hBending = h.bending != null ? h.bending : Math.max(0, hTotal - hPaid);

            entries.push({
              id: `${c.id}-hist-${hIdx}`,
              date: h.date,
              isToday: false,
              cans: hCans,
              empty: hEmpty,
              rate: hRate,
              total: hTotal,
              paid: hPaid,
              bending: hBending
            });
          }
        });
      }

      // Sort customer entries descending by date
      entries.sort((a, b) => new Date(b.date) - new Date(a.date));

      const totalDelivered = entries.reduce((s, e) => s + e.cans, 0);
      const totalEmpty = entries.reduce((s, e) => s + e.empty, 0);
      const totalPaid = entries.reduce((s, e) => s + e.paid, 0);

      // Current overall pending dues
      const todayCans = c.todayEntry?.cansBought || 0;
      const todayPaid = c.todayEntry?.amountPaid || 0;
      const todayBending = Math.max(0, (todayCans * rate) - todayPaid);
      const currentOutstandingDues = (c.previousBendingAmount || 0) + todayBending;

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        address: c.address,
        amountPerCane: rate,
        entries,
        totalDelivered,
        totalEmpty,
        totalPaid,
        currentOutstandingDues
      };
    });
  }, [customers]);

  // Aggregate by date for "On Date Details" mode
  const allDateData = useMemo(() => {
    const dateMap = {};

    customerLedgers.forEach(c => {
      c.entries.forEach(entry => {
        if (!dateMap[entry.date]) {
          dateMap[entry.date] = {
            date: entry.date,
            isToday: entry.isToday,
            records: []
          };
        }
        dateMap[entry.date].records.push({
          id: `${c.id}-${entry.id}`,
          customerId: c.id,
          name: c.name,
          phone: c.phone,
          address: c.address,
          cans: entry.cans,
          empty: entry.empty,
          rate: entry.rate,
          total: entry.total,
          paid: entry.paid,
          bending: entry.bending
        });
      });
    });

    return Object.values(dateMap).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [customerLedgers]);

  // Extract distinct months for On Date mode
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

  // Filtered Dates for "On Date Details"
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

  // Filtered Customers for "Customer Details"
  const filteredCustomerLedgers = useMemo(() => {
    let list = customerLedgers;

    if (customerFilter === 'due') {
      list = list.filter(c => c.currentOutstandingDues > 0);
    } else if (customerFilter === 'active') {
      list = list.filter(c => c.entries.length > 0);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(c => 
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q))
      );
    }

    return list;
  }, [customerLedgers, customerFilter, searchQuery]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5">
      {/* 1. Header with Mode Switcher */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-ocean-700 mb-1">
              <ClockCounterClockwise weight="bold" className="w-4 h-4 text-ocean-600" aria-hidden="true" />
              <span>Records & Ledger Archives</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              {viewMode === 'onDate' ? 'On Date Details' : 'Customer Details'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              {viewMode === 'onDate' 
                ? 'Daily breakdown of cans delivered, empty cans collected, cash collected, and pending dues by date.'
                : 'Complete customer-by-customer ledger with cans delivered, empty collected, amount paid, and bending with date.'
              }
            </p>
          </div>

          {/* Mode Switcher Toggle */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 shrink-0 self-start sm:self-auto">
            <button
              onClick={() => { setViewMode('onDate'); setSearchQuery(''); }}
              className={`tactile-btn inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'onDate'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar weight={viewMode === 'onDate' ? 'fill' : 'regular'} className="w-4 h-4 text-ocean-600" />
              <span>On Date Details</span>
            </button>
            <button
              onClick={() => { setViewMode('customer'); setSearchQuery(''); }}
              className={`tactile-btn inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'customer'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User weight={viewMode === 'customer' ? 'fill' : 'regular'} className="w-4 h-4 text-amber-600" />
              <span>Customer Details</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Controls & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        {/* Sub-Filters */}
        {viewMode === 'onDate' ? (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedMonth('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedMonth === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Dates ({allDateData.length})
            </button>
            {availableMonths.map(m => (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedMonth === m
                    ? 'bg-ocean-700 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setCustomerFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                customerFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Customers ({customerLedgers.length})
            </button>
            <button
              onClick={() => setCustomerFilter('active')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                customerFilter === 'active'
                  ? 'bg-ocean-700 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              With Delivery Entries
            </button>
            <button
              onClick={() => setCustomerFilter('due')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                customerFilter === 'due'
                  ? 'bg-amber-700 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              With Pending Dues
            </button>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative flex-1 max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <MagnifyingGlass weight="bold" className="w-4 h-4 text-ocean-600" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              viewMode === 'onDate' 
                ? 'Search date (YYYY-MM-DD) or customer...' 
                : 'Search customer name, phone, address...'
            }
            className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ocean-500/20 focus:border-ocean-500 shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X weight="bold" className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. VIEW 1: ON DATE DETAILS */}
      {viewMode === 'onDate' && (
        <div>
          {filteredDates.length === 0 ? (
            <div className="p-1 rounded-2xl bg-slate-100/70 ring-1 ring-slate-200 shadow-sm text-center py-14">
              <div className="rounded-xl bg-white p-8 max-w-md mx-auto bezel-core">
                <div className="w-12 h-12 rounded-full bg-ocean-50 text-ocean-600 mx-auto flex items-center justify-center mb-3">
                  <Calendar weight="bold" className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">No Date Records Found</h3>
                <p className="text-xs text-slate-600 mt-1 mb-5">
                  No delivery records match your selected month or search query.
                </p>
                <button
                  onClick={() => { setSelectedMonth('all'); setSearchQuery(''); }}
                  className="tactile-btn inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                >
                  <span>Reset Date Filters</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {filteredDates.map((dItem, dIdx) => {
                const dateObj = new Date(dItem.date);
                const formattedDisplayDate = !isNaN(dateObj.getTime())
                  ? dateObj.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                  : dItem.date;

                const dateCansTotal = dItem.records.reduce((s, r) => s + r.cans, 0);
                const dateEmptyTotal = dItem.records.reduce((s, r) => s + r.empty, 0);
                const datePaidTotal = dItem.records.reduce((s, r) => s + r.paid, 0);
                const dateBendingTotal = dItem.records.reduce((s, r) => s + r.bending, 0);

                return (
                  <div 
                    key={dIdx}
                    className="p-1 rounded-2xl bg-white border border-slate-200/90 shadow-bezel-outer overflow-hidden"
                  >
                    <div className="rounded-xl bg-white bezel-core overflow-hidden">
                      {/* Date Header */}
                      <div className="px-4 sm:px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-ocean-100 text-ocean-800 flex items-center justify-center font-bold text-xs shrink-0">
                            <Calendar weight="bold" className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm sm:text-base text-slate-900">
                                {formattedDisplayDate}
                              </span>
                              {dItem.isToday && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-ocean-100 text-ocean-800 border border-ocean-200">
                                  Today's Update
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-600 font-mono">
                              {dItem.records.length} customer entries on this day
                            </span>
                          </div>
                        </div>

                        {/* Date Summary Chips */}
                        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                          <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-extrabold text-ocean-700 shadow-2xs">
                            {dateCansTotal} cans delivered
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 font-extrabold text-amber-800 shadow-2xs">
                            {dateEmptyTotal} empty collected
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 font-extrabold text-emerald-800 shadow-2xs">
                            ₹{datePaidTotal} paid
                          </span>
                          {dateBendingTotal > 0 && (
                            <span className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 font-extrabold text-rose-800 shadow-2xs">
                              ₹{dateBendingTotal} due
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Entries Table for that day */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-100/70 border-b border-slate-200 font-bold uppercase text-slate-600 text-[10px] tracking-wider">
                              <th className="py-2.5 px-4">Customer Name</th>
                              <th className="py-2.5 px-4 text-center">No. of Cane Delivered</th>
                              <th className="py-2.5 px-4 text-center">No. of Empty Collected</th>
                              <th className="py-2.5 px-4 text-center">Rate</th>
                              <th className="py-2.5 px-4 text-right">Amount Paid</th>
                              <th className="py-2.5 px-4 text-right">Bending Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {dItem.records.map((r, rIdx) => (
                              <tr key={rIdx} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-2.5 px-4 font-bold text-slate-900">
                                  {r.name}
                                  {r.phone && <span className="block text-[10px] text-slate-500 font-mono">{r.phone}</span>}
                                </td>
                                <td className="py-2.5 px-4 text-center font-extrabold text-ocean-700 font-mono">
                                  {r.cans} Cans
                                </td>
                                <td className="py-2.5 px-4 text-center font-mono">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                    r.empty > 0 
                                      ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                      : 'bg-slate-100 text-slate-500'
                                  }`}>
                                    {r.empty} Empty
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 text-center font-mono text-slate-600">
                                  ₹{r.rate}
                                </td>
                                <td className="py-2.5 px-4 text-right font-extrabold text-emerald-700 font-mono text-xs">
                                  ₹{r.paid}
                                </td>
                                <td className="py-2.5 px-4 text-right font-mono">
                                  {r.bending > 0 ? (
                                    <span className="font-extrabold text-amber-700">₹{r.bending}</span>
                                  ) : (
                                    <span className="text-emerald-700 font-sans font-semibold text-[11px]">Paid ✅</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-slate-50/80 border-t border-slate-200 font-bold text-xs text-slate-800">
                              <td className="py-2.5 px-4 uppercase text-[10px] tracking-wider text-slate-600 font-extrabold">
                                Total on {dItem.date}:
                              </td>
                              <td className="py-2.5 px-4 text-center font-mono font-black text-ocean-800">
                                {dateCansTotal} Cans
                              </td>
                              <td className="py-2.5 px-4 text-center font-mono font-black text-amber-800">
                                {dateEmptyTotal} Empty
                              </td>
                              <td className="py-2.5 px-4 text-center text-slate-400">-</td>
                              <td className="py-2.5 px-4 text-right font-mono font-black text-emerald-800">
                                ₹{datePaidTotal}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-black text-amber-800">
                                {dateBendingTotal > 0 ? `₹${dateBendingTotal}` : '₹0 (All Clear)'}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. VIEW 2: CUSTOMER DETAILS */}
      {viewMode === 'customer' && (
        <div>
          {filteredCustomerLedgers.length === 0 ? (
            <div className="p-1 rounded-2xl bg-slate-100/70 ring-1 ring-slate-200 shadow-sm text-center py-14">
              <div className="rounded-xl bg-white p-8 max-w-md mx-auto bezel-core">
                <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center mb-3">
                  <User weight="bold" className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">No Customers Found</h3>
                <p className="text-xs text-slate-600 mt-1 mb-5">
                  No customers matched your filter or search query.
                </p>
                <button
                  onClick={() => { setCustomerFilter('all'); setSearchQuery(''); }}
                  className="tactile-btn inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                >
                  <span>Reset Customer Filters</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredCustomerLedgers.map((customer) => (
                <div 
                  key={customer.id}
                  className="p-1 rounded-2xl bg-white border border-slate-200/90 shadow-bezel-outer overflow-hidden"
                >
                  <div className="rounded-xl bg-white bezel-core overflow-hidden">
                    {/* Customer Header Info */}
                    <div className="px-4 sm:px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-base text-slate-900">
                            {customer.name}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-ocean-50 text-ocean-800 border border-ocean-200">
                            ₹{customer.amountPerCane}/can
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-600">
                          {customer.phone && (
                            <span className="inline-flex items-center gap-1 font-mono">
                              <Phone weight="bold" className="w-3.5 h-3.5 text-slate-400" />
                              <span>{customer.phone}</span>
                            </span>
                          )}
                          {customer.address && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin weight="bold" className="w-3.5 h-3.5 text-slate-400" />
                              <span>{customer.address}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Customer Overall Metric Chips */}
                      <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                        <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-extrabold text-ocean-700 shadow-2xs">
                          {customer.totalDelivered} Cans Total
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 font-extrabold text-amber-800 shadow-2xs">
                          {customer.totalEmpty} Empty Returned
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 font-extrabold text-emerald-800 shadow-2xs">
                          ₹{customer.totalPaid} Paid
                        </span>
                        {customer.currentOutstandingDues > 0 ? (
                          <span className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 font-extrabold text-rose-800 shadow-2xs">
                            ₹{customer.currentOutstandingDues} Bending Due
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-100 border border-emerald-300 font-extrabold text-emerald-800 shadow-2xs font-sans">
                            All Clear ✅
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Customer Date-By-Date Ledger Table */}
                    {customer.entries.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500">
                        <span>No delivery or payment records logged yet for this customer.</span>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-100/70 border-b border-slate-200 font-bold uppercase text-slate-600 text-[10px] tracking-wider">
                              <th className="py-2.5 px-4">Date</th>
                              <th className="py-2.5 px-4 text-center">No. of Cane Delivered</th>
                              <th className="py-2.5 px-4 text-center">No. of Empty Collected</th>
                              <th className="py-2.5 px-4 text-right">Amount Paid in Each Date</th>
                              <th className="py-2.5 px-4 text-right">Bending Amount with Date</th>
                              <th className="py-2.5 px-4 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {customer.entries.map((entry, eIdx) => {
                              const dateObj = new Date(entry.date);
                              const formattedDate = !isNaN(dateObj.getTime())
                                ? dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                : entry.date;

                              return (
                                <tr key={eIdx} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                                    <div className="flex items-center gap-2">
                                      <span>{formattedDate}</span>
                                      {entry.isToday && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-ocean-100 text-ocean-800 border border-ocean-200">
                                          Today
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-4 text-center font-extrabold text-ocean-700 font-mono">
                                    {entry.cans} Cans
                                  </td>
                                  <td className="py-2.5 px-4 text-center font-mono">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                      entry.empty > 0 
                                        ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                        : 'bg-slate-100 text-slate-500'
                                    }`}>
                                      {entry.empty} Empty
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-extrabold text-emerald-700 font-mono text-xs">
                                    ₹{entry.paid}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono">
                                    {entry.bending > 0 ? (
                                      <span className="font-extrabold text-amber-700">₹{entry.bending}</span>
                                    ) : (
                                      <span className="text-emerald-700 font-medium">₹0</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-4 text-center">
                                    {entry.bending <= 0 ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <CheckCircle weight="fill" className="w-3 h-3 text-emerald-600" />
                                        <span>Paid</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                        <WarningCircle weight="fill" className="w-3 h-3 text-amber-600" />
                                        <span>Due ₹{entry.bending}</span>
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="bg-slate-50/80 border-t border-slate-200 font-bold text-xs text-slate-800">
                              <td className="py-2.5 px-4 uppercase text-[10px] tracking-wider text-slate-600 font-extrabold">
                                Total Summary:
                              </td>
                              <td className="py-2.5 px-4 text-center font-mono font-black text-ocean-800">
                                {customer.totalDelivered} Cans
                              </td>
                              <td className="py-2.5 px-4 text-center font-mono font-black text-amber-800">
                                {customer.totalEmpty} Empty
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-black text-emerald-800">
                                ₹{customer.totalPaid}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-black text-amber-800">
                                ₹{customer.currentOutstandingDues}
                              </td>
                              <td className="py-2.5 px-4 text-center font-sans text-[11px]">
                                {customer.currentOutstandingDues === 0 ? 'Clear ✅' : 'Pending Dues'}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
