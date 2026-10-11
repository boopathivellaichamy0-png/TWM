import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot, 
  enableIndexedDbPersistence 
} from 'firebase/firestore';

const CONFIG_STORAGE_KEY = 'tamilan_waters_firebase_config';

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
  return null;
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

export function initializeFirebase(config) {
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

    // Enable offline persistence so it works offline on mobile
    try {
      enableIndexedDbPersistence(firestoreInstance).catch((err) => {
        if (err.code === 'failed-precondition') {
          // Multiple tabs open, persistence can only be enabled in one tab at a time.
        } else if (err.code === 'unimplemented') {
          // The current browser does not support all of the features required to enable persistence
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
 * Push updated customer data to the cloud so all other phones update immediately
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
    console.error('Failed to push to cloud:', err);
    throw err;
  }
}
