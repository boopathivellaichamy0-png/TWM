import React, { useState, useRef } from 'react';
import { 
  ShieldCheck, 
  DownloadSimple, 
  UploadSimple, 
  ClockCounterClockwise, 
  X, 
  CheckCircle, 
  WarningCircle, 
  DeviceMobile,
  ArrowCounterClockwise,
  ShareNetwork,
  LockKey
} from '@phosphor-icons/react';

export function DataSafetyModal({ 
  isOpen, 
  onClose, 
  customers, 
  onRestoreCustomers,
  businessInfo,
  deferredInstallPrompt,
  onTriggerInstall
}) {
  const [activeTab, setActiveTab] = useState('backup'); // 'backup' | 'snapshots' | 'install'
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Retrieve auto-snapshots from localStorage
  const getSnapshots = () => {
    try {
      const raw = localStorage.getItem('tamilan_waters_auto_snapshots_v1');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const snapshots = getSnapshots();

  // 1. Export Data to JSON file
  const handleExportBackup = () => {
    try {
      const backupData = {
        app: "Tamilan Waters",
        version: "1.0",
        exportDate: new Date().toISOString(),
        customerCount: customers.length,
        businessInfo,
        customers
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      const datePart = new Date().toISOString().split('T')[0];
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `Tamilan_Waters_Backup_${datePart}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setFeedbackMsg(`Backup successfully downloaded! (${customers.length} customers saved)`);
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (e) {
      setErrorMsg("Failed to generate backup: " + e.message);
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  // 2. Import / Restore Data from JSON file
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        const restoredCustomers = Array.isArray(parsed) ? parsed : parsed.customers;

        if (!Array.isArray(restoredCustomers)) {
          throw new Error("Invalid backup format: customer list not found.");
        }

        if (window.confirm(`Restore backup with ${restoredCustomers.length} customer records? Current data will be replaced.`)) {
          onRestoreCustomers(restoredCustomers);
          setFeedbackMsg(`Successfully restored ${restoredCustomers.length} customer records!`);
          setTimeout(() => {
            setFeedbackMsg(null);
            onClose();
          }, 2000);
        }
      } catch (err) {
        setErrorMsg("Failed to restore: " + err.message);
        setTimeout(() => setErrorMsg(null), 5000);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  // 3. Restore from auto-snapshot
  const handleRestoreSnapshot = (snap) => {
    if (window.confirm(`Restore automatic snapshot from ${new Date(snap.timestamp).toLocaleString('en-IN')}?`)) {
      onRestoreCustomers(snap.customers);
      setFeedbackMsg(`Successfully restored snapshot with ${snap.customers.length} customers!`);
      setTimeout(() => {
        setFeedbackMsg(null);
        onClose();
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-ocean-100 text-ocean-700 flex items-center justify-center font-bold">
              <ShieldCheck weight="fill" className="w-5 h-5 text-ocean-600" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Safety & App Installation
              </h2>
              <p className="text-xs text-slate-500">
                Data security, backups, and mobile app setup
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X weight="bold" className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-4 pt-2 gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('backup')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'backup'
                ? 'border-ocean-600 text-ocean-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck weight="bold" className="w-4 h-4" />
            <span>Backup & Restore</span>
          </button>
          <button
            onClick={() => setActiveTab('snapshots')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'snapshots'
                ? 'border-ocean-600 text-ocean-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClockCounterClockwise weight="bold" className="w-4 h-4" />
            <span>Auto-Recovery ({snapshots.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('install')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'install'
                ? 'border-ocean-600 text-ocean-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <DeviceMobile weight="bold" className="w-4 h-4" />
            <span>Install Mobile App</span>
          </button>
        </div>

        {/* Feedback banners */}
        {feedbackMsg && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle weight="fill" className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <WarningCircle weight="fill" className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* TAB 1: BACKUP & RESTORE */}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-ocean-50/60 border border-ocean-100 flex items-start gap-3">
                <ShieldCheck weight="bold" className="w-5 h-5 text-ocean-600 shrink-0 mt-0.5" />
                <div className="text-xs text-ocean-950">
                  <p className="font-bold">Your data is safe and stored locally on your device.</p>
                  <p className="text-ocean-800 mt-1">
                    To keep your business records safe across phone changes or accidental clears, download a backup file regularly or restore an existing one.
                  </p>
                </div>
              </div>

              {/* Export Button Card */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                    Export Safe Backup File
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Save all customer records, today's deliveries, and dues as a secure `.json` file.
                  </p>
                </div>
                <button
                  onClick={handleExportBackup}
                  className="tactile-btn inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-ocean-600 hover:bg-ocean-700 text-white text-xs font-bold shrink-0 shadow-sm"
                >
                  <DownloadSimple weight="bold" className="w-4 h-4" />
                  <span>Download Backup</span>
                </button>
              </div>

              {/* Import Button Card */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                    Restore from Backup File
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Load previously saved customer records and ledger entries from your phone or PC.
                  </p>
                </div>
                <div>
                  <input
                    type="file"
                    accept=".json"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="tactile-btn inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shrink-0 shadow-sm"
                  >
                    <UploadSimple weight="bold" className="w-4 h-4" />
                    <span>Upload & Restore</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AUTOMATIC RECOVERY SNAPSHOTS */}
          {activeTab === 'snapshots' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                The system automatically creates recovery snapshots on every save so you never lose accidental updates.
              </p>

              {snapshots.length === 0 ? (
                <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-slate-500 text-xs">
                  No automated snapshots recorded yet. They will appear here automatically as deliveries are saved.
                </div>
              ) : (
                <div className="space-y-2">
                  {snapshots.map((snap, idx) => {
                    const snapDate = new Date(snap.timestamp);
                    const formattedDate = !isNaN(snapDate.getTime())
                      ? snapDate.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                      : snap.timestamp;

                    return (
                      <div 
                        key={idx}
                        className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                            <ClockCounterClockwise weight="bold" className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{formattedDate}</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {snap.customers?.length || 0} Customers • Snapshot #{idx + 1}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRestoreSnapshot(snap)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] transition-colors"
                        >
                          Restore
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: APP INSTALLATION GUIDE */}
          {activeTab === 'install' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs flex items-start gap-3">
                <DeviceMobile weight="fill" className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Install Tamilan Waters as a Standalone App</p>
                  <p className="text-emerald-800 mt-1">
                    Once installed, Tamilan Waters opens directly from your phone's home screen, runs full-screen without browser address bars, and works 100% offline during deliveries!
                  </p>
                </div>
              </div>

              {/* Direct 1-Click Install Button if supported */}
              {deferredInstallPrompt && (
                <div className="p-4 rounded-2xl bg-ocean-600 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                  <div>
                    <h3 className="font-extrabold text-sm">Direct One-Click Install Available</h3>
                    <p className="text-xs text-ocean-100 mt-0.5">Your browser supports instant 1-tap installation.</p>
                  </div>
                  <button
                    onClick={() => {
                      onTriggerInstall();
                      onClose();
                    }}
                    className="tactile-btn inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-ocean-800 font-extrabold text-xs shadow-sm hover:bg-ocean-50 shrink-0"
                  >
                    <DeviceMobile weight="bold" className="w-4 h-4 text-ocean-600" />
                    <span>Install App Now</span>
                  </button>
                </div>
              )}

              {/* Step-by-Step Instructions */}
              <div className="space-y-3 pt-1">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  How to Install on Your Device:
                </h3>

                {/* Android Steps */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-900 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">1</span>
                    <span>Android Phone (Google Chrome)</span>
                  </div>
                  <p className="text-xs text-slate-600 pl-7">
                    Open this website in Chrome, tap the <strong>three dots (⋮)</strong> at top right, and tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                  </p>
                </div>

                {/* iPhone Steps */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-900 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">2</span>
                    <span>iPhone / iPad (Safari)</span>
                  </div>
                  <p className="text-xs text-slate-600 pl-7">
                    Open in Safari, tap the <strong>Share button (⎙)</strong> at the bottom bar, scroll down and tap <strong>"Add to Home Screen (+)"</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
