import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { CaneEntries } from './components/CaneEntries';
import { AddCustomer } from './components/AddCustomer';
import { BendingCustomers } from './components/BendingCustomers';
import { TodaysUpdate } from './components/TodaysUpdate';
import { AllDatesHistory } from './components/AllDatesHistory';
import { DeliverySheetModal } from './components/DeliverySheetModal';
import { INITIAL_CUSTOMERS, DEFAULT_BUSINESS_INFO } from './data/initialData';
import { Drop, Heart } from '@phosphor-icons/react';

const STORAGE_KEY = 'tamilan_waters_customers_live';

export default function App() {
  const [customers, setCustomers] = useState(() => {
    // Purge old demo caches
    try {
      localStorage.removeItem('tamilan_waters_customers');
      localStorage.removeItem('tamilan_waters_customers_v1');
      localStorage.removeItem('tamilan_waters_customers_v2');
    } catch (e) {
      // ignore
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load from localStorage', e);
    }
    return INITIAL_CUSTOMERS; // []
  });

  const [activeTab, setActiveTab] = useState('entries'); // entries | todayUpdate | allDates | bending | addCustomer
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [businessInfo] = useState(DEFAULT_BUSINESS_INFO);

  // Sync with localStorage whenever customers changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }, [customers]);

  // Update a customer's entry
  const handleUpdateEntry = (customerId, updates) => {
    setCustomers(prev => prev.map(c => {
      if (c.id === customerId) {
        return {
          ...c,
          todayEntry: {
            ...c.todayEntry,
            ...updates
          }
        };
      }
      return c;
    }));
  };

  // Add new customer
  const handleAddCustomer = (newCustomer) => {
    setCustomers(prev => [newCustomer, ...prev]);
    setActiveTab('entries');
  };

  // Record payment in BendingCustomers tab
  const handleRecordPayment = (customerId, amount, method) => {
    setCustomers(prev => prev.map(c => {
      if (c.id === customerId) {
        let remainingPayment = amount;
        
        // 1. First pay off today's unpaid bill if any
        const todayCans = c.todayEntry?.cansBought || 0;
        const rate = c.amountPerCane || 35;
        const currentTodayPaid = c.todayEntry?.amountPaid || 0;
        const todayCost = todayCans * rate;
        const todayUnpaid = Math.max(0, todayCost - currentTodayPaid);

        let newTodayPaid = currentTodayPaid;
        let newPrevBending = c.previousBendingAmount || 0;

        if (todayUnpaid > 0) {
          const payToToday = Math.min(remainingPayment, todayUnpaid);
          newTodayPaid += payToToday;
          remainingPayment -= payToToday;
        }

        // 2. Any leftover goes to pay off previous dues
        if (remainingPayment > 0 && newPrevBending > 0) {
          const payToPrev = Math.min(remainingPayment, newPrevBending);
          newPrevBending -= payToPrev;
          remainingPayment -= payToPrev;
        }

        // If even more was paid, credit as negative previous balance
        if (remainingPayment > 0) {
          newPrevBending -= remainingPayment;
        }

        return {
          ...c,
          previousBendingAmount: newPrevBending,
          todayEntry: {
            ...c.todayEntry,
            amountPaid: newTodayPaid,
            saved: true,
            lastUpdated: new Date().toISOString()
          },
          history: [
            {
              date: new Date().toISOString().split('T')[0],
              amountPaid: amount,
              method,
              timestamp: new Date().toISOString()
            },
            ...(c.history || [])
          ]
        };
      }
      return c;
    }));
  };

  // Reset / Clear all data
  const handleResetData = () => {
    if (window.confirm("Clear all customer entries and reset to a completely fresh empty site?")) {
      setCustomers([]);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    }
  };

  // Metric counts for tab badges
  const bendingCount = customers.filter(c => {
    const todayCans = c.todayEntry?.cansBought || 0;
    const rate = c.amountPerCane || 0;
    const todayPaid = c.todayEntry?.amountPaid || 0;
    const todayBending = (todayCans * rate) - todayPaid;
    const total = (c.previousBendingAmount || 0) + todayBending;
    return total > 0;
  }).length;

  const todayDeliveredCount = customers.filter(c => (c.todayEntry?.cansBought || 0) > 0).length;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#f8fafc]">
      {/* Top Header with Embedded Navigation near Name */}
      <Header
        customers={customers}
        onPrintRoute={() => setIsPrintModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {activeTab === 'entries' && (
          <CaneEntries
            customers={customers}
            onUpdateEntry={handleUpdateEntry}
            onNavigateToAddCustomer={() => setActiveTab('addCustomer')}
            businessInfo={businessInfo}
          />
        )}

        {activeTab === 'todayUpdate' && (
          <TodaysUpdate
            customers={customers}
            onNavigateToEntries={() => setActiveTab('entries')}
            businessInfo={businessInfo}
          />
        )}

        {activeTab === 'allDates' && (
          <AllDatesHistory
            customers={customers}
            onNavigateToEntries={() => setActiveTab('entries')}
          />
        )}

        {activeTab === 'addCustomer' && (
          <AddCustomer
            onAddCustomer={handleAddCustomer}
            onCancel={() => setActiveTab('entries')}
          />
        )}

        {activeTab === 'bending' && (
          <BendingCustomers
            customers={customers}
            onRecordPayment={handleRecordPayment}
            businessInfo={businessInfo}
            onNavigateToEntries={() => setActiveTab('entries')}
          />
        )}
      </main>

      {/* Printable Delivery Manifest Modal */}
      <DeliverySheetModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        customers={customers}
        businessInfo={businessInfo}
      />

      {/* Discreet Footer */}
      <footer className="py-6 border-t border-slate-200/80 bg-white/50 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-medium">
            <Drop weight="fill" className="w-4 h-4 text-ocean-600" />
            <span className="font-bold text-slate-800">Tamilan Waters</span>
            <span>• 20L Water Can Supply Management</span>
          </div>
          <div className="text-slate-500 text-xs">
            Designed with Taste Skill standards • Anti-slop Double-Bezel Architecture
          </div>
        </div>
      </footer>
    </div>
  );
}
