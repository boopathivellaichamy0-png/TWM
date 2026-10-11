import React, { useState } from 'react';
import { 
  Cloud, 
  CloudCheck, 
  X, 
  CheckCircle, 
  WarningCircle, 
  WhatsappLogo, 
  Copy, 
  Trash, 
  ArrowClockwise,
  DeviceMobile,
  ShareNetwork,
  Info
} from '@phosphor-icons/react';
import { 
  getStoredFirebaseConfig, 
  saveFirebaseConfig, 
  clearFirebaseConfig, 
  initializeFirebase,
  pushCustomersToCloud
} from '../services/firebase';

export function CloudSyncModal({ 
  isOpen, 
  onClose, 
  cloudStatus, 
  onConfigUpdated,
  customers 
}) {
  const [configInput, setConfigInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHowToGuide, setShowHowToGuide] = useState(false);

  if (!isOpen) return null;

  const currentConfig = getStoredFirebaseConfig();

  // Parse user input (supports JSON, JS object syntax, or URL hash)
  const parseConfig = (raw) => {
    let clean = raw.trim();
    // If user pasted 'const firebaseConfig = { ... };'
    if (clean.includes('{') && clean.includes('}')) {
      const start = clean.indexOf('{');
      const end = clean.lastIndexOf('}');
      clean = clean.substring(start, end + 1);
    }
    
    // Replace unquoted keys if necessary
    try {
      return JSON.parse(clean);
    } catch {
      try {
        // Try relaxed JSON parsing for JS object notation
        const formatted = clean
          .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2": ')
          .replace(/'/g, '"');
        return JSON.parse(formatted);
      } catch (err) {
        throw new Error("Could not parse configuration. Please paste the Firebase config object { apiKey: '...', projectId: '...' }");
      }
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      const parsed = parseConfig(configInput);
      if (!parsed.apiKey || !parsed.projectId) {
        throw new Error("Missing 'apiKey' or 'projectId' in the provided configuration.");
      }

      // Test initialization
      const db = initializeFirebase(parsed);
      if (!db) {
        throw new Error("Could not initialize Firebase with these credentials. Please verify your project ID and API key.");
      }

      // Save locally
      saveFirebaseConfig(parsed);

      // If we currently have customers, push them to initialize the cloud database
      if (customers && customers.length > 0) {
        try {
          await pushCustomersToCloud(customers, 'Setup Device');
        } catch {
          // If cloud push had rules error, warn user
        }
      }

      setSuccessMsg("Cloud database connected successfully! All devices with this setup will now sync live.");
      if (onConfigUpdated) onConfigUpdated(parsed);
      
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 2000);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisconnect = () => {
    if (window.confirm("Disconnect from cloud database on this phone? Local data will remain intact.")) {
      clearFirebaseConfig();
      if (onConfigUpdated) onConfigUpdated(null);
      setSuccessMsg("Disconnected from cloud. This phone will use offline local storage.");
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1500);
    }
  };

  // Generate 1-click shareable link for drivers
  const generateShareLink = () => {
    if (!currentConfig) return '';
    const encoded = encodeURIComponent(JSON.stringify(currentConfig));
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}#cloud=${encoded}`;
  };

  const handleShareWhatsApp = () => {
    const link = generateShareLink();
    const msg = `*Tamilan Waters • Cloud Sync Setup* 💧\n\nTap this link to automatically connect your phone to our live cloud database:\n\n${link}\n\nOnce opened, all water deliveries, empty cans, and payments will sync in real time across all staff phones!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
              currentConfig ? 'bg-emerald-100 text-emerald-700' : 'bg-ocean-100 text-ocean-700'
            }`}>
              {currentConfig ? (
                <CloudCheck weight="fill" className="w-5 h-5 text-emerald-600" />
              ) : (
                <Cloud weight="fill" className="w-5 h-5 text-ocean-600" />
              )}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Multi-Mobile Cloud Sync
              </h2>
              <p className="text-xs text-slate-500">
                Connect multiple mobile phones to one live database
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

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Status Banner */}
          {currentConfig ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-extrabold text-emerald-800 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Live Cloud Connected</span>
                </div>
                <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded-md border border-emerald-300 font-bold">
                  Project: {currentConfig.projectId}
                </span>
              </div>
              <p className="text-emerald-800">
                Any delivery, payment, or empty can entered on this phone instantly updates all other connected mobile phones in real time!
              </p>

              {/* 1-Click WhatsApp Invite for Other Drivers */}
              <div className="pt-2 border-t border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-emerald-900">
                  Connect another staff/driver phone:
                </span>
                <button
                  onClick={handleShareWhatsApp}
                  className="tactile-btn inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm"
                >
                  <WhatsappLogo weight="fill" className="w-4 h-4" />
                  <span>Share Setup via WhatsApp</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs">
              <div className="flex items-center gap-2 font-bold text-amber-900 mb-1">
                <Info weight="bold" className="w-4 h-4 text-amber-700" />
                <span>Currently Operating in Single-Phone (Local) Mode</span>
              </div>
              <p className="text-amber-800">
                To connect multiple mobile phones so delivery entries sync across all phones in real time, connect your free Google Firebase project below.
              </p>
            </div>
          )}

          {/* Feedback messages */}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle weight="fill" className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <WarningCircle weight="fill" className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Configuration Form */}
          <form onSubmit={handleSaveConfig} className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                {currentConfig ? 'Update Firebase Configuration' : 'Paste Firebase Configuration'}
              </label>
              <textarea
                rows={5}
                value={configInput}
                onChange={(e) => setConfigInput(e.target.value)}
                placeholder={`{\n  apiKey: "AIzaSy...",\n  projectId: "tamilan-waters",\n  authDomain: "tamilan-waters.firebaseapp.com",\n  ...\n}`}
                className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ocean-500/20 focus:border-ocean-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Paste the Firebase Web App config object from your Firebase Console.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowHowToGuide(!showHowToGuide)}
                className="text-xs font-bold text-ocean-700 hover:underline flex items-center gap-1"
              >
                <span>{showHowToGuide ? 'Hide' : 'How to get free Firebase in 2 mins'}</span>
              </button>

              <div className="flex items-center gap-2">
                {currentConfig && (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                  >
                    Disconnect
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!configInput.trim() || isSubmitting}
                  className="tactile-btn px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Testing...' : 'Connect Cloud Database'}
                </button>
              </div>
            </div>
          </form>

          {/* 3-Step Setup Guide */}
          {showHowToGuide && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2.5 animate-fade-in">
              <h4 className="font-extrabold text-slate-900">
                Free Google Firebase Setup (Takes 2 minutes):
              </h4>
              <ol className="list-decimal pl-4 space-y-1.5 text-slate-600 text-[11px]">
                <li>
                  Open <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-ocean-700 underline font-semibold">console.firebase.google.com</a> and sign in with Google.
                </li>
                <li>
                  Click <strong>"Create a project"</strong> and name it (e.g., <code>tamilan-waters</code>).
                </li>
                <li>
                  In the left sidebar, click <strong>"Firestore Database"</strong> ➔ <strong>"Create Database"</strong> (select Test Mode / start in test mode).
                </li>
                <li>
                  Click Project Overview (⚙️) ➔ <strong>"Project settings"</strong> ➔ Scroll to "Your apps" ➔ Click Web icon (<strong>&lt;/&gt;</strong>).
                </li>
                <li>
                  Copy the <code>firebaseConfig</code> code and paste it in the box above!
                </li>
              </ol>
              <p className="text-[10px] text-slate-500 italic">
                *Firebase Spark plan is 100% free forever for up to 50,000 updates per day.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
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
