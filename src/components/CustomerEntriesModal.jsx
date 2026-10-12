import React, { useState, useMemo } from 'react';
import { 
  X, 
  Drop, 
  Calendar, 
  Clock, 
  CurrencyInr, 
  CheckCircle, 
  WarningCircle, 
  Trash, 
  Plus, 
  WhatsappLogo, 
  Printer, 
  Phone, 
  MapPin, 
  ArrowClockwise,
  MagnifyingGlass
} from '@phosphor-icons/react';
import { 
  formatDisplayDate, 
  formatDisplayTime, 
  getTodayDateString, 
  getCurrentTimeString 
} from '../utils/customerUtils';

export function CustomerEntriesModal({ 
  isOpen, 
  onClose, 
  customer, 
  onAddEntry, 
  onDeleteEntry,
  businessInfo 
}) {
  if (!isOpen || !customer) return null;

  const [activeFilter, setActiveFilter] = useState('all'); // all | today | thisMonth | dues
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);

  // New entry form state
  const [newCans, setNewCans] = useState('1');
  const [newEmpty, setNewEmpty] = useState('1');
  const [newPaid, setNewPaid] = useState('');
  const [newDate, setNewDate] = useState(getTodayDateString());
  const [newTime, setNewTime] = useState(getCurrentTimeString());
  const [newNotes, setNewNotes] = useState('');

  const rate = Number(customer.amountPerCane) || 35;
  const entries = customer.entries || [];
  const todayStr = getTodayDateString();

  // Filtered entries
  const filteredEntries = useMemo(() => {
    let list = [...entries];

    if (activeFilter === 'today') {
      list = list.filter(e => e.date === todayStr);
    } else if (activeFilter === 'thisMonth') {
      const currentMonthPrefix = todayStr.slice(0, 7); // YYYY-MM
      list = list.filter(e => e.date && e.date.startsWith(currentMonthPrefix));
    } else if (activeFilter === 'dues') {
      list = list.filter(e => (Number(e.bendingAmount) || 0) > 0);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(e => 
        (e.date && e.date.includes(q)) ||
        (e.time && e.time.toLowerCase().includes(q)) ||
        (e.notes && e.notes.toLowerCase().includes(q))
      );
    }

    return list;
  }, [entries, activeFilter, searchQuery, todayStr]);

  // Overall metrics for this customer
  const totalCans = entries.reduce((s, e) => s + (Number(e.cansDelivered) || 0), 0);
  const totalEmpty = entries.reduce((s, e) => s + (Number(e.emptyCansReturned) || 0), 0);
  const totalPaid = entries.reduce((s, e) => s + (Number(e.amountPaid) || 0), 0);
  const totalCost = entries.reduce((s, e) => s + (Number(e.totalCost) || (Number(e.cansDelivered || 0) * rate)), 0);
  const prevOpeningDue = Number(customer.previousBendingAmount || 0);
  const overallBalance = prevOpeningDue + Math.max(0, totalCost - totalPaid);

  const handleCreateEntry = (e) => {
    e.preventDefault();
    const cansVal = Math.max(0, parseInt(newCans, 10) || 0);
    const emptyVal = Math.max(0, parseInt(newEmpty, 10) || 0);
    const paidVal = Math.max(0, parseFloat(newPaid) || 0);

    if (cansVal === 0 && emptyVal === 0 && paidVal === 0) {
      alert('Please enter at least cans delivered, empty cans returned, or amount paid.');
      return;
    }

    const entryData = {
      cansDelivered: cansVal,
      emptyCansReturned: emptyVal,
      amountPaid: paidVal,
      rate: rate,
      date: newDate || todayStr,
      time: newTime || getCurrentTimeString(),
      notes: newNotes.trim()
    };

    onAddEntry(customer.id, entryData);

    // Reset form
    setNewCans('1');
    setNewEmpty('1');
    setNewPaid('');
    setNewNotes('');
    setIsAddFormOpen(false);
  };

  const handlePrintLedger = () => {
    window.print();
  };

  const generateWhatsAppLedger = () => {
    let msg = `*${businessInfo?.name || 'Tamilan Waters'}* 💧\n`;
    msg += `Customer Statement: *${customer.name}*\n`;
    msg += `Mobile: ${customer.phone || 'N/A'}\n`;
    msg += `Rate per Can: ₹${rate}\n`;
    msg += `--------------------------------\n`;
    msg += `*ALL ENTRIES HISTORY (Date & Time)*:\n`;

    if (entries.length === 0) {
      msg += `No delivery entries recorded yet.\n`;
    } else {
      entries.slice(0, 20).forEach((entry, idx) => {
        const dStr = formatDisplayDate(entry.date);
        const tStr = formatDisplayTime(entry.time, entry.timestamp);
        msg += `${idx + 1}. ${dStr} at ${tStr || 'N/A'}\n`;
        msg += `   • Delivered: ${entry.cansDelivered || 0} Cans\n`;
        msg += `   • Empty Received: ${entry.emptyCansReturned || 0} Empty\n`;
        msg += `   • Paid: ₹${entry.amountPaid || 0}\n`;
        if (entry.bendingAmount > 0) {
          msg += `   • Due: ₹${entry.bendingAmount}\n`;
        }
      });
    }

    msg += `--------------------------------\n`;
    msg += `*Total Cans Delivered: ${totalCans} Cans*\n`;
    msg += `*Total Empty Received: ${totalEmpty} Empty*\n`;
    msg += `*Total Amount Paid: ₹${totalPaid}*\n`;
    msg += `*Current Total Balance Due: ₹${overallBalance}*\n`;
    if (businessInfo?.upiId) {
      msg += `UPI ID for Payment: ${businessInfo.upiId}\n`;
    }
    msg += `Thank you for choosing Tamilan Waters!`;

    return encodeURIComponent(msg);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fade-in">
      <div 
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-4 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Modal Top Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-start justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-8 h-8 rounded-xl bg-ocean-500/20 text-ocean-400 border border-ocean-500/30 flex items-center justify-center font-bold text-sm">
                {customer.name.charAt(0)}
              </span>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                {customer.name}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-ocean-600 text-white shadow-xs">
                ₹{rate}/can
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-2">
              {customer.phone && (
                <a 
                  href={`tel:${customer.phone}`} 
                  className="flex items-center gap-1 hover:text-white transition-colors font-mono"
                >
                  <Phone weight="bold" className="w-3.5 h-3.5 text-ocean-400" />
                  <span>{customer.phone}</span>
                </a>
              )}
              {customer.address && (
                <span className="flex items-center gap-1 text-slate-300">
                  <MapPin weight="bold" className="w-3.5 h-3.5 text-ocean-400" />
                  <span>{customer.address}</span>
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors shrink-0"
            aria-label="Close dialog"
          >
            <X weight="bold" className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Customer Summary Statistics Banner */}
        <div className="bg-slate-50 border-b border-slate-200/90 px-4 sm:px-6 py-3.5 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Total Cans Delivered */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Cans Delivered
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg sm:text-xl font-black text-ocean-700 num-tabular">
                  {totalCans}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">Cans</span>
              </div>
            </div>

            {/* Total Empty Received */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Empty Cans Received
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg sm:text-xl font-black text-amber-700 num-tabular">
                  {totalEmpty}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">Empty</span>
              </div>
            </div>

            {/* Total Paid */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Amount Paid
              </span>
              <div className="flex items-baseline gap-0.5 mt-0.5">
                <span className="text-xs font-bold text-slate-500">₹</span>
                <span className="text-lg sm:text-xl font-black text-emerald-700 num-tabular">
                  {totalPaid.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Current Outstanding Balance */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Current Bending Balance
              </span>
              <div className="flex items-baseline gap-0.5 mt-0.5">
                <span className="text-xs font-bold text-amber-600">₹</span>
                <span className={`text-lg sm:text-xl font-black num-tabular ${
                  overallBalance > 0 ? 'text-amber-600' : 'text-emerald-700'
                }`}>
                  {overallBalance.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Toolbar: Search, Filters, and Add Entry Toggle */}
        <div className="p-3 sm:px-6 sm:py-3.5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0 bg-white">
          {/* Quick Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Entries ({entries.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeFilter === 'today'
                  ? 'bg-ocean-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Today's Entries
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('thisMonth')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeFilter === 'thisMonth'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('dues')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeFilter === 'dues'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Pending Dues
            </button>
          </div>

          {/* Search bar & + Add Entry Button */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-48">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search date or time..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-ocean-500"
              />
              <MagnifyingGlass weight="bold" className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            </div>

            <button
              type="button"
              onClick={() => setIsAddFormOpen(p => !p)}
              className={`tactile-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                isAddFormOpen 
                  ? 'bg-slate-200 text-slate-800' 
                  : 'bg-ocean-600 text-white hover:bg-ocean-700 shadow-sm'
              }`}
            >
              <Plus weight="bold" className="w-3.5 h-3.5" />
              <span>{isAddFormOpen ? 'Close Form' : 'Add Delivery Entry'}</span>
            </button>
          </div>
        </div>

        {/* 4. Expandable Drawer: Add New Delivery / Payment Entry */}
        {isAddFormOpen && (
          <div className="p-4 sm:p-5 bg-ocean-50/50 border-b border-ocean-200/80 shrink-0 animate-slide-down">
            <form onSubmit={handleCreateEntry} className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-extrabold uppercase tracking-wider text-ocean-900 flex items-center gap-1.5">
                  <Drop weight="fill" className="w-4 h-4 text-ocean-600" />
                  <span>Log New Delivery / Payment for {customer.name}</span>
                </span>
                <span className="text-[11px] font-bold text-ocean-700 font-mono">
                  Rate: ₹{rate}/can
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {/* Date */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Delivery Date
                  </label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-ocean-500"
                  />
                </div>

                {/* Time */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Delivery Time
                  </label>
                  <input
                    type="text"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    placeholder="e.g. 10:30 AM"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-ocean-500 font-mono"
                  />
                </div>

                {/* Cans Delivered */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Cans Delivered
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newCans}
                    onChange={(e) => setNewCans(e.target.value)}
                    placeholder="1"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-ocean-700 focus:outline-none focus:border-ocean-500 num-tabular"
                  />
                </div>

                {/* Empty Cans Returned */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Empty Returned
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newEmpty}
                    onChange={(e) => setNewEmpty(e.target.value)}
                    placeholder="1"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-ocean-500 num-tabular"
                  />
                </div>

                {/* Amount Paid */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Amount Paid (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={newPaid}
                    onChange={(e) => setNewPaid(e.target.value)}
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-emerald-700 focus:outline-none focus:border-ocean-500 num-tabular"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 gap-2">
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Optional notes / delivery remarks..."
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-ocean-500"
                />

                <button
                  type="submit"
                  className="tactile-btn px-4 py-1.5 rounded-lg bg-ocean-600 text-white text-xs font-bold hover:bg-ocean-700 shadow-sm transition-colors whitespace-nowrap"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 5. Main Content: ALL ENTRIES TABLE (Date, Time, Delivered, Received, Paid, Dues) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl bg-slate-50 border border-slate-200/70">
              <div className="w-12 h-12 rounded-2xl bg-ocean-50 text-ocean-600 mx-auto flex items-center justify-center mb-3">
                <Drop weight="bold" className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                {searchQuery || activeFilter !== 'all' 
                  ? 'No entries match this filter' 
                  : 'No delivery entries recorded yet'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Deliveries added from the Cane Entries screen or via the button above will show here with exact date and time.
              </p>
              <button
                type="button"
                onClick={() => setIsAddFormOpen(true)}
                className="mt-4 tactile-btn inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-ocean-600 text-white text-xs font-bold hover:bg-ocean-700 shadow-sm"
              >
                <Plus weight="bold" className="w-4 h-4" />
                <span>Add First Entry</span>
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/90 border-b border-slate-200 font-bold uppercase text-slate-600 text-[10px] tracking-wider">
                      <th className="py-3 px-3.5">#</th>
                      <th className="py-3 px-3.5">Date & Time</th>
                      <th className="py-3 px-3 text-center">Cans Delivered</th>
                      <th className="py-3 px-3 text-center">Empty Received</th>
                      <th className="py-3 px-3 text-center">Rate</th>
                      <th className="py-3 px-3 text-right">Total Bill</th>
                      <th className="py-3 px-3 text-right">Amount Paid</th>
                      <th className="py-3 px-3.5 text-right">Bending / Due</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEntries.map((entry, idx) => {
                      const entryCans = Number(entry.cansDelivered) || 0;
                      const entryEmpty = Number(entry.emptyCansReturned) || 0;
                      const entryRate = Number(entry.rate) || rate;
                      const entryTotal = Number(entry.totalCost) || (entryCans * entryRate);
                      const entryPaid = Number(entry.amountPaid) || 0;
                      const entryDue = Number(entry.bendingAmount) || Math.max(0, entryTotal - entryPaid);
                      const isToday = entry.date === todayStr;

                      const displayDate = formatDisplayDate(entry.date);
                      const displayTime = formatDisplayTime(entry.time, entry.timestamp);

                      return (
                        <tr key={entry.id || idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3.5 text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>

                          {/* Date & Time */}
                          <td className="py-3 px-3.5 font-sans">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 text-xs">
                                {displayDate}
                              </span>
                              {isToday && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-ocean-100 text-ocean-800 border border-ocean-200">
                                  Today
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono mt-0.5">
                              <Clock weight="bold" className="w-3 h-3 text-slate-400" />
                              <span>{displayTime || 'Time recorded'}</span>
                              {entry.notes && (
                                <span className="text-slate-400 italic ml-1">({entry.notes})</span>
                              )}
                            </div>
                          </td>

                          {/* Cans Delivered */}
                          <td className="py-3 px-3 text-center font-mono">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-extrabold bg-ocean-50 text-ocean-800 border border-ocean-200">
                              {entryCans} Cans
                            </span>
                          </td>

                          {/* Empty Cans Received */}
                          <td className="py-3 px-3 text-center font-mono">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                              entryEmpty > 0 
                                ? 'bg-amber-50 text-amber-800 border border-amber-200' 
                                : 'bg-slate-50 text-slate-500'
                            }`}>
                              {entryEmpty} Empty
                            </span>
                          </td>

                          {/* Rate */}
                          <td className="py-3 px-3 text-center font-mono text-slate-600">
                            ₹{entryRate}
                          </td>

                          {/* Total Bill */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                            ₹{entryTotal}
                          </td>

                          {/* Amount Paid */}
                          <td className="py-3 px-3 text-right font-mono font-extrabold text-emerald-700">
                            ₹{entryPaid}
                          </td>

                          {/* Bending Due */}
                          <td className="py-3 px-3.5 text-right font-mono font-bold">
                            {entryDue > 0 ? (
                              <span className="text-amber-700">₹{entryDue}</span>
                            ) : (
                              <span className="text-emerald-700">₹0</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3 text-center">
                            {entryDue <= 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle weight="fill" className="w-3 h-3 text-emerald-600" />
                                <span>Paid</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                <WarningCircle weight="fill" className="w-3 h-3 text-amber-600" />
                                <span>Due</span>
                              </span>
                            )}
                          </td>

                          {/* Action (Delete Entry) */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => setEntryToDelete(entry)}
                              className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center mx-auto transition-colors"
                              title="Delete this entry"
                            >
                              <Trash weight="bold" className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Summary Totals Footer */}
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold text-xs text-slate-900">
                      <td colSpan="2" className="py-3 px-3.5 uppercase text-slate-700 font-extrabold text-[11px] tracking-wider">
                        Filtered Entries Total:
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-black text-ocean-800">
                        {filteredEntries.reduce((s, e) => s + (Number(e.cansDelivered) || 0), 0)} Cans
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-black text-amber-800">
                        {filteredEntries.reduce((s, e) => s + (Number(e.emptyCansReturned) || 0), 0)} Empty
                      </td>
                      <td className="py-3 px-3 text-center text-slate-400">-</td>
                      <td className="py-3 px-3 text-right font-mono font-black text-slate-900">
                        ₹{filteredEntries.reduce((s, e) => s + (Number(e.totalCost) || ((Number(e.cansDelivered) || 0) * rate)), 0)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-emerald-800">
                        ₹{filteredEntries.reduce((s, e) => s + (Number(e.amountPaid) || 0), 0)}
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono font-black text-amber-700">
                        ₹{filteredEntries.reduce((s, e) => s + (Number(e.bendingAmount) || 0), 0)}
                      </td>
                      <td colSpan="2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* 6. Footer Actions: WhatsApp Ledger Share, Print, Close */}
        <div className="p-4 sm:px-6 bg-slate-50 border-t border-slate-200/90 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            <span>Showing {filteredEntries.length} of {entries.length} entries recorded for {customer.name}</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {customer.phone && (
              <a
                href={`https://wa.me/91${customer.phone}?text=${generateWhatsAppLedger()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tactile-btn flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors"
              >
                <WhatsappLogo weight="fill" className="w-4 h-4 text-emerald-600" />
                <span>Share Ledger via WhatsApp</span>
              </a>
            )}

            <button
              type="button"
              onClick={handlePrintLedger}
              className="tactile-btn flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors"
            >
              <Printer weight="bold" className="w-4 h-4 text-ocean-600" />
              <span>Print Ledger</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="tactile-btn flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {/* Confirm Entry Deletion Modal */}
        {entryToDelete && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-center gap-2.5 text-rose-600">
                <Trash weight="bold" className="w-5 h-5" />
                <h4 className="font-bold text-sm text-slate-900">Delete Delivery Entry?</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to delete this delivery entry on <strong>{formatDisplayDate(entryToDelete.date)} at {formatDisplayTime(entryToDelete.time, entryToDelete.timestamp)}</strong> ({entryToDelete.cansDelivered} cans, ₹{entryToDelete.amountPaid} paid)?
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEntryToDelete(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteEntry(customer.id, entryToDelete.id);
                    setEntryToDelete(null);
                  }}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm"
                >
                  Yes, Delete Entry
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
