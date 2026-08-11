import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { ref, set, get, child, update, remove, onValue } from 'firebase/database';
import { db } from './firebase';
import { Bill, AppSettings } from '../types';

interface BillingDB extends DBSchema {
  bills: {
    key: string;
    value: Bill;
    indexes: { 'by-date': number };
  };
  settings: {
    key: string;
    value: AppSettings;
  };
  syncQueue: {
    key: string;
    value: {
      id: string;
      collection: 'bills' | 'settings';
      action: 'set' | 'update' | 'delete';
      payload?: any;
      timestamp: number;
    };
  };
}

const DB_NAME = 'billing_app_db';
const DB_VERSION = 2; // Bumped version to add settings store

let dbPromise: Promise<IDBPDatabase<BillingDB>>;

export function initDB() {
  if (!dbPromise) {
    dbPromise = openDB<BillingDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const billStore = db.createObjectStore('bills', { keyPath: 'id' });
          billStore.createIndex('by-date', 'createdAt');
          db.createObjectStore('syncQueue', { keyPath: 'id' });
        }
        if (oldVersion < 2) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Save a bill locally and queue for sync.
 */
export async function saveBillLocally(bill: Bill) {
  const idb = await initDB();
  const tx = idb.transaction(['bills', 'syncQueue'], 'readwrite');
  
  bill.syncStatus = 'pending_sync';
  bill.updatedAt = Date.now();
  
  await tx.objectStore('bills').put(bill);
  
  await tx.objectStore('syncQueue').put({
    id: `bill_${bill.id}`,
    collection: 'bills',
    action: 'set',
    payload: bill,
    timestamp: Date.now()
  });
  
  await tx.done;
  
  if (navigator.onLine) {
    syncPendingData();
  }
  
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('local-bills-updated'));
  }
}

/**
 * Save settings locally and queue for sync.
 */
export async function saveSettingsLocally(settings: AppSettings) {
  const idb = await initDB();
  const tx = idb.transaction(['settings', 'syncQueue'], 'readwrite');
  
  settings.syncStatus = 'pending_sync';
  settings.updatedAt = Date.now();
  
  await tx.objectStore('settings').put(settings);
  
  await tx.objectStore('syncQueue').put({
    id: `settings_${settings.id}`,
    collection: 'settings',
    action: 'set',
    payload: settings,
    timestamp: Date.now()
  });
  
  await tx.done;
  
  if (navigator.onLine) {
    syncPendingData();
  }
}

/**
 * Get all bills from local DB.
 */
export async function getLocalBills(): Promise<Bill[]> {
  const idb = await initDB();
  const bills = await idb.getAllFromIndex('bills', 'by-date');
  return bills.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Get settings from local DB.
 */
export async function getLocalSettings(): Promise<AppSettings | undefined> {
  const idb = await initDB();
  return await idb.get('settings', 'default');
}

/**
 * Delete a bill locally and queue for sync deletion.
 */
export async function deleteBillLocally(id: string) {
  const idb = await initDB();
  const tx = idb.transaction(['bills', 'syncQueue'], 'readwrite');
  
  await tx.objectStore('bills').delete(id);
  
  await tx.objectStore('syncQueue').put({
    id: `bill_${id}`,
    collection: 'bills',
    action: 'delete',
    timestamp: Date.now()
  });
  
  await tx.done;
  
  if (navigator.onLine) {
    syncPendingData();
  }
  
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('local-bills-updated'));
  }
}

/**
 * Sync pending writes from local queue to Firebase RTDB.
 */
export async function syncPendingData() {
  const idb = await initDB();
  const syncQueue = await idb.getAll('syncQueue');
  
  if (syncQueue.length === 0) return;
  
  syncQueue.sort((a, b) => a.timestamp - b.timestamp);
  
  for (const item of syncQueue) {
    try {
      // Extract original ID (e.g., 'bill_123' -> '123')
      const actualId = item.id.replace(/^(bill_|settings_)/, '');
      const dbRef = ref(db, `${item.collection}/${actualId}`);
      
      if (item.action === 'set' || item.action === 'update') {
        await set(dbRef, { ...item.payload, syncStatus: 'synced' });
        
        if (item.collection === 'bills') {
          const localBill = await idb.get('bills', actualId);
          if (localBill) {
            localBill.syncStatus = 'synced';
            await idb.put('bills', localBill);
          }
        } else if (item.collection === 'settings') {
          const localSettings = await idb.get('settings', actualId);
          if (localSettings) {
            localSettings.syncStatus = 'synced';
            await idb.put('settings', localSettings);
          }
        }
      } else if (item.action === 'delete') {
        await remove(dbRef);
      }
      
      await idb.delete('syncQueue', item.id);
    } catch (error) {
      console.error(`Failed to sync item ${item.id}:`, error);
      break; 
    }
  }
}

/**
 * Fetch bills and settings from Firebase and update local cache.
 */
export async function pullFromFirebase() {
  if (!navigator.onLine) return;
  
  try {
    const dbRef = ref(db);
    
    // Pull Bills
    const billsSnapshot = await get(child(dbRef, 'bills'));
    if (billsSnapshot.exists()) {
      const serverBills: Record<string, Bill> = billsSnapshot.val();
      const idb = await initDB();
      const tx = idb.transaction('bills', 'readwrite');
      const store = tx.objectStore('bills');
      
      for (const key in serverBills) {
        const serverBill = serverBills[key];
        serverBill.syncStatus = 'synced';
        await store.put(serverBill);
      }
      await tx.done;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('local-bills-updated'));
      }
    }
    
    // Pull Settings
    const settingsSnapshot = await get(child(dbRef, 'settings'));
    if (settingsSnapshot.exists()) {
      const serverSettings: Record<string, AppSettings> = settingsSnapshot.val();
      const idb = await initDB();
      const tx = idb.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      
      for (const key in serverSettings) {
        const serverSetting = serverSettings[key];
        serverSetting.syncStatus = 'synced';
        await store.put(serverSetting);
      }
      await tx.done;
    }
  } catch (error) {
    console.error("Failed to pull from Firebase", error);
  }
}

// Setup network listeners for background sync
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('App is online. Triggering background sync...');
    syncPendingData();
    pullFromFirebase();
  });
}

/**
 * Setup a realtime listener for Firebase.
 * Used when the app is online to get updates from other devices.
 */
export function setupRealtimeSync() {
  if (typeof window === 'undefined') return;

  const dbRef = ref(db, 'bills');
  onValue(dbRef, async (snapshot) => {
    if (snapshot.exists()) {
      const serverBills: Record<string, Bill> = snapshot.val();
      const idb = await initDB();
      const tx = idb.transaction('bills', 'readwrite');
      const store = tx.objectStore('bills');
      
      let updated = false;
      for (const key in serverBills) {
        const serverBill = serverBills[key];
        serverBill.syncStatus = 'synced';
        await store.put(serverBill);
        updated = true;
      }
      
      await tx.done;
      
      if (updated) {
        window.dispatchEvent(new Event('local-bills-updated'));
      }
    }
  });
}
