import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { ref, set, get, child, remove, onValue } from 'firebase/database';
import { db, auth } from './firebase';
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

let dbInstance: IDBPDatabase<BillingDB> | null = null;
let dbOpeningPromise: Promise<IDBPDatabase<BillingDB>> | null = null;

/**
 * Resets the cached database connection handle so a fresh one can be opened.
 */
export function resetDBHandle() {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // Ignore close errors
    }
  }
  dbInstance = null;
  dbOpeningPromise = null;
}

/**
 * Self-healing IndexedDB initialization that handles mobile/PWA background suspension.
 */
export async function initDB(): Promise<IDBPDatabase<BillingDB>> {
  // If we have an existing open connection that is still active
  if (dbInstance) {
    return dbInstance;
  }

  // If already opening, await the pending connection promise
  if (dbOpeningPromise) {
    return dbOpeningPromise;
  }

  dbOpeningPromise = (async () => {
    try {
      const openedDb = await openDB<BillingDB>(DB_NAME, DB_VERSION, {
        upgrade(database, oldVersion) {
          if (oldVersion < 1) {
            const billStore = database.createObjectStore('bills', { keyPath: 'id' });
            billStore.createIndex('by-date', 'createdAt');
            database.createObjectStore('syncQueue', { keyPath: 'id' });
          }
          if (oldVersion < 2) {
            database.createObjectStore('settings', { keyPath: 'id' });
          }
        },
        blocked() {
          console.warn('[IndexedDB] Connection blocked by older version.');
        },
        blocking() {
          console.warn('[IndexedDB] Connection blocking a newer version; closing.');
          resetDBHandle();
        },
        terminated() {
          console.warn('[IndexedDB] Connection terminated by browser/PWA lifecycle.');
          resetDBHandle();
        },
      });

      // Listen for unexpected closing (e.g. mobile tab backgrounded/suspended)
      openedDb.addEventListener('close', () => {
        console.warn('[IndexedDB] Database closed event received. Resetting handle.');
        resetDBHandle();
      });

      dbInstance = openedDb;
      return openedDb;
    } catch (err) {
      dbInstance = null;
      dbOpeningPromise = null;
      throw err;
    } finally {
      dbOpeningPromise = null;
    }
  })();

  return dbOpeningPromise;
}

/**
 * Safe transaction runner that retries automatically once if database connection was closed/suspended.
 */
async function runWithRetry<T>(operation: (idb: IDBPDatabase<BillingDB>) => Promise<T>): Promise<T> {
  try {
    const idb = await initDB();
    return await operation(idb);
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    const isClosingOrClosed = 
      err?.name === 'InvalidStateError' || 
      errMsg.includes('closing') || 
      errMsg.includes('closed') ||
      errMsg.includes('hidden');

    if (isClosingOrClosed) {
      console.warn('[IndexedDB] Connection was closed/closing. Re-initializing and retrying operation...', err);
      resetDBHandle();
      const freshIdb = await initDB();
      return await operation(freshIdb);
    }
    throw err;
  }
}

/**
 * Save a bill locally and queue for sync.
 */
export async function saveBillLocally(bill: Bill) {
  bill.syncStatus = 'pending_sync';
  bill.updatedAt = Date.now();

  await runWithRetry(async (idb) => {
    const tx = idb.transaction(['bills', 'syncQueue'], 'readwrite');
    await tx.objectStore('bills').put(bill);
    await tx.objectStore('syncQueue').put({
      id: `bill_${bill.id}`,
      collection: 'bills',
      action: 'set',
      payload: bill,
      timestamp: Date.now(),
    });
    await tx.done;
  });

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
  settings.syncStatus = 'pending_sync';
  settings.updatedAt = Date.now();

  await runWithRetry(async (idb) => {
    const tx = idb.transaction(['settings', 'syncQueue'], 'readwrite');
    await tx.objectStore('settings').put(settings);
    await tx.objectStore('syncQueue').put({
      id: `settings_${settings.id}`,
      collection: 'settings',
      action: 'set',
      payload: settings,
      timestamp: Date.now(),
    });
    await tx.done;
  });

  if (navigator.onLine) {
    syncPendingData();
  }
}

/**
 * Get all bills from local DB.
 */
export async function getLocalBills(): Promise<Bill[]> {
  const bills = await runWithRetry(async (idb) => {
    return await idb.getAllFromIndex('bills', 'by-date');
  });

  const trailingDigitsRegex = /(\d+)(?=\D*$)/;

  return bills.sort((a, b) => {
    const matchA = (a.invoiceNumber || '').match(trailingDigitsRegex);
    const numA = matchA && matchA[1] ? parseInt(matchA[1], 10) : 0;

    const matchB = (b.invoiceNumber || '').match(trailingDigitsRegex);
    const numB = matchB && matchB[1] ? parseInt(matchB[1], 10) : 0;

    if (numB !== numA) {
      return numB - numA;
    }
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
}

/**
 * Get settings from local DB.
 */
export async function getLocalSettings(): Promise<AppSettings | undefined> {
  return await runWithRetry(async (idb) => {
    return await idb.get('settings', 'default');
  });
}

/**
 * Delete a bill locally and queue for sync deletion.
 */
export async function deleteBillLocally(id: string) {
  await runWithRetry(async (idb) => {
    const tx = idb.transaction(['bills', 'syncQueue'], 'readwrite');
    await tx.objectStore('bills').delete(id);
    await tx.objectStore('syncQueue').put({
      id: `bill_${id}`,
      collection: 'bills',
      action: 'delete',
      timestamp: Date.now(),
    });
    await tx.done;
  });

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
  if (!auth.currentUser) return;

  const syncQueue = await runWithRetry(async (idb) => {
    return await idb.getAll('syncQueue');
  });

  if (!syncQueue || syncQueue.length === 0) return;

  syncQueue.sort((a, b) => a.timestamp - b.timestamp);

  for (const item of syncQueue) {
    try {
      if (!auth.currentUser) break;
      const actualId = item.id.replace(/^(bill_|settings_)/, '');
      const dbRef = ref(db, `${item.collection}/${actualId}`);

      if (item.action === 'set' || item.action === 'update') {
        await set(dbRef, { ...item.payload, syncStatus: 'synced' });

        await runWithRetry(async (idb) => {
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
        });
      } else if (item.action === 'delete') {
        await remove(dbRef);
      }

      await runWithRetry(async (idb) => {
        await idb.delete('syncQueue', item.id);
      });
    } catch (error: any) {
      // If permission denied or not logged in, stop sync until user logs in
      console.warn(`[Firebase Sync] Deferred sync for item ${item.id}:`, error?.message || error);
      break;
    }
  }
}

/**
 * Fetch bills and settings from Firebase and update local cache.
 */
export async function pullFromFirebase() {
  if (!navigator.onLine || !auth.currentUser) return;

  try {
    const dbRef = ref(db);

    // Pull Bills
    const billsSnapshot = await get(child(dbRef, 'bills'));
    if (billsSnapshot.exists()) {
      const serverBillsData = billsSnapshot.val();
      if (serverBillsData && typeof serverBillsData === 'object') {
        await runWithRetry(async (idb) => {
          const tx = idb.transaction('bills', 'readwrite');
          const store = tx.objectStore('bills');

          for (const key in serverBillsData) {
            const rawBill = serverBillsData[key];
            if (rawBill && typeof rawBill === 'object') {
              const serverBill: Bill = {
                ...rawBill,
                id: rawBill.id || key,
                syncStatus: 'synced',
              };
              await store.put(serverBill);
            }
          }
          await tx.done;
        });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('local-bills-updated'));
        }
      }
    }

    // Pull Settings
    const settingsSnapshot = await get(child(dbRef, 'settings'));
    if (settingsSnapshot.exists()) {
      const serverSettingsData = settingsSnapshot.val();
      if (serverSettingsData && typeof serverSettingsData === 'object') {
        await runWithRetry(async (idb) => {
          const tx = idb.transaction('settings', 'readwrite');
          const store = tx.objectStore('settings');

          if ('supplier' in serverSettingsData || 'id' in serverSettingsData) {
            const setting = {
              ...serverSettingsData,
              id: serverSettingsData.id || 'default',
              syncStatus: 'synced' as const,
            };
            await store.put(setting);
          } else {
            for (const key in serverSettingsData) {
              const rawSetting = serverSettingsData[key];
              if (rawSetting && typeof rawSetting === 'object') {
                const serverSetting: AppSettings = {
                  ...rawSetting,
                  id: rawSetting.id || key,
                  syncStatus: 'synced',
                };
                await store.put(serverSetting);
              }
            }
          }
          await tx.done;
        });
      }
    }
  } catch (error: any) {
    // Only log if it's not an expected unauthenticated/permission denied before login
    if (!error?.message?.includes('Permission denied') && !error?.message?.includes('permission_denied')) {
      console.error('Failed to pull from Firebase', error);
    }
  }
}

// Setup network and PWA visibility lifecycle listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (auth.currentUser) {
      syncPendingData();
      pullFromFirebase();
    }
  });

  // When returning from background / wake from sleep in mobile PWA
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (navigator.onLine && auth.currentUser) {
        syncPendingData();
        pullFromFirebase();
      }
    }
  });
}

/**
 * Setup a realtime listener for Firebase.
 * Used when the app is online to get updates from other devices.
 */
export function setupRealtimeSync() {
  if (typeof window === 'undefined' || !auth.currentUser) return () => {};

  const dbRef = ref(db, 'bills');
  const unsubscribe = onValue(
    dbRef,
    async (snapshot) => {
      if (snapshot.exists()) {
        const serverBillsData = snapshot.val();
        if (serverBillsData && typeof serverBillsData === 'object') {
          try {
            await runWithRetry(async (idb) => {
              const tx = idb.transaction('bills', 'readwrite');
              const store = tx.objectStore('bills');

              for (const key in serverBillsData) {
                const rawBill = serverBillsData[key];
                if (rawBill && typeof rawBill === 'object') {
                  const serverBill: Bill = {
                    ...rawBill,
                    id: rawBill.id || key,
                    syncStatus: 'synced',
                  };
                  await store.put(serverBill);
                }
              }
              await tx.done;
            });

            window.dispatchEvent(new Event('local-bills-updated'));
          } catch (err) {
            console.error('[IndexedDB] Realtime listener sync error:', err);
          }
        }
      }
    },
    (err) => {
      // If permission denied before login or during logout, suppress cleanly
      if (!err?.message?.includes('Permission denied') && !err?.message?.includes('permission_denied')) {
        console.error('[Firebase Realtime] Listener error:', err);
      }
    }
  );

  return unsubscribe;
}
