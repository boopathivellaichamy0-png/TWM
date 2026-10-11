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
  ArrowCounterClockwise,
  CaretDown,
  CaretUp,
  Drop
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';

export function CaneEntries({ 
  customers, 
  onUpdateEntry, 
  onNavigateToAddCustomer,
  businessInfo 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // all | delivered | pending-entry | bending
  const [savedFeedbacks, setSavedFeedbacks] = useState({}); // { [customerId]: boolean }
  const [expandedBendingIds, setExpandedBendingIds] = useState({}); // { [customerId]: boolean }

  const toggleBendingDetails = (customerId) => {
    setExpandedBendingIds(prev => ({
      ...prev,
      [customerId]: !prev[customerId]
    }));
  };

  // Filtered customers based on search and selected filter chip
  const filteredCustomers = useMemo(() => {
    let list = customers;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(c => 
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q))
      );
    }

    if (activeFilter === 'delivered') {
      list = list.filter(c => (c.todayEntry?.cansBought || 0) > 0);
    } else if (activeFilter === 'pending-entry') {
      list = list.filter(c => !c.todayEntry?.saved || (c.todayEntry?.cansBought || 0) === 0);
    } else if (activeFilter === 'bending') {
      list = list.filter(c => {
        const todayCans = c.todayEntry?.cansBought || 0;
        const rate = c.amountPerCane || 0;
        const todayPaid = c.todayEntry?.amountPaid || 0;
        const todayBending = (todayCans * rate) - todayPaid;
        const totalBending = (c.previousBendingAmount || 0) + todayBending;
        return totalBending > 0;
      });
    }

    return list;
  }, [customers, searchQuery, activeFilter]);

  // Handle local state updates for cans delivered
  const handleCansChange = (customerId, newCans) => {
    const val = Math.max(0, parseInt(newCans, 10) || 0);
    onUpdateEntry(customerId, {
      cansBought: val,
      saved: false
    });
  };

  const handleQuickAddCans = (customerId, delta) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;
    const current = customer.todayEntry?.cansBought || 0;
    handleCansChange(customerId, current + delta);
  };

  // Handle empty cans returned
  const handleEmptyCansValueChange = (customerId, newEmptyVal) => {
    const nextVal = Math.max(0, parseInt(newEmptyVal, 10) || 0);
    onUpdateEntry(customerId, {
      emptyCansReturned: nextVal,
      saved: false
    });
  };

  const handleQuickAddEmptyCans = (customerId, delta) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;
    const current = customer.todayEntry?.emptyCansReturned || 0;
    handleEmptyCansValueChange(customerId, current + delta);
  };

  const handlePaidChange = (customerId, newPaid) => {
    const val = Math.max(0, parseFloat(newPaid) || 0);
    onUpdateEntry(customerId, {
      amountPaid: val,
      saved: false
    });
  };

  const handleQuickPayFull = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;
    const todayCost = (customer.todayEntry?.cansBought || 0) * (customer.amountPerCane || 0);
    onUpdateEntry(customerId, {
      amountPaid: todayCost,
      saved: false
    });
  };

  const handleSaveEntry = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    onUpdateEntry(customerId, {
      saved: true,
      lastUpdated: new Date().toISOString()
    });

    setSavedFeedbacks(prev => ({ ...prev, [customerId]: true }));
    setTimeout(() => {
      setSavedFeedbacks(prev => ({ ...prev, [customerId]: false }));
    }, 2200);

    const todayCans = customer.todayEntry?.cansBought || 0;
    const rate = customer.amountPerCane || 0;
    const todayPaid = customer.todayEntry?.amountPaid || 0;
    const todayBending = (todayCans * rate) - todayPaid;
    if (todayBending <= 0 && todayCans > 0) {
      confetti({
        particleCount: 25,
        spread: 60,
        origin: { y: 0.8 }
      });
    }
  };

  const generateWhatsAppMessage = (customer) => {
    const cans = customer.todayEntry?.cansBought || 0;
    const emptyReturned = customer.todayEntry?.emptyCansReturned || 0;
    const rate = customer.amountPerCane || 0;
    const paid = customer.todayEntry?.amountPaid || 0;
    const todayCost = cans * rate;
    const todayBending = todayCost - paid;
    const prevBending = customer.previousBendingAmount || 0;
    const totalBending = prevBending + todayBending;

    const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    let message = `*${businessInfo.name}* 💧 Water Can Bill\n`;
    message += `Date: ${dateStr}\n`;
    message += `Customer: *${customer.name}*\n`;
    message += `--------------------------------\n`;
    message += `Cans Delivered Today: *${cans} Cans* @ ₹${rate}/can\n`;
    message += `Empty Cans Returned Today: *${emptyReturned} Cans*\n`;
    message += `Today's Bill Amount: ₹${todayCost}\n`;
    message += `Amount Paid Today: ₹${paid}\n`;
    
    if (todayBending > 0) {
      message += `Today's Bending: *₹${todayBending}*\n`;
    }
    if (prevBending > 0) {
      message += `Previous Dues: ₹${prevBending}\n`;
    }
    message += `--------------------------------\n`;
    if (totalBending > 0) {
      message += `*Total Outstanding Bending: ₹${totalBending}*\n`;
      message += `Kindly pay via GPay / UPI: ${businessInfo.upiId}\n`;
    } else {
      message += `*Status: Fully Paid / All Clear ✅*\n`;
      message += `Thank you for your business!\n`;
    }
    message += `--------------------------------\n`;
    message += `Tamilan Waters • Phone: ${businessInfo.phone}`;

    return encodeURIComponent(message);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
      {/* Search & Filter Bar (Direct top element as requested, removing subheader in image 1) */}
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

      {/* Customer Cards List: Strict Vertical Flow */}
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
      ) : filteredCustomers.length === 0 ? (
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
            const todayCans = customer.todayEntry?.cansBought || 0;
            const rate = customer.amountPerCane || 35;
            const todayPaid = customer.todayEntry?.amountPaid || 0;
            const todayCost = todayCans * rate;
            
            // USER FORMULA:
            // bending amount = (number of cane * amount per cane - amount paied)
            const todayBending = todayCost - todayPaid;
            const prevBending = customer.previousBendingAmount || 0;
            const totalOutstandingBending = prevBending + todayBending;

            const isSaved = customer.todayEntry?.saved;
            const justSaved = savedFeedbacks[customer.id];
            const emptyCansReturned = customer.todayEntry?.emptyCansReturned || 0;

            return (
              <div 
                key={customer.id}
                className="p-1 rounded-3xl bg-white border border-slate-200/90 shadow-bezel-outer hover:shadow-bezel-inner transition-all duration-300"
              >
                <div className="rounded-2xl bg-white p-5 sm:p-6 bezel-core space-y-4">
                  {/* CARD HEADER (Customer Details) */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
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

                    {/* Status badge */}
                    <div className="shrink-0 text-right">
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
                    </div>
                  </div>

                  {/* VERTICAL ITEM 1: No. of Cane Delivered Today (Renamed from Buyed to Delivered) */}
                  <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-ocean-100 text-ocean-700 text-xs font-bold flex items-center justify-center">
                          1
                        </span>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          No. of Cane Delivered Today
                        </label>
                      </div>
                      <span className="text-xs font-bold text-ocean-700 font-mono bg-ocean-50 px-2 py-0.5 rounded-lg border border-ocean-200">
                        Today's Cost: ₹{todayCost}
                      </span>
                    </div>

                    {/* Counter Row that fits the entire box width */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-stretch">
                      {/* Left: Enclosed Minus, Flex-1 Input, Plus */}
                      <div className="sm:col-span-6 flex items-stretch gap-1.5 bg-white p-1 rounded-xl border border-slate-200/90 shadow-sm">
                        <button
                          type="button"
                          onClick={() => handleCansChange(customer.id, todayCans - 1)}
                          disabled={todayCans <= 0}
                          className="w-12 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed tactile-btn"
                        >
                          <Minus weight="bold" className="w-4 h-4" />
                        </button>

                        <input
                          type="number"
                          min="0"
                          value={todayCans}
                          onChange={(e) => handleCansChange(customer.id, e.target.value)}
                          className="flex-1 min-w-0 h-10 text-center bg-transparent text-lg font-black text-slate-900 focus:outline-none num-tabular"
                        />

                        <button
                          type="button"
                          onClick={() => handleCansChange(customer.id, todayCans + 1)}
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

                  {/* VERTICAL ITEM 2: Empty Cane Returned Today */}
                  <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center">
                          2
                        </span>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Empty Cane Returned Today
                        </label>
                      </div>
                      <span className="text-xs font-bold text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                        {customer.emptyCansHeld ? `Holds: ${customer.emptyCansHeld} cans` : 'Empty Returns'}
                      </span>
                    </div>

                    {/* Counter Row fitting the entire box width */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-stretch">
                      <div className="sm:col-span-6 flex items-stretch gap-1.5 bg-white p-1 rounded-xl border border-slate-200/90 shadow-sm">
                        <button
                          type="button"
                          onClick={() => handleEmptyCansValueChange(customer.id, emptyCansReturned - 1)}
                          disabled={emptyCansReturned <= 0}
                          className="w-12 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed tactile-btn"
                        >
                          <Minus weight="bold" className="w-4 h-4" />
                        </button>

                        <input
                          type="number"
                          min="0"
                          value={emptyCansReturned}
                          onChange={(e) => handleEmptyCansValueChange(customer.id, e.target.value)}
                          className="flex-1 min-w-0 h-10 text-center bg-transparent text-lg font-black text-slate-900 focus:outline-none num-tabular"
                        />

                        <button
                          type="button"
                          onClick={() => handleEmptyCansValueChange(customer.id, emptyCansReturned + 1)}
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
                            onClick={() => handleQuickAddEmptyCans(customer.id, amt)}
                            className="h-12 sm:h-auto rounded-xl bg-white border border-slate-200 text-slate-700 font-extrabold text-xs sm:text-sm hover:bg-slate-100 hover:border-slate-300 active:scale-95 transition-all shadow-sm flex items-center justify-center"
                          >
                            +{amt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* VERTICAL ITEM 3: Amount Paied Today */}
                  <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">
                          3
                        </span>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Amount Paied Today
                        </label>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-400">
                        Cash or GPay / UPI (₹)
                      </span>
                    </div>

                    {/* Input & Quick presets fitting the entire box width */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-stretch">
                      <div className="sm:col-span-6 relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 font-bold text-base">
                          ₹
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="5"
                          value={todayPaid}
                          onChange={(e) => handlePaidChange(customer.id, e.target.value)}
                          placeholder="0"
                          className="w-full h-11 pl-9 pr-3.5 bg-white border border-slate-300 rounded-xl text-base font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-ocean-500/20 focus:border-ocean-500 num-tabular shadow-sm"
                        />
                      </div>

                      <div className="sm:col-span-6 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleQuickPayFull(customer.id)}
                          className="h-11 px-2 text-xs font-bold rounded-xl bg-emerald-100 text-emerald-800 hover:bg-emerald-200 active:scale-95 transition-all shadow-sm flex items-center justify-center text-center truncate"
                        >
                          Full Paid (₹{todayCost})
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
                        {/* Always visible banner: Click to toggle breakdown */}
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
                              <span>(number of cane * amount per cane - amount paied)</span>
                            </div>

                            {/* Step-by-Step Vertical Formula Display */}
                            <div className="space-y-1.5 text-xs text-slate-700 font-mono">
                              <div className="flex justify-between items-center py-1">
                                <span className="text-slate-600">Total Cane Cost ({todayCans} cans × ₹{rate}):</span>
                                <span className="font-bold text-slate-900">₹{todayCost}</span>
                              </div>
                              <div className="flex justify-between items-center py-1">
                                <span className="text-slate-600">Less Amount Paied:</span>
                                <span className="font-bold text-emerald-700">- ₹{todayPaid}</span>
                              </div>
                              <div className="flex justify-between items-center py-1 border-t border-amber-200/60">
                                <span className="font-semibold text-slate-800">Today's Bending Amount:</span>
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

                  {/* VERTICAL ITEM 5: Card Actions (Save & WhatsApp) */}
                  <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="text-xs text-slate-400 flex items-center gap-1.5">
                      {isSaved ? (
                        <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                          <Check weight="bold" className="w-4 h-4" />
                          <span>Entry Saved for Today</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">Unsaved changes</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {customer.phone && (
                        <a
                          href={`https://wa.me/91${customer.phone}?text=${generateWhatsAppMessage(customer)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tactile-btn flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100"
                          title="Share Bill via WhatsApp"
                        >
                          <WhatsappLogo weight="fill" className="w-4 h-4 text-emerald-600" />
                          <span>WhatsApp Bill</span>
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => handleSaveEntry(customer.id)}
                        className={`tactile-btn flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md ${
                          justSaved
                            ? 'bg-emerald-600 text-white'
                            : isSaved
                              ? 'bg-slate-900 text-white hover:bg-slate-800'
                              : 'bg-ocean-600 text-white hover:bg-ocean-700'
                        }`}
                      >
                        {justSaved ? (
                          <>
                            <Check weight="bold" className="w-4 h-4 animate-bounce" />
                            <span>Saved Successfully!</span>
                          </>
                        ) : (
                          <>
                            <CalendarCheck weight="bold" className="w-4 h-4" />
                            <span>{isSaved ? 'Update Today Entry' : 'Save Today Entry'}</span>
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
    </div>
  );
}
