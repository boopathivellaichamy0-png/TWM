import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { CaneEntries } from './components/CaneEntries';
import { AddCustomer } from './components/AddCustomer';
import { BendingCustomers } from './components/BendingCustomers';
import { TodaysUpdate } from './components/TodaysUpdate';
import { AllDatesHistory } from './components/AllDatesHistory';
import { DeliverySheetModal } from './components/DeliverySheetModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { INITIAL_CUSTOMERS, DEFAULT_BUSINESS_INFO } from './data/initialData';
import { 
  getStoredFirebaseConfig, 
  initializeFirebase, 
  subscribeToLiveCustomers, 
  pushCustomersToCloud,
  saveFirebaseConfig
} from './services/firebase';
import { 
  normalizeCustomer, 
  getTodayDateString, 
  getCurrentTimeString 
} from './utils/customerUtils';
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
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map(c => normalizeCustomer(c));
        }
      }
    } catch (e) {
      console.error('Failed to load from localStorage', e);
    }
    return INITIAL_CUSTOMERS;
  });

  const [activeTab, setActiveTab] = useState('entries'); // entries | todayUpdate | allDates | bending | addCustomer
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(Boolean(getStoredFirebaseConfig()));
  const [cloudConfigVersion, setCloudConfigVersion] = useState(0);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [businessInfo] = useState(DEFAULT_BUSINESS_INFO);

  const isSyncingFromCloudRef = useRef(false);

  // 1. Process 1-click WhatsApp cloud invite links (#cloud=...) & Listen for real-time Firestore sync
  useEffect(() => {
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
        const normalized = cloudCustomers.map(c => normalizeCustomer(c));
        setCustomers(normalized);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
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
        
        if (Date.now() - lastTime > 60000 || snaps.length === 0) {
          const newSnap = {
            timestamp: new Date().toISOString(),
            customers
          };
          const updatedSnaps = [newSnap, ...snaps.slice(0, 4)];
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
      alert("To install Tamilan Waters App on your mobile phone:\n\n• On Android (Chrome): Tap the three dots (⋮) at top-right and tap 'Install app' or 'Add to Home screen'.\n• On iPhone (Safari): Tap the Share button (⎙) at bottom and tap 'Add to Home Screen (+)'.\n\nThe app will install directly on your home screen!");
    }
  };

  // Delete a customer permanently
  const handleDeleteCustomer = (customerId) => {
    setCustomers(prev => {
      const updated = prev.filter(c => c.id !== customerId);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        if (isCloudConnected) {
          pushCustomersToCloud(updated);
        }
      } catch (e) {
        console.error('Failed to update after deletion', e);
      }
      return updated;
    });
  };

  // Add a new delivery entry to a customer (supports multiple deliveries per day with exact date & time)
  const handleAddDeliveryEntry = (customerId, entryData) => {
    setCustomers(prev => prev.map(c => {
      if (c.id === customerId) {
        const norm = normalizeCustomer(c);
        const now = new Date();
        const todayStr = getTodayDateString();
        const entryDate = entryData.date || todayStr;
        const timeStr = entryData.time || getCurrentTimeString();
        const rate = Number(entryData.rate) || norm.amountPerCane || 35;
        const cans = Number(entryData.cansDelivered) || 0;
        const empty = Number(entryData.emptyCansReturned) || 0;
        const paid = Number(entryData.amountPaid) || 0;
        const totalCost = cans * rate;
        const bendingAmount = cans > 0 ? (totalCost - paid) : -paid;

        const newEntry = {
          id: `ent-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          date: entryDate,
          time: timeStr,
          timestamp: entryDate === todayStr ? now.toISOString() : new Date(`${entryDate}T12:00:00`).toISOString(),
          cansDelivered: cans,
          emptyCansReturned: empty,
          rate: rate,
          totalCost: totalCost,
          amountPaid: paid,
          bendingAmount: bendingAmount,
          notes: entryData.notes || '',
          type: cans > 0 ? 'delivery' : 'payment'
        };

        const updatedEntries = [newEntry, ...(norm.entries || [])];

        return normalizeCustomer({
          ...norm,
          entries: updatedEntries
        });
      }
      return c;
    }));
  };

  // Delete an individual delivery entry
  const handleDeleteEntry = (customerId, entryId) => {
    setCustomers(prev => prev.map(c => {
      if (c.id === customerId) {
        const norm = normalizeCustomer(c);
        const updatedEntries = (norm.entries || []).filter(e => e.id !== entryId);

        return normalizeCustomer({
          ...norm,
          entries: updatedEntries
        });
      }
      return c;
    }));
  };

  // Update a customer's today entry draft (backward-compatible)
  const handleUpdateEntry = (customerId, updates) => {
    setCustomers(prev => prev.map(c => {
      if (c.id === customerId) {
        return normalizeCustomer({
          ...c,
          todayEntry: {
            ...c.todayEntry,
            ...updates
          }
        });
      }
      return c;
    }));
  };

  // Add new customer
  const handleAddCustomer = (newCustomer) => {
    const normalized = normalizeCustomer(newCustomer);
    setCustomers(prev => [normalized, ...prev]);
    setActiveTab('entries');
  };

  // Record payment in BendingCustomers tab (or CustomerEntriesModal)
  const handleRecordPayment = (customerId, amount, method) => {
    setCustomers(prev => prev.map(c => {
      if (c.id === customerId) {
        const norm = normalizeCustomer(c);
        const now = new Date();
        const todayStr = getTodayDateString();
        const timeStr = getCurrentTimeString();
        const payAmount = Number(amount) || 0;

        const paymentEntry = {
          id: `pay-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          date: todayStr,
          time: timeStr,
          timestamp: now.toISOString(),
          cansDelivered: 0,
          emptyCansReturned: 0,
          rate: norm.amountPerCane || 35,
          totalCost: 0,
          amountPaid: payAmount,
          bendingAmount: -payAmount,
          notes: `Paid via ${method || 'Cash'}`,
          type: 'payment'
        };

        return normalizeCustomer({
          ...norm,
          entries: [paymentEntry, ...(norm.entries || [])]
        });
      }
      return c;
    }));
  };

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-[#f8fafc]">
      {/* 1. Vertical Left-Side Navbar (Permanent on Desktop/Tablet, Slide-out on Mobile) */}
      <Sidebar
        customers={customers}
        onPrintRoute={() => setIsPrintModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onTriggerInstall={handleTriggerInstall}
        isInstallable={Boolean(deferredInstallPrompt)}
        isCloudConnected={isCloudConnected}
        onOpenCloudSync={() => setIsCloudModalOpen(true)}
      />

      {/* 2. Main Content Area on the right */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 px-3 sm:px-6 lg:px-8 py-5 pb-16 max-w-6xl w-full mx-auto">
          {activeTab === 'entries' && (
            <CaneEntries
              customers={customers}
              onUpdateEntry={handleUpdateEntry}
              onAddDeliveryEntry={handleAddDeliveryEntry}
              onDeleteEntry={handleDeleteEntry}
              onNavigateToAddCustomer={() => setActiveTab('addCustomer')}
              onDeleteCustomer={handleDeleteCustomer}
              businessInfo={businessInfo}
            />
          )}

          {activeTab === 'todayUpdate' && (
            <TodaysUpdate
              customers={customers}
              onNavigateToEntries={() => setActiveTab('entries')}
              onAddDeliveryEntry={handleAddDeliveryEntry}
              onDeleteEntry={handleDeleteEntry}
              businessInfo={businessInfo}
            />
          )}

          {activeTab === 'allDates' && (
            <AllDatesHistory
              customers={customers}
              onNavigateToEntries={() => setActiveTab('entries')}
              onDeleteCustomer={handleDeleteCustomer}
              onAddDeliveryEntry={handleAddDeliveryEntry}
              onDeleteEntry={handleDeleteEntry}
              businessInfo={businessInfo}
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
              onAddDeliveryEntry={handleAddDeliveryEntry}
              onDeleteEntry={handleDeleteEntry}
              businessInfo={businessInfo}
              onNavigateToEntries={() => setActiveTab('entries')}
            />
          )}
        </main>

        {/* Discreet Footer */}
        <footer className="py-5 border-t border-slate-200/80 bg-white/50 text-center text-xs text-slate-500">
          <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
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
                onClick={handleTriggerInstall}
                className="text-ocean-700 hover:underline font-semibold"
              >
                Install Mobile App
              </button>
            </div>
          </div>
        </footer>
      </div>

      {/* Printable Delivery Manifest Modal */}
      <DeliverySheetModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        customers={customers}
        businessInfo={businessInfo}
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
    </div>
  );
}
