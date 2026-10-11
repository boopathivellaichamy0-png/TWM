import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { CaneEntries } from './components/CaneEntries';
import { AddCustomer } from './components/AddCustomer';
import { BendingCustomers } from './components/BendingCustomers';
import { TodaysUpdate } from './components/TodaysUpdate';
import { AllDatesHistory } from './components/AllDatesHistory';
import { DeliverySheetModal } from './components/DeliverySheetModal';
import { DataSafetyModal } from './components/DataSafetyModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { INITIAL_CUSTOMERS, DEFAULT_BUSINESS_INFO } from './data/initialData';
import { 
  getStoredFirebaseConfig, 
  initializeFirebase, 
  subscribeToLiveCustomers, 
  pushCustomersToCloud,
  saveFirebaseConfig
} from './services/firebase';
import { Drop } from '@phosphor-icons/react';

const STORAGE_KEY = 'tamilan_waters_customers_live';
const SNAPSHOTS_KEY = 'tamilan_waters_auto_snapshots_v1';

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
  const [isDataSafetyModalOpen, setIsDataSafetyModalOpen] = useState(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(Boolean(getStoredFirebaseConfig()));
  const [cloudConfigVersion, setCloudConfigVersion] = useState(0);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [businessInfo] = useState(DEFAULT_BUSINESS_INFO);

  const isSyncingFromCloudRef = useRef(false);

  // 1. Process 1-click WhatsApp cloud invite links (#cloud=...) & Listen for real-time Firestore sync
  useEffect(() => {
    // Check if staff member opened a 1-click cloud invite link
    if (window.location.hash.startsWith('#cloud=')) {
      try {
        const raw = decodeURIComponent(window.location.hash.replace('#cloud=', ''));
        const parsed = JSON.parse(raw);
        if (parsed.apiKey && parsed.projectId) {
          saveFirebaseConfig(parsed);
          setIsCloudConnected(true);
          setCloudConfigVersion(v => v + 1);
          window.history.replaceState(null, '', window.location.pathname);
        }
      } catch (err) {
        console.error('Failed to parse cloud invite from URL hash', err);
      }
    }

    const config = getStoredFirebaseConfig();
    if (!config) {
      setIsCloudConnected(false);
      return;
    }

    setIsCloudConnected(true);
    initializeFirebase(config);

    // Live subscription across all connected phones
    const unsubscribe = subscribeToLiveCustomers((cloudCustomers) => {
      if (cloudCustomers && Array.isArray(cloudCustomers)) {
        isSyncingFromCloudRef.current = true;
        setCustomers(cloudCustomers);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudCustomers));
        } catch {
          // ignore
        }
        setTimeout(() => {
          isSyncingFromCloudRef.current = false;
        }, 500);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [cloudConfigVersion]);

  // 2. Capture PWA installation prompt event
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // 3. Sync local changes to localStorage and Cloud Firestore
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));

      // Push to cloud if connected and not originating from an incoming cloud sync
      if (isCloudConnected && !isSyncingFromCloudRef.current && customers.length >= 0) {
        pushCustomersToCloud(customers).catch(() => {
          // Will retry on next update or when online
        });
      }

      // Save rolling safety snapshot if customers exist
      if (customers && customers.length > 0) {
        const raw = localStorage.getItem(SNAPSHOTS_KEY);
        const snaps = raw ? JSON.parse(raw) : [];
        const lastTime = snaps[0]?.timestamp ? new Date(snaps[0].timestamp).getTime() : 0;
        
        // Save new snapshot if 1 minute passed or if first snapshot
        if (Date.now() - lastTime > 60000 || snaps.length === 0) {
          const newSnap = {
            timestamp: new Date().toISOString(),
            customers
          };
          const updatedSnaps = [newSnap, ...snaps.slice(0, 4)]; // Keep last 5 snapshots
          localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(updatedSnaps));
        }
      }
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }, [customers, isCloudConnected]);

  // Trigger app installation prompt
  const handleTriggerInstall = () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          setDeferredInstallPrompt(null);
        }
      });
    } else {
      setIsDataSafetyModalOpen(true);
    }
  };

  // Restore customer list from backup or snapshot
  const handleRestoreCustomers = (restoredCustomers) => {
    setCustomers(restoredCustomers);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(restoredCustomers));
      if (isCloudConnected) {
        pushCustomersToCloud(restoredCustomers);
      }
    } catch (e) {
      console.error('Failed to persist restored customers', e);
    }
  };

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

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#f8fafc]">
      {/* Top Header with Embedded Navigation, Cloud Sync, Data Safety and Install App triggers */}
      <Header
        customers={customers}
        onPrintRoute={() => setIsPrintModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenDataSafety={() => setIsDataSafetyModalOpen(true)}
        onTriggerInstall={handleTriggerInstall}
        isInstallable={Boolean(deferredInstallPrompt)}
        isCloudConnected={isCloudConnected}
        onOpenCloudSync={() => setIsCloudModalOpen(true)}
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

      {/* Data Safety, Backup & App Installation Modal */}
      <DataSafetyModal
        isOpen={isDataSafetyModalOpen}
        onClose={() => setIsDataSafetyModalOpen(false)}
        customers={customers}
        onRestoreCustomers={handleRestoreCustomers}
        businessInfo={businessInfo}
        deferredInstallPrompt={deferredInstallPrompt}
        onTriggerInstall={handleTriggerInstall}
      />

      {/* Multi-Mobile Cloud Sync Configuration Modal */}
      <CloudSyncModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
        cloudStatus={isCloudConnected}
        onConfigUpdated={(cfg) => {
          setIsCloudConnected(Boolean(cfg));
          setCloudConfigVersion(v => v + 1);
        }}
        customers={customers}
      />

      {/* Discreet Footer */}
      <footer className="py-6 border-t border-slate-200/80 bg-white/50 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-medium">
            <Drop weight="fill" className="w-4 h-4 text-ocean-600" />
            <span className="font-bold text-slate-800">Tamilan Waters</span>
            <span>• 20L Water Can Supply Management</span>
          </div>
          <div className="flex items-center gap-3 text-slate-500 text-xs">
            <button 
              onClick={() => setIsCloudModalOpen(true)}
              className="text-ocean-700 hover:underline font-semibold"
            >
              {isCloudConnected ? '🟢 Cloud Synced' : '☁️ Connect Cloud'}
            </button>
            <span>•</span>
            <button 
              onClick={() => setIsDataSafetyModalOpen(true)}
              className="text-ocean-700 hover:underline font-semibold"
            >
              Data Safety & Backup
            </button>
            <span>•</span>
            <button 
              onClick={handleTriggerInstall}
              className="text-ocean-700 hover:underline font-semibold"
            >
              Install Mobile App
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
