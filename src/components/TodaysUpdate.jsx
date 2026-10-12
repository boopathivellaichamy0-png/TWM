import React, { useState, useMemo } from 'react';
import { 
  CalendarCheck, 
  MagnifyingGlass, 
  X, 
  Drop, 
  CurrencyInr, 
  CheckCircle, 
  WarningCircle, 
  Phone,
  WhatsappLogo,
  ArrowRight,
  ClockCounterClockwise
} from '@phosphor-icons/react';
import { CustomerEntriesModal } from './CustomerEntriesModal';
import { getTodayDateString } from '../utils/customerUtils';

export function TodaysUpdate({ 
  customers, 
  onNavigateToEntries, 
  onAddDeliveryEntry,
  onDeleteEntry,
  businessInfo 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState(null);

  const todayStr = getTodayDateString();

  const todayDateFormatted = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  // Customers with delivery or payment activity today (accumulates all deliveries made today)
  const todayRecords = useMemo(() => {
    return customers.map(c => {
      const rate = c.amountPerCane || 35;
      const cansDelivered = c.todayCans ?? (c.todayEntry?.cansBought || 0);
      const emptyCansReturned = c.todayEmpty ?? (c.todayEntry?.emptyCansReturned || 0);
      const amountCollected = c.todayPaid ?? (c.todayEntry?.amountPaid || 0);
      const totalCost = cansDelivered * rate;
      const bendingToday = Math.max(0, totalCost - amountCollected);
      const todayEntries = (c.entries || []).filter(e => e.date === todayStr);

      return {
        id: c.id,
        rawCustomer: c,
        name: c.name,
        phone: c.phone,
        address: c.address,
        rate,
        cansDelivered,
        amountCollected,
        totalCost,
        bendingToday,
        emptyCansReturned,
        deliveryCount: todayEntries.length > 0 ? todayEntries.length : (cansDelivered > 0 ? 1 : 0),
        isSaved: c.todayEntry?.saved
      };
    }).filter(c => c.cansDelivered > 0 || c.amountCollected > 0 || c.emptyCansReturned > 0);
  }, [customers, todayStr]);

  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return todayRecords;
    const q = searchQuery.toLowerCase().trim();
    return todayRecords.filter(r => 
      r.name.toLowerCase().includes(q) ||
      (r.phone && r.phone.includes(q))
    );
  }, [todayRecords, searchQuery]);

  const totalCansDelivered = todayRecords.reduce((s, r) => s + r.cansDelivered, 0);
  const totalEmptyCollected = todayRecords.reduce((s, r) => s + r.emptyCansReturned, 0);
  const totalAmountCollected = todayRecords.reduce((s, r) => s + r.amountCollected, 0);
  const totalBendingToday = todayRecords.reduce((s, r) => s + r.bendingToday, 0);

  const generateWhatsAppDaySummary = () => {
    let msg = `*${businessInfo.name}* • Daily Summary 💧\n`;
    msg += `Date: ${todayDateFormatted}\n`;
    msg += `--------------------------------\n`;
    msg += `Total Cans Delivered: *${totalCansDelivered} Cans*\n`;
    msg += `Total Empty Collected: *${totalEmptyCollected} Empty*\n`;
    msg += `Total Amount Collected: *₹${totalAmountCollected}*\n`;
    msg += `Today's Pending Dues: *₹${totalBendingToday}*\n`;
    msg += `Customers Served: ${todayRecords.length}\n`;
    msg += `--------------------------------\n`;
    msg += `Customer Breakdown:\n`;
    todayRecords.forEach(r => {
      msg += `• *${r.name}*: ${r.cansDelivered} delivered (${r.deliveryCount} deliveries) | ${r.emptyCansReturned} empty | Paid: ₹${r.amountCollected}`;
      if (r.bendingToday > 0) msg += ` (Due: ₹${r.bendingToday})`;
      msg += `\n`;
    });
    msg += `--------------------------------\n`;
    msg += `Tamilan Waters • ${businessInfo.phone}`;

    return encodeURIComponent(msg);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      {/* Top Banner */}
      <div className="rounded-2xl bg-white border border-slate-200/90 shadow-sm p-5 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-ocean-700 mb-1">
              <CalendarCheck weight="bold" className="w-4 h-4 text-ocean-600" aria-hidden="true" />
              <span>Daily Delivery & Collection Report</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Today's Update
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {todayDateFormatted} • {todayRecords.length} Customers logged today
            </p>
          </div>

          {/* Quick Stat Pills */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200 shrink-0">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Delivered
              </p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-ocean-700 num-tabular">
                  {totalCansDelivered}
                </span>
                <span className="text-xs font-semibold text-slate-500">Cans</span>
              </div>
            </div>
            <div className="h-7 w-px bg-slate-200"></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Empty Collected
              </p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-amber-700 num-tabular">
                  {totalEmptyCollected}
                </span>
                <span className="text-xs font-semibold text-slate-500">Empty</span>
              </div>
            </div>
            <div className="h-7 w-px bg-slate-200"></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Cash Collected
              </p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xs font-semibold text-slate-500">₹</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-700 num-tabular">
                  {totalAmountCollected.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <MagnifyingGlass weight="bold" className="w-4 h-4 text-ocean-600" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search today's customers by name or phone..."
            className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ocean-500/20 focus:border-ocean-500 shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X weight="bold" className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {todayRecords.length > 0 && (
            <a
              href={`https://wa.me/?text=${generateWhatsAppDaySummary()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="tactile-btn inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100"
            >
              <WhatsappLogo weight="fill" className="w-4 h-4 text-emerald-600" />
              <span>Share Today's Summary</span>
            </a>
          )}

          <button
            onClick={onNavigateToEntries}
            className="tactile-btn inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-sm"
          >
            <span>Log More in Cane Entries</span>
            <ArrowRight weight="bold" className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Customer Delivery & Collections Table */}
      {filteredRecords.length === 0 ? (
        <div className="p-1 rounded-2xl bg-slate-100/70 ring-1 ring-slate-200 shadow-sm text-center py-14">
          <div className="rounded-xl bg-white p-8 max-w-md mx-auto bezel-core">
            <div className="w-12 h-12 rounded-full bg-ocean-50 text-ocean-600 mx-auto flex items-center justify-center mb-3">
              <Drop weight="bold" className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {searchQuery ? `No customer matching "${searchQuery}" today` : "No deliveries recorded yet today"}
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              Deliveries logged in the Cane Entries tab will immediately appear here.
            </p>
            <button
              onClick={onNavigateToEntries}
              className="tactile-btn inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-ocean-600 text-white text-xs font-semibold hover:bg-ocean-700"
            >
              <span>Go to Daily Cane Entries</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-1 rounded-2xl bg-white border border-slate-200/90 shadow-bezel-outer overflow-hidden">
          <div className="overflow-x-auto rounded-xl bg-white bezel-core">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-200 font-bold uppercase text-slate-600 text-[10px] tracking-wider">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4 text-center">No. of Cane Delivered</th>
                  <th className="py-3 px-4 text-center">No. of Empty Collected</th>
                  <th className="py-3 px-4 text-center">Amount Per Can</th>
                  <th className="py-3 px-4 text-right">Amount Collected</th>
                  <th className="py-3 px-4 text-right">Today's Bending</th>
                  <th className="py-3 px-4 text-center">History</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div>
                        <span>{r.name}</span>
                        {r.phone && <span className="block text-[10px] text-slate-400 font-mono mt-0.5">{r.phone}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-ocean-50 text-ocean-800 border border-ocean-200 font-mono">
                          {r.cansDelivered} Cans
                        </span>
                        {r.deliveryCount > 1 && (
                          <span className="text-[10px] text-ocean-700 font-semibold mt-0.5">
                            ({r.deliveryCount} deliveries)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold font-mono ${
                        r.emptyCansReturned > 0 
                          ? 'bg-amber-50 text-amber-800 border border-amber-200' 
                          : 'bg-slate-50 text-slate-500 border border-slate-200'
                      }`}>
                        {r.emptyCansReturned} Empty
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-600">
                      ₹{r.rate}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-emerald-700 font-mono text-sm">
                      ₹{r.amountCollected}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {r.bendingToday > 0 ? (
                        <span className="font-extrabold text-amber-700">₹{r.bendingToday}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-sans font-semibold text-[11px]">
                          <CheckCircle weight="fill" className="w-3.5 h-3.5" />
                          <span>Paid</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedCustomerForHistory(r.rawCustomer)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 transition-colors"
                        title="View All Entries for this customer"
                      >
                        <ClockCounterClockwise weight="bold" className="w-4 h-4 text-ocean-600" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-ocean-50/60 border-t-2 border-ocean-200 font-bold text-xs text-slate-900">
                  <td colSpan="2" className="py-3.5 px-4 uppercase text-slate-800 tracking-wider font-extrabold">
                    Today's Grand Totals:
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-black text-ocean-800 text-sm">
                    {totalCansDelivered} Cans
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-black text-amber-800 text-sm">
                    {totalEmptyCollected} Empty
                  </td>
                  <td className="py-3.5 px-4 text-center text-slate-400">-</td>
                  <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-700 text-sm">
                    ₹{totalAmountCollected.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-black text-amber-700 text-sm">
                    ₹{totalBendingToday.toLocaleString('en-IN')}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* View All Entries Modal */}
      {(() => {
        const modalCustomer = selectedCustomerForHistory 
          ? (customers.find(c => c.id === selectedCustomerForHistory.id) || selectedCustomerForHistory)
          : null;

        if (!modalCustomer) return null;

        return (
          <CustomerEntriesModal
            isOpen={Boolean(modalCustomer)}
            onClose={() => setSelectedCustomerForHistory(null)}
            customer={modalCustomer}
            onAddEntry={onAddDeliveryEntry}
            onDeleteEntry={onDeleteEntry}
            businessInfo={businessInfo}
          />
        );
      })()}
    </div>
  );
}
