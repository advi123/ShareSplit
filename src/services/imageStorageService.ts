/**
 * IndexedDB Service for storing full bill image data locally in browser storage.
 * Designed with a clean async interface so Phase 2 can swap this with backend file/S3 storage.
 */

const DB_NAME = 'ShareSplitImageDB';
const DB_VERSION = 1;
const STORE_NAME = 'bill_images';

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('IndexedDB open error:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

export const imageStorageService = {
  async saveImage(billId: string, imageData: string): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(imageData, billId);

        request.onsuccess = () => resolve();
        request.onerror = (e) => reject((e.target as IDBRequest).error);
      });
    } catch (err) {
      console.error(`Failed to save image in IndexedDB for bill ${billId}`, err);
    }
  },

  async getImage(billId: string): Promise<string | null> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(billId);

        request.onsuccess = () => {
          resolve((request.result as string) || null);
        };
        request.onerror = () => resolve(null);
      });
    } catch (err) {
      console.error(`Failed to retrieve image from IndexedDB for bill ${billId}`, err);
      return null;
    }
  },

  async deleteImage(billId: string): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(billId);

        request.onsuccess = () => resolve();
        request.onerror = (e) => reject((e.target as IDBRequest).error);
      });
    } catch (err) {
      console.error(`Failed to delete image from IndexedDB for bill ${billId}`, err);
    }
  }
};
