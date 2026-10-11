import React from 'react';
import { X, Printer, Drop } from '@phosphor-icons/react';

export function DeliverySheetModal({ isOpen, onClose, customers, businessInfo }) {
  if (!isOpen) return null;

  const todayStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const totalCansDelivered = customers.reduce((s, c) => s + (c.todayEntry?.cansBought || 0), 0);
  const totalEmptyCollected = customers.reduce((s, c) => s + (c.todayEntry?.emptyCansReturned || 0), 0);
  const totalAmountCollected = customers.reduce((s, c) => s + (c.todayEntry?.amountPaid || 0), 0);
  const totalBendingDues = customers.reduce((s, c) => {
    const todayCost = (c.todayEntry?.cansBought || 0) * (c.amountPerCane || 0);
    const todayPaid = c.todayEntry?.amountPaid || 0;
    const todayBending = Math.max(0, todayCost - todayPaid);
    return s + todayBending + (c.previousBendingAmount || 0);
  }, 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header - Not printed */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Drop weight="fill" className="w-5 h-5 text-ocean-400" />
            <span className="font-bold text-sm">Tamilan Waters • Daily Delivery & Route Sheet</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-ocean-600 text-white text-xs font-bold hover:bg-ocean-700 flex items-center gap-1.5"
            >
              <Printer weight="bold" className="w-4 h-4" />
              <span>Print Sheet</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X weight="bold" className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-8 print:p-0">
          <div className="border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                  {businessInfo.name} (தமிழன் வாட்டர்ஸ்)
                </h1>
                <p className="text-xs text-slate-600 mt-0.5">
                  {businessInfo.address} • Ph: {businessInfo.phone}
                </p>
                <p className="text-xs font-semibold text-ocean-700 mt-1">
                  UPI ID for Payments: {businessInfo.upiId}
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 rounded bg-slate-100 font-mono text-xs font-bold text-slate-800 uppercase">
                  DAILY ROUTE MANIFEST
                </span>
                <p className="text-xs font-medium text-slate-600 mt-1">{todayStr}</p>
              </div>
            </div>
          </div>

          {/* Delivery Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-300 bg-slate-50 font-bold uppercase text-slate-700">
                  <th className="py-2.5 px-2">#</th>
                  <th className="py-2.5 px-2">Customer Name & Phone</th>
                  <th className="py-2.5 px-2">Address</th>
                  <th className="py-2.5 px-2 text-center">Rate</th>
                  <th className="py-2.5 px-2 text-center">Cans Given</th>
                  <th className="py-2.5 px-2 text-center">Empty Ret.</th>
                  <th className="py-2.5 px-2 text-right">Amt Paid</th>
                  <th className="py-2.5 px-2 text-right">Bending Amt</th>
                  <th className="py-2.5 px-2 text-center print:table-cell">Sign</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {customers.map((c, idx) => {
                  const todayCans = c.todayEntry?.cansBought || 0;
                  const rate = c.amountPerCane || 35;
                  const todayPaid = c.todayEntry?.amountPaid || 0;
                  const todayBending = Math.max(0, (todayCans * rate) - todayPaid);
                  const totalBending = (c.previousBendingAmount || 0) + todayBending;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="py-2 px-2 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2 px-2 font-bold text-slate-900">
                        {c.name}
                        {c.phone && <span className="block text-[10px] text-slate-500 font-mono">{c.phone}</span>}
                      </td>
                      <td className="py-2 px-2 text-slate-600 max-w-[150px] truncate">{c.address || '-'}</td>
                      <td className="py-2 px-2 text-center font-mono">₹{rate}</td>
                      <td className="py-2 px-2 text-center font-extrabold text-ocean-700 font-mono text-sm">
                        {todayCans}
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-slate-600">
                        {c.todayEntry?.emptyCansReturned || 0}
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-emerald-700 font-mono">
                        ₹{todayPaid}
                      </td>
                      <td className="py-2 px-2 text-right font-extrabold font-mono text-amber-600">
                        ₹{totalBending}
                      </td>
                      <td className="py-2 px-2 text-center border-l border-slate-100">
                        <div className="w-12 h-4 border-b border-dashed border-slate-300 mx-auto"></div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-900 font-bold bg-slate-50 text-slate-900">
                  <td colSpan="4" className="py-3 px-2 uppercase text-right">
                    Daily Manifest Totals:
                  </td>
                  <td className="py-3 px-2 text-center text-sm font-extrabold text-ocean-700 font-mono">
                    {totalCansDelivered} Cans
                  </td>
                  <td className="py-3 px-2 text-center text-sm font-mono">
                    {totalEmptyCollected}
                  </td>
                  <td className="py-3 px-2 text-right text-sm font-extrabold text-emerald-700 font-mono">
                    ₹{totalAmountCollected}
                  </td>
                  <td className="py-3 px-2 text-right text-sm font-extrabold text-amber-600 font-mono">
                    ₹{totalBendingDues}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Footer note */}
          <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between text-[11px] text-slate-500">
            <div>
              <span>Driver / Delivery Staff Signature: _______________________</span>
            </div>
            <div>
              <span>Verified by Tamilan Waters Admin</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
