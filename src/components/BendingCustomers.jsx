import React, { useState, useMemo } from 'react';
import { 
  WarningCircle, 
  CurrencyInr, 
  WhatsappLogo, 
  CheckCircle, 
  MagnifyingGlass, 
  HandCoins, 
  Phone, 
  MapPin, 
  Calendar,
  Drop,
  CaretDown,
  CaretUp,
  ClockCounterClockwise
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';

export function BendingCustomers({ 
  customers, 
  onRecordPayment, 
  businessInfo,
  onNavigateToEntries 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('highest'); // highest | lowest | name
  const [expandedCustomerId, setExpandedCustomerId] = useState(null);
  const [payingCustomerId, setPayingCustomerId] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  // Compute pending details and all date-wise bending records for each customer
  const bendingCustomersList = useMemo(() => {
    return customers.map(c => {
      const rate = c.amountPerCane || 35;
      const todayCans = c.todayEntry?.cansBought || 0;
      const todayPaid = c.todayEntry?.amountPaid || 0;
      const todayCost = todayCans * rate;
      const todayBending = Math.max(0, todayCost - todayPaid);
      const prevBending = c.previousBendingAmount || 0;
      const totalBending = prevBending + todayBending;
      const entryDate = c.todayEntry?.date || new Date().toISOString().split('T')[0];

      // Build date-wise entries for ALL dates (Today + all past dates)
      const allDateRecords = [];

      // 1. Today's Record (if cans delivered or bending exists today)
      if (todayCans > 0 || todayPaid > 0 || todayBending > 0) {
        allDateRecords.push({
          date: entryDate,
          isToday: true,
          cans: todayCans,
          rate: rate,
          total: todayCost,
          paid: todayPaid,
          bending: todayBending
        });
      }

      // 2. Previous Dates from History
      let historyBendingSum = 0;
      if (Array.isArray(c.history) && c.history.length > 0) {
        c.history.forEach(h => {
          const hCans = h.cans || 0;
          const hRate = h.rate || rate;
          const hTotal = h.total != null ? h.total : (hCans * hRate);
          const hPaid = h.paid || 0;
          const hBending = h.bending != null ? h.bending : Math.max(0, hTotal - hPaid);
          
          historyBendingSum += hBending;

          allDateRecords.push({
            date: h.date,
            isToday: false,
            cans: hCans,
            rate: hRate,
            total: hTotal,
            paid: hPaid,
            bending: hBending
          });
        });
      }

      // 3. Fallback for any legacy opening dues not covered by explicit history records
      const unaccountedPrev = prevBending - historyBendingSum;
      if (unaccountedPrev > 0 && allDateRecords.length <= 1) {
        allDateRecords.push({
          date: 'Previous Balance',
          isToday: false,
          cans: Math.round(unaccountedPrev / rate) || 0,
          rate: rate,
          total: unaccountedPrev,
          paid: 0,
          bending: unaccountedPrev,
          isOlderBalance: true
        });
      }

      return {
        ...c,
        todayCans,
        todayPaid,
        todayBending,
        prevBending,
        totalBending,
        entryDate,
        allDateRecords
      };
    }).filter(c => c.totalBending > 0);
  }, [customers]);

  // Total metrics
  const grandTotalBending = bendingCustomersList.reduce((sum, c) => sum + c.totalBending, 0);

  // Search & Sort
  const processedList = useMemo(() => {
    let list = [...bendingCustomersList];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(c => 
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      if (sortBy === 'highest') return b.totalBending - a.totalBending;
      if (sortBy === 'lowest') return a.totalBending - b.totalBending;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

    return list;
  }, [bendingCustomersList, searchQuery, sortBy]);

  const toggleExpand = (customerId) => {
    setExpandedCustomerId(prev => prev === customerId ? null : customerId);
  };

  const handleOpenPayment = (e, customer) => {
    e.stopPropagation();
    setPayingCustomerId(customer.id);
    setPaymentAmount(customer.totalBending);
  };

  const handleConfirmPayment = (customerId) => {
    const customer = processedList.find(c => c.id === customerId);
    if (!customer) return;

    const amt = parseFloat(paymentAmount) || 0;
    if (amt <= 0) return;

    onRecordPayment(customerId, amt, paymentMethod);
    setPayingCustomerId(null);
    setPaymentAmount('');

    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.7 }
    });
  };

  const generateReminderText = (customer) => {
    let msg = `*${businessInfo.name}* • Payment Reminder 💧\n`;
    msg += `வணக்கம் / Dear *${customer.name}*,\n\n`;
    msg += `This is a reminder of your water can billing account:\n`;
    msg += `--------------------------------\n`;
    msg += `*TOTAL BENDING DUES: ₹${customer.totalBending}*\n`;
    msg += `--------------------------------\n`;
    msg += `*Date-wise Previous Bending Breakdown:*\n`;

    customer.allDateRecords.forEach(r => {
      if (r.bending > 0) {
        const dateDisplay = r.isToday ? 'Today' : r.date;
        msg += `• ${dateDisplay}: ${r.cans} Cans | Due: ₹${r.bending}\n`;
      }
    });

    msg += `--------------------------------\n`;
    msg += `Kindly clear the balance via Google Pay / UPI:\n`;
    msg += `👉 UPI ID: *${businessInfo.upiId}*\n`;
    msg += `👉 Mobile: *${businessInfo.phone}*\n\n`;
    msg += `Thank you for your business!`;

    return encodeURIComponent(msg);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      {/* Header Stat Strip */}
      <div className="p-1 rounded-2xl bg-white border border-slate-200/90 shadow-sm mb-6">
        <div className="p-4 sm:p-5 rounded-xl bg-slate-50/70 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Bending Balance
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xs font-bold text-amber-600">₹</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 num-tabular">
                {grandTotalBending.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
              <WarningCircle weight="fill" className="w-3.5 h-3.5 text-amber-600" />
              <span>{bendingCustomersList.length} Customers</span>
            </span>
            <p className="text-[11px] text-slate-400 mt-1">Tap card to view all dates history</p>
          </div>
        </div>
      </div>

      {/* Search & Sort Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <MagnifyingGlass weight="bold" className="w-4 h-4 text-amber-600" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search bending customers..."
            className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Sort:
          </span>
          <div className="inline-flex rounded-xl bg-white p-1 border border-slate-200 shadow-sm">
            <button
              onClick={() => setSortBy('highest')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                sortBy === 'highest'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Highest
            </button>
            <button
              onClick={() => setSortBy('lowest')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                sortBy === 'lowest'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Lowest
            </button>
            <button
              onClick={() => setSortBy('name')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                sortBy === 'name'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              A-Z
            </button>
          </div>
        </div>
      </div>

      {/* Bending Customers List */}
      {processedList.length === 0 ? (
        <div className="p-1 rounded-2xl bg-emerald-50/60 ring-1 ring-emerald-200 shadow-sm text-center py-16">
          <div className="rounded-xl bg-white p-8 max-w-md mx-auto bezel-core">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-3">
              <CheckCircle weight="fill" className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              {searchQuery ? 'No matching bending customers' : 'All Accounts Settled!'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              {searchQuery 
                ? `No customer with bending dues matches "${searchQuery}".` 
                : 'There are currently zero pending dues across all customers.'}
            </p>
            <button
              onClick={onNavigateToEntries}
              className="tactile-btn inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
            >
              <span>Go to Daily Cane Entries</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {processedList.map((customer) => {
            const isExpanded = expandedCustomerId === customer.id;
            const isPaying = payingCustomerId === customer.id;

            // Totals across all dates
            const totalCansAllDates = customer.allDateRecords.reduce((s, r) => s + (r.cans || 0), 0);
            const totalBillAllDates = customer.allDateRecords.reduce((s, r) => s + (r.total || 0), 0);
            const totalPaidAllDates = customer.allDateRecords.reduce((s, r) => s + (r.paid || 0), 0);
            const totalBendingAllDates = customer.allDateRecords.reduce((s, r) => s + (r.bending || 0), 0);

            return (
              <div
                key={customer.id}
                className="p-1 rounded-2xl bg-white border border-slate-200/90 shadow-bezel-outer hover:shadow-bezel-inner transition-all duration-300"
              >
                <div className="rounded-xl bg-white bezel-core overflow-hidden">
                  {/* CLEAN CARD ROW (JUST CUSTOMER NAME & BENDING AMOUNT) */}
                  <div
                    onClick={() => toggleExpand(customer.id)}
                    className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/60 transition-colors select-none"
                  >
                    {/* Customer Name */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center font-extrabold text-sm shrink-0">
                        {customer.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-slate-900 truncate">
                          {customer.name}
                        </h3>
                        {customer.phone && (
                          <p className="text-xs text-slate-400 font-mono">
                            {customer.phone}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Bending Amount & Expand Caret */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Bending Amount
                        </span>
                        <div className="flex items-baseline justify-end gap-0.5">
                          <span className="text-xs font-bold text-amber-600">₹</span>
                          <span className="text-xl sm:text-2xl font-black text-amber-600 num-tabular">
                            {customer.totalBending}
                          </span>
                        </div>
                      </div>

                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800">
                        {isExpanded ? (
                          <CaretUp weight="bold" className="w-4 h-4" />
                        ) : (
                          <CaretDown weight="bold" className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* EXPANDED DETAILS: DATE-WISE PREVIOUS BENDING AMOUNT OF ALL DATES */}
                  {isExpanded && (
                    <div className="px-4 sm:px-5 pb-5 pt-3 border-t border-slate-100 space-y-4 bg-slate-50/50">
                      {/* Subheader info bar */}
                      <div className="flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                          <ClockCounterClockwise weight="bold" className="w-4 h-4 text-ocean-600" />
                          <span>Previous Bending Records of All Dates</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-mono text-[11px]">
                          Rate: ₹{customer.amountPerCane}/can
                        </span>
                      </div>

                      {/* DATE-WISE PREVIOUS BENDING LEDGER TABLE */}
                      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-100/80 border-b border-slate-200 font-bold uppercase text-slate-600 text-[10px] tracking-wider">
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-2.5 text-center">No. of Cane</th>
                              <th className="py-2.5 px-2.5 text-center">Rate</th>
                              <th className="py-2.5 px-2.5 text-right">Total Cost</th>
                              <th className="py-2.5 px-2.5 text-right">Amount Paid</th>
                              <th className="py-2.5 px-3 text-right">Bending Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono">
                            {customer.allDateRecords.map((rec, idx) => {
                              const isToday = rec.isToday;
                              const displayDate = isToday 
                                ? `${new Date(rec.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} (Today)`
                                : (rec.isOlderBalance ? 'Past Balance' : new Date(rec.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }));

                              return (
                                <tr 
                                  key={idx}
                                  className={`hover:bg-slate-50/80 ${isToday ? 'bg-ocean-50/30 font-semibold' : ''}`}
                                >
                                  {/* Date */}
                                  <td className="py-2.5 px-3 font-sans text-xs font-bold text-slate-900">
                                    <div className="flex items-center gap-1.5">
                                      {isToday && (
                                        <span className="w-2 h-2 rounded-full bg-ocean-500 animate-pulse"></span>
                                      )}
                                      <span>{displayDate}</span>
                                    </div>
                                  </td>

                                  {/* No. of Cane */}
                                  <td className="py-2.5 px-2.5 text-center font-bold text-ocean-700">
                                    {rec.cans} cans
                                  </td>

                                  {/* Amount per can */}
                                  <td className="py-2.5 px-2.5 text-center text-slate-500">
                                    ₹{rec.rate}
                                  </td>

                                  {/* Total Cost */}
                                  <td className="py-2.5 px-2.5 text-right font-medium text-slate-800">
                                    ₹{rec.total}
                                  </td>

                                  {/* Amount Paid */}
                                  <td className="py-2.5 px-2.5 text-right text-emerald-700 font-medium">
                                    ₹{rec.paid}
                                  </td>

                                  {/* Bending Amount */}
                                  <td className="py-2.5 px-3 text-right font-bold text-amber-600">
                                    ₹{rec.bending}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>

                          {/* TOTALS OF ALL DATES */}
                          <tfoot>
                            <tr className="bg-amber-50/70 border-t-2 border-amber-200 text-xs font-bold text-slate-900">
                              <td className="py-3 px-3 uppercase text-amber-900 font-sans tracking-wide">
                                Total Across All Dates:
                              </td>
                              <td className="py-3 px-2.5 text-center text-ocean-700 font-mono">
                                {totalCansAllDates} cans
                              </td>
                              <td className="py-3 px-2.5 text-center text-slate-400">-</td>
                              <td className="py-3 px-2.5 text-right text-slate-900 font-mono">
                                ₹{totalBillAllDates}
                              </td>
                              <td className="py-3 px-2.5 text-right text-emerald-700 font-mono">
                                ₹{totalPaidAllDates}
                              </td>
                              <td className="py-3 px-3 text-right text-amber-700 font-mono font-black text-sm">
                                ₹{totalBendingAllDates || customer.totalBending}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* Payment Drawer or Action Buttons */}
                      {isPaying ? (
                        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                              Collect Payment from {customer.name}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPayingCustomerId(null);
                              }}
                              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                            >
                              Cancel
                            </button>
                          </div>

                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-700 font-bold">
                              ₹
                            </div>
                            <input
                              type="number"
                              min="1"
                              max={customer.totalBending}
                              value={paymentAmount}
                              onChange={(e) => setPaymentAmount(e.target.value)}
                              className="w-full pl-9 pr-3.5 py-2 bg-white border border-emerald-300 rounded-xl text-base font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 num-tabular"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            {['Cash', 'GPay/UPI'].map(mode => (
                              <button
                                key={mode}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPaymentMethod(mode);
                                }}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                                  paymentMethod === mode
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {mode}
                              </button>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConfirmPayment(customer.id);
                            }}
                            className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs sm:text-sm font-bold hover:bg-emerald-700 tactile-btn shadow-md"
                          >
                            Confirm & Settle ₹{paymentAmount}
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-1">
                          {customer.phone && (
                            <a
                              href={`https://wa.me/91${customer.phone}?text=${generateReminderText(customer)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="tactile-btn inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100"
                            >
                              <WhatsappLogo weight="fill" className="w-4 h-4 text-emerald-600" />
                              <span>WhatsApp Reminder with All Dates</span>
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={(e) => handleOpenPayment(e, customer)}
                            className="tactile-btn inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-sm"
                          >
                            <HandCoins weight="bold" className="w-4 h-4 text-ocean-400" />
                            <span>Clear / Collect Due</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
