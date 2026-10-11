import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot, 
  enableIndexedDbPersistence 
} from 'firebase/firestore';

const CONFIG_STORAGE_KEY = 'tamilan_waters_firebase_config';

// Built-in Default Firebase Project for Tamilan Waters
// All devices automatically connect to this permanent cloud database out-of-the-box!
export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBhCi1xjV8c2A1Qveib9nV8kC2I9QMQMwQ",
  authDomain: "tamilan-waters.firebaseapp.com",
  projectId: "tamilan-waters",
  storageBucket: "tamilan-waters.firebasestorage.app",
  messagingSenderId: "483514485153",
  appId: "1:483514485153:web:45a0c31e2738c03eece3e0",
  measurementId: "G-88WN5S4CG4"
};

export function getStoredFirebaseConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading firebase config from storage', e);
  }
  // Return the built-in permanent default project for all mobile phones
  return DEFAULT_FIREBASE_CONFIG;
}

export function saveFirebaseConfig(config) {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    return true;
  } catch (e) {
    console.error('Failed to save firebase config', e);
    return false;
  }
}

export function clearFirebaseConfig() {
  localStorage.removeItem(CONFIG_STORAGE_KEY);
}

let firestoreInstance = null;
let currentApp = null;

export function initializeFirebase(config = DEFAULT_FIREBASE_CONFIG) {
  if (!config || !config.apiKey || !config.projectId) {
    return null;
  }

  try {
    if (getApps().length === 0) {
      currentApp = initializeApp(config);
    } else {
      currentApp = getApp();
    }

    firestoreInstance = getFirestore(currentApp);

    // Enable offline persistence so all deliveries work even without network
    try {
      enableIndexedDbPersistence(firestoreInstance).catch((err) => {
        if (err.code === 'failed-precondition') {
          // Multiple tabs open, persistence can only be enabled in one tab at a time.
        } else if (err.code === 'unimplemented') {
          // Current browser does not support IndexedDB persistence
        }
      });
    } catch {
      // Ignore if already enabled
    }

    return firestoreInstance;
  } catch (err) {
    console.error('Failed to initialize Firebase:', err);
    return null;
  }
}

/**
 * Real-time listener for customer database changes across all connected devices
 */
export function subscribeToLiveCustomers(onData, onError) {
  const config = getStoredFirebaseConfig();
  if (!config) return null;

  const db = firestoreInstance || initializeFirebase(config);
  if (!db) return null;

  try {
    const docRef = doc(db, 'tamilan_waters', 'customers_database');
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (Array.isArray(data.customers)) {
          onData(data.customers, data.updatedAt, data.updatedBy);
        }
      } else {
        // Document doesn't exist yet in cloud
        onData(null);
      }
    }, (error) => {
      console.warn('Firestore subscription notice:', error);
      if (onError) onError(error);
    });

    return unsubscribe;
  } catch (err) {
    console.error('Failed to subscribe to Firestore:', err);
    if (onError) onError(err);
    return null;
  }
}

/**
 * Push updated customer data to the permanent cloud so all other phones update immediately
 */
export async function pushCustomersToCloud(customers, deviceIdentifier = 'Mobile Device') {
  const config = getStoredFirebaseConfig();
  if (!config) return false;

  const db = firestoreInstance || initializeFirebase(config);
  if (!db) return false;

  try {
    const docRef = doc(db, 'tamilan_waters', 'customers_database');
    await setDoc(docRef, {
      customers,
      updatedAt: new Date().toISOString(),
      updatedBy: deviceIdentifier,
      customerCount: customers.length
    }, { merge: true });
    return true;
  } catch (err) {
    console.error('Failed to push to permanent cloud:', err);
    throw err;
  }
}
