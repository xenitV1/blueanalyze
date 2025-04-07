import axios from 'axios';

// Token yönetimi için yardımcı fonksiyonlar
/**
 * Token yaşını kontrol eden yardımcı fonksiyon
 * JWT token'dan bilgileri çıkarır ve oluşturulma zamanını döndürür
 */
export const getTokenAge = (token: string): number => {
  try {
    // Token formatı: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) return Infinity;
    
    // Payload'ı decode et
    const payload = JSON.parse(atob(parts[1]));
    
    // iat (issued at) veya benzer bir zaman damgası varsa kullan
    if (payload.exp) {
      // Token'ın ne kadar süredir var olduğunu hesapla (milisaniye)
      const expiresAt = payload.exp * 1000; // Unix timestamp'i milisaniyeye çevir
      const currentTime = Date.now();
      return expiresAt - currentTime; // Kalan süre (milisaniye)
    }
    
    return Infinity; // Zaman bilgisi yoksa sonsuz kabul et
  } catch (error) {
    console.error('Token yaşı hesaplanamadı:', error);
    return Infinity; // Hata durumunda sonsuz kabul et
  }
};

/**
 * Token'ın hala geçerli olup olmadığını kontrol eder
 */
export const isTokenValid = (token: string): boolean => {
  // Token'ın kalan ömrünü kontrol et (15 dakikadan fazla ise geçerli say)
  const remainingTime = getTokenAge(token);
  return remainingTime > 15 * 60 * 1000; // 15 dakikadan fazla süresi kaldıysa geçerli
};

/**
 * Oturum bilgilerini localStorage'a kaydeder
 */
export const saveSession = (username: string, session: AuthResponse) => {
  try {
    localStorage.setItem(`blueAnalyze_username`, username);
    localStorage.setItem(`blueAnalyze_accessJwt`, session.accessJwt);
    localStorage.setItem(`blueAnalyze_refreshJwt`, session.refreshJwt);
    localStorage.setItem(`blueAnalyze_did`, session.did);
    // Token süresinin dolacağı zamanı (yaklaşık 2 saat sonra - Bluesky API standardı)
    const expiryTime = Date.now() + 2 * 60 * 60 * 1000;
    localStorage.setItem(`blueAnalyze_tokenExpiry`, expiryTime.toString());
  } catch (error) {
    console.error('Oturum bilgileri kaydedilemedi:', error);
  }
};

/**
 * Kaydedilmiş oturum bilgilerini getirir
 */
export const getSession = (): { username: string, accessJwt: string, refreshJwt: string, did: string, tokenExpiry: number } | null => {
  try {
    const username = localStorage.getItem(`blueAnalyze_username`);
    const accessJwt = localStorage.getItem(`blueAnalyze_accessJwt`);
    const refreshJwt = localStorage.getItem(`blueAnalyze_refreshJwt`);
    const did = localStorage.getItem(`blueAnalyze_did`);
    const tokenExpiryStr = localStorage.getItem(`blueAnalyze_tokenExpiry`);
    
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
    console.error('Oturum bilgileri alınamadı:', error);
    return null;
  }
};

/**
 * Kaydedilmiş oturum bilgilerinin hala geçerli olup olmadığını kontrol eder
 * Geçerliyse kaydedilmiş tokenları döndürür, değilse refresh token ile yeni token alır
 */
export const validateSession = async (): Promise<{ accessJwt: string, did: string } | null> => {
  const session = getSession();
  if (!session) return null;
  
  // Token hala geçerliyse (15 dakikadan fazla kalmışsa) doğrudan döndür
  if (Date.now() < session.tokenExpiry - 15 * 60 * 1000) {
    return {
      accessJwt: session.accessJwt,
      did: session.did
    };
  }
  
  // Token geçersizse veya yakında sona erecekse yenile
  try {
    const refreshedSession = await refreshSession(session.refreshJwt);
    if (refreshedSession) {
      // Yeni oturum bilgilerini kaydet ve güncellenen tokenları döndür
      saveSession(session.username, refreshedSession);
      return {
        accessJwt: refreshedSession.accessJwt,
        did: refreshedSession.did
      };
    }
  } catch (error) {
    console.error('Token yenilenirken hata oluştu:', error);
    // Refresh token da geçersiz olabilir, oturumu tamamen temizle
    clearSession();
  }
  
  return null;
};

/**
 * Kaydedilmiş oturumu temizler
 */
export const clearSession = () => {
  localStorage.removeItem(`blueAnalyze_username`);
  localStorage.removeItem(`blueAnalyze_accessJwt`);
  localStorage.removeItem(`blueAnalyze_refreshJwt`);
  localStorage.removeItem(`blueAnalyze_did`);
  localStorage.removeItem(`blueAnalyze_tokenExpiry`);
};

/**
 * Refresh token kullanarak yeni bir access token almak için API'yi çağırır
 */
export const refreshSession = async (refreshJwt: string): Promise<AuthResponse | null> => {
  try {
    const response = await axios.post(`${AUTH_URL}/xrpc/com.atproto.server.refreshSession`, 
      {}, // Body boş olabilir çünkü token header'da gönderiliyor
      {
        headers: {
          'Authorization': `Bearer ${refreshJwt}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Session yenileme hatası:', error);
    return null;
  }
};

/**
 * İşlem durumunu localStorage'a kaydeden fonksiyon
 */
export const saveOperationProgress = (
  operation: string, 
  username: string, 
  currentIndex: number, 
  totalItems: number,
  itemList: any[]
): void => {
  try {
    // İşlem anahtarını oluştur
    const storageKey = `${username}_${operation}_progress`;
    
    // İşlem durumunu kaydet - daha az veri kullanarak
    const progressData = {
      currentIndex,
      totalItems,
      timestamp: Date.now(),
      // Kalan öğelerin tam listesini saklamak yerine, sadece indeksi sakla
      // Eğer kalan öğelerin DID'lerini saklamak gerekiyorsa, sayıyı sınırla (100 yerine 20)
      remainingIds: itemList.slice(currentIndex, Math.min(currentIndex + 20, itemList.length)).map(item => item.did)
    };
    
    try {
      // Önce mevcut localStorage kullanımını kontrol et 
      const serializedData = JSON.stringify(progressData);
      if (serializedData.length > 500000) { // 500KB civarı bir limit
        console.warn('İşlem durumu verisi çok büyük, remainingIds kaldırılıyor');
        // Büyük verileri kaldır
        progressData.remainingIds = [];
      }
      
      localStorage.setItem(storageKey, JSON.stringify(progressData));
    } catch (storageError) {
      // Eğer quota aşıldıysa, daha az veri saklamayı dene
      console.warn('Storage quota aşıldı, daha az veri saklanıyor', storageError);
      
      // TypeScript uyumlu şekilde boş array olarak ayarla
      progressData.remainingIds = [];
      
      try {
        localStorage.setItem(storageKey, JSON.stringify(progressData));
      } catch (finalError) {
        // Son bir deneme daha başarısız olursa, sadece indeksi sakla
        console.error('LocalStorage kaydetme tamamen başarısız oldu, işlem durumu kaydedilemeyecek', finalError);
      }
    }
  } catch (error) {
    console.error('İşlem durumu kaydedilemedi:', error);
  }
};

/**
 * Kaydedilmiş işlem durumunu getiren fonksiyon
 */
export const getOperationProgress = (
  operation: string, 
  username: string
): { currentIndex: number, totalItems: number, timestamp: number, remainingIds: string[] } | null => {
  try {
    // İşlem anahtarını oluştur
    const storageKey = `${username}_${operation}_progress`;
    
    // İşlem durumunu oku
    const savedProgress = localStorage.getItem(storageKey);
    if (!savedProgress) return null;
    
    return JSON.parse(savedProgress);
  } catch (error) {
    console.error('İşlem durumu alınamadı:', error);
    return null;
  }
};

/**
 * İşlemin tamamlandığını işaretleyerek ilerleme bilgisini temizler
 */
export const clearOperationProgress = (
  operation: string, 
  username: string
): void => {
  try {
    // İşlem anahtarını oluştur
    const storageKey = `${username}_${operation}_progress`;
    
    // İşlem durumunu temizle
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.error('İşlem durumu temizlenemedi:', error);
  }
};

// API endpoint urls
const BASE_URL = 'https://public.api.bsky.app';
const AUTH_URL = 'https://bsky.social';
const FOLLOWERS_ENDPOINT = '/xrpc/app.bsky.graph.getFollowers';
const FOLLOWING_ENDPOINT = '/xrpc/app.bsky.graph.getFollows';
const CREATE_SESSION_ENDPOINT = '/xrpc/com.atproto.server.createSession';
const UNFOLLOW_ENDPOINT = '/xrpc/app.bsky.graph.unfollow';
const SEARCH_USERS_ENDPOINT = '/xrpc/app.bsky.actor.searchActors'; // Kullanıcı arama endpoint'i

// Types
export interface BlueSkyUser {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  description?: string;
  indexedAt?: string;
  followersCount?: number;
  followsCount?: number;
}

export interface FollowersResponse {
  followers: BlueSkyUser[];
  subject: BlueSkyUser;
  cursor?: string;
}

export interface FollowingResponse {
  follows: BlueSkyUser[];
  subject: BlueSkyUser;
  cursor?: string;
}

export interface FollowerAnalysisResult {
  notFollowingBack: BlueSkyUser[];
  notFollowedBack: BlueSkyUser[];
  mutuals: BlueSkyUser[];
  followerCount: number;
  followingCount: number;
}

export interface AuthResponse {
  accessJwt: string;
  refreshJwt: string;
  handle: string;
  did: string;
  email?: string;
  emailConfirmed?: boolean;
}

export interface DebugInfo {
  error: boolean;
  status?: number;
  message: string;
  details?: any;
}

/**
 * Authenticate user and get session tokens
 */
export const authenticateUser = async (handle: string, password: string): Promise<AuthResponse> => {
  const MAX_RETRIES = 3;
  let retryCount = 0;
  let lastError = null;

  while (retryCount <= MAX_RETRIES) {
    try {
      console.log(`Authentication attempt ${retryCount + 1}/${MAX_RETRIES + 1} for user: ${handle}`);
      
      // Normalize handle format if needed (remove @ if present)
      const normalizedHandle = handle.startsWith('@') ? handle.substring(1) : handle;
      
      // Ensure the handle has .bsky.social if no domain is specified
      const formattedHandle = normalizedHandle.includes('.') 
        ? normalizedHandle 
        : `${normalizedHandle}.bsky.social`;
      
      console.log(`Using formatted handle: ${formattedHandle}`);
      
      const response = await axios.post(`${AUTH_URL}${CREATE_SESSION_ENDPOINT}`, {
        identifier: formattedHandle,
        password: password
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 15000 // 15 second timeout
      });
      
      console.log('Authentication successful');
      return response.data;
    } catch (error) {
      lastError = error;
      console.error('Authentication error:', error);
      
      // Handle specific error cases
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const errorData = error.response?.data;
        
        // Format detailed error message
        let errorMessage = 'Failed to authenticate.';
        
        if (status === 400) {
          // Bad Request - typically incorrect credentials
          errorMessage = 'Invalid username or password. If using an App Password, verify it was entered correctly.';
          
          // Check for specific error message in response
          if (errorData && errorData.error) {
            console.log('API error details:', errorData);
            
            if (errorData.error === 'InvalidPassword') {
              errorMessage = 'Incorrect password. Remember to use an App Password, not your main account password.';
            } else if (errorData.error === 'AccountNotFound') {
              errorMessage = 'Account not found. Check your username and try again.';
            } else {
              errorMessage = `Authentication failed: ${errorData.error || errorData.message || 'Unknown error'}`;
            }
          }
          
          // Don't retry for credential errors
          throw new Error(errorMessage);
        } else if (status === 429) {
          // Rate limit error
          errorMessage = 'Too many login attempts. Please wait a few minutes and try again.';
          throw new Error(errorMessage);
        } else if (status === 500 || status === 502 || status === 503 || status === 504) {
          // Server errors - good candidates for retry
          errorMessage = `Server error (${status}). Retrying...`;
          console.log(errorMessage);
          
          // Wait before retry with exponential backoff
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            const delay = 1000 * Math.pow(2, retryCount) + Math.floor(Math.random() * 1000);
            console.log(`Waiting ${delay}ms before retry ${retryCount}`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        } else if (!status) {
          // Network error
          errorMessage = 'Network error. Please check your internet connection.';
          
          // Retry for network errors
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            const delay = 1000 * retryCount + Math.floor(Math.random() * 500);
            console.log(`Network issue, waiting ${delay}ms before retry ${retryCount}`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        // Throw the detailed error if we get here
        throw new Error(errorMessage);
      }
      
      // If retries are left, continue
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        const delay = 1000 * retryCount;
        console.log(`Unexpected error, waiting ${delay}ms before retry ${retryCount}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If we've used all retries or it's not a retryable error
      throw new Error('Failed to authenticate after multiple attempts. Please try again later or check your credentials.');
    }
  }
  
  // This should not be reached, but just in case
  throw lastError || new Error('Authentication failed due to an unknown error.');
};

/**
 * Unfollow a user with detailed debug info
 */
export const unfollowUser = async (
  token: string, 
  userDid: string,
  signal?: AbortSignal
): Promise<{success: boolean, debug: DebugInfo}> => {
  const debugInfo: DebugInfo = {
    error: false,
    message: 'Success'
  };
  
  // Add retry logic for 500/502 errors
  const MAX_RETRIES = 5; // Increased from 3 to 5 for longer backoff
  let retryCount = 0;
  
  while (retryCount <= MAX_RETRIES) {
    try {
      // İptal edildi mi kontrol et
      if (signal?.aborted) {
        debugInfo.error = true;
        debugInfo.message = 'Operation was canceled by the user';
        return { success: false, debug: debugInfo };
      }
      
      // First, we need to find the follow record to delete
      console.log(`Finding follow record for user: ${userDid}${retryCount > 0 ? ` (Retry ${retryCount}/${MAX_RETRIES})` : ''}`);
      
      const auth = token.split('.');
      let did = '';
      
      // Extract DID from JWT token
      if (auth.length > 1) {
        try {
          const payload = JSON.parse(atob(auth[1]));
          did = payload.sub;
          console.log(`Authenticated user DID: ${did}`);
          
          // Check token expiration
          if (payload.exp && payload.exp * 1000 < Date.now()) {
            debugInfo.error = true;
            debugInfo.message = 'Auth token has expired';
            return { success: false, debug: debugInfo };
          }
        } catch (e) {
          console.error('Failed to parse JWT token', e);
          debugInfo.error = true;
          debugInfo.message = 'Failed to parse authentication token';
          return { success: false, debug: debugInfo };
        }
      }
      
      if (!did) {
        debugInfo.error = true;
        debugInfo.message = 'Could not determine authenticated user DID from token';
        return { success: false, debug: debugInfo };
      }
      
      // Process pagination to find the follow record
      let cursor: string | undefined = undefined;
      let followRecord = null;
      let pageCount = 0;
      const MAX_PAGES = 10; // Limit to avoid infinite loops
      
      // Keep fetching pages until we find the record or run out of pages
      while (pageCount < MAX_PAGES) {
        // İptal edildi mi kontrol et
        if (signal?.aborted) {
          debugInfo.error = true;
          debugInfo.message = 'Operation was canceled by the user';
          return { success: false, debug: debugInfo };
        }
        
        pageCount++;
        console.log(`Fetching follow records page ${pageCount}${cursor ? ' with cursor' : ''}`);
        
        // Get list of follows to find the specific record - Using AUTH_URL instead of BASE_URL
        console.log(`Using endpoint: ${AUTH_URL}/xrpc/com.atproto.repo.listRecords`);
        const followsResponse: { data: { records: any[], cursor?: string } } = await axios.get(
          `${AUTH_URL}/xrpc/com.atproto.repo.listRecords`, 
          {
            params: {
              repo: did,
              collection: 'app.bsky.graph.follow',
              limit: 100,
              cursor: cursor
            },
            headers: {
              'Authorization': `Bearer ${token}`
            },
            // Signal'i ekle
            signal: signal
          }
        );
        
        // Check if records exist in response
        if (!followsResponse.data.records || followsResponse.data.records.length === 0) {
          break; // No more records to check
        }
        
        // Find the specific follow record for the target user
        followRecord = followsResponse.data.records.find(
          (record: any) => record.value.subject === userDid
        );
        
        if (followRecord) {
          console.log(`Found follow record on page ${pageCount}`);
          break; // Found what we need, exit the loop
        }
        
        // Get cursor for next page
        cursor = followsResponse.data.cursor;
        if (!cursor) {
          console.log('No more pages available');
          break; // No more pages
        }
      }
      
      if (!followRecord) {
        debugInfo.error = true;
        debugInfo.message = `Follow record not found for user ${userDid} after checking ${pageCount} pages`;
        return { success: false, debug: debugInfo };
      }
      
      // Extract rkey from URI (format: at://did:plc:xxx/app.bsky.graph.follow/RKEY)
      const uri = followRecord.uri;
      console.log(`Found follow record with URI: ${uri}`);
      
      // The rkey is the last part of the URI after the last slash
      const rkey = uri.split('/').pop();
      
      if (!rkey) {
        debugInfo.error = true;
        debugInfo.message = 'Could not extract rkey from URI';
        return { success: false, debug: debugInfo };
      }
      
      console.log(`Extracted rkey: ${rkey} from URI: ${uri}`);
      
      // Delete the follow record using com.atproto.repo.deleteRecord
      console.log(`Attempting to unfollow user by deleting record: ${rkey}`);
      console.log(`Using endpoint: ${AUTH_URL}/xrpc/com.atproto.repo.deleteRecord`);
      
      try {
        // İptal edildi mi kontrol et
        if (signal?.aborted) {
          debugInfo.error = true;
          debugInfo.message = 'Operation was canceled by the user';
          return { success: false, debug: debugInfo };
        }
        
        const response = await axios.post(`${AUTH_URL}/xrpc/com.atproto.repo.deleteRecord`, 
          {
            repo: did,
            collection: 'app.bsky.graph.follow',
            rkey: rkey
          },
          { 
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            // Signal'i ekle
            signal: signal
          }
        );
        
        console.log('Unfollow response status:', response.status);
        debugInfo.status = response.status;
        
        return { success: true, debug: debugInfo };
      } catch (deleteError: any) {
        // İptal edildi mi kontrol et
        if (deleteError.name === 'AbortError' || deleteError.message === 'canceled') {
          debugInfo.error = true;
          debugInfo.message = 'Operation was canceled by the user';
          return { success: false, debug: debugInfo };
        }
        
        if (axios.isAxiosError(deleteError) && (deleteError.response?.status === 500 || deleteError.response?.status === 502)) {
          // If we get a 500 or 502 error, wait and retry
          const errorStatus = deleteError.response?.status;
          console.log(`Received ${errorStatus} error on deleteRecord, retrying (${retryCount + 1}/${MAX_RETRIES})`);
          retryCount++;
          
          if (retryCount <= MAX_RETRIES) {
            // Wait a bit before retrying (exponential backoff with jitter)
            const baseDelay = 1000 * Math.pow(2, retryCount - 1);
            // Add jitter - random value between 0 and 30% of the base delay
            const jitter = Math.floor(Math.random() * (0.3 * baseDelay));
            const delay = baseDelay + jitter;
            
            console.log(`Waiting ${delay}ms before retry with jitter`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue; // Retry the entire operation
          }
        }
        
        // If it's not a 500/502 error or we've exhausted retries, throw to be caught by outer catch
        throw deleteError;
      }
    } catch (error: any) {
      // İptal edildi mi kontrol et
      if (error.name === 'AbortError' || error.message === 'canceled') {
        debugInfo.error = true;
        debugInfo.message = 'Operation was canceled by the user';
        return { success: false, debug: debugInfo };
      }
      
      if (axios.isAxiosError(error) && (error.response?.status === 500 || error.response?.status === 502) && retryCount < MAX_RETRIES) {
        // If we get a 500 or 502 error and have retries left, try again
        const errorStatus = error.response?.status;
        console.log(`Received ${errorStatus} error, retrying (${retryCount + 1}/${MAX_RETRIES})`);
        retryCount++;
        
        // Wait a bit before retrying (exponential backoff with jitter)
        const baseDelay = 1000 * Math.pow(2, retryCount - 1);
        // Add jitter - random value between 0 and 30% of the base delay
        const jitter = Math.floor(Math.random() * (0.3 * baseDelay));
        const delay = baseDelay + jitter;
        
        console.log(`Waiting ${delay}ms before retry with jitter`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      debugInfo.error = true;
      
      if (axios.isAxiosError(error)) {
        debugInfo.status = error.response?.status;
        debugInfo.message = error.message;
        
        if (error.response) {
          // Server responded with a status code outside of 2xx range
          debugInfo.details = {
            status: error.response.status,
            data: error.response.data,
            headers: error.response.headers
          };
          console.error('API Error response:', error.response.status, error.response.data);
          
          // Check for token expiration in response
          if (error.response.status === 401) {
            debugInfo.message = 'Authentication token has expired or is invalid';
          }
        } else if (error.request) {
          // Request was made but no response received
          debugInfo.details = {
            request: 'Request was made but no response was received'
          };
          console.error('No response received:', error.request);
        } else {
          // Something else happened while setting up the request
          debugInfo.details = {
            message: error.message
          };
          console.error('Error setting up request:', error.message);
        }
      } else {
        // Non-Axios error
        debugInfo.message = error instanceof Error ? error.message : 'Unknown error';
        debugInfo.details = error;
        console.error('Non-axios error:', error);
      }
      
      return { success: false, debug: debugInfo };
    }
  }
  
  // If we get here, we've exhausted retries
  debugInfo.error = true;
  debugInfo.message = `Failed to unfollow user after ${MAX_RETRIES} retries`;
  return { success: false, debug: debugInfo };
};

/**
 * İlerleme takibi yapabilen unfollow fonksiyonu
 * Token süresi dolduğunda işlemi durdurup daha sonra kaldığı yerden devam etme imkanı sağlar
 */
export const batchUnfollowUsersWithProgress = async (
  handle: string, 
  password: string | null, 
  users: BlueSkyUser[], 
  startIndex: number = 0,
  onProgress?: (completed: number, total: number, lastError?: DebugInfo) => void,
  signal?: AbortSignal
): Promise<{success: number, failed: number, errors: DebugInfo[], lastProcessedIndex: number}> => {
  try {
    // First authenticate
    let authResponse;
    // Eğer şifre verilmediyse mevcut oturumu kullan
    if (!password) {
      const session = await validateSession();
      if (!session) {
        throw new Error('No active session and no password provided');
      }
      authResponse = {
        accessJwt: session.accessJwt,
        did: session.did,
        handle: handle
      };
    } else {
      authResponse = await authenticateUser(handle, password);
    }
    
    console.log('Authentication successful', authResponse.handle);
    
    // Başlangıç durumunu callback ile bildir
    if (onProgress) {
      onProgress(startIndex, users.length);
    }
    
    let successCount = 0;
    let failedCount = 0;
    const total = users.length;
    const errors: DebugInfo[] = [];
    let lastProcessedIndex = startIndex;
    
    // İptal edilip edilmediğini kontrol et
    if (signal?.aborted) {
      console.log('Request was already aborted');
      throw new Error('canceled');
    }
    
    // AbortSignal eventListener ekle
    if (signal) {
      signal.addEventListener('abort', () => {
        console.log('Abort signal received in batchUnfollowUsersWithProgress');
      });
    }
    
    // Break into smaller chunks to avoid rate limiting (iş parçalama)
    const CHUNK_SIZE = 5; // Process in chunks of 5 users
    const chunks = [];
    
    // Split users into chunks, starting from the startIndex
    for (let i = startIndex; i < users.length; i += CHUNK_SIZE) {
      chunks.push(users.slice(i, i + CHUNK_SIZE));
    }
    
    console.log(`Processing ${users.length - startIndex} remaining users in ${chunks.length} chunks of ${CHUNK_SIZE}`);
    
    let completedUsers = startIndex;
    
    // Process each chunk
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      // İptal edildi mi kontrol et
      if (signal?.aborted) {
        console.log('Operation was aborted during chunk processing');
        throw new Error('canceled');
      }
      
      const chunk = chunks[chunkIndex];
      console.log(`Processing chunk ${chunkIndex + 1}/${chunks.length} with ${chunk.length} users`);
      
      // Token süresini kontrol et
      if (!isTokenValid(authResponse.accessJwt)) {
        console.log('Token süresi dolmak üzere, işlem duraklatıldı');
        
        // İşlem durumunu kaydet
        saveOperationProgress('unfollow', handle, completedUsers, total, users);
        
        // Token süresi hatası oluştur
        const tokenError: DebugInfo = {
          error: true,
          message: 'Authentication token is about to expire, operation paused'
        };
        errors.push(tokenError);
        
        // Callback ile bildir
        if (onProgress) {
          onProgress(completedUsers, total, tokenError);
        }
        
        return {
          success: successCount,
          failed: failedCount,
          errors,
          lastProcessedIndex: completedUsers
        };
      }
      
      // Process users in this chunk with a queue
      for (let i = 0; i < chunk.length; i++) {
        // Her kullanıcı işlemi öncesi iptal edildi mi kontrol et
        if (signal?.aborted) {
          console.log('Operation was aborted during user processing');
          throw new Error('canceled');
        }
        
        const user = chunk[i];
        console.log(`Unfollowing user ${completedUsers + 1}/${total}: ${user.handle}`);
        
        try {
          // Signal parametresini unfollowUser'a da geçir
          const { success, debug } = await unfollowUser(authResponse.accessJwt, user.did, signal);
          
          if (success) {
            successCount++;
            console.log(`Successfully unfollowed user: ${user.handle}`);
          } else {
            failedCount++;
            errors.push(debug);
            console.warn(`Failed to unfollow user: ${user.handle}, reason: ${debug.message}`);
            
            // Only keep last 5 errors to avoid excessive memory usage
            if (errors.length > 5) {
              errors.shift();
            }
            
            // Token süresi dolduysa işlemi durdur
            if (debug.message === 'Auth token has expired' || debug.message === 'Authentication token has expired or is invalid') {
              console.log('Token süresi doldu, işlem duraklatıldı');
              // İşlem durumunu kaydet
              saveOperationProgress('unfollow', handle, completedUsers, total, users);
              
              // Callback ile bildir
              if (onProgress) {
                onProgress(completedUsers, total, debug);
              }
              
              return {
                success: successCount,
                failed: failedCount,
                errors,
                lastProcessedIndex: completedUsers
              };
            }
          }
          
          lastProcessedIndex = completedUsers;
          completedUsers++;
          
          // Call progress callback
          if (onProgress) {
            // Başarılı olsa da olmasa da güncel durumu bildir
            onProgress(completedUsers, total, debug.error ? debug : undefined);
          }
        } catch (userError: any) {
          // İptal edilme durumunu kontrol et
          if (userError.name === 'AbortError' || userError.message === 'canceled') {
            console.log('User operation was aborted');
            throw userError; // Hatayı yukarı fırlat
          }
          
          // Beklenmeyen hata durumunda da işlemi devam ettir
          failedCount++;
          
          const errorDebug: DebugInfo = {
            error: true,
            message: userError instanceof Error ? userError.message : 'Unknown error during unfollow operation',
            details: userError
          };
          
          errors.push(errorDebug);
          console.error(`Exception while unfollowing user ${user.handle}:`, userError);
          
          // Only keep last 5 errors to avoid excessive memory usage
          if (errors.length > 5) {
            errors.shift();
          }
          
          // İşleme devam et ama hata bilgisini callback'e bildir
          lastProcessedIndex = completedUsers;
          completedUsers++;
          
          if (onProgress) {
            onProgress(completedUsers, total, errorDebug);
          }
        }
        
        // İşlem durumunu düzenli olarak kaydet (her 10 kullanıcıda bir)
        if (completedUsers % 10 === 0) {
          saveOperationProgress('unfollow', handle, completedUsers, total, users);
        }
        
        // Add a delay with jitter between each user in the chunk
        if (i < chunk.length - 1 && !signal?.aborted) {
          // Base delay of 500ms plus random jitter between 0-300ms
          const delay = 500 + Math.floor(Math.random() * 300);
          console.log(`Waiting ${delay}ms before next user in chunk`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      // Add a longer delay between chunks with jitter
      if (chunkIndex < chunks.length - 1 && !signal?.aborted) {
        // Longer delay between chunks (2-3 seconds)
        const chunkDelay = 2000 + Math.floor(Math.random() * 1000);
        console.log(`Completed chunk ${chunkIndex + 1}/${chunks.length}. Waiting ${chunkDelay}ms before next chunk`);
        await new Promise(resolve => setTimeout(resolve, chunkDelay));
      }
    }
    
    console.log(`Batch unfollow completed - Success: ${successCount}, Failed: ${failedCount}`);
    
    // İşlem tamamlandı, ilerleme bilgisini temizle
    clearOperationProgress('unfollow', handle);
    
    // Final callback
    if (onProgress) {
      onProgress(completedUsers, total);
    }
    
    return {
      success: successCount,
      failed: failedCount,
      errors,
      lastProcessedIndex: completedUsers
    };
  } catch (error: any) {
    console.error('Error in batch unfollow operation:', error);
    
    // İptal edildi mi kontrol et
    if (error.name === 'AbortError' || error.message === 'canceled') {
      console.log('Batch unfollow operation was aborted by the user');
      
      // İptal bilgisini callback'e bildir
      if (onProgress) {
        const abortInfo: DebugInfo = {
          error: true,
          message: 'Operation was canceled by the user',
          details: { aborted: true }
        };
        onProgress(startIndex, users.length, abortInfo);
      }
    } else {
      // Ana hata durumunda callback fonksiyonunu çağır
      if (onProgress) {
        const errorInfo: DebugInfo = {
          error: true,
          message: error instanceof Error ? error.message : 'Unknown batch unfollow error',
          details: error
        };
        onProgress(startIndex, users.length, errorInfo);
      }
    }
    
    throw error;
  }
};

/**
 * İlerleme takibi yapabilen follow fonksiyonu
 * Token süresi dolduğunda işlemi durdurup daha sonra kaldığı yerden devam etme imkanı sağlar
 */
export const batchFollowUsersWithProgress = async (
  handle: string, 
  password: string | null, 
  users: BlueSkyUser[], 
  startIndex: number = 0,
  onProgress?: (completed: number, total: number, lastError?: DebugInfo) => void
): Promise<{success: number, failed: number, errors: DebugInfo[], lastProcessedIndex: number}> => {
  try {
    // First authenticate
    let authResponse;
    // Eğer şifre verilmediyse mevcut oturumu kullan
    if (!password) {
      const session = await validateSession();
      if (!session) {
        throw new Error('No active session and no password provided');
      }
      authResponse = {
        accessJwt: session.accessJwt,
        did: session.did,
        handle: handle
      };
    } else {
      authResponse = await authenticateUser(handle, password);
    }
    
    console.log('Authentication successful', authResponse.handle);
    
    let successCount = 0;
    let failedCount = 0;
    const total = users.length;
    const errors: DebugInfo[] = [];
    let lastProcessedIndex = startIndex;
    
    // Break into smaller chunks to avoid rate limiting (iş parçalama)
    const CHUNK_SIZE = 3; // Process in chunks of 3 users
    const chunks = [];
    
    // Split users into chunks, starting from the startIndex
    for (let i = startIndex; i < users.length; i += CHUNK_SIZE) {
      chunks.push(users.slice(i, i + CHUNK_SIZE));
    }
    
    console.log(`Processing ${users.length - startIndex} remaining users in ${chunks.length} chunks of ${CHUNK_SIZE}`);
    
    let completedUsers = startIndex;
    
    // Process each chunk
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      console.log(`Processing chunk ${chunkIndex + 1}/${chunks.length} with ${chunk.length} users`);
      
      // Token süresini kontrol et
      if (!isTokenValid(authResponse.accessJwt)) {
        console.log('Token süresi dolmak üzere, işlem duraklatıldı');
        // İşlem durumunu kaydet
        saveOperationProgress('follow', handle, completedUsers, total, users);
        return {
          success: successCount,
          failed: failedCount,
          errors,
          lastProcessedIndex: completedUsers
        };
      }
      
      // Process users in this chunk with a queue
      for (let i = 0; i < chunk.length; i++) {
        const user = chunk[i];
        console.log(`Following user ${completedUsers + 1}/${total}: ${user.handle}`);
        
        const { success, debug } = await followUser(authResponse.accessJwt, user.did);
        
        if (success) {
          successCount++;
        } else {
          // Don't count "already following" as a failure
          if (debug.message === 'Already following this user') {
            console.log(`Already following user: ${user.handle}`);
            successCount++;
          } else {
            failedCount++;
            errors.push(debug);
            
            // Only keep last 5 errors to avoid excessive memory usage
            if (errors.length > 5) {
              errors.shift();
            }
            
            // Token süresi dolduysa işlemi durdur
            if (debug.message === 'Auth token has expired' || debug.message === 'Authentication token has expired or is invalid') {
              console.log('Token süresi doldu, işlem duraklatıldı');
              // İşlem durumunu kaydet
              saveOperationProgress('follow', handle, completedUsers, total, users);
              return {
                success: successCount,
                failed: failedCount,
                errors,
                lastProcessedIndex: completedUsers
              };
            }
          }
        }
        
        lastProcessedIndex = completedUsers;
        completedUsers++;
        
        // Call progress callback
        if (onProgress) {
          onProgress(completedUsers, total, debug.error ? debug : undefined);
        }
        
        // İşlem durumunu düzenli olarak kaydet (her 10 kullanıcıda bir)
        if (completedUsers % 10 === 0) {
          saveOperationProgress('follow', handle, completedUsers, total, users);
        }
        
        // Add a longer delay with jitter between each follow (500-800ms)
        // This helps avoid being flagged as automated/spam behavior
        if (i < chunk.length - 1) {
          const delay = 500 + Math.floor(Math.random() * 300);
          console.log(`Waiting ${delay}ms before next user in chunk`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      // Add a much longer delay between chunks with jitter (3-5 seconds)
      // This is crucial to avoid triggering spam detection
      if (chunkIndex < chunks.length - 1) {
        const chunkDelay = 3000 + Math.floor(Math.random() * 2000);
        console.log(`Completed chunk ${chunkIndex + 1}/${chunks.length}. Waiting ${chunkDelay}ms before next chunk`);
        await new Promise(resolve => setTimeout(resolve, chunkDelay));
      }
    }
    
    console.log(`Batch follow completed - Success: ${successCount}, Failed: ${failedCount}`);
    
    // İşlem tamamlandı, ilerleme bilgisini temizle
    clearOperationProgress('follow', handle);
    
    return {
      success: successCount,
      failed: failedCount,
      errors,
      lastProcessedIndex: completedUsers
    };
  } catch (error) {
    console.error('Error in batch follow operation:', error);
    throw error;
  }
};

/**
 * Batch unfollow users - will unfollow users who don't follow back
 */
export const batchUnfollowUsers = async (
  handle: string, 
  password: string, 
  users: BlueSkyUser[], 
  onProgress?: (completed: number, total: number, lastError?: DebugInfo) => void
): Promise<{success: number, failed: number, errors: DebugInfo[]}> => {
  try {
    // First authenticate
    const authResponse = await authenticateUser(handle, password);
    console.log('Authentication successful', authResponse.handle);
    
    let successCount = 0;
    let failedCount = 0;
    const total = users.length;
    const errors: DebugInfo[] = [];
    
    // Break into smaller chunks to avoid rate limiting (iş parçalama)
    const CHUNK_SIZE = 5; // Process in chunks of 5 users
    const chunks = [];
    
    // Split users into chunks
    for (let i = 0; i < users.length; i += CHUNK_SIZE) {
      chunks.push(users.slice(i, i + CHUNK_SIZE));
    }
    
    console.log(`Processing ${users.length} users in ${chunks.length} chunks of ${CHUNK_SIZE}`);
    
    let completedUsers = 0;
    
    // Process each chunk
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      console.log(`Processing chunk ${chunkIndex + 1}/${chunks.length} with ${chunk.length} users`);
      
      // Process users in this chunk with a queue
      for (let i = 0; i < chunk.length; i++) {
        const user = chunk[i];
        console.log(`Unfollowing user ${completedUsers + 1}/${total}: ${user.handle}`);
        
        const { success, debug } = await unfollowUser(authResponse.accessJwt, user.did);
        
        if (success) {
          successCount++;
        } else {
          failedCount++;
          errors.push(debug);
          
          // Only keep last 5 errors to avoid excessive memory usage
          if (errors.length > 5) {
            errors.shift();
          }
        }
        
        completedUsers++;
        
        // Call progress callback
        if (onProgress) {
          onProgress(completedUsers, total, debug.error ? debug : undefined);
        }
        
        // Add a delay with jitter between each user in the chunk
        if (i < chunk.length - 1) {
          // Base delay of 500ms plus random jitter between 0-300ms
          const delay = 500 + Math.floor(Math.random() * 300);
          console.log(`Waiting ${delay}ms before next user in chunk`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      // Add a longer delay between chunks with jitter
      if (chunkIndex < chunks.length - 1) {
        // Longer delay between chunks (2-3 seconds)
        const chunkDelay = 2000 + Math.floor(Math.random() * 1000);
        console.log(`Completed chunk ${chunkIndex + 1}/${chunks.length}. Waiting ${chunkDelay}ms before next chunk`);
        await new Promise(resolve => setTimeout(resolve, chunkDelay));
      }
    }
    
    console.log(`Batch unfollow completed - Success: ${successCount}, Failed: ${failedCount}`);
    
    return {
      success: successCount,
      failed: failedCount,
      errors
    };
  } catch (error) {
    console.error('Error in batch unfollow operation:', error);
    throw error;
  }
};

/**
 * Get all followers for a user
 */
export const getAllFollowers = async (handle: string): Promise<BlueSkyUser[]> => {
  try {
    // Validate session for authenticated requests if available
    const session = await validateSession();
    
    const allFollowers: BlueSkyUser[] = [];
    let cursor: string | undefined = undefined;
    
    while (true) {
      // Make API request with auth token if available
      const response = session 
        ? await axios.get(`${BASE_URL}${FOLLOWERS_ENDPOINT}`, {
            params: {
              actor: handle,
              limit: 100,
              cursor,
            },
            headers: {
              'Authorization': `Bearer ${session.accessJwt}`
            }
          })
        : await axios.get(`${BASE_URL}${FOLLOWERS_ENDPOINT}`, {
            params: {
              actor: handle,
              limit: 100,
              cursor,
            }
          });
      
      const data: FollowersResponse = response.data;
      allFollowers.push(...data.followers);
      
      // If there's more data (cursor exists), continue fetching
      cursor = data.cursor;
      if (!cursor) break;
    }
    
    return allFollowers;
  } catch (error) {
    console.error('Error fetching followers:', error);
    throw error;
  }
};

/**
 * Get all following for a user
 */
export const getAllFollowing = async (handle: string): Promise<BlueSkyUser[]> => {
  try {
    // Validate session for authenticated requests if available
    const session = await validateSession();
    
    const allFollowing: BlueSkyUser[] = [];
    let cursor: string | undefined = undefined;
    
    while (true) {
      // Make API request with auth token if available
      const response = session 
        ? await axios.get(`${BASE_URL}${FOLLOWING_ENDPOINT}`, {
            params: {
              actor: handle,
              limit: 100,
              cursor,
            },
            headers: {
              'Authorization': `Bearer ${session.accessJwt}`
            }
          })
        : await axios.get(`${BASE_URL}${FOLLOWING_ENDPOINT}`, {
            params: {
              actor: handle,
              limit: 100,
              cursor,
            }
          });
      
      const data: FollowingResponse = response.data;
      allFollowing.push(...data.follows);
      
      // If there's more data (cursor exists), continue fetching
      cursor = data.cursor;
      if (!cursor) break;
    }
    
    return allFollowing;
  } catch (error) {
    console.error('Error fetching following:', error);
    throw error;
  }
};

/**
 * Analyze followers and following to find who doesn't follow back, who you don't follow back, and mutual follows
 */
export const analyzeFollowers = async (handle: string): Promise<FollowerAnalysisResult> => {
  try {
    // Öncelikle aktif bir oturum olup olmadığını kontrol et
    const session = await validateSession();
    
    // Takipçileri al
    const followers = await getAllFollowers(handle);
    
    // Takip edilenleri al
    const following = await getAllFollowing(handle);
    
    // Kimlerin takip etmediğini bul (sen takip ediyorsun ama onlar etmiyor)
    const notFollowingBack = following.filter(
      followingUser => !followers.some(follower => follower.did === followingUser.did)
    );
    
    // Kimi takip etmediğini bul (onlar seni takip ediyor ama sen etmiyorsun)
    const notFollowedBack = followers.filter(
      follower => !following.some(followingUser => followingUser.did === follower.did)
    );
    
    // Karşılıklı takipleştiğin kişileri bul
    const mutuals = followers.filter(
      follower => following.some(followingUser => followingUser.did === follower.did)
    );
    
    return {
      notFollowingBack,
      notFollowedBack,
      mutuals,
      followerCount: followers.length,
      followingCount: following.length
    };
  } catch (error) {
    console.error('Error analyzing followers:', error);
    throw error;
  }
};

/**
 * Follow a user with detailed debug info
 */
export const followUser = async (token: string, userDid: string): Promise<{success: boolean, debug: DebugInfo}> => {
  const debugInfo: DebugInfo = {
    error: false,
    message: 'Success'
  };
  
  // Add retry logic for 500/502 errors
  const MAX_RETRIES = 5;
  let retryCount = 0;
  
  while (retryCount <= MAX_RETRIES) {
    try {
      const auth = token.split('.');
      let did = '';
      
      // Extract DID from JWT token
      if (auth.length > 1) {
        try {
          const payload = JSON.parse(atob(auth[1]));
          did = payload.sub;
          console.log(`Authenticated user DID: ${did}`);
          
          // Check token expiration
          if (payload.exp && payload.exp * 1000 < Date.now()) {
            debugInfo.error = true;
            debugInfo.message = 'Auth token has expired';
            return { success: false, debug: debugInfo };
          }
        } catch (e) {
          console.error('Failed to parse JWT token', e);
          debugInfo.error = true;
          debugInfo.message = 'Failed to parse authentication token';
          return { success: false, debug: debugInfo };
        }
      }
      
      if (!did) {
        debugInfo.error = true;
        debugInfo.message = 'Could not determine authenticated user DID from token';
        return { success: false, debug: debugInfo };
      }
      
      // Create a follow record with com.atproto.repo.createRecord
      try {
        console.log(`Attempting to follow user: ${userDid}`);
        const now = new Date().toISOString();
        
        const followRecord = {
          $type: 'app.bsky.graph.follow',
          subject: userDid,
          createdAt: now
        };
        
        const response = await axios.post(
          `${AUTH_URL}/xrpc/com.atproto.repo.createRecord`,
          {
            repo: did,
            collection: 'app.bsky.graph.follow',
            record: followRecord
          },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log('Follow response status:', response.status);
        debugInfo.status = response.status;
        
        return { success: true, debug: debugInfo };
      } catch (followError) {
        if (axios.isAxiosError(followError) && (followError.response?.status === 500 || followError.response?.status === 502)) {
          // If we get a 500 or 502 error, wait and retry
          const errorStatus = followError.response?.status;
          console.log(`Received ${errorStatus} error on createRecord, retrying (${retryCount + 1}/${MAX_RETRIES})`);
          retryCount++;
          
          if (retryCount <= MAX_RETRIES) {
            // Wait a bit before retrying (exponential backoff with jitter)
            const baseDelay = 1000 * Math.pow(2, retryCount - 1);
            // Add jitter - random value between 0 and 30% of the base delay
            const jitter = Math.floor(Math.random() * (0.3 * baseDelay));
            const delay = baseDelay + jitter;
            
            console.log(`Waiting ${delay}ms before retry with jitter`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue; // Retry the entire operation
          }
        }
        
        // Check if the user is already being followed (duplicate follow)
        if (axios.isAxiosError(followError) && followError.response?.status === 400) {
          const errorData = followError.response?.data;
          if (errorData && errorData.error === 'InvalidRequest' && 
              errorData.message && errorData.message.includes('duplicate')) {
            debugInfo.error = true;
            debugInfo.message = 'Already following this user';
            debugInfo.status = 400;
            debugInfo.details = errorData;
            return { success: false, debug: debugInfo };
          }
        }
        
        // If it's not a 500/502 error or we've exhausted retries, throw to be caught by outer catch
        throw followError;
      }
    } catch (error) {
      if (axios.isAxiosError(error) && (error.response?.status === 500 || error.response?.status === 502) && retryCount < MAX_RETRIES) {
        // If we get a 500 or 502 error and have retries left, try again
        const errorStatus = error.response?.status;
        console.log(`Received ${errorStatus} error, retrying (${retryCount + 1}/${MAX_RETRIES})`);
        retryCount++;
        
        // Wait a bit before retrying (exponential backoff with jitter)
        const baseDelay = 1000 * Math.pow(2, retryCount - 1);
        // Add jitter - random value between 0 and 30% of the base delay
        const jitter = Math.floor(Math.random() * (0.3 * baseDelay));
        const delay = baseDelay + jitter;
        
        console.log(`Waiting ${delay}ms before retry with jitter`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      debugInfo.error = true;
      
      if (axios.isAxiosError(error)) {
        debugInfo.status = error.response?.status;
        debugInfo.message = error.message;
        
        if (error.response) {
          // Server responded with a status code outside of 2xx range
          debugInfo.details = {
            status: error.response.status,
            data: error.response.data,
            headers: error.response.headers
          };
          console.error('API Error response:', error.response.status, error.response.data);
          
          // Check for token expiration in response
          if (error.response.status === 401) {
            debugInfo.message = 'Authentication token has expired or is invalid';
          }
        } else if (error.request) {
          // Request was made but no response received
          debugInfo.details = {
            request: 'Request was made but no response was received'
          };
          console.error('No response received:', error.request);
        } else {
          // Something else happened while setting up the request
          debugInfo.details = {
            message: error.message
          };
          console.error('Error setting up request:', error.message);
        }
      } else {
        // Non-Axios error
        debugInfo.message = error instanceof Error ? error.message : 'Unknown error';
        debugInfo.details = error;
        console.error('Non-axios error:', error);
      }
      
      return { success: false, debug: debugInfo };
    }
  }
  
  // Should never reach here, but TypeScript requires a return
  debugInfo.error = true;
  debugInfo.message = 'Exhausted all retries';
  return { success: false, debug: debugInfo };
};

/**
 * Batch follow users
 */
export const batchFollowUsers = async (
  handle: string, 
  password: string | null, 
  users: BlueSkyUser[], 
  onProgress?: (completed: number, total: number, lastError?: DebugInfo) => void
): Promise<{success: number, failed: number, errors?: DebugInfo[]}> => {
  try {
    let accessToken: string;
    let errors: DebugInfo[] = [];
    
    // Önce aktif bir oturum var mı kontrol et
    const session = await validateSession();
    
    if (session) {
      // Aktif oturum varsa onun token'ını kullan
      accessToken = session.accessJwt;
      console.log("Using existing session for batch follow");
    } else if (password) {
      // Aktif oturum yoksa ve şifre verildiyse, authenticate ol
      console.log("No active session, authenticating with password");
      const authResponse = await authenticateUser(handle, password);
      accessToken = authResponse.accessJwt;
      
      // Oturum bilgilerini kaydet
      saveSession(handle, authResponse);
    } else {
      // Ne oturum var ne de şifre, bu durumda işlem yapılamaz
      throw new Error("No active session and no password provided");
    }
    
    let successCount = 0;
    let failedCount = 0;
    const total = users.length;
    
    // Process in batches to avoid rate limiting
    for (let i = 0; i < users.length; i++) {
      try {
        const result = await followUser(accessToken, users[i].did);
        
        if (result.success) {
          successCount++;
        } else {
          failedCount++;
          if (result.debug) {
            errors.push(result.debug);
          }
        }
      } catch (error) {
        failedCount++;
        console.error('Error following user:', error);
        
        // Create debug info for the error
        const debugInfo: DebugInfo = {
          error: true,
          message: error instanceof Error ? error.message : 'Unknown error',
          details: { user: users[i] }
        };
        errors.push(debugInfo);
        
        // Pass the last error to the progress callback
        if (onProgress) {
          onProgress(i + 1, total, debugInfo);
        }
      }
      
      // Call progress callback
      if (onProgress) {
        onProgress(i + 1, total, errors.length > 0 ? errors[errors.length - 1] : undefined);
      }
      
      // Add a delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Record progress for potential resumption
      saveOperationProgress('follow', handle, i + 1, total, users);
    }
    
    // Clear progress when complete
    clearOperationProgress('follow', handle);
    
    return {
      success: successCount,
      failed: failedCount,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error('Error in batch follow operation:', error);
    throw error;
  }
};

/**
 * Kullanıcı arama fonksiyonu
 * @param query Aranacak kullanıcı adı
 * @param limit Döndürülecek sonuç sayısı
 * @returns Kullanıcı arama sonuçları
 */
export const searchUsers = async (query: string, limit: number = 1): Promise<BlueSkyUser[]> => {
  try {
    // Önce mevcut oturum var mı kontrol et
    const session = await validateSession();
    
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString()
    });
    
    // API çağrısını yap
    const response = await axios.get(`${BASE_URL}${SEARCH_USERS_ENDPOINT}?${params.toString()}`, {
      headers: session ? {
        'Authorization': `Bearer ${session.accessJwt}`
      } : {}
    });
    
    // Sonuçları dönüştür
    if (response.data && response.data.actors) {
      return response.data.actors.map((user: any) => ({
        did: user.did,
        handle: user.handle,
        displayName: user.displayName || user.handle,
        avatar: user.avatar,
        description: user.description,
        indexedAt: user.indexedAt,
        followersCount: user.followersCount || 0,
        followsCount: user.followsCount || 0
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Kullanıcı arama hatası:', error);
    throw new Error('Failed to search users');
  }
};

/**
 * Belirli bir kullanıcının takipçilerini getirir
 * @param targetDid Hedef kullanıcının DID'si
 * @param maxCount İstenen maksimum kullanıcı sayısı (varsayılan: 100)
 * @returns Takipçi listesi
 */
export const getUserFollowers = async (targetDid: string, maxCount: number = 100): Promise<BlueSkyUser[]> => {
  try {
    const session = await validateSession();
    const allFollowers: BlueSkyUser[] = [];
    let cursor: string | undefined = undefined;
    
    // Bluesky API bir seferde maksimum 100 kullanıcı döndürür
    const perPageLimit = 100;
    
    // Maksimum 10000 kullanıcı getirme limiti
    const safeMaxCount = Math.min(maxCount, 10000);
    
    do {
      const params = new URLSearchParams({
        actor: targetDid,
        limit: perPageLimit.toString()
      });
      
      if (cursor) {
        params.append('cursor', cursor);
      }
      
      console.log(`Fetching followers page: ${allFollowers.length}/${safeMaxCount}`);
      
      try {
        const response = await axios.get(`${BASE_URL}${FOLLOWERS_ENDPOINT}?${params.toString()}`, {
          headers: session ? {
            'Authorization': `Bearer ${session.accessJwt}`
          } : {}
        });
        
        if (response.data && response.data.followers) {
          allFollowers.push(...response.data.followers);
          cursor = response.data.cursor;
        } else {
          cursor = undefined;
        }
        
        // API rate limit koruması - her sayfa arasında kısa bir bekleme
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        console.error('Followers page fetch error:', error);
        // Hata durumunda döngüyü sonlandır
        break;
      }
    } while (cursor && allFollowers.length < safeMaxCount);
    
    console.log(`Total followers fetched: ${allFollowers.length}`);
    return allFollowers;
  } catch (error) {
    console.error('Kullanıcı takipçilerini getirme hatası:', error);
    throw new Error('Failed to get user followers');
  }
};

/**
 * Belirli bir kullanıcının takip ettiklerini getirir
 * @param targetDid Hedef kullanıcının DID'si
 * @param maxCount İstenen maksimum kullanıcı sayısı (varsayılan: 100)
 * @returns Takip edilen kullanıcı listesi
 */
export const getUserFollowing = async (targetDid: string, maxCount: number = 100): Promise<BlueSkyUser[]> => {
  try {
    const session = await validateSession();
    const allFollowing: BlueSkyUser[] = [];
    let cursor: string | undefined = undefined;
    
    // Bluesky API bir seferde maksimum 100 kullanıcı döndürür
    const perPageLimit = 100;
    
    // Maksimum 10000 kullanıcı getirme limiti
    const safeMaxCount = Math.min(maxCount, 10000);
    
    do {
      const params = new URLSearchParams({
        actor: targetDid,
        limit: perPageLimit.toString()
      });
      
      if (cursor) {
        params.append('cursor', cursor);
      }
      
      console.log(`Fetching following page: ${allFollowing.length}/${safeMaxCount}`);
      
      try {
        const response = await axios.get(`${BASE_URL}${FOLLOWING_ENDPOINT}?${params.toString()}`, {
          headers: session ? {
            'Authorization': `Bearer ${session.accessJwt}`
          } : {}
        });
        
        if (response.data && response.data.follows) {
          allFollowing.push(...response.data.follows);
          cursor = response.data.cursor;
        } else {
          cursor = undefined;
        }
        
        // API rate limit koruması - her sayfa arasında kısa bir bekleme
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        console.error('Following page fetch error:', error);
        // Hata durumunda döngüyü sonlandır
        break;
      }
    } while (cursor && allFollowing.length < safeMaxCount);
    
    console.log(`Total following fetched: ${allFollowing.length}`);
    return allFollowing;
  } catch (error) {
    console.error('Kullanıcı takip ettiklerini getirme hatası:', error);
    throw new Error('Failed to get user following');
  }
}; 