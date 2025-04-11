import React, { useState, useRef, useEffect } from 'react';
import type { BlueSkyUser, DebugInfo } from '../../services/blueskyAPI';
import { batchUnfollowUsersWithProgress, validateSession, getAllFollowing, getSession, searchUsers, invalidateAnalysisCache } from '../../services/blueskyAPI';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import { FiAlertTriangle, FiCheck, FiInfo, FiTrash, FiUserMinus, FiUsers, FiX, FiSearch, FiPlus, FiChevronLeft, FiChevronRight, FiShield, FiUser } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import * as idb from '../../services/indexedDBService';

const UnfollowAll: React.FC = () => {
  const { t, language } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followingUsers, setFollowingUsers] = useState<BlueSkyUser[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [unfollowInProgress, setUnfollowInProgress] = useState(false);
  const [unfollowProgress, setUnfollowProgress] = useState({ completed: 0, total: 0 });
  const [unfollowError, setUnfollowError] = useState<string | null>(null);
  const [unfollowSuccess, setUnfollowSuccess] = useState<{success: number, failed: number} | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [sessionHandle, setSessionHandle] = useState('');
  const [showStorageWarning, setShowStorageWarning] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<{ timestamp: number, age: string } | null>(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  // Search and whitelist states
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<BlueSkyUser[]>([]);
  const [whitelistedUsers, setWhitelistedUsers] = useState<BlueSkyUser[]>([]);

  // Check for active session on component mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const validSession = await validateSession();
        if (validSession) {
          setHasActiveSession(true);
          
          // Get full session information including username
          const sessionInfo = await getSession();
          if (sessionInfo && sessionInfo.username) {
            setSessionHandle(sessionInfo.username);
            setUsername(sessionInfo.username);
            
            // Check if there's cached analysis data
            const cachedData = await idb.getAnalysisResults(sessionInfo.username);
            if (cachedData && cachedData.result) {
              // Calculate how old the cache is
              const ageMs = Date.now() - cachedData.timestamp;
              const ageMinutes = Math.round(ageMs / (60 * 1000));
              const ageHours = Math.round(ageMs / (60 * 60 * 1000) * 10) / 10;
              
              let ageStr = '';
              if (ageMinutes < 60) {
                ageStr = `${ageMinutes} dakika`;
              } else {
                ageStr = `${ageHours} saat`;
              }
              
              setCacheInfo({ timestamp: cachedData.timestamp, age: ageStr });
              console.log(`Using cached data from ${ageStr} ago`);
            }
            
            // Load following users with the handle
            loadFollowingUsers(sessionInfo.username);
          } else {
            // If somehow we have a valid session but no stored username,
            // use the DID as fallback (less user-friendly but functional)
            setSessionHandle(validSession.did);
            setUsername(validSession.did);
            loadFollowingUsers(validSession.did);
          }
        }
      } catch (err) {
        console.error('Error checking session:', err);
        setHasActiveSession(false);
      }
    };
    
    checkSession();
  }, []);

  const loadFollowingUsers = async (handle: string) => {
    setIsLoadingUsers(true);
    setError(null);
    setFollowingUsers([]);

    try {
      // First try to get analysis data from cache
      const cachedData = await idb.getAnalysisResults(handle);
      
      if (cachedData && cachedData.result) {
        console.log(`Using cached analysis data for ${handle} from ${new Date(cachedData.timestamp).toLocaleString()}`);
        
        // If we have the cached analysis data, use the following users from there
        const cachedAnalysis = cachedData.result;
        
        // Combine all users from analysis (mutuals and notFollowingBack)
        const allFollowingUsers = [
          ...cachedAnalysis.notFollowingBack,
          ...cachedAnalysis.mutuals
        ];
        
        setFollowingUsers(allFollowingUsers);
        console.log(`Loaded ${allFollowingUsers.length} following users from cache`);
        
        if (allFollowingUsers.length === 0) {
          setError(language === 'TR' ? 'Takip ettiğiniz hesap bulunamadı' : 'No following users found');
        }
      } else {
        // If no cached data, fetch from API
        console.log(`No cached data found for ${handle}, fetching from API...`);
        const followingUsers = await getAllFollowing(handle);
        setFollowingUsers(followingUsers);
        console.log(`Loaded ${followingUsers.length} following users from API`);
        
        if (followingUsers.length === 0) {
          setError(language === 'TR' ? 'Takip ettiğiniz hesap bulunamadı' : 'No following users found');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load following users');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchFollowingUsers = async () => {
    if (!username) {
      setError('Please enter a Bluesky username');
      return;
    }

    loadFollowingUsers(username);
  };

  // Arama fonksiyonu
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setIsSearching(true);
      const results = await searchUsers(searchQuery, 10);
      setSearchResults(results);
    } catch (err) {
      console.error("Search error:", err);
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  // Whitelist'e kullanıcı ekleme fonksiyonu
  const addToWhitelist = (user: BlueSkyUser) => {
    // Kullanıcı zaten whitelist'te mi kontrol et
    if (!whitelistedUsers.some(u => u.did === user.did)) {
      setWhitelistedUsers(prev => [...prev, user]);
    }
    // Arama sonuçlarını temizle
    setSearchResults([]);
    setSearchQuery('');
  };

  // Whitelist'ten kullanıcı çıkarma fonksiyonu
  const removeFromWhitelist = (did: string) => {
    setWhitelistedUsers(prev => prev.filter(user => user.did !== did));
  };

  // Sayfalama için mevcut sayfadaki kullanıcıları getir
  const getCurrentPageUsers = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return followingUsers.slice(startIndex, endIndex);
  };

  // Toplam sayfa sayısını hesapla
  const totalPages = Math.ceil(followingUsers.length / itemsPerPage);

  // Sayfa değiştirme fonksiyonları
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleUnfollowAll = async () => {
    // Check active session first
    const validSession = await validateSession();
    
    // If no active session and no password, show error
    if (!validSession) {
      setUnfollowError(language === 'TR' 
        ? 'Aktif bir oturum bulunamadı. Lütfen Ana sayfadan giriş yapın veya sayfayı yenileyin.' 
        : 'No active session found. Please login from the main page or refresh the page.');
      return;
    }

    // Reset error state
    setUnfollowError('');
    setUnfollowInProgress(true);
    setUnfollowSuccess(null);
    setUnfollowProgress({ completed: 0, total: 0 });
    
    // Abort previous operation if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller for this operation
    abortControllerRef.current = new AbortController();
    
    try {
      // Filter users to unfollow - exclude whitelisted users
      const usersToUnfollow = followingUsers.filter(
        user => !whitelistedUsers.some(whitelisted => whitelisted.did === user.did)
      );
      
      if (usersToUnfollow.length === 0) {
        setUnfollowInProgress(false);
        setUnfollowError(language === 'TR' ? 'Takipten çıkarılacak kullanıcı bulunamadı' : 'No users to unfollow');
        return;
      }
      
      setUnfollowProgress({ completed: 0, total: usersToUnfollow.length });
      
      // Add listener for storage errors
      const handleStorageError = (e: ErrorEvent) => {
        console.warn('Storage error detected', e);
        if (e.message && 
            (e.message.includes('QuotaExceededError') || 
             e.message.includes('exceeded the quota') || 
             e.message.includes('localStorage is full') ||
             e.message.includes('IndexedDB') && e.message.includes('quota') ||
             e.message.includes('transaction was aborted due to quota'))) {
          setShowStorageWarning(true);
        }
      };
      
      // Add listener for storage errors
      window.addEventListener('error', handleStorageError);
      
      // Eğer geçerli bir oturum varsa, şifreye gerek olmadan işlemi gerçekleştir
      // Yoksa, kullanıcının girdiği şifreyi kullan
      const passwordToUse = validSession ? null : password;
      
      const unfollowResult = await batchUnfollowUsersWithProgress(
        username,
        passwordToUse,
        usersToUnfollow,
        0,
        (completed, total, lastError) => {
          // Update progress
          setUnfollowProgress({ completed, total });
          if (lastError) {
            setDebugInfo(lastError);
            // Show critical errors
            if (lastError.error && lastError.message) {
              setUnfollowError(`Error during operation: ${lastError.message}`);
            }
          }
        },
        abortControllerRef.current.signal
      );
      
      // Remove the error listener
      window.removeEventListener('error', handleStorageError);
      
      console.log('API unfollow operation completed', unfollowResult);
      
      // Show result
      setUnfollowSuccess({
        success: unfollowResult.success,
        failed: unfollowResult.failed
      });
      
      // Show last error if exists
      if (unfollowResult.errors && unfollowResult.errors.length > 0) {
        const lastError = unfollowResult.errors[unfollowResult.errors.length - 1];
        setDebugInfo(lastError);
        
        if (lastError.error && lastError.message) {
          setUnfollowError(`Last error: ${lastError.message}`);
        }
      }
      
      // Refresh following list after unfollowing - always get fresh data
      if (unfollowResult.success > 0) {
        // Ensure cache is invalidated
        await invalidateAnalysisCache(username);
        
        // Reload the following user list to reflect changes
        await loadFollowingUsers(username);
      }
    } catch (err: any) {
      console.error('Unfollow operation error:', err);
      // Show special message for cancellation
      if (err.name === 'AbortError' || err.message === 'canceled') {
        setUnfollowError(language === 'TR' ? 'İşlem iptal edildi.' : 'Operation was canceled.');
      } else {
        setUnfollowError(err instanceof Error ? err.message : language === 'TR' ? 'Takipten çıkarma işlemi başarısız oldu' : 'Unfollow operation failed');
      }
    } finally {
      setUnfollowInProgress(false);
      // Clear controller reference
      abortControllerRef.current = null;
    }
  };

  // Cancel operation function
  const cancelUnfollowOperation = () => {
    if (abortControllerRef.current) {
      console.log('Canceling unfollow operation...');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setShowConfirmModal(false);
  };

  // Cleanup on component unmount
  React.useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const renderDebugInfo = () => {
    if (!debugInfo) return null;
    
    // Create a more user-friendly message for common errors
    let userFriendlyMessage = debugInfo.message;
    if (debugInfo.details && typeof debugInfo.details === 'object') {
      // Check for UpstreamFailure
      if (debugInfo.details.data?.error === 'UpstreamFailure') {
        userFriendlyMessage = 'Bluesky API server is experiencing issues. This is likely a temporary problem with Bluesky\'s servers, not with your request.';
      } 
    }
    
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 overflow-auto"
      >
        <h4 className="font-bold mb-2 text-red-500 flex items-center">
          <FiInfo className="mr-2" /> Debug Information
        </h4>
        <div className="text-xs font-mono">
          <p><strong>Error:</strong> {debugInfo.error ? 'Yes' : 'No'}</p>
          <p><strong>Status Code:</strong> {debugInfo.status || 'N/A'}</p>
          <p><strong>Message:</strong> {debugInfo.message}</p>
          
          {userFriendlyMessage !== debugInfo.message && (
            <p className="mt-2 text-amber-600 dark:text-amber-400 font-normal">
              <strong>Explanation:</strong> {userFriendlyMessage}
            </p>
          )}
          
          {debugInfo.details && (
            <div className="mt-2">
              <p className="font-bold">Details:</p>
              <pre className="bg-gray-200 dark:bg-gray-900 p-2 rounded mt-1 overflow-x-auto">
                {JSON.stringify(debugInfo.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  // Kullanıcı listesi elemanını render et
  const renderUserItem = (user: BlueSkyUser, isWhitelisted: boolean = false) => {
    return (
      <div key={user.did} className="flex items-center justify-between p-3 border-b dark:border-gray-700 last:border-0">
        <div className="flex items-center">
          {user.avatar ? (
            <img src={user.avatar} alt={user.handle} className="w-10 h-10 rounded-full mr-3" />
          ) : (
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full mr-3 flex items-center justify-center">
              <FiUser className="text-gray-500 dark:text-gray-400" />
            </div>
          )}
          <div>
            <p className="font-medium">{user.displayName || user.handle}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">@{user.handle}</p>
          </div>
        </div>
        
        {isWhitelisted ? (
          <Button
            variant="secondary"
            className="text-xs px-2 py-1"
            onClick={() => removeFromWhitelist(user.did)}
          >
            <FiX className="mr-1" /> {language === 'TR' ? 'Kaldır' : 'Remove'}
          </Button>
        ) : (
          <Button
            variant="secondary"
            className="text-xs px-2 py-1"
            onClick={() => addToWhitelist(user)}
          >
            <FiShield className="mr-1" /> {language === 'TR' ? 'Koru' : 'Whitelist'}
          </Button>
        )}
      </div>
    );
  };

  // Format timestamp to readable time
  const formatTimeAgo = (timestamp: number): string => {
    const ageMs = Date.now() - timestamp;
    const ageMinutes = Math.round(ageMs / (60 * 1000));
    
    if (ageMinutes < 60) {
      return language === 'TR' ? `${ageMinutes} dakika önce` : `${ageMinutes} minutes ago`;
    } else {
      const ageHours = Math.round(ageMs / (60 * 60 * 1000) * 10) / 10;
      return language === 'TR' ? `${ageHours} saat önce` : `${ageHours} hours ago`;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card className="mb-8">
        <h2 className="text-2xl font-bold mb-6 text-red-600 dark:text-red-500 flex items-center">
          <FiUserMinus className="mr-2" /> 
          {language === 'TR' ? 'Tüm Takip Edilen Hesapları Takipten Çıkar' : 'Unfollow All Accounts'}
        </h2>
        
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg mb-6">
          <p className="flex items-start text-red-600 dark:text-red-400">
            <FiAlertTriangle className="mr-2 mt-1 flex-shrink-0" />
            <span>
              {language === 'TR' 
                ? 'Bu özellik, takip ettiğiniz TÜM hesapları takipten çıkaracaktır. Bu işlem geri alınamaz ve hesabınızı boş bir takip listesiyle bırakır.'
                : 'This feature will unfollow ALL accounts you are currently following. This action cannot be undone and will leave your account with an empty following list.'}
            </span>
          </p>
        </div>

        {/* Show user information when session is active */}
        {hasActiveSession ? (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="flex items-center text-blue-700 dark:text-blue-400">
              <FiCheck className="mr-2" />
              {language === 'TR' 
                ? `${sessionHandle} hesabıyla giriş yaptınız.` 
                : `Logged in as ${sessionHandle}.`}
            </p>
            
            {/* Show cache information if available */}
            {cacheInfo && (
              <p className="flex items-center text-blue-700 dark:text-blue-400 mt-2 text-sm">
                <FiInfo className="mr-2" />
                {language === 'TR' 
                  ? `Önbellek verileri kullanılıyor (${cacheInfo.age} önce kaydedilmiş).` 
                  : `Using cached data (saved ${formatTimeAgo(cacheInfo.timestamp)}).`}
              </p>
            )}
          </div>
        ) : (
          <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="flex items-center text-yellow-700 dark:text-yellow-400">
              <FiInfo className="mr-2" />
              {language === 'TR' 
                ? 'Giriş yapmadınız. Lütfen önce ana sayfadan giriş yapın.' 
                : 'You are not logged in. Please login from the main page first.'}
            </p>
          </div>
        )}

        <div className="flex space-x-4 pt-2 mb-6">
          {/* Always show unfollow button, but disabled if no following users */}
          <Button
            onClick={() => setShowConfirmModal(true)}
            variant="danger"
            className="flex items-center"
            disabled={followingUsers.length === 0 || isLoadingUsers}
          >
            <FiTrash className="mr-2" />
            {language === 'TR' ? 'Tümünü Takipten Çıkar' : 'Unfollow All'}
          </Button>
        </div>

        {error && (
          <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200 rounded-lg flex items-start mb-4">
            <FiAlertTriangle className="mt-1 mr-2 flex-shrink-0" />
            <div>{error}</div>
          </div>
        )}

        {/* Show loading indicator when fetching users */}
        {isLoadingUsers && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {language === 'TR' ? 'Takip edilen hesaplar getiriliyor...' : 'Fetching following accounts...'}
            </p>
          </div>
        )}

        {followingUsers.length > 0 && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-4">
            <p className="font-medium flex items-center">
              <FiUsers className="mr-2" />
              {language === 'TR' 
                ? `${followingUsers.length} hesap takip ediyorsunuz`
                : `You are following ${followingUsers.length} accounts`}
            </p>
          </div>
        )}

        {/* Show storage warning if needed */}
        {showStorageWarning && (
          <div className="p-4 mb-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="flex items-start text-yellow-700 dark:text-yellow-400">
              <FiInfo className="mr-2 mt-1 flex-shrink-0" />
              <span>
                {language === 'TR' 
                  ? 'Tarayıcı depolama alanı sınırına ulaşıldı. İşlem devam edecek, ancak ilerleme durumu tam olarak kaydedilemeyebilir.'
                  : 'Browser storage limit reached. The operation will continue, but progress state may not be fully saved.'}
              </span>
            </p>
          </div>
        )}

        {/* Kullanıcı Arama Alanı */}
        {followingUsers.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <FiShield className="mr-2" />
              {language === 'TR' ? 'Korumak İstediğiniz Hesapları Arayın' : 'Search Accounts to Whitelist'}
            </h3>
            <div className="flex space-x-2 mb-3">
              <Input
                placeholder={language === 'TR' ? "Kullanıcı adı ile ara..." : "Search by username..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleSearch}
                variant="secondary"
                isLoading={isSearching}
                className="flex items-center"
              >
                <FiSearch className="mr-2" />
                {language === 'TR' ? 'Ara' : 'Search'}
              </Button>
            </div>
            
            {/* Arama Sonuçları */}
            {searchResults.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4">
                <h4 className="text-sm font-medium mb-2">
                  {language === 'TR' ? 'Arama Sonuçları' : 'Search Results'}
                </h4>
                <div className="max-h-60 overflow-y-auto border rounded-lg divide-y dark:divide-gray-700">
                  {searchResults.map(user => (
                    <div key={user.did} className="flex items-center justify-between p-3">
                      <div className="flex items-center">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.handle} className="w-8 h-8 rounded-full mr-2" />
                        ) : (
                          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full mr-2 flex items-center justify-center">
                            <FiUser className="text-gray-500 dark:text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-sm">{user.displayName || user.handle}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">@{user.handle}</p>
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        className="text-xs px-2 py-1"
                        onClick={() => addToWhitelist(user)}
                      >
                        <FiPlus className="mr-1" /> {language === 'TR' ? 'Ekle' : 'Add'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Whitelist */}
            {whitelistedUsers.length > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mb-4">
                <h4 className="text-sm font-medium mb-2 flex items-center">
                  <FiShield className="mr-2 text-green-600 dark:text-green-400" />
                  {language === 'TR' ? 'Korunan Hesaplar' : 'Whitelisted Accounts'} ({whitelistedUsers.length})
                </h4>
                <div className="max-h-60 overflow-y-auto border rounded-lg">
                  {whitelistedUsers.map(user => renderUserItem(user, true))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Paginated user list */}
        {followingUsers.length > 0 && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <FiUsers className="mr-2" />
              {language === 'TR' ? 'Takip Edilen Hesaplar' : 'Following Accounts'}
            </h3>
            
            <div className="border rounded-lg divide-y dark:divide-gray-700 mb-3">
              {getCurrentPageUsers().map(user => renderUserItem(user))}
            </div>
            
            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-3">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {language === 'TR' 
                    ? `Sayfa ${currentPage}/${totalPages}`
                    : `Page ${currentPage} of ${totalPages}`}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="secondary"
                    className="px-3 py-1"
                    onClick={goToPrevPage}
                    disabled={currentPage === 1}
                  >
                    <FiChevronLeft />
                  </Button>
                  <Button
                    variant="secondary"
                    className="px-3 py-1"
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                  >
                    <FiChevronRight />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {language === 'TR' ? 'Tüm Hesapları Takipten Çıkar' : 'Unfollow All Accounts'}
              </h3>
              <button
                onClick={cancelUnfollowOperation}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <FiX className="text-xl" />
              </button>
            </div>

            <p className="mb-4 text-gray-700 dark:text-gray-300">
              {language === 'TR' 
                ? `${followingUsers.length - whitelistedUsers.length} hesabı takipten çıkmak üzeresiniz. Bu işlem geri alınamaz.`
                : `You are about to unfollow ${followingUsers.length - whitelistedUsers.length} accounts. This action cannot be undone.`
              }
            </p>
            
            {whitelistedUsers.length > 0 && (
              <p className="mb-4 text-gray-700 dark:text-gray-300 flex items-center">
                <FiShield className="mr-2 text-green-600 dark:text-green-400" />
                {language === 'TR'
                  ? `${whitelistedUsers.length} korumalı hesap takipten çıkarılmayacak.`
                  : `${whitelistedUsers.length} whitelisted accounts will be preserved.`
                }
              </p>
            )}

            {unfollowError && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200 rounded text-sm">
                {unfollowError}
              </div>
            )}

            {unfollowSuccess && (
              <div className={`mb-4 p-3 ${
                  unfollowSuccess.success > 0 && unfollowSuccess.failed === 0 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-200' 
                    : unfollowSuccess.success === 0 && unfollowSuccess.failed > 0
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200'
                      : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-200'
                } rounded text-sm`}>
                <div className="flex items-start">
                  {unfollowSuccess.success > 0 && unfollowSuccess.failed === 0 ? (
                    <FiCheck className="mr-2 mt-0.5 text-green-600 dark:text-green-400" />
                  ) : unfollowSuccess.success === 0 && unfollowSuccess.failed > 0 ? (
                    <FiAlertTriangle className="mr-2 mt-0.5 text-red-600 dark:text-red-400" />
                  ) : (
                    <FiInfo className="mr-2 mt-0.5 text-yellow-600 dark:text-yellow-400" />
                  )}
                  <div>
                    {language === 'TR'
                      ? (
                          <>
                            {unfollowSuccess.success > 0 && <span className="font-medium">{unfollowSuccess.success} hesap başarıyla takipten çıkarıldı.</span>}
                            {unfollowSuccess.failed > 0 && <span className="font-medium">{unfollowSuccess.success > 0 ? ' ' : ''}{unfollowSuccess.failed} hesap takipten çıkarılamadı.</span>}
                            {unfollowSuccess.success === 0 && unfollowSuccess.failed > 0 && <div className="mt-1">Tekrar denemek için aşağıdaki butona tıklayın.</div>}
                          </>
                        )
                      : (
                          <>
                            {unfollowSuccess.success > 0 && <span className="font-medium">Successfully unfollowed {unfollowSuccess.success} accounts.</span>}
                            {unfollowSuccess.failed > 0 && <span className="font-medium">{unfollowSuccess.success > 0 ? ' ' : ''}Failed to unfollow {unfollowSuccess.failed} accounts.</span>}
                            {unfollowSuccess.success === 0 && unfollowSuccess.failed > 0 && <div className="mt-1">Click the button below to try again.</div>}
                          </>
                        )
                    }
                  </div>
                </div>
              </div>
            )}

            {showDebugInfo && renderDebugInfo()}

            {unfollowInProgress ? (
              <div className="mb-4">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-2">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${(unfollowProgress.completed / unfollowProgress.total) * 100}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  {language === 'TR'
                    ? `İşleniyor: ${unfollowProgress.completed} / ${unfollowProgress.total}`
                    : `Processing ${unfollowProgress.completed} of ${unfollowProgress.total}`
                  }
                </p>
                <div className="mt-3 flex justify-center">
                  <Button
                    variant="secondary"
                    className="px-4 py-2 text-sm"
                    onClick={cancelUnfollowOperation}
                  >
                    {language === 'TR' ? 'İşlemi İptal Et' : 'Cancel Operation'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={cancelUnfollowOperation}
                >
                  {language === 'TR' ? 'İptal' : 'Cancel'}
                </Button>
                <Button
                  onClick={handleUnfollowAll}
                  variant="danger"
                  className="flex-1"
                  isLoading={unfollowInProgress}
                >
                  {unfollowSuccess ? 
                    (language === 'TR' ? 'Tekrar Dene' : 'Try Again') : 
                    (language === 'TR' ? 'Tümünü Takipten Çık' : 'Unfollow All')
                  }
                </Button>
              </div>
            )}

            {debugInfo && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowDebugInfo(!showDebugInfo)}
                  className="text-gray-600 dark:text-gray-400 text-sm hover:underline"
                >
                  {showDebugInfo 
                    ? (language === 'TR' ? 'Hata Bilgilerini Gizle' : 'Hide Debug Info')
                    : (language === 'TR' ? 'Hata Bilgilerini Göster' : 'Show Debug Info')
                  }
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default UnfollowAll; 