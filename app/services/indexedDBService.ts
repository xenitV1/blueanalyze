import type { AuthResponse } from './blueskyAPI';
import type { FollowerAnalysisResult } from './blueskyAPI';

// Database configuration
const DB_NAME = 'BlueAnalyzeDB';
const DB_VERSION = 2; // Increased version for schema update

// Object store names
const AUTH_STORE = 'auth';
const PREFERENCES_STORE = 'preferences';
const PROGRESS_STORE = 'progress';
const ANALYSIS_STORE = 'analysis'; // New store for analysis results

// Interface for database initialization
interface DBSchema {
  stores: { name: string; keyPath: string; indexes?: { name: string; keyPath: string; options?: IDBIndexParameters }[] }[];
}

/**
 * Initialize IndexedDB and create object stores if they don't exist
 */
export const initDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    // Define the schema for our database
    const schema: DBSchema = {
      stores: [
        {
          name: AUTH_STORE,
          keyPath: 'key',
        },
        {
          name: PREFERENCES_STORE,
          keyPath: 'key',
        },
        {
          name: PROGRESS_STORE,
          keyPath: 'key',
        },
        {
          name: ANALYSIS_STORE, // Add the new analysis store
          keyPath: 'key',
          indexes: [
            { name: 'username', keyPath: 'username' },
            { name: 'timestamp', keyPath: 'timestamp' }
          ]
        }
      ]
    };

    // Open a connection to the database
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // Handle database upgrade (called when the database is created or version is changed)
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBRequest).result;
      
      // Create object stores based on schema
      schema.stores.forEach(store => {
        if (!db.objectStoreNames.contains(store.name)) {
          const objectStore = db.createObjectStore(store.name, { keyPath: store.keyPath });
          
          // Create indexes if defined
          if (store.indexes) {
            store.indexes.forEach(index => {
              objectStore.createIndex(index.name, index.keyPath, index.options);
            });
          }
        }
      });
    };

    // Handle success
    request.onsuccess = (event) => {
      const db = (event.target as IDBRequest).result;
      resolve(db);
    };

    // Handle error
    request.onerror = (event) => {
      console.error('Database error:', (event.target as IDBRequest).error);
      reject((event.target as IDBRequest).error);
    };
  });
};

/**
 * Generic function to set a value in an object store
 */
export const setItem = async <T>(storeName: string, key: string, value: T): Promise<void> => {
  try {
    const db = await initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put({ key, value });
      
      request.onsuccess = () => {
        resolve();
        db.close();
      };
      
      request.onerror = (event) => {
        console.error(`Error setting item in ${storeName}:`, (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
        db.close();
      };
    });
  } catch (error) {
    console.error(`Failed to set item in ${storeName}:`, error);
    throw error;
  }
};

/**
 * Generic function to get a value from an object store
 */
export const getItem = async <T>(storeName: string, key: string): Promise<T | null> => {
  try {
    const db = await initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      
      request.onsuccess = (event) => {
        const result = (event.target as IDBRequest).result;
        resolve(result ? result.value : null);
        db.close();
      };
      
      request.onerror = (event) => {
        console.error(`Error getting item from ${storeName}:`, (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
        db.close();
      };
    });
  } catch (error) {
    console.error(`Failed to get item from ${storeName}:`, error);
    throw error;
  }
};

/**
 * Generic function to remove a value from an object store
 */
export const removeItem = async (storeName: string, key: string): Promise<void> => {
  try {
    const db = await initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);
      
      request.onsuccess = () => {
        resolve();
        db.close();
      };
      
      request.onerror = (event) => {
        console.error(`Error removing item from ${storeName}:`, (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
        db.close();
      };
    });
  } catch (error) {
    console.error(`Failed to remove item from ${storeName}:`, error);
    throw error;
  }
};

// ========== AUTH FUNCTIONS ==========

/**
 * Save session information to IndexedDB
 */
export const saveSession = async (username: string, session: AuthResponse): Promise<void> => {
  try {
    // Save each session value separately
    await setItem(AUTH_STORE, `blueAnalyze_username`, username);
    await setItem(AUTH_STORE, `blueAnalyze_accessJwt`, session.accessJwt);
    await setItem(AUTH_STORE, `blueAnalyze_refreshJwt`, session.refreshJwt);
    await setItem(AUTH_STORE, `blueAnalyze_did`, session.did);
    
    // Token expiry time (2 hours from now - Bluesky API standard)
    const expiryTime = Date.now() + 2 * 60 * 60 * 1000;
    await setItem(AUTH_STORE, `blueAnalyze_tokenExpiry`, expiryTime.toString());
  } catch (error) {
    console.error('Failed to save session to IndexedDB:', error);
    throw error;
  }
};

/**
 * Get saved session information from IndexedDB
 */
export const getSession = async (): Promise<{ username: string, accessJwt: string, refreshJwt: string, did: string, tokenExpiry: number } | null> => {
  try {
    const username = await getItem<string>(AUTH_STORE, `blueAnalyze_username`);
    const accessJwt = await getItem<string>(AUTH_STORE, `blueAnalyze_accessJwt`);
    const refreshJwt = await getItem<string>(AUTH_STORE, `blueAnalyze_refreshJwt`);
    const did = await getItem<string>(AUTH_STORE, `blueAnalyze_did`);
    const tokenExpiryStr = await getItem<string>(AUTH_STORE, `blueAnalyze_tokenExpiry`);
    
    if (!username || !accessJwt || !refreshJwt || !did || !tokenExpiryStr) {
      return null;
    }
    
    return {
      username,
      accessJwt,
      refreshJwt,
      did,
      tokenExpiry: parseInt(tokenExpiryStr)
    };
  } catch (error) {
    console.error('Failed to get session from IndexedDB:', error);
    return null;
  }
};

/**
 * Clear session data from IndexedDB
 */
export const clearSession = async (): Promise<void> => {
  try {
    await removeItem(AUTH_STORE, `blueAnalyze_username`);
    await removeItem(AUTH_STORE, `blueAnalyze_accessJwt`);
    await removeItem(AUTH_STORE, `blueAnalyze_refreshJwt`);
    await removeItem(AUTH_STORE, `blueAnalyze_did`);
    await removeItem(AUTH_STORE, `blueAnalyze_tokenExpiry`);
  } catch (error) {
    console.error('Failed to clear session from IndexedDB:', error);
  }
};

// ========== PREFERENCES FUNCTIONS ==========

/**
 * Save language preference to IndexedDB
 */
export const saveLanguagePreference = async (language: string): Promise<void> => {
  try {
    await setItem(PREFERENCES_STORE, 'blueanalyze-language', language);
  } catch (error) {
    console.error('Failed to save language preference to IndexedDB:', error);
  }
};

/**
 * Get language preference from IndexedDB
 */
export const getLanguagePreference = async (): Promise<string | null> => {
  try {
    return await getItem<string>(PREFERENCES_STORE, 'blueanalyze-language');
  } catch (error) {
    console.error('Failed to get language preference from IndexedDB:', error);
    return null;
  }
};

/**
 * Save last username to IndexedDB
 */
export const saveLastUsername = async (username: string): Promise<void> => {
  try {
    await setItem(PREFERENCES_STORE, 'lastUsername', username);
  } catch (error) {
    console.error('Failed to save last username to IndexedDB:', error);
  }
};

/**
 * Get last username from IndexedDB
 */
export const getLastUsername = async (): Promise<string | null> => {
  try {
    return await getItem<string>(PREFERENCES_STORE, 'lastUsername');
  } catch (error) {
    console.error('Failed to get last username from IndexedDB:', error);
    return null;
  }
};

// ========== PROGRESS FUNCTIONS ==========

/**
 * Save operation progress to IndexedDB
 */
export const saveOperationProgress = async (
  operation: string,
  username: string,
  currentIndex: number,
  totalItems: number,
  itemList: any[]
): Promise<void> => {
  try {
    const storageKey = `${username}_${operation}_progress`;
    
    // Store less data to keep size manageable
    const progressData = {
      currentIndex,
      totalItems,
      timestamp: Date.now(),
      // Only store a small subset of items to reduce size
      remainingIds: itemList.slice(currentIndex, Math.min(currentIndex + 20, itemList.length))
        .map(item => item.did)
    };
    
    await setItem(PROGRESS_STORE, storageKey, progressData);
  } catch (error) {
    console.error('Failed to save operation progress to IndexedDB:', error);
  }
};

/**
 * Get operation progress from IndexedDB
 */
export const getOperationProgress = async (
  operation: string,
  username: string
): Promise<{ currentIndex: number, totalItems: number, timestamp: number, remainingIds: string[] } | null> => {
  try {
    const storageKey = `${username}_${operation}_progress`;
    return await getItem(PROGRESS_STORE, storageKey);
  } catch (error) {
    console.error('Failed to get operation progress from IndexedDB:', error);
    return null;
  }
};

/**
 * Clear operation progress from IndexedDB
 */
export const clearOperationProgress = async (
  operation: string,
  username: string
): Promise<void> => {
  try {
    const storageKey = `${username}_${operation}_progress`;
    await removeItem(PROGRESS_STORE, storageKey);
  } catch (error) {
    console.error('Failed to clear operation progress from IndexedDB:', error);
  }
};

/**
 * Save analysis results to IndexedDB
 */
export const saveAnalysisResults = async (
  username: string, 
  analysisResult: FollowerAnalysisResult
): Promise<void> => {
  try {
    const timestamp = Date.now();
    const key = `analysis_${username}`;
    
    // Create a data object with metadata
    const dataToStore = {
      key,
      username,
      timestamp,
      result: analysisResult
    };
    
    const db = await initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(ANALYSIS_STORE, 'readwrite');
      const store = transaction.objectStore(ANALYSIS_STORE);
      const request = store.put(dataToStore);
      
      request.onsuccess = () => {
        console.log(`Analysis results saved for ${username} at ${new Date(timestamp).toLocaleString()}`);
        resolve();
        db.close();
      };
      
      request.onerror = (event) => {
        console.error('Error saving analysis results:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
        db.close();
      };
    });
  } catch (error) {
    console.error('Failed to save analysis results:', error);
    throw error;
  }
};

/**
 * Get saved analysis results from IndexedDB
 * @param username The username to get analysis for
 * @param maxAge Optional maximum age in milliseconds (default 1 hour)
 * @returns The analysis result or null if not found or too old
 */
export const getAnalysisResults = async (
  username: string,
  maxAge: number = 60 * 60 * 1000 // Default to 1 hour
): Promise<{ result: FollowerAnalysisResult, timestamp: number } | null> => {
  try {
    const key = `analysis_${username}`;
    const db = await initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(ANALYSIS_STORE, 'readonly');
      const store = transaction.objectStore(ANALYSIS_STORE);
      const request = store.get(key);
      
      request.onsuccess = (event) => {
        const data = (event.target as IDBRequest).result;
        
        if (data) {
          // Check if data is fresh enough based on maxAge
          const isDataFresh = (Date.now() - data.timestamp) < maxAge;
          
          if (isDataFresh) {
            console.log(`Using cached analysis results for ${username} from ${new Date(data.timestamp).toLocaleString()}`);
            resolve({ result: data.result, timestamp: data.timestamp });
          } else {
            console.log(`Cached analysis results for ${username} are too old (${new Date(data.timestamp).toLocaleString()})`);
            resolve(null);
          }
        } else {
          resolve(null);
        }
        
        db.close();
      };
      
      request.onerror = (event) => {
        console.error('Error getting analysis results:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
        db.close();
      };
    });
  } catch (error) {
    console.error('Failed to get analysis results:', error);
    return null;
  }
};

/**
 * Clear saved analysis results for a user
 */
export const clearAnalysisResults = async (username: string): Promise<void> => {
  try {
    const key = `analysis_${username}`;
    await removeItem(ANALYSIS_STORE, key);
  } catch (error) {
    console.error('Failed to clear analysis results:', error);
  }
}; 