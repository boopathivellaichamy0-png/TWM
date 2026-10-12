import React, { useState } from 'react';
import { 
  UserPlus, 
  CurrencyInr, 
  Phone, 
  MapPin, 
  ArrowLeft,
  WarningCircle
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';

export function AddCustomer({ onAddCustomer, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    amountPerCane: 35,
    phone: '',
    address: '',
    emptyCansHeld: 2,
    previousBendingAmount: 0,
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'amountPerCane' || name === 'emptyCansHeld' || name === 'previousBendingAmount'
        ? Number(value)
        : value
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Customer name is required';
    }

    if (!formData.amountPerCane || formData.amountPerCane <= 0) {
      newErrors.amountPerCane = 'Enter a valid amount per cane (minimum ₹1)';
    }

    if (formData.phone && !/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Please enter a valid 10-digit mobile number';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const openingDue = Number(formData.previousBendingAmount) || 0;
    const newCustomer = {
      id: `cust-${Date.now()}`,
      name: formData.name.trim(),
      amountPerCane: Number(formData.amountPerCane) || 35,
      phone: formData.phone.trim(),
      address: formData.address.trim(),
      emptyCansHeld: Number(formData.emptyCansHeld) || 0,
      openingBendingAmount: openingDue,
      previousBendingAmount: openingDue,
      entries: [],
      todayEntry: {
        date: todayStr,
        cansBought: 0,
        emptyCansReturned: 0,
        amountPaid: 0,
        saved: false,
        lastUpdated: now.toISOString(),
      },
      history: []
    };

    // Confetti celebration
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 }
    });

    onAddCustomer(newCustomer);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      {/* Top breadcrumb */}
      <div className="mb-6">
        <button
          onClick={onCancel}
          className="tactile-btn inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-2"
        >
          <ArrowLeft weight="bold" className="w-3.5 h-3.5" />
          <span>Back to Cane Entries</span>
        </button>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Add New Customer
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Enter customer details, rate per cane, and contact information.
        </p>
      </div>

      {/* Form Container (Clean Double-Bezel Card) */}
      <div className="p-1 rounded-2xl bg-white border border-slate-200/90 shadow-bezel-outer">
        <form onSubmit={handleSubmit} className="rounded-xl bg-white p-6 sm:p-7 bezel-core">
          <div className="space-y-5">
            {/* 1. Customer Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Customer / Business Name <span className="text-ocean-600">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Murugan Tea Stall, Karthik Illam, Sri Balaji Traders"
                className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-ocean-500/20 transition-all ${
                  errors.name ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-ocean-500'
                }`}
              />
              {errors.name && (
                <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                  <WarningCircle weight="bold" className="w-3.5 h-3.5" />
                  <span>{errors.name}</span>
                </p>
              )}
            </div>

            {/* 2. Amount per cane & Phone number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Amount per cane */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Amount Per Cane (₹) <span className="text-ocean-600">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">Standard: ₹35</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 font-bold">
                    ₹
                  </div>
                  <input
                    type="number"
                    name="amountPerCane"
                    min="1"
                    step="1"
                    value={formData.amountPerCane}
                    onChange={handleChange}
                    placeholder="35"
                    className={`w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm font-extrabold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-ocean-500/20 num-tabular transition-all ${
                      errors.amountPerCane ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-ocean-500'
                    }`}
                  />
                </div>
                {/* Preset quick buttons */}
                <div className="flex items-center gap-1.5 mt-2">
                  {[30, 35, 40, 50].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, amountPerCane: rate }))}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                        formData.amountPerCane === rate
                          ? 'bg-ocean-600 text-white border-ocean-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      ₹{rate}
                    </button>
                  ))}
                </div>
                {errors.amountPerCane && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1">
                    {errors.amountPerCane}
                  </p>
                )}
              </div>

              {/* Mobile / WhatsApp Number */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Mobile / WhatsApp No.
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone weight="bold" className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="9876543210"
                    maxLength={10}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-ocean-500/20 focus:border-ocean-500 font-mono transition-all"
                  />
                </div>
                {errors.phone && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1">
                    {errors.phone}
                  </p>
                )}
              </div>
            </div>

            {/* 3. Delivery Address / Street */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Delivery Address / Landmark
              </label>
              <div className="relative">
                <div className="absolute top-3 left-3 pointer-events-none text-slate-400">
                  <MapPin weight="bold" className="w-4 h-4" />
                </div>
                <textarea
                  name="address"
                  rows="2"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="e.g. Door No. 45, 2nd Cross Street, Near Bus Stand, Madurai"
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-ocean-500/20 focus:border-ocean-500 transition-all resize-none"
                ></textarea>
              </div>
            </div>

            {/* 4. Opening Account Details (Empty Cans & Opening Bending Balance) */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-2.5">
                Account Initialization (Optional)
              </span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    Empty Cans Provided
                  </label>
                  <input
                    type="number"
                    name="emptyCansHeld"
                    min="0"
                    value={formData.emptyCansHeld}
                    onChange={handleChange}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 num-tabular focus:outline-none focus:border-ocean-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    Initial Bending / Old Due (₹)
                  </label>
                  <input
                    type="number"
                    name="previousBendingAmount"
                    min="0"
                    step="5"
                    value={formData.previousBendingAmount}
                    onChange={handleChange}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-amber-600 num-tabular focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onCancel}
                className="tactile-btn px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="tactile-btn inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-ocean-600 text-white text-xs sm:text-sm font-bold shadow-md hover:bg-ocean-700 active:scale-[0.98]"
              >
                <UserPlus weight="bold" className="w-4 h-4" />
                <span>Save & Register Customer</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
