import React, { useState, useMemo } from 'react';
import { 
  MagnifyingGlass, 
  X, 
  Plus, 
  Minus, 
  Check, 
  WhatsappLogo, 
  CalendarCheck, 
  MapPin, 
  Phone, 
  CaretDown,
  CaretUp,
  Drop,
  Trash,
  ClockCounterClockwise,
  ListBullets,
  Clock
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { CustomerEntriesModal } from './CustomerEntriesModal';
import { 
  formatDisplayDate, 
  formatDisplayTime, 
  getTodayDateString 
} from '../utils/customerUtils';

export function CaneEntries({ 
  customers, 
  onUpdateEntry, 
  onAddDeliveryEntry,
  onDeleteEntry,
  onNavigateToAddCustomer,
  onDeleteCustomer,
  businessInfo 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // all | delivered | pending-entry | bending
  const [savedFeedbacks, setSavedFeedbacks] = useState({}); // { [customerId]: boolean }
  const [expandedBendingIds, setExpandedBendingIds] = useState({}); // { [customerId]: boolean }
  const [expandedTodayLogIds, setExpandedTodayLogIds] = useState({}); // { [customerId]: boolean }
  const [customerToDelete, setCustomerToDelete] = useState(null);
  
  // Selected customer for "View All Entries" modal
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState(null);

  // Form drafts for new deliveries per customer: { [customerId]: { cans: number, empty: number, paid: number } }
  const [draftEntries, setDraftEntries] = useState({});

  const todayStr = getTodayDateString();

  // Helper to get or init draft values
  const getDraft = (customerId, rate = 35) => {
    if (draftEntries[customerId]) {
      return draftEntries[customerId];
    }
    return {
      cans: 1,
      empty: 1,
      paid: ''
    };
  };

  const updateDraft = (customerId, updates) => {
    setDraftEntries(prev => {
      const current = prev[customerId] || { cans: 1, empty: 1, paid: '' };
      return {
        ...prev,
        [customerId]: {
          ...current,
          ...updates
        }
      };
    });
  };

  const toggleBendingDetails = (customerId) => {
    setExpandedBendingIds(prev => ({
      ...prev,
      [customerId]: !prev[customerId]
    }));
  };

  const toggleTodayLog = (customerId) => {
    setExpandedTodayLogIds(prev => ({
      ...prev,
      [customerId]: !prev[customerId]
    }));
  };

  // Filtered customers based on search query
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) {
      return [];
    }

    const q = searchQuery.toLowerCase().trim();
    let list = customers.filter(c => 
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q))
    );

    if (activeFilter === 'delivered') {
      list = list.filter(c => (c.todayCans || c.todayEntry?.cansBought || 0) > 0);
    } else if (activeFilter === 'pending-entry') {
      list = list.filter(c => !c.todayEntry?.saved || (c.todayCans || c.todayEntry?.cansBought || 0) === 0);
    } else if (activeFilter === 'bending') {
      list = list.filter(c => (c.totalOutstandingBending || 0) > 0);
    }

    return list;
  }, [customers, searchQuery, activeFilter]);

  // Handle draft changes for cans delivered
  const handleCansChange = (customerId, newCans) => {
    const val = Math.max(0, parseInt(newCans, 10) || 0);
    updateDraft(customerId, { cans: val });
  };

  const handleQuickAddCans = (customerId, delta) => {
    const current = getDraft(customerId).cans;
    handleCansChange(customerId, current + delta);
  };

  // Handle empty cans returned
  const handleEmptyCansChange = (customerId, newEmpty) => {
    const val = Math.max(0, parseInt(newEmpty, 10) || 0);
    updateDraft(customerId, { empty: val });
  };

  const handleQuickAddEmpty = (customerId, delta) => {
    const current = getDraft(customerId).empty;
    handleEmptyCansChange(customerId, current + delta);
  };

  // Handle amount paid
  const handlePaidChange = (customerId, newPaid) => {
    updateDraft(customerId, { paid: newPaid });
  };

  const handleQuickPayFull = (customerId, rate) => {
    const cans = getDraft(customerId).cans;
    const cost = cans * rate;
    updateDraft(customerId, { paid: cost });
  };

  // SAVE DELIVERY ENTRY (Adds to customer details, accumulating with any previous deliveries today)
  const handleSaveDeliveryEntry = (customer) => {
    const draft = getDraft(customer.id);
    const cansVal = Number(draft.cans) || 0;
    const emptyVal = Number(draft.empty) || 0;
    const paidVal = draft.paid === '' ? 0 : (parseFloat(draft.paid) || 0);
    const rate = customer.amountPerCane || 35;

    if (cansVal === 0 && emptyVal === 0 && paidVal === 0) {
      alert('Please enter at least cans delivered, empty cans returned, or amount paid to log a delivery.');
      return;
    }

    onAddDeliveryEntry(customer.id, {
      cansDelivered: cansVal,
      emptyCansReturned: emptyVal,
      amountPaid: paidVal,
      rate: rate
    });

    // Reset draft form for next delivery
    setDraftEntries(prev => ({
      ...prev,
      [customer.id]: {
        cans: 1,
        empty: 1,
        paid: ''
      }
    }));

    // Trigger celebration & feedback
    setSavedFeedbacks(prev => ({ ...prev, [customer.id]: true }));
    setTimeout(() => {
      setSavedFeedbacks(prev => ({ ...prev, [customer.id]: false }));
    }, 2500);

    confetti({
      particleCount: 35,
      spread: 60,
      origin: { y: 0.8 }
    });
  };

  const generateWhatsAppMessage = (customer) => {
    const rate = customer.amountPerCane || 35;
    const todayCans = customer.todayCans ?? (customer.todayEntry?.cansBought || 0);
    const todayEmpty = customer.todayEmpty ?? (customer.todayEntry?.emptyCansReturned || 0);
    const todayPaid = customer.todayPaid ?? (customer.todayEntry?.amountPaid || 0);
    const todayCost = todayCans * rate;
    const totalBending = customer.totalOutstandingBending ?? 0;

    const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    let message = `*${businessInfo.name}* 💧 Water Can Bill\n`;
    message += `Date: ${dateStr}\n`;
    message += `Customer: *${customer.name}*\n`;
    message += `--------------------------------\n`;
    message += `Total Cans Delivered Today: *${todayCans} Cans* @ ₹${rate}/can\n`;
    message += `Empty Cans Returned Today: *${todayEmpty} Cans*\n`;
    message += `Today's Bill Amount: ₹${todayCost}\n`;
    message += `Amount Paid Today: ₹${todayPaid}\n`;
    
    if (totalBending > 0) {
      message += `--------------------------------\n`;
      message += `*Total Outstanding Bending: ₹${totalBending}*\n`;
      message += `Kindly pay via GPay / UPI: ${businessInfo.upiId}\n`;
    } else {
      message += `--------------------------------\n`;
      message += `*Status: Fully Paid / All Clear ✅*\n`;
      message += `Thank you for your business!\n`;
    }
    message += `--------------------------------\n`;
    message += `Tamilan Waters • Phone: ${businessInfo.phone}`;

    return encodeURIComponent(message);
  };

  // Find latest customer instance to pass to modal
  const modalCustomer = useMemo(() => {
    if (!selectedCustomerForHistory) return null;
    return customers.find(c => c.id === selectedCustomerForHistory.id) || selectedCustomerForHistory;
  }, [customers, selectedCustomerForHistory]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
      {/* Search & Filter Bar */}
      <div className="p-1 rounded-2xl bg-white border border-slate-200/90 shadow-sm mb-6">
        <div className="p-2 sm:p-3 rounded-xl bg-slate-50/70 flex flex-col gap-3">
          {/* Main search bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <MagnifyingGlass weight="bold" className="w-5 h-5 text-ocean-600" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customer name, phone number, or area (e.g., 'Murugan', 'Karthik')..."
              className="w-full pl-11 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ocean-500/20 focus:border-ocean-500 transition-all shadow-sm"
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

          {/* Quick Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              All ({customers.length})
            </button>
            <button
              onClick={() => setActiveFilter('delivered')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeFilter === 'delivered'
                  ? 'bg-ocean-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Delivered Today
            </button>
            <button
              onClick={() => setActiveFilter('pending-entry')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeFilter === 'pending-entry'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Pending Entry
            </button>
            <button
              onClick={() => setActiveFilter('bending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeFilter === 'bending'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Has Bending Dues
            </button>
          </div>
        </div>
      </div>

      {/* Customer Cards List */}
      {customers.length === 0 ? (
        <div className="p-1 rounded-3xl bg-white border border-slate-200/90 shadow-bezel-outer text-center py-16">
          <div className="rounded-2xl bg-white p-8 max-w-md mx-auto bezel-core">
            <div className="w-16 h-16 rounded-2xl bg-ocean-50 text-ocean-600 mx-auto flex items-center justify-center mb-4 ring-1 ring-ocean-200 shadow-sm">
              <Drop weight="fill" className="w-8 h-8 text-ocean-600 animate-pulse" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900">
              Welcome to Tamilan Waters!
            </h2>
            <p className="text-xs text-slate-500 mt-1.5 mb-6 leading-relaxed">
              Your site is completely fresh and ready. Add your first customer with their name, rate per can, and opening balance to start logging deliveries.
            </p>
            <button
              onClick={onNavigateToAddCustomer}
              className="tactile-btn inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-md transition-all"
            >
              <Plus weight="bold" className="w-4 h-4 text-ocean-400" />
              <span>Add Your First Customer</span>
            </button>
          </div>
        </div>
      ) : !searchQuery.trim() ? (
        /* Prompt state when no customer has been searched yet */
        <div className="p-1 rounded-3xl bg-white border border-slate-200/90 shadow-bezel-outer text-center py-12 px-4">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-ocean-50 text-ocean-600 mx-auto flex items-center justify-center ring-1 ring-ocean-200 shadow-sm">
              <MagnifyingGlass weight="bold" className="w-7 h-7 text-ocean-600" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                Search Customer to View Details
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                Type customer name, phone number, or area in the search bar above to log cans delivered, empty cans returned, and payments.
              </p>
            </div>

            {/* Quick Clickable Customer Name Tags */}
            {customers.length > 0 && (
              <div className="pt-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                  Or tap a customer name:
                </p>
                <div className="flex flex-wrap items-center justify-center gap-1.5 max-h-48 overflow-y-auto p-1 scrollbar-none">
                  {customers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSearchQuery(c.name)}
                      className="tactile-btn px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-ocean-50 hover:text-ocean-700 hover:border-ocean-300 border border-slate-200/80 text-xs font-semibold text-slate-700 transition-all shadow-2xs"
                    >
                      <span>{c.name}</span>
                      {c.phone && <span className="ml-1 text-[10px] text-slate-400">({c.phone.slice(-4)})</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={onNavigateToAddCustomer}
                className="tactile-btn inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-sm"
              >
                <Plus weight="bold" className="w-4 h-4 text-ocean-400" />
                <span>Add New Customer</span>
              </button>
            </div>
          </div>
        </div>
      ) : filteredCustomers.length === 0 ? (
        /* State when searched customer is not found */
        <div className="p-1 rounded-2xl bg-slate-100/70 ring-1 ring-slate-200/80 shadow-sm text-center py-14">
          <div className="rounded-xl bg-white p-8 max-w-md mx-auto bezel-core">
            <div className="w-12 h-12 rounded-full bg-ocean-50 text-ocean-600 mx-auto flex items-center justify-center mb-3">
              <MagnifyingGlass weight="bold" className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-slate-900">No Customers Found</h2>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              No customer matching "{searchQuery}". You can quickly add a new customer to Tamilan Waters.
            </p>
            <button
              onClick={onNavigateToAddCustomer}
              className="tactile-btn inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-ocean-600 text-white text-xs font-semibold hover:bg-ocean-700"
            >
              <span>Add "{searchQuery || 'New Customer'}"</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredCustomers.map((customer) => {
            const rate = customer.amountPerCane || 35;
            const draft = getDraft(customer.id, rate);

            // Today's aggregate totals across all deliveries today
            const todayEntries = (customer.entries || []).filter(e => e.date === todayStr);
            const todayCans = customer.todayCans ?? (customer.todayEntry?.cansBought || 0);
            const todayEmpty = customer.todayEmpty ?? (customer.todayEntry?.emptyCansReturned || 0);
            const todayPaid = customer.todayPaid ?? (customer.todayEntry?.amountPaid || 0);
            const todayCost = todayCans * rate;
            const todayBending = Math.max(0, todayCost - todayPaid);
            const prevBending = customer.previousBendingAmount || 0;
            const totalOutstandingBending = customer.totalOutstandingBending ?? (prevBending + todayBending);

            const justSaved = savedFeedbacks[customer.id];
            const hasDeliveriesToday = todayCans > 0 || todayEntries.length > 0;
            const isTodayLogOpen = Boolean(expandedTodayLogIds[customer.id]);

            // Draft values currently entered in the boxes for next delivery
            const draftCans = draft.cans;
            const draftEmpty = draft.empty;
            const draftPaid = draft.paid;
            const draftCost = draftCans * rate;

            return (
              <div 
                key={customer.id}
                className="p-1 rounded-3xl bg-white border border-slate-200/90 shadow-bezel-outer hover:shadow-bezel-inner transition-all duration-300"
              >
                <div className="rounded-2xl bg-white p-5 sm:p-6 bezel-core space-y-4">
                  {/* CARD HEADER (Customer Details + View All Entries Button) */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 flex-wrap sm:flex-nowrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-slate-900">
                          {customer.name}
                        </h3>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-ocean-50 text-ocean-700 border border-ocean-200">
                          ₹{rate}/cane
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                        {customer.phone && (
                          <span className="flex items-center gap-1 font-mono">
                            <Phone weight="bold" className="w-3.5 h-3.5 text-slate-400" />
                            {customer.phone}
                          </span>
                        )}
                        {customer.address && (
                          <span className="flex items-center gap-1 text-slate-400">
                            <MapPin weight="bold" className="w-3.5 h-3.5 text-slate-400" />
                            {customer.address}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status badge and View All Entries feature button */}
                    <div className="shrink-0 flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      {/* VIEW ALL ENTRIES FEATURE BUTTON */}
                      <button
                        type="button"
                        onClick={() => setSelectedCustomerForHistory(customer)}
                        className="tactile-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-sm transition-all"
                        title="View complete date & time delivery log for this customer"
                      >
                        <ClockCounterClockwise weight="bold" className="w-4 h-4 text-ocean-400" />
                        <span>View All Entries ({customer.entries?.length || 0})</span>
                      </button>

                      {totalOutstandingBending > 0 ? (
                        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          <span>Bending: ₹{totalOutstandingBending}</span>
                        </div>
                      ) : totalOutstandingBending === 0 ? (
                        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                          <Check weight="bold" className="w-3.5 h-3.5" />
                          <span>All Clear</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-ocean-50 text-ocean-700 border border-ocean-300">
                          <span>Advance: ₹{Math.abs(totalOutstandingBending)}</span>
                        </div>
                      )}

                      {/* Delete Customer Button */}
                      <button
                        type="button"
                        onClick={() => setCustomerToDelete(customer)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200/60 hover:border-rose-200 transition-colors"
                        title={`Delete ${customer.name}`}
                      >
                        <Trash weight="bold" className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* TODAY'S ACCUMULATED SUMMARY BANNER (SOLVES: Displays only last entries) */}
                  {hasDeliveriesToday && (
                    <div className="rounded-2xl bg-ocean-50/70 border border-ocean-200 p-3.5 sm:p-4 space-y-2.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-ocean-600 animate-pulse"></span>
                          <span className="text-xs font-extrabold uppercase tracking-wider text-ocean-900">
                            Today's Total Logged Deliveries
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-ocean-200/80 text-ocean-900">
                            {todayEntries.length} {todayEntries.length === 1 ? 'delivery' : 'deliveries'} today
                          </span>
                        </div>

                        {todayEntries.length > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleTodayLog(customer.id)}
                            className="text-xs font-bold text-ocean-700 hover:text-ocean-900 flex items-center gap-1 transition-colors"
                          >
                            <span>{isTodayLogOpen ? 'Hide Today Entries' : 'View Today Entries'}</span>
                            {isTodayLogOpen ? (
                              <CaretUp weight="bold" className="w-3.5 h-3.5" />
                            ) : (
                              <CaretDown weight="bold" className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Today's cumulative stat pills */}
                      <div className="grid grid-cols-3 gap-2 text-center pt-1">
                        <div className="p-2 rounded-xl bg-white border border-ocean-200/80 shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">Delivered Today</span>
                          <span className="text-sm sm:text-base font-black text-ocean-700 font-mono">
                            {todayCans} Cans
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-white border border-ocean-200/80 shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">Empty Returned</span>
                          <span className="text-sm sm:text-base font-black text-amber-700 font-mono">
                            {todayEmpty} Empty
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-white border border-ocean-200/80 shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">Paid Today</span>
                          <span className="text-sm sm:text-base font-black text-emerald-700 font-mono">
                            ₹{todayPaid}
                          </span>
                        </div>
                      </div>

                      {/* Expandable list of all deliveries made TODAY */}
                      {isTodayLogOpen && todayEntries.length > 0 && (
                        <div className="pt-2 border-t border-ocean-200/70 space-y-1.5 animate-slide-down">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-ocean-800 block mb-1">
                            Individual Deliveries Today:
                          </span>
                          {todayEntries.map((entry, eIdx) => (
                            <div 
                              key={entry.id || eIdx}
                              className="p-2 rounded-xl bg-white/90 border border-ocean-100 flex items-center justify-between text-xs font-mono"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-500">#{eIdx + 1}</span>
                                <span className="text-slate-700 font-sans font-semibold">
                                  {entry.time || formatDisplayTime(null, entry.timestamp) || 'Today'}
                                </span>
                                <span className="text-ocean-700 font-bold">
                                  • {entry.cansDelivered} cans
                                </span>
                                <span className="text-amber-700">
                                  • {entry.emptyCansReturned} empty
                                </span>
                                <span className="text-emerald-700 font-bold">
                                  • ₹{entry.amountPaid} paid
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => onDeleteEntry(customer.id, entry.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                                title="Remove this delivery entry"
                              >
                                <Trash weight="bold" className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUBHEADER: LOG NEW / ANOTHER DELIVERY */}
                  <div className="pt-1">
                    <p className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Plus weight="bold" className="w-3.5 h-3.5 text-ocean-600" />
                      <span>{hasDeliveriesToday ? "Add Another Delivery to Today's Account" : "Log Today's Delivery"}</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {hasDeliveriesToday 
                        ? "Enter additional cans delivered, empty cans collected, or amount paid. It will automatically add to today's totals." 
                        : "Enter cans delivered, empty cans collected, and amount paid for today."}
                    </p>
                  </div>

                  {/* VERTICAL ITEM 1: No. of Cane Delivered (For this delivery) */}
                  <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-ocean-100 text-ocean-700 text-xs font-bold flex items-center justify-center">
                          1
                        </span>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          No. of Cane Delivered
                        </label>
                      </div>
                      <span className="text-xs font-bold text-ocean-700 font-mono bg-ocean-50 px-2 py-0.5 rounded-lg border border-ocean-200">
                        Delivery Cost: ₹{draftCost}
                      </span>
                    </div>

                    {/* Counter Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-stretch">
                      {/* Left: Minus, Input, Plus */}
                      <div className="sm:col-span-6 flex items-stretch gap-1.5 bg-white p-1 rounded-xl border border-slate-200/90 shadow-sm">
                        <button
                          type="button"
                          onClick={() => handleCansChange(customer.id, draftCans - 1)}
                          disabled={draftCans <= 0}
                          className="w-12 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed tactile-btn"
                        >
                          <Minus weight="bold" className="w-4 h-4" />
                        </button>

                        <input
                          type="number"
                          min="0"
                          value={draftCans}
                          onChange={(e) => handleCansChange(customer.id, e.target.value)}
                          className="flex-1 min-w-0 h-10 text-center bg-transparent text-lg font-black text-slate-900 focus:outline-none num-tabular"
                        />

                        <button
                          type="button"
                          onClick={() => handleCansChange(customer.id, draftCans + 1)}
                          className="w-12 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 tactile-btn"
                        >
                          <Plus weight="bold" className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Right: 4 Equal Width Quick Jump Buttons */}
                      <div className="sm:col-span-6 grid grid-cols-4 gap-1.5">
                        {[1, 2, 5, 10].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => handleQuickAddCans(customer.id, amt)}
                            className="h-12 sm:h-auto rounded-xl bg-white border border-slate-200 text-ocean-700 font-extrabold text-xs sm:text-sm hover:bg-ocean-50 hover:border-ocean-300 active:scale-95 transition-all shadow-sm flex items-center justify-center"
                          >
                            +{amt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* VERTICAL ITEM 2: Empty Cane Returned */}
                  <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center">
                          2
                        </span>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Empty Cane Returned
                        </label>
                      </div>
                      <span className="text-xs font-bold text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                        {customer.emptyCansHeld ? `Holds: ${customer.emptyCansHeld} cans` : 'Empty Returns'}
                      </span>
                    </div>

                    {/* Counter Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-stretch">
                      <div className="sm:col-span-6 flex items-stretch gap-1.5 bg-white p-1 rounded-xl border border-slate-200/90 shadow-sm">
                        <button
                          type="button"
                          onClick={() => handleEmptyCansChange(customer.id, draftEmpty - 1)}
                          disabled={draftEmpty <= 0}
                          className="w-12 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed tactile-btn"
                        >
                          <Minus weight="bold" className="w-4 h-4" />
                        </button>

                        <input
                          type="number"
                          min="0"
                          value={draftEmpty}
                          onChange={(e) => handleEmptyCansChange(customer.id, e.target.value)}
                          className="flex-1 min-w-0 h-10 text-center bg-transparent text-lg font-black text-slate-900 focus:outline-none num-tabular"
                        />

                        <button
                          type="button"
                          onClick={() => handleEmptyCansChange(customer.id, draftEmpty + 1)}
                          className="w-12 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 tactile-btn"
                        >
                          <Plus weight="bold" className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="sm:col-span-6 grid grid-cols-4 gap-1.5">
                        {[1, 2, 5, 10].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => handleQuickAddEmpty(customer.id, amt)}
                            className="h-12 sm:h-auto rounded-xl bg-white border border-slate-200 text-slate-700 font-extrabold text-xs sm:text-sm hover:bg-slate-100 hover:border-slate-300 active:scale-95 transition-all shadow-sm flex items-center justify-center"
                          >
                            +{amt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* VERTICAL ITEM 3: Amount Paid for this Delivery */}
                  <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">
                          3
                        </span>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Amount Paid Today
                        </label>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-400">
                        Cash or GPay / UPI (₹)
                      </span>
                    </div>

                    {/* Input & Quick presets */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-stretch">
                      <div className="sm:col-span-6 relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 font-bold text-base">
                          ₹
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="5"
                          value={draftPaid}
                          onChange={(e) => handlePaidChange(customer.id, e.target.value)}
                          placeholder="0"
                          className="w-full h-11 pl-9 pr-3.5 bg-white border border-slate-300 rounded-xl text-base font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-ocean-500/20 focus:border-ocean-500 num-tabular shadow-sm"
                        />
                      </div>

                      <div className="sm:col-span-6 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleQuickPayFull(customer.id, rate)}
                          className="h-11 px-2 text-xs font-bold rounded-xl bg-emerald-100 text-emerald-800 hover:bg-emerald-200 active:scale-95 transition-all shadow-sm flex items-center justify-center text-center truncate"
                        >
                          Full Paid (₹{draftCost})
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePaidChange(customer.id, 0)}
                          className="h-11 px-2 text-xs font-bold rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 active:scale-95 transition-all flex items-center justify-center text-center"
                        >
                          ₹0 Unpaid
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* VERTICAL ITEM 4: BENDING AMOUNT (Click to view calculation breakdown) */}
                  {(() => {
                    const isBendingOpen = !!expandedBendingIds[customer.id];

                    return (
                      <div className="rounded-2xl border border-amber-200/90 overflow-hidden bg-gradient-to-b from-amber-50/70 to-orange-50/40 transition-all">
                        {/* Always visible banner */}
                        <div
                          onClick={() => toggleBendingDetails(customer.id)}
                          className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-amber-100/50 transition-colors select-none"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-amber-200 text-amber-900 text-xs font-bold flex items-center justify-center shrink-0">
                              4
                            </span>
                            <div>
                              <span className="text-xs font-bold uppercase tracking-wider text-amber-900 block">
                                Total Bending Amount
                              </span>
                              <span className="text-[11px] text-amber-700 font-medium flex items-center gap-1 mt-0.5">
                                <span>{isBendingOpen ? 'Click to hide breakdown' : 'Click to view calculation breakdown'}</span>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="flex items-baseline gap-1">
                              <span className="text-sm font-bold text-amber-600">₹</span>
                              <span className={`text-2xl sm:text-3xl font-black num-tabular ${
                                totalOutstandingBending > 0 
                                  ? 'text-amber-600' 
                                  : totalOutstandingBending === 0 
                                    ? 'text-emerald-600' 
                                    : 'text-ocean-600'
                              }`}>
                                {totalOutstandingBending}
                              </span>
                            </div>

                            <div className="w-7 h-7 rounded-lg bg-amber-200/60 flex items-center justify-center text-amber-900">
                              {isBendingOpen ? (
                                <CaretUp weight="bold" className="w-4 h-4" />
                              ) : (
                                <CaretDown weight="bold" className="w-4 h-4" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* DISPLAY ONLY WHEN CLICKED */}
                        {isBendingOpen && (
                          <div className="px-4 sm:px-5 pb-5 pt-3 border-t border-amber-200/70 space-y-3 bg-white/80">
                            <div className="flex items-center justify-between pb-2 border-b border-amber-200/50 text-[11px] font-mono text-amber-800">
                              <span className="font-bold uppercase tracking-wider text-[10px]">Formula</span>
                              <span>(all cans delivered * amount per can - all amount paid)</span>
                            </div>

                            {/* Step-by-Step Formula Display */}
                            <div className="space-y-1.5 text-xs text-slate-700 font-mono">
                              <div className="flex justify-between items-center py-1">
                                <span className="text-slate-600">Total Cans Today ({todayCans} cans × ₹{rate}):</span>
                                <span className="font-bold text-slate-900">₹{todayCost}</span>
                              </div>
                              <div className="flex justify-between items-center py-1">
                                <span className="text-slate-600">Less Amount Paid Today:</span>
                                <span className="font-bold text-emerald-700">- ₹{todayPaid}</span>
                              </div>
                              <div className="flex justify-between items-center py-1 border-t border-amber-200/60">
                                <span className="font-semibold text-slate-800">Today's Remaining Bending:</span>
                                <span className={`font-bold ${todayBending > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                                  ₹{todayBending}
                                </span>
                              </div>
                              {prevBending > 0 && (
                                <div className="flex justify-between items-center py-1 text-amber-800">
                                  <span>+ Previous Accumulated Bending:</span>
                                  <span className="font-bold">₹{prevBending}</span>
                                </div>
                              )}
                            </div>

                            <div className="pt-2 border-t border-amber-200/60 flex justify-between text-[11px] text-slate-500 font-medium">
                              <span>Status:</span>
                              <span className="font-bold text-slate-800">
                                {totalOutstandingBending > 0 
                                  ? 'Outstanding payment due to collect' 
                                  : totalOutstandingBending === 0 
                                    ? 'Fully settled - no pending dues' 
                                    : 'Advance amount with Tamilan Waters'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* VERTICAL ITEM 5: Card Actions (Add Delivery, WhatsApp, View All Entries) */}
                  <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedCustomerForHistory(customer)}
                        className="text-ocean-700 hover:text-ocean-900 font-bold hover:underline flex items-center gap-1"
                      >
                        <ClockCounterClockwise weight="bold" className="w-4 h-4" />
                        <span>View complete history ({customer.entries?.length || 0} entries)</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      {customer.phone && (
                        <a
                          href={`https://wa.me/91${customer.phone}?text=${generateWhatsAppMessage(customer)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tactile-btn flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100"
                          title="Share Bill via WhatsApp"
                        >
                          <WhatsappLogo weight="fill" className="w-4 h-4 text-emerald-600" />
                          <span>WhatsApp Bill</span>
                        </a>
                      )}

                      {/* SAVE / ADD DELIVERY BUTTON */}
                      <button
                        type="button"
                        onClick={() => handleSaveDeliveryEntry(customer)}
                        className={`tactile-btn flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md ${
                          justSaved
                            ? 'bg-emerald-600 text-white'
                            : 'bg-ocean-600 text-white hover:bg-ocean-700'
                        }`}
                      >
                        {justSaved ? (
                          <>
                            <Check weight="bold" className="w-4 h-4 animate-bounce" />
                            <span>Delivery Added! Total: {todayCans} Cans</span>
                          </>
                        ) : (
                          <>
                            <CalendarCheck weight="bold" className="w-4 h-4" />
                            <span>
                              {hasDeliveriesToday 
                                ? `+ Add Delivery (${draftCans} Cans • Total: ${todayCans + draftCans})` 
                                : `Save Delivery Entry (${draftCans} Cans)`
                              }
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 1. Customer Entries History Modal ("View All Entries in Customer") */}
      {modalCustomer && (
        <CustomerEntriesModal
          isOpen={Boolean(modalCustomer)}
          onClose={() => setSelectedCustomerForHistory(null)}
          customer={modalCustomer}
          onAddEntry={onAddDeliveryEntry}
          onDeleteEntry={onDeleteEntry}
          businessInfo={businessInfo}
        />
      )}

      {/* 2. Customer Delete Permission Confirmation Modal */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div 
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-5 sm:p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash weight="bold" className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Delete Customer?
                </h3>
                <p className="text-xs text-slate-500">
                  Permission required to permanently delete
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1.5">
              <p>
                Are you sure you want to delete <strong className="text-slate-900 font-extrabold">{customerToDelete.name}</strong>?
              </p>
              <p className="text-[11px] text-rose-600 font-medium">
                ⚠️ This will permanently remove this customer's profile, all daily delivery records, empty cans log, and all pending balances.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteCustomer(customerToDelete.id);
                  setCustomerToDelete(null);
                }}
                className="tactile-btn px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-colors"
              >
                Yes, Delete Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
