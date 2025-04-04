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
    
    // İşlem durumunu kaydet
    const progressData = {
      currentIndex,
      totalItems,
      timestamp: Date.now(),
      completedItems: currentIndex,
      remainingItems: totalItems - currentIndex,
      // İşlenecek kalan öğelerin DID'lerini sakla (maksimum 100 öğe)
      remainingIds: itemList.slice(currentIndex, currentIndex + 100).map(item => item.did)
    };
    
    localStorage.setItem(storageKey, JSON.stringify(progressData));
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

// Types
export interface BlueSkyUser {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  description?: string;
  indexedAt?: string;
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
  try {
    const response = await axios.post(`${AUTH_URL}${CREATE_SESSION_ENDPOINT}`, {
      identifier: handle,
      password: password
    });
    
    return response.data;
  } catch (error) {
    console.error('Authentication error:', error);
    throw new Error('Failed to authenticate. Please check your username and password.');
  }
};

/**
 * Unfollow a user with detailed debug info
 */
export const unfollowUser = async (token: string, userDid: string): Promise<{success: boolean, debug: DebugInfo}> => {
  const debugInfo: DebugInfo = {
    error: false,
    message: 'Success'
  };
  
  // Add retry logic for 500/502 errors
  const MAX_RETRIES = 5; // Increased from 3 to 5 for longer backoff
  let retryCount = 0;
  
  while (retryCount <= MAX_RETRIES) {
    try {
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
            }
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
            }
          }
        );
        
        console.log('Unfollow response status:', response.status);
        debugInfo.status = response.status;
        
        return { success: true, debug: debugInfo };
      } catch (deleteError) {
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
  password: string, 
  users: BlueSkyUser[], 
  startIndex: number = 0,
  onProgress?: (completed: number, total: number, lastError?: DebugInfo) => void
): Promise<{success: number, failed: number, errors: DebugInfo[], lastProcessedIndex: number}> => {
  try {
    // First authenticate
    const authResponse = await authenticateUser(handle, password);
    console.log('Authentication successful', authResponse.handle);
    
    let successCount = 0;
    let failedCount = 0;
    const total = users.length;
    const errors: DebugInfo[] = [];
    let lastProcessedIndex = startIndex;
    
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
      const chunk = chunks[chunkIndex];
      console.log(`Processing chunk ${chunkIndex + 1}/${chunks.length} with ${chunk.length} users`);
      
      // Token süresini kontrol et
      if (!isTokenValid(authResponse.accessJwt)) {
        console.log('Token süresi dolmak üzere, işlem duraklatıldı');
        // İşlem durumunu kaydet
        saveOperationProgress('unfollow', handle, completedUsers, total, users);
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
          
          // Token süresi dolduysa işlemi durdur
          if (debug.message === 'Auth token has expired' || debug.message === 'Authentication token has expired or is invalid') {
            console.log('Token süresi doldu, işlem duraklatıldı');
            // İşlem durumunu kaydet
            saveOperationProgress('unfollow', handle, completedUsers, total, users);
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
          onProgress(completedUsers, total, debug.error ? debug : undefined);
        }
        
        // İşlem durumunu düzenli olarak kaydet (her 10 kullanıcıda bir)
        if (completedUsers % 10 === 0) {
          saveOperationProgress('unfollow', handle, completedUsers, total, users);
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
    
    // İşlem tamamlandı, ilerleme bilgisini temizle
    clearOperationProgress('unfollow', handle);
    
    return {
      success: successCount,
      failed: failedCount,
      errors,
      lastProcessedIndex: completedUsers
    };
  } catch (error) {
    console.error('Error in batch unfollow operation:', error);
    throw error;
  }
};

/**
 * İlerleme takibi yapabilen follow fonksiyonu
 * Token süresi dolduğunda işlemi durdurup daha sonra kaldığı yerden devam etme imkanı sağlar
 */
export const batchFollowUsersWithProgress = async (
  handle: string, 
  password: string, 
  users: BlueSkyUser[], 
  startIndex: number = 0,
  onProgress?: (completed: number, total: number, lastError?: DebugInfo) => void
): Promise<{success: number, failed: number, errors: DebugInfo[], lastProcessedIndex: number}> => {
  try {
    // First authenticate
    const authResponse = await authenticateUser(handle, password);
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
        debugInfo.status = error.response?.status || 0;
        debugInfo.message = error.message;
        debugInfo.details = error.response?.data || error.message;
        
        // Check for rate limit errors
        if (error.response?.status === 429) {
          debugInfo.message = 'Rate limit exceeded. Please try again later.';
        }
      } else {
        debugInfo.message = error instanceof Error ? error.message : 'Unknown error occurred';
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