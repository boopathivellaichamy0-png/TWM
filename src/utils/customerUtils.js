/**
 * Utilities for Customer Entries, Normalization, and Multi-Delivery Aggregation
 */

export function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentTimeString() {
  return new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export function formatDisplayTime(timeStr, timestampStr) {
  if (timeStr) return timeStr;
  if (timestampStr) {
    const d = new Date(timestampStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
  }
  return '';
}

/**
 * Normalizes customer data so that all deliveries/payments across all dates
 * (including multiple deliveries in the same day) are preserved and aggregated properly.
 */
export function normalizeCustomer(customer) {
  const todayStr = getTodayDateString();
  const rate = Number(customer.amountPerCane) || 35;
  const rawEntries = Array.isArray(customer.entries) ? [...customer.entries] : [];

  // Migration: If entries array does NOT exist on customer, populate from history and todayEntry
  if (!Array.isArray(customer.entries)) {
    // 1. From history
    if (Array.isArray(customer.history)) {
      customer.history.forEach((h, idx) => {
        if (!h) return;
        const hCans = Number(h.cans ?? h.cansBought ?? 0);
        const hEmpty = Number(h.emptyCansReturned ?? h.emptyCans ?? h.empty ?? 0);
        const hRate = Number(h.rate) || rate;
        const hPaid = Number(h.paid ?? h.amountPaid ?? 0);
        const hTotal = Number(h.total ?? (hCans * hRate));
        const hBending = Number(h.bending ?? (hTotal - hPaid));
        const hDate = h.date || todayStr;
        const hTime = h.time || (h.timestamp ? formatDisplayTime(null, h.timestamp) : '10:00 AM');

        if (hCans > 0 || hEmpty > 0 || hPaid > 0) {
          rawEntries.push({
            id: h.id || `mig-hist-${customer.id}-${idx}`,
            date: hDate,
            time: hTime,
            timestamp: h.timestamp || new Date(`${hDate}T10:00:00`).toISOString(),
            cansDelivered: hCans,
            emptyCansReturned: hEmpty,
            rate: hRate,
            totalCost: hTotal,
            amountPaid: hPaid,
            bendingAmount: hBending,
            notes: h.notes || (h.method ? `Paid via ${h.method}` : ''),
            type: hCans > 0 ? 'delivery' : 'payment'
          });
        }
      });
    }

    // 2. From todayEntry if present and active
    if (customer.todayEntry && Boolean(customer.todayEntry.saved)) {
      const tCans = Number(customer.todayEntry.cansBought || 0);
      const tEmpty = Number(customer.todayEntry.emptyCansReturned || 0);
      const tPaid = Number(customer.todayEntry.amountPaid || 0);
      const tDate = customer.todayEntry.date || todayStr;

      if (tCans > 0 || tEmpty > 0 || tPaid > 0) {
        const exists = rawEntries.some(e => e.date === tDate && e.cansDelivered === tCans && e.amountPaid === tPaid);
        if (!exists) {
          const tTotal = tCans * rate;
          rawEntries.push({
            id: `mig-today-${customer.id}-${Date.now()}`,
            date: tDate,
            time: customer.todayEntry.lastUpdated ? formatDisplayTime(null, customer.todayEntry.lastUpdated) : getCurrentTimeString(),
            timestamp: customer.todayEntry.lastUpdated || new Date().toISOString(),
            cansDelivered: tCans,
            emptyCansReturned: tEmpty,
            rate: rate,
            totalCost: tTotal,
            amountPaid: tPaid,
            bendingAmount: tTotal - tPaid,
            notes: customer.todayEntry.notes || 'Today entry',
            type: tCans > 0 ? 'delivery' : 'payment'
          });
        }
      }
    }
  }

  // Sort entries descending: primarily by date, secondarily by timestamp/time
  rawEntries.sort((a, b) => {
    const dateComp = (b.date || '').localeCompare(a.date || '');
    if (dateComp !== 0) return dateComp;
    const timeA = new Date(a.timestamp || 0).getTime();
    const timeB = new Date(b.timestamp || 0).getTime();
    return timeB - timeA;
  });

  // Calculate today's aggregations
  const todayEntries = rawEntries.filter(e => e.date === todayStr);
  const todayCans = todayEntries.reduce((sum, e) => sum + (Number(e.cansDelivered) || 0), 0);
  const todayEmpty = todayEntries.reduce((sum, e) => sum + (Number(e.emptyCansReturned) || 0), 0);
  const todayPaid = todayEntries.reduce((sum, e) => sum + (Number(e.amountPaid) || 0), 0);
  const todayCost = todayEntries.reduce((sum, e) => sum + (Number(e.totalCost) || ((Number(e.cansDelivered) || 0) * rate)), 0);
  const todayBending = Math.max(0, todayCost - todayPaid);

  // Fallback to customer.todayEntry if rawEntries had nothing for today but legacy todayEntry had saved values
  const hasLegacyToday = todayEntries.length === 0 && customer.todayEntry?.date === todayStr && Boolean(customer.todayEntry?.saved);
  const effectiveTodayCans = todayEntries.length > 0 ? todayCans : (hasLegacyToday ? Number(customer.todayEntry?.cansBought || 0) : 0);
  const effectiveTodayEmpty = todayEntries.length > 0 ? todayEmpty : (hasLegacyToday ? Number(customer.todayEntry?.emptyCansReturned || 0) : 0);
  const effectiveTodayPaid = todayEntries.length > 0 ? todayPaid : (hasLegacyToday ? Number(customer.todayEntry?.amountPaid || 0) : 0);
  const effectiveTodayCost = effectiveTodayCans * rate;
  const effectiveTodayBending = Math.max(0, effectiveTodayCost - effectiveTodayPaid);

  // Opening initial dues when customer registered
  const openingBendingAmount = Number(customer.openingBendingAmount ?? customer.previousBendingAmount ?? 0);

  // Overall totals across all time
  const totalCansAllTime = rawEntries.reduce((s, e) => s + (Number(e.cansDelivered) || 0), 0);
  const totalEmptyAllTime = rawEntries.reduce((s, e) => s + (Number(e.emptyCansReturned) || 0), 0);
  const totalPaidAllTime = rawEntries.reduce((s, e) => s + (Number(e.amountPaid) || 0), 0);
  const totalCostAllTime = rawEntries.reduce((s, e) => s + (Number(e.totalCost) || ((Number(e.cansDelivered) || 0) * (Number(e.rate) || rate))), 0);

  // Past dues before today
  const pastEntries = rawEntries.filter(e => e.date !== todayStr);
  const pastCost = pastEntries.reduce((s, e) => s + (Number(e.totalCost) || ((Number(e.cansDelivered) || 0) * (Number(e.rate) || rate))), 0);
  const pastPaid = pastEntries.reduce((s, e) => s + (Number(e.amountPaid) || 0), 0);
  const pastBending = openingBendingAmount + (pastCost - pastPaid);

  // Total balance: opening balance + (all deliveries cost - all payments)
  const totalOutstandingBending = openingBendingAmount + (totalCostAllTime - totalPaidAllTime);

  return {
    ...customer,
    amountPerCane: rate,
    openingBendingAmount,
    previousBendingAmount: pastBending,
    entries: rawEntries,
    todayEntries,
    todayCans: effectiveTodayCans,
    todayEmpty: effectiveTodayEmpty,
    todayPaid: effectiveTodayPaid,
    todayCost: effectiveTodayCost,
    todayBending: effectiveTodayBending,
    totalCansAllTime,
    totalEmptyAllTime,
    totalPaidAllTime,
    totalCostAllTime,
    totalOutstandingBending,
    todayEntry: {
      date: todayStr,
      cansBought: effectiveTodayCans,
      emptyCansReturned: effectiveTodayEmpty,
      amountPaid: effectiveTodayPaid,
      saved: todayEntries.length > 0 || Boolean(customer.todayEntry?.saved),
      lastUpdated: customer.todayEntry?.lastUpdated || new Date().toISOString()
    }
  };
}
