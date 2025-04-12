import React, { useState, useEffect, useRef } from 'react';
import type { BlueSkyUser, FollowerAnalysisResult, DebugInfo, ProgressInfo } from '../../services/blueskyAPI';
import { analyzeFollowers, batchUnfollowUsers, batchUnfollowUsersWithProgress, batchFollowUsers, batchFollowUsersWithProgress, getAllFollowers, getAllFollowing, getOperationProgress, clearOperationProgress, authenticateUser, saveSession, getSession, validateSession, clearSession, searchUsers, analyzeFollowersWithProgress, invalidateAnalysisCache } from '../../services/blueskyAPI';
import { useOperation } from '../../contexts/OperationContext';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import UserListItem from '../ui/UserListItem';
import { FiUser, FiUserCheck, FiUserMinus, FiUserPlus, FiX, FiAlertTriangle, FiExternalLink, FiInfo, FiCheck, FiUsers, FiMessageSquare, FiTarget, FiActivity, FiTrash, FiShield, FiSearch, FiPlus, FiImage, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import TargetFollow from './TargetFollow';
import UnfollowAll from './UnfollowAll';
import { getLastUsername, saveLastUsername, getAnalysisResults, clearAnalysisResults } from '../../services/indexedDBService';
import * as idb from '../../services/indexedDBService';

const FollowerAnalysis: React.FC = () => {
  const { operation, togglePause } = useOperation();
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followersData, setFollowersData] = useState<FollowerAnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<'notFollowingBack' | 'notFollowedBack' | 'mutuals' | 'targetFollow' | 'unfollowAll'>('notFollowingBack');
  const [showUnfollowModal, setShowUnfollowModal] = useState(false);
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [password, setPassword] = useState('');
  const [unfollowInProgress, setUnfollowInProgress] = useState(false);
  const [followInProgress, setFollowInProgress] = useState(false);
  const [unfollowProgress, setUnfollowProgress] = useState({ completed: 0, total: 0 });
  const [followProgress, setFollowProgress] = useState({ completed: 0, total: 0 });
  const [unfollowError, setUnfollowError] = useState<string | null>(null);
  const [followError, setFollowError] = useState<string | null>(null);
  const [unfollowSuccess, setUnfollowSuccess] = useState<{success: number, failed: number} | null>(null);
  const [followSuccess, setFollowSuccess] = useState<{success: number, failed: number} | null>(null);
  const [showAppPasswordInfo, setShowAppPasswordInfo] = useState(false);
  const [showMobileImagesModal, setShowMobileImagesModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [followSource, setFollowSource] = useState<'followers' | 'following'>('followers');
  const [selectedMutualsUsers, setSelectedMutualsUsers] = useState<{[key: string]: boolean}>({});
  const [selectedNotFollowedBackUsers, setSelectedNotFollowedBackUsers] = useState<{[key: string]: boolean}>({});
  const [showMutualsSelection, setShowMutualsSelection] = useState(false);
  const [showNotFollowedSelection, setShowNotFollowedSelection] = useState(false);
  const [showMutualNetworkModal, setShowMutualNetworkModal] = useState(false);
  const [networkOption, setNetworkOption] = useState<'followers' | 'following' | 'both'>('followers');
  const [fetchingNetworkUsers, setFetchingNetworkUsers] = useState(false);
  const [networkUsers, setNetworkUsers] = useState<BlueSkyUser[]>([]);
  const [networkFetchProgress, setNetworkFetchProgress] = useState({ completed: 0, total: 0 });
  const [networkFetchError, setNetworkFetchError] = useState<string | null>(null);
  const [savedOperationInfo, setSavedOperationInfo] = useState<{
    operation: string;
    currentIndex: number;
    totalItems: number;
    timestamp: number;
  } | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 20; // Her sayfada 20 kullanıcı gösterilsin
  const { t, language } = useLanguage();
  const [resetFlag, setResetFlag] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [sessionDebugInfo, setSessionDebugInfo] = useState<any>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  // AbortController referansını tutmak için useRef ekle
  const abortControllerRef = useRef<AbortController | null>(null);
  // Öncelikle state değişkenlerini ekle
  const [selectedNotFollowingBackUsers, setSelectedNotFollowingBackUsers] = useState<{[key: string]: boolean}>({});
  const [showNotFollowingSelection, setShowNotFollowingSelection] = useState(false);
  const [whitelistedNotFollowingUsers, setWhitelistedNotFollowingUsers] = useState<BlueSkyUser[]>([]);
  const [searchQueryNotFollowing, setSearchQueryNotFollowing] = useState('');
  const [isSearchingNotFollowing, setIsSearchingNotFollowing] = useState(false);
  const [searchResultsNotFollowing, setSearchResultsNotFollowing] = useState<BlueSkyUser[]>([]);
  const [fetchProgress, setFetchProgress] = useState<ProgressInfo>({
    followersProgress: { fetched: 0, total: 0 },
    followingProgress: { fetched: 0, total: 0 },
    analysisProgress: 0
  });
  const [isParallelFetching, setIsParallelFetching] = useState(false);
  // Add new state for tracking cache information
  const [cacheInfo, setCacheInfo] = useState<{ timestamp: number, age: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load last username from IndexedDB on component mount
  useEffect(() => {
    const loadLastUsername = async () => {
      if (typeof window !== 'undefined') {
        try {
          const lastUsername = await getLastUsername();
          if (lastUsername) {
            setUsername(lastUsername);
          }
        } catch (error) {
          console.error('Failed to load last username from IndexedDB:', error);
        }
      }
    };
    
    loadLastUsername();
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      console.log("Checking session validity...");
      const validSession = await validateSession();
      console.log("Session validation result:", validSession ? "Valid session found" : "No valid session");
      
      if (validSession) {
        // Oturum geçerliyse kaydedilmiş kullanıcı adını al
        const session = await getSession();
        console.log("Retrieved session data:", session);
        
        // Debug bilgisi için session bilgilerini kaydet
        if (session) {
          setSessionDebugInfo({
            username: session.username,
            tokenExpiry: session.tokenExpiry ? new Date(session.tokenExpiry).toLocaleString() : "N/A",
            timeRemaining: session.tokenExpiry ? Math.round((session.tokenExpiry - Date.now()) / 1000 / 60) + " minutes" : "N/A",
            didFormat: session.did ? `${session.did.substring(0, 10)}...${session.did.substring(session.did.length - 5)}` : "N/A"
          });
        }
        
        if (session) {
          // Oturum geçerli olduğunda direkt olarak login formunu gizle
          setShowLoginForm(false);
          
          setUsername(session.username);
          setIsLoading(true);
          try {
            // Kaydedilmiş oturum ile takipçi analizini yükle
            console.log("Loading analysis with saved session...");
            const analysisResult = await analyzeFollowers(session.username);
            setFollowersData(analysisResult);
            console.log("Analysis loaded successfully with saved session");
          } catch (err) {
            console.error("Failed to load analysis with saved session:", err);
            setError(err instanceof Error ? err.message : 'Failed to load saved session data');
          } finally {
            setIsLoading(false);
          }
        }
      }
      
      // Session kontrolü tamamlandı, loading'i kaldır
      setInitialLoading(false);
    };

    checkSession();
  }, []);

  useEffect(() => {
    if (followersData) {
      setShowLoginForm(false);
    }
  }, [followersData]);

  useEffect(() => {
    if (username) {
      const checkOperationProgress = async () => {
        const unfollowProgress = await getOperationProgress('unfollow', username);
        const followProgress = await getOperationProgress('follow', username);
        
        if (unfollowProgress) {
          setSavedOperationInfo({
            operation: 'unfollow',
            currentIndex: unfollowProgress.currentIndex,
            totalItems: unfollowProgress.totalItems,
            timestamp: unfollowProgress.timestamp
          });
        } else if (followProgress) {
          setSavedOperationInfo({
            operation: 'follow',
            currentIndex: followProgress.currentIndex,
            totalItems: followProgress.totalItems,
            timestamp: followProgress.timestamp
          });
        } else {
          setSavedOperationInfo(null);
        }
      };
      
      checkOperationProgress();
    }
  }, [username]);

  // Reset pagination when changing tabs
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) {
      setError('Please enter a Bluesky username');
      return;
    }

    // Kullanıcı adını temizle ve formatla
    let formattedUsername = username.trim();
    if (formattedUsername.startsWith('@')) {
      formattedUsername = formattedUsername.substring(1);
    }
    if (!formattedUsername.includes('.')) {
      formattedUsername = `${formattedUsername}.bsky.social`;
    }
    
    // Temizlenmiş kullanıcı adını state'e kaydet
    setUsername(formattedUsername);

    // Save the username to IndexedDB
    if (typeof window !== 'undefined') {
      try {
        await saveLastUsername(formattedUsername);
      } catch (error) {
        console.error('Failed to save username to IndexedDB:', error);
      }
    }

    setIsLoading(true);
    setIsParallelFetching(true);
    setError(null);
    setCacheInfo(null);
    
    // Reset progress state
    setFetchProgress({
      followersProgress: { fetched: 0, total: 0 },
      followingProgress: { fetched: 0, total: 0 },
      analysisProgress: 0
    });

    try {
      // Authenticate user if password provided
      if (password) {
        try {
          console.log("Authenticating user:", formattedUsername);
          const authResponse = await authenticateUser(formattedUsername, password);
          console.log("Authentication successful, saving session");
          
          const tokenExpiry = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
          setSessionDebugInfo({
            username: formattedUsername,
            tokenExpiry: new Date(tokenExpiry).toLocaleString(),
            timeRemaining: "120 minutes (fresh)",
            didFormat: authResponse.did ? `${authResponse.did.substring(0, 10)}...${authResponse.did.substring(authResponse.did.length - 5)}` : "N/A"
          });
          
          saveSession(formattedUsername, authResponse);
        } catch (authError) {
          console.error('Authentication error:', authError);
        }
      }

      // Use the parallel fetching function with progress callback and caching
      const analysisResult = await analyzeFollowersWithProgress(
        formattedUsername,
        (progress) => {
          setFetchProgress(progress);
        }
      );
      
      // Check if data was from cache
      if (fetchProgress.analysisProgress === 100 && fetchProgress.followersProgress.fetched > 0) {
        // Data was loaded from cache
        const cachedData = await getAnalysisResults(formattedUsername);
        if (cachedData) {
          const now = Date.now();
          const age = formatTimeAgo(now - cachedData.timestamp);
          setCacheInfo({
            timestamp: cachedData.timestamp,
            age
          });
        }
      }
      
      setFollowersData(analysisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze followers');
    } finally {
      setIsLoading(false);
      setIsParallelFetching(false);
    }
  };

  // Add a function to format time ago
  const formatTimeAgo = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} ${language === 'TR' ? 'gün önce' : 'days ago'}`;
    if (hours > 0) return `${hours} ${language === 'TR' ? 'saat önce' : 'hours ago'}`;
    if (minutes > 0) return `${minutes} ${language === 'TR' ? 'dakika önce' : 'minutes ago'}`;
    return `${seconds} ${language === 'TR' ? 'saniye önce' : 'seconds ago'}`;
  };

  // Add a refresh function to force update the data
  const handleRefreshData = async () => {
    if (!username || isLoading || isRefreshing) return;
    
    setIsRefreshing(true);
    setCacheInfo(null);
    
    try {
      // First invalidate the cache to ensure fresh data
      await invalidateAnalysisCache(username);
      
      // Then force a fresh analysis
      const analysisResult = await analyzeFollowers(username, { forceRefresh: true });
      setFollowersData(analysisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Add a component to display cache info and refresh button
  const renderCacheInfo = () => {
    if (!cacheInfo || !followersData) return null;
    
    return (
      <div className="flex items-center justify-between mb-4 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
        <div className="text-gray-600 dark:text-gray-300">
          {language === 'TR' 
            ? `Veriler ${cacheInfo.age} önlemlendi. Son güncellenme: ${new Date(cacheInfo.timestamp).toLocaleString()}`
            : `Data cached ${cacheInfo.age}. Last updated: ${new Date(cacheInfo.timestamp).toLocaleString()}`}
        </div>
        <Button
          onClick={handleRefreshData}
          variant="secondary"
          size="sm"
          isLoading={isRefreshing}
        >
          {language === 'TR' ? 'Yenile' : 'Refresh'}
        </Button>
      </div>
    );
  };

  const handleNewSearch = () => {
    setShowLoginForm(true);
    setFollowersData(null);
    setUsername('');
    setPassword('');
    clearSession();
  };

  // initiateUnfollowWithWhitelist fonksiyonunu güncelle
  const initiateUnfollowWithWhitelist = async () => {
    // Check for active session first
    const validSession = await validateSession();
    
    // If no active session and no password, show error
    if (!validSession && !password) {
      setUnfollowError(language === 'TR' ? 'Şifre gerekli' : 'Password required');
      return;
    }

    // Reset state
    setUnfollowError('');
    setUnfollowInProgress(true);
    setUnfollowSuccess(null);
    setUnfollowProgress({ completed: 0, total: 0 });
    
    // Abort previous operation if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      // Check if followersData exists
      if (!followersData) {
        setUnfollowInProgress(false);
        setUnfollowError(language === 'TR' ? 'Takipçi verisi bulunamadı' : 'Follower data not found');
        return;
      }
      
      // Filter users to unfollow (those I follow but not in my whitelist)
      const usersToUnfollow = followersData.notFollowingBack.filter(
        user => !whitelistedNotFollowingUsers.some(whitelisted => whitelisted.did === user.did)
      );
      
      // Validate there are users to unfollow
      if (usersToUnfollow.length === 0) {
        setUnfollowInProgress(false);
        setUnfollowError(language === 'TR' ? 'Takip edilmeyen kullanıcı bulunamadı' : 'No users to unfollow');
        return;
      }
      
      setUnfollowProgress({ completed: 0, total: usersToUnfollow.length });
      
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
      
      setUnfollowSuccess({
        success: unfollowResult.success,
        failed: unfollowResult.failed
      });
      
      // Son hata varsa göster
      if (unfollowResult.errors && unfollowResult.errors.length > 0) {
        setDebugInfo(unfollowResult.errors[unfollowResult.errors.length - 1]);
      }
      
      // Başarılı işlemler sonrası önbelleği temizle
      if (unfollowResult.success > 0) {
        // Önbelleği geçersiz kıl
        await invalidateAnalysisCache(username);
        
        // Analizi yenile - API'dan en son verileri al
        const newAnalysis = await analyzeFollowers(username, { forceRefresh: true });
        setFollowersData(newAnalysis);
      }
    } catch (err: any) {
      console.error('Batch unfollow error:', err);
      
      // İptal edilme durumu için özel mesaj
      if (err.name === 'AbortError' || err.message === 'canceled') {
        setUnfollowError(language === 'TR' ? 'İşlem iptal edildi' : 'Operation was canceled');
      } else {
        setUnfollowError(err instanceof Error ? err.message : 'Unfollow operation failed');
      }
    } finally {
      setUnfollowInProgress(false);
      setShowAppPasswordInfo(false);
      // Controller'ı temizle
      abortControllerRef.current = null;
    }
  };

  // İşlemi iptal etme fonksiyonu ekle
  const cancelUnfollowOperation = () => {
    if (abortControllerRef.current) {
      console.log('Canceling unfollow operation...');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setShowUnfollowModal(false);
  };

  // Komponentin unmount olması durumunda da iptal et
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleBatchFollow = async () => {
    // Önce aktif oturum var mı kontrol et
    const validSession = await validateSession();
    
    // Eğer aktif oturum yoksa ve şifre girilmemişse hata göster
    if (!validSession && !password) {
      setFollowError(t.passwordRequired);
      return;
    }

    // Get the selected users - either from network users or directly selected users
    const usersToFollow = networkUsers.length > 0 ? networkUsers : getSelectedUsersArray();
    
    if (usersToFollow.length === 0) {
      setFollowError(t.noUsersToFollow);
      return;
    }

    setFollowInProgress(true);
    setFollowError(null);
    setFollowSuccess(null);
    setDebugInfo(null);
    setFollowProgress({ completed: 0, total: usersToFollow.length });

    try {
      // Eğer geçerli bir oturum varsa, şifreye gerek olmadan işlemi gerçekleştir
      const passwordToUse = validSession ? null : password;
      
      const followResult = await batchFollowUsers(
        username,
        passwordToUse,
        usersToFollow,
        (completed, total, lastError) => {
          setFollowProgress({ completed, total });
          if (lastError) {
            setDebugInfo(lastError);
          }
        }
      );
      
      setFollowSuccess({
        success: followResult.success,
        failed: followResult.failed
      });
      
      // Set last error if available
      if (followResult.errors && followResult.errors.length > 0) {
        setDebugInfo(followResult.errors[followResult.errors.length - 1]);
      }
      
      // Başarılı işlemler sonrası önbelleği temizle
      if (followResult.success > 0) {
        // Önbelleği geçersiz kıl
        await invalidateAnalysisCache(username);
        
        // Analizi yenile - API'dan en son verileri al
        const newAnalysis = await analyzeFollowers(username, { forceRefresh: true });
        setFollowersData(newAnalysis);
      }
    } catch (err) {
      setFollowError(err instanceof Error ? err.message : t.followFailed);
    } finally {
      setFollowInProgress(false);
      // Don't clear password anymore to retain it for future operations
      setShowNotFollowedSelection(false);
      setSelectedNotFollowedBackUsers({});
      setNetworkUsers([]);
    }
  };

  const getSelectedUsersArray = (): BlueSkyUser[] => {
    if (!followersData) return [];
    
    if (activeTab === 'mutuals') {
      return followersData.mutuals.filter(user => selectedMutualsUsers[user.did]);
    } else if (activeTab === 'notFollowedBack') {
      return followersData.notFollowedBack.filter(user => selectedNotFollowedBackUsers[user.did]);
    }
    
    return [];
  };

  const toggleUserSelection = (user: BlueSkyUser) => {
    if (activeTab === 'mutuals') {
      const newSelection = { ...selectedMutualsUsers };
      newSelection[user.did] = !newSelection[user.did];
      setSelectedMutualsUsers(newSelection);
    } else if (activeTab === 'notFollowedBack') {
      const newSelection = { ...selectedNotFollowedBackUsers };
      newSelection[user.did] = !newSelection[user.did];
      setSelectedNotFollowedBackUsers(newSelection);
    }
  };

  const selectAllUsers = () => {
    if (!followersData) return;
    
    if (activeTab === 'mutuals') {
      const allSelected: {[key: string]: boolean} = {};
      followersData.mutuals.forEach(user => {
        allSelected[user.did] = true;
      });
      setSelectedMutualsUsers(allSelected);
    } else if (activeTab === 'notFollowedBack') {
      const allSelected: {[key: string]: boolean} = {};
      followersData.notFollowedBack.forEach(user => {
        allSelected[user.did] = true;
      });
      setSelectedNotFollowedBackUsers(allSelected);
    }
  };

  const unselectAllUsers = () => {
    if (activeTab === 'mutuals') {
      setSelectedMutualsUsers({});
    } else if (activeTab === 'notFollowedBack') {
      setSelectedNotFollowedBackUsers({});
    }
  };

  const getSelectedCount = () => {
    if (activeTab === 'mutuals') {
      return Object.values(selectedMutualsUsers).filter(value => value).length;
    } else if (activeTab === 'notFollowedBack') {
      return Object.values(selectedNotFollowedBackUsers).filter(value => value).length;
    }
    return 0;
  };

  const showMutualSelectionUI = () => {
    setShowMutualsSelection(true);
    setSelectedMutualsUsers({});
  };

  const showNotFollowedSelectionUI = () => {
    setShowNotFollowedSelection(true);
    setSelectedNotFollowedBackUsers({});
  };

  const getSelectedMutualUsers = (): BlueSkyUser[] => {
    if (!followersData) return [];
    return followersData.mutuals.filter(user => selectedMutualsUsers[user.did]);
  };

  const showMutualOptions = () => {
    if (getSelectedMutualUsers().length === 0) {
      // Show an error if no mutuals selected
      // You could add a toast or alert here
      return;
    }
    setShowMutualNetworkModal(true);
  };

  const showFollowSelectedModal = () => {
    if (Object.values(selectedNotFollowedBackUsers).filter(value => value).length === 0) {
      // No users selected, show an error or notification
      return;
    }
    
    setNetworkUsers([]); // Clear any network users
    setShowFollowModal(true);
  };

  const fetchNetworkUsers = async () => {
    const selectedMutuals = getSelectedMutualUsers();
    if (selectedMutuals.length === 0) {
      setNetworkFetchError('No mutual users selected');
      return;
    }

    setFetchingNetworkUsers(true);
    setNetworkFetchError(null);
    // Artık Start over butonuna tıklandığında resetFlag değişiyor,
    // bu nedenle temiz bir başlangıç yapmak için networkUsers'ı burada temizlemek önemli
    setNetworkUsers([]);
    setResetFlag(false);
    setNetworkFetchProgress({ completed: 0, total: selectedMutuals.length });

    try {
      let allNetworkUsers: BlueSkyUser[] = [];
      const seenDids = new Set<string>(); // To avoid duplicates
      
      // Add the authenticated user's did to avoid recommending the user to follow themselves
      if (followersData?.notFollowingBack.length) {
        const firstUser = followersData.notFollowingBack[0];
        if (firstUser.handle.includes(username)) {
          seenDids.add(firstUser.did);
        }
      }
      
      // Also add all mutuals to avoid recommending already mutual users
      followersData?.mutuals.forEach(user => {
        seenDids.add(user.did);
      });
      
      // Also add all following to avoid recommending users you already follow
      followersData?.notFollowingBack.forEach(user => {
        seenDids.add(user.did);
      });
      
      for (let i = 0; i < selectedMutuals.length; i++) {
        const mutual = selectedMutuals[i];
        let followers: BlueSkyUser[] = [];
        let following: BlueSkyUser[] = [];
        
        try {
          if (networkOption === 'followers' || networkOption === 'both') {
            followers = await getAllFollowers(mutual.handle);
          }
          
          if (networkOption === 'following' || networkOption === 'both') {
            following = await getAllFollowing(mutual.handle);
          }
          
          // Combine and filter out duplicates and users already seen
          const combinedUsers = [...followers, ...following].filter(user => !seenDids.has(user.did));
          
          // Add these users to the seen set
          combinedUsers.forEach(user => seenDids.add(user.did));
          
          // Add to the network users list
          allNetworkUsers = [...allNetworkUsers, ...combinedUsers];
          
          // Update progress
          setNetworkFetchProgress({ 
            completed: i + 1, 
            total: selectedMutuals.length 
          });
          
        } catch (err) {
          console.error(`Error fetching network for ${mutual.handle}:`, err);
          // Continue with the next user
        }
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Deduplicate again just to be safe
      const uniqueNetworkUsers = Array.from(
        new Map(allNetworkUsers.map(user => [user.did, user])).values()
      );
      
      setNetworkUsers(uniqueNetworkUsers);
    } catch (err) {
      setNetworkFetchError(err instanceof Error ? err.message : 'Failed to fetch network users');
    } finally {
      setFetchingNetworkUsers(false);
    }
  };

  const renderUserList = (users: BlueSkyUser[]) => {
    if (users.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No users found in this category
        </div>
      );
    }

    // Pagination logic
    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);
    const totalPages = Math.ceil(users.length / usersPerPage);

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
    
    const renderPagination = () => {
      if (users.length <= usersPerPage) return null;

      return (
        <div className="flex justify-center mt-6 space-x-2">
          <Button 
            variant="outline"
            size="sm"
            onClick={() => paginate(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            {language === 'TR' ? 'Önceki' : 'Previous'}
          </Button>
          
          <div className="flex items-center px-3 bg-gray-100 dark:bg-gray-800 rounded">
            <span className="text-sm">
              {language === 'TR' 
                ? `Sayfa ${currentPage} / ${totalPages}` 
                : `Page ${currentPage} of ${totalPages}`}
            </span>
          </div>
          
          <Button 
            variant="outline"
            size="sm"
            onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            {language === 'TR' ? 'Sonraki' : 'Next'}
          </Button>
        </div>
      );
    };

    // Not Following Back tab with whitelist UI
    if (activeTab === 'notFollowingBack') {
      return (
        <div>
          {/* Kullanıcı Arama Alanı */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <FiShield className="mr-2" />
              {language === 'TR' ? 'Korumak İstediğiniz Hesapları Arayın' : 'Search Accounts to Whitelist'}
            </h3>
            <div className="flex space-x-2 mb-3">
              <Input
                placeholder={language === 'TR' ? "Kullanıcı adı ile ara..." : "Search by username..."}
                value={searchQueryNotFollowing}
                onChange={(e) => setSearchQueryNotFollowing(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleSearchNotFollowing}
                variant="secondary"
                isLoading={isSearchingNotFollowing}
                className="flex items-center"
              >
                <FiSearch className="mr-2" />
                {language === 'TR' ? 'Ara' : 'Search'}
              </Button>
            </div>
            
            {/* Arama Sonuçları */}
            {searchResultsNotFollowing.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4">
                <h4 className="text-sm font-medium mb-2">
                  {language === 'TR' ? 'Arama Sonuçları' : 'Search Results'}
                </h4>
                <div className="max-h-60 overflow-y-auto border rounded-lg divide-y dark:divide-gray-700">
                  {searchResultsNotFollowing.map(user => (
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
                        onClick={() => addToWhitelistNotFollowing(user)}
                      >
                        <FiPlus className="mr-1" /> {language === 'TR' ? 'Ekle' : 'Add'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Whitelist */}
            {whitelistedNotFollowingUsers.length > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mb-4">
                <h4 className="text-sm font-medium mb-2 flex items-center">
                  <FiShield className="mr-2 text-green-600 dark:text-green-400" />
                  {language === 'TR' ? 'Korunan Hesaplar' : 'Whitelisted Accounts'} ({whitelistedNotFollowingUsers.length})
                </h4>
                <div className="max-h-60 overflow-y-auto border rounded-lg">
                  {whitelistedNotFollowingUsers.map(user => renderUserItemNotFollowing(user, true))}
                </div>
              </div>
            )}
          </div>
          
          {/* Kullanıcı listesi başlığı */}
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <FiUserMinus className="mr-2" />
            {language === 'TR' ? 'Takip Etmeyen Hesaplar' : 'Not Following Back'}
          </h3>
          
          {/* Takipten Çık butonunun bulunduğu kısmı, onClick={initiateUnfollowWithWhitelist} yerine aşağıdaki gibi değiştir */}
          <div className="mb-4 flex justify-end">
            <Button
              className="flex items-center"
              variant="danger"
              onClick={showUnfollowModalForWhitelist}
            >
              <FiUserMinus className="mr-2" /> 
              {language === 'TR' 
                ? `${whitelistedNotFollowingUsers.length > 0 && followersData
                    ? `${followersData.notFollowingBack.length - whitelistedNotFollowingUsers.length} Hesabı` 
                    : 'Tümünü'} Takipten Çık` 
                : `Unfollow ${whitelistedNotFollowingUsers.length > 0 && followersData
                    ? `${followersData.notFollowingBack.length - whitelistedNotFollowingUsers.length} Accounts` 
                    : 'All'}`}
            </Button>
          </div>
          
          {/* Paginated user list */}
          <div className="border rounded-lg divide-y dark:divide-gray-700 mb-3">
            {currentUsers.map(user => renderUserItemNotFollowing(user))}
          </div>
          
          {renderPagination()}
        </div>
      );
    }

    // Mutuals tab with selection UI
    if (activeTab === 'mutuals' && showMutualsSelection) {
      return (
        <div>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded mb-3 flex justify-between items-center">
            <div>
              <span className="font-medium">Selected: {getSelectedCount()} of {users.length}</span>
            </div>
            <div className="space-x-2">
              <Button size="sm" onClick={selectAllUsers}>Select All</Button>
              <Button size="sm" variant="secondary" onClick={unselectAllUsers}>Unselect All</Button>
              <Button 
                size="sm" 
                variant="primary" 
                disabled={getSelectedCount() === 0}
                onClick={showMutualOptions}
              >
                <FiUsers className="mr-1" /> View Network Options
              </Button>
            </div>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {currentUsers.map((user, index) => (
              <div key={user.did} className="flex items-center py-3">
                <div 
                  className={`mr-3 p-1 rounded-md cursor-pointer ${selectedMutualsUsers[user.did] ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}
                  onClick={() => toggleUserSelection(user)}
                >
                  {selectedMutualsUsers[user.did] ? (
                    <FiCheck className="text-green-600 dark:text-green-400" />
                  ) : (
                    <FiUserPlus className="text-gray-500 dark:text-gray-400" />
                  )}
                </div>
                <div className="flex-grow">
                  <UserListItem user={user} index={indexOfFirstUser + index} />
                </div>
              </div>
            ))}
          </div>
          {renderPagination()}
        </div>
      );
    }
    
    // Not Followed Back tab with selection UI
    if (activeTab === 'notFollowedBack' && showNotFollowedSelection) {
      return (
        <div>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded mb-3 flex justify-between items-center">
            <div>
              <span className="font-medium">Selected: {getSelectedCount()} of {users.length}</span>
            </div>
            <div className="space-x-2">
              <Button size="sm" onClick={selectAllUsers}>Select All</Button>
              <Button size="sm" variant="secondary" onClick={unselectAllUsers}>Unselect All</Button>
              <Button 
                size="sm" 
                variant="primary" 
                disabled={getSelectedCount() === 0}
                onClick={showFollowSelectedModal}
              >
                <FiUserPlus className="mr-1" /> {t.batchFollowUsers}
              </Button>
            </div>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {currentUsers.map((user, index) => (
              <div key={user.did} className="flex items-center py-3">
                <div 
                  className={`mr-3 p-1 rounded-md cursor-pointer ${selectedNotFollowedBackUsers[user.did] ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}
                  onClick={() => toggleUserSelection(user)}
                >
                  {selectedNotFollowedBackUsers[user.did] ? (
                    <FiCheck className="text-green-600 dark:text-green-400" />
                  ) : (
                    <FiUserPlus className="text-gray-500 dark:text-gray-400" />
                  )}
                </div>
                <div className="flex-grow">
                  <UserListItem user={user} index={indexOfFirstUser + index} />
                </div>
              </div>
            ))}
          </div>
          {renderPagination()}
        </div>
      );
    }

    // Default user list with pagination (for other tabs or when no selection mode)
    return (
      <div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {currentUsers.map((user, index) => (
            <div key={user.did} className="py-2">
              <UserListItem user={user} index={indexOfFirstUser + index} />
            </div>
          ))}
        </div>
        {renderPagination()}
      </div>
    );
  };

  const openBlueskySite = () => {
    window.open('https://bsky.app/settings/app-passwords', '_blank', 'noopener,noreferrer');
  };

  const renderAppPasswordInfo = () => (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-4 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg"
    >
      <h4 className="font-bold mb-2">{language === 'TR' ? 'App Password oluşturma adımları:' : 'How to create an App Password:'}</h4>
      <ol className="list-decimal pl-5 space-y-2 text-sm">
        <li>{language === 'TR' ? 'Bluesky Ayarlar\'a gidin (mobil uygulama veya web üzerinden)' : 'Go to Bluesky Settings (via the mobile app or web)'}</li>
        <li>{language === 'TR' ? 'Gizlilik ve Güvenlik > Uygulama Şifreleri bölümüne gidin' : 'Navigate to Privacy & Security > App Passwords'}</li>
        <li>{language === 'TR' ? 'Şifre Ekle butonuna tıklayın' : 'Click Add App Password'}</li>
        <li>{language === 'TR' ? '"BlueSky Follower Analyzer" gibi bir etiket girin ve Oluştur butonuna tıklayın' : 'Enter a label like "BlueSky Follower Analyzer" and click Create'}</li>
        <li>{language === 'TR' ? 'Oluşturulan şifreyi kopyalayın ve buraya yapıştırın' : 'Copy the generated password and paste it here'}</li>
      </ol>
      <Button
        className="mt-4 flex items-center bg-orange-400 hover:bg-orange-600 text-white w-full"
        onClick={() => setShowMobileImagesModal(true)}
      >
        <FiImage className="mr-2" />
        {language === 'TR' ? 'Nasıl yapılır?' : 'How to do it?'}
      </Button>
      <Button
        className="mt-4 flex items-center bg-red-400 hover:bg-red-600 text-white w-full"
        onClick={openBlueskySite}
      >
        {language === 'TR' ? 'Bluesky App Password Ayarlarına Git' : 'Go to Bluesky App Password Settings'} <FiExternalLink className="ml-2" />
      </Button>

      <p className="mt-4 text-xs border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg animate-pulse">
        <strong className="text-red-600 dark:text-red-400">{language === 'TR' ? 'Not:' : 'Note:'}</strong> {language === 'TR' 
          ? 'App Password\'ler ana şifrenizi kullanmaktan daha güvenlidir. Hesabınıza sınırlı erişim sağlarlar ve istenildiği zaman iptal edilebilirler. Hesabınızın güvenliği için iki faktörlü kimlik doğrulama da açmayı unutmayın!'
          : 'App Passwords are more secure than using your main password. They allow limited access to your account and can be revoked at any time. Do not forget to enable two-factor authentication for your account security!'}
      </p>
    </motion.div>
  );

  const renderDebugInfo = () => {
    if (!debugInfo) return null;
    
    // Create a more user-friendly message for common errors
    let userFriendlyMessage = debugInfo.message;
    if (debugInfo.details && typeof debugInfo.details === 'object') {
      // Check for UpstreamFailure
      if (debugInfo.details.data?.error === 'UpstreamFailure') {
        userFriendlyMessage = 'Bluesky API server is experiencing issues. This is likely a temporary problem with Bluesky\'s servers, not with your request.';
      } 
      // Handle other common errors here if needed
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

  const continueFromLastPoint = async () => {
    if (!savedOperationInfo || !followersData || !password) {
      setError('Devam edilecek işlem bulunamadı veya eksik bilgi var.');
      return;
    }
    
    setFollowInProgress(true);
    setError(null);
    
    try {
      let operationResult;
      const startIndex = savedOperationInfo.currentIndex;
      const users = savedOperationInfo.operation === 'unfollow' 
        ? followersData.notFollowingBack 
        : followersData.notFollowedBack;
      
      setFollowProgress({ completed: startIndex, total: users.length });
      
      if (savedOperationInfo.operation === 'unfollow') {
        operationResult = await batchUnfollowUsersWithProgress(
          username,
          password,
          users,
          startIndex,
          (completed, total, lastError) => {
            setFollowProgress({ completed, total });
            if (lastError) {
              setDebugInfo(lastError);
            }
          }
        );
      } else {
        operationResult = await batchFollowUsersWithProgress(
          username,
          password,
          users,
          startIndex,
          (completed, total, lastError) => {
            setFollowProgress({ completed, total });
            if (lastError) {
              setDebugInfo(lastError);
            }
          }
        );
      }
      
      setFollowSuccess({
        success: operationResult.success,
        failed: operationResult.failed
      });
      
      // İşlem tamamen bittiyse ilerleme bilgisini temizle
      if (operationResult.lastProcessedIndex >= savedOperationInfo.totalItems) {
        clearOperationProgress(savedOperationInfo.operation, username);
        setSavedOperationInfo(null);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'İşlem sırasında bir hata oluştu');
    } finally {
      setFollowInProgress(false);
    }
  };

  // Token kalan süre bilgisi
  const formatRemainingTime = (timestamp: number): string => {
    const now = Date.now();
    const elapsed = now - timestamp;
    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours} saat ${minutes} dakika önce`;
  };

  // Feedback modal için içerik render eden yeni bir fonksiyon ekleyelim
  const renderFeedbackModal = () => {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.feedbackTitle}</h3>
            <button
              onClick={() => setShowFeedbackModal(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <FiX className="text-xl" />
            </button>
          </div>

          <div className="mb-6 text-gray-700 dark:text-gray-300">
            <p className="mb-4">{t.feedbackIntro}</p>
            
            <h4 className="font-medium mb-2">{t.feedbackAbout}</h4>
            <ul className="list-disc pl-5 mb-4 space-y-1">
              <li>{t.featureSuggestions}</li>
              <li>{t.bugReports}</li>
              <li>{t.userExperience}</li>
              <li>{t.designFeedback}</li>
              <li>{t.otherFeedback}</li>
            </ul>
            
            <p className="mb-2">{t.emailAt}</p>
            <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-md text-center mb-4">
              <a 
                href="mailto:blueanalyze@outlook.com?subject=BlueAnalyze Feedback"
                className="text-blue-600 dark:text-blue-400 font-medium"
              >
                blueanalyze@outlook.com
              </a>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              {language === 'TR' 
                ? 'Geri bildirimleriniz aracı geliştirmemize ve yeni özellikler eklememize yardımcı olur. Desteğiniz için teşekkür ederiz!'
                : 'Your feedback helps us improve the tool and develop new features. Thank you for your support!'}
            </p>
          </div>

          <div className="flex justify-between">
            <Button
              variant="secondary"
              onClick={() => setShowFeedbackModal(false)}
            >
              {language === 'TR' ? 'Kapat' : 'Close'}
            </Button>
            
            <Button
              variant="primary"
              className="flex items-center"
              onClick={() => {
                window.location.href = "mailto:blueanalyze@outlook.com?subject=BlueAnalyze Feedback";
              }}
            >
              <FiMessageSquare className="mr-2" />
              {t.sendEmail}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  };

  // Render debug panel
  const renderDebugPanel = () => {
    if (!showDebugPanel) return null;
    
    // State to store IndexedDB keys
    const [idbKeys, setIdbKeys] = useState<string[]>([]);

    // Function to get all keys from IndexedDB
    const getIndexedDBKeys = async () => {
      try {
        // Initialize the database
        const db = await idb.initDatabase();
        const transaction = db.transaction('auth', 'readonly');
        const store = transaction.objectStore('auth');
        
        // Get all keys that start with blueAnalyze_
        const request = store.getAllKeys();
        request.onsuccess = (event) => {
          const allKeys = (event.target as IDBRequest).result as IDBValidKey[];
          // Filter and convert keys to strings
          const filteredKeys = allKeys.filter(key => 
            typeof key === 'string' && key.toString().startsWith('blueAnalyze_')
          ).map(key => key.toString());
          
          setIdbKeys(filteredKeys);
          db.close();
        };
        
        request.onerror = (event) => {
          console.error('Error getting IndexedDB keys:', (event.target as IDBRequest).error);
          db.close();
        };
      } catch (error) {
        console.error('Failed to get IndexedDB keys:', error);
      }
    };
    
    // Call getIndexedDBKeys when debug panel is shown
    useEffect(() => {
      getIndexedDBKeys();
    }, [showDebugPanel]);
    
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3 text-xs">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-bold">Debug Panel: Session & Token Info</h4>
          <button 
            onClick={() => setShowDebugPanel(false)}
            className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <FiX />
          </button>
        </div>
        <div className="space-y-1">
          <p><strong>Session Status:</strong> {sessionDebugInfo ? "Active" : "None"}</p>
          {sessionDebugInfo && (
            <>
              <p><strong>Username:</strong> {sessionDebugInfo.username}</p>
              <p><strong>Token Expires:</strong> {sessionDebugInfo.tokenExpiry}</p>
              <p><strong>Time Remaining:</strong> {sessionDebugInfo.timeRemaining}</p>
              <p><strong>DID:</strong> {sessionDebugInfo.didFormat}</p>
              <p><strong>IndexedDB Keys:</strong> {idbKeys.join(', ')}</p>
            </>
          )}
          <div className="flex space-x-2 mt-2">
            <button 
              onClick={async () => {
                await clearSession();
                setSessionDebugInfo(null);
                getIndexedDBKeys(); // Refresh keys after clearing
                console.log("Session cleared");
              }}
              className="bg-red-500 text-white px-2 py-1 rounded text-xs"
            >
              Clear Session
            </button>
            <button 
              onClick={async () => {
                const session = await validateSession();
                console.log("Session validation result:", session);
                alert(JSON.stringify(session, null, 2));
              }}
              className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
            >
              Validate Session
            </button>
            <button 
              onClick={async () => {
                try {
                  const session = await getSession();
                  if (session) {
                    setSessionDebugInfo({
                      username: session.username,
                      tokenExpiry: session.tokenExpiry ? new Date(session.tokenExpiry).toLocaleString() : "N/A",
                      timeRemaining: session.tokenExpiry ? Math.round((session.tokenExpiry - Date.now()) / 1000 / 60) + " minutes" : "N/A",
                      didFormat: session.did ? `${session.did.substring(0, 10)}...${session.did.substring(session.did.length - 5)}` : "N/A"
                    });
                    console.log("Session debug info updated");
                  } else {
                    setSessionDebugInfo(null);
                    console.log("No session found");
                  }
                } catch (error) {
                  console.error("Failed to get session:", error);
                }
              }}
              className="bg-green-500 text-white px-2 py-1 rounded text-xs"
            >
              Refresh Info
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render initial loading screen
  const renderLoadingScreen = () => {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">
          {t.appTitle}
        </h1>
        
        <div className="relative w-20 h-20 mb-6">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-200 dark:border-blue-900 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-transparent border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin"></div>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400 text-center">
          {language === 'TR' ? 'Uygulama yükleniyor...' : 'Loading application...'}
        </p>
      </div>
    );
  };

  // Arama fonksiyonu ekle
  const handleSearchNotFollowing = async () => {
    if (!searchQueryNotFollowing.trim() || !followersData) return;
    
    setIsSearchingNotFollowing(true);
    try {
      const results = await searchUsers(searchQueryNotFollowing);
      // Sadece takip etmeyen kullanıcıları filtrele
      const filteredResults = results.filter(user => 
        followersData.notFollowingBack.some(notFollowing => notFollowing.did === user.did)
      );
      setSearchResultsNotFollowing(filteredResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearchingNotFollowing(false);
    }
  };

  // Whitelist'e kullanıcı ekleme
  const addToWhitelistNotFollowing = (user: BlueSkyUser) => {
    if (whitelistedNotFollowingUsers.some(whitelisted => whitelisted.did === user.did)) {
      return; // Zaten listede varsa ekleme
    }
    
    setWhitelistedNotFollowingUsers(prev => [...prev, user]);
    
    // Arama sonuçlarını temizle
    setSearchResultsNotFollowing([]);
    setSearchQueryNotFollowing('');
  };

  // Whitelist'ten kullanıcı çıkarma
  const removeFromWhitelistNotFollowing = (user: BlueSkyUser) => {
    setWhitelistedNotFollowingUsers(prev => 
      prev.filter(whitelisted => whitelisted.did !== user.did)
    );
  };

  // Not Following Back kullanıcıları için öğe render fonksiyonu
  const renderUserItemNotFollowing = (user: BlueSkyUser, isWhitelisted: boolean = false) => {
    return (
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
        
        {isWhitelisted ? (
          <Button
            variant="outline"
            className="text-xs px-2 py-1"
            onClick={() => removeFromWhitelistNotFollowing(user)}
          >
            <FiX className="mr-1" /> {language === 'TR' ? 'Kaldır' : 'Remove'}
          </Button>
        ) : (
          <Button
            variant="secondary"
            className="text-xs px-2 py-1"
            onClick={() => addToWhitelistNotFollowing(user)}
          >
            <FiShield className="mr-1" /> {language === 'TR' ? 'Koruma Ekle' : 'Whitelist'}
          </Button>
        )}
      </div>
    );
  };

  // showUnfollowModalForWhitelist fonksiyonunu ekle
  const showUnfollowModalForWhitelist = () => {
    if (!followersData || !followersData.notFollowingBack) return;
    
    // Log white-listed kullanıcı bilgilerini
    console.log(`Total users: ${followersData.notFollowingBack.length}, Whitelisted: ${whitelistedNotFollowingUsers.length}, To unfollow: ${followersData.notFollowingBack.length - whitelistedNotFollowingUsers.length}`);
    
    // Modalı göster
    setShowUnfollowModal(true);
    // Artık şifre bilgisine ihtiyaç duymuyoruz
    setShowAppPasswordInfo(false);
  };

  // Add new component to render progress display
  const renderProgressDisplay = () => {
    if (!isParallelFetching) return null;
    
    // Calculate percentages for progress bars
    const followersPercent = fetchProgress.followersProgress.total > 0
      ? Math.min(100, Math.round((fetchProgress.followersProgress.fetched / fetchProgress.followersProgress.total) * 100))
      : 0;
      
    const followingPercent = fetchProgress.followingProgress.total > 0
      ? Math.min(100, Math.round((fetchProgress.followingProgress.fetched / fetchProgress.followingProgress.total) * 100))
      : 0;
      
    // Overall completion percentage
    const completionPercent = Math.round(
      (followersPercent + followingPercent + fetchProgress.analysisProgress) / 3
    );
    
    return (
      <div className="w-full max-w-2xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          {language === 'TR' ? 'Analiz Ediliyor' : 'Analyzing'}
        </h2>
        
        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{language === 'TR' ? 'Takipçiler' : 'Followers'}</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {fetchProgress.followersProgress.fetched} / 
              {fetchProgress.followersProgress.total > 0 ? 
                ` ~${fetchProgress.followersProgress.total}` : 
                ' ???'}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div 
              className="bg-blue-500 h-2.5 rounded-full" 
              style={{ width: `${followersPercent}%` }}
            ></div>
          </div>
        </div>
        
        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{language === 'TR' ? 'Takip Edilenler' : 'Following'}</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {fetchProgress.followingProgress.fetched} / 
              {fetchProgress.followingProgress.total > 0 ? 
                ` ~${fetchProgress.followingProgress.total}` : 
                ' ???'}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div 
              className="bg-blue-500 h-2.5 rounded-full" 
              style={{ width: `${followingPercent}%` }}
            ></div>
          </div>
        </div>
        
        {fetchProgress.analysisProgress > 0 && (
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{language === 'TR' ? 'Veri Analizi' : 'Analyzing Data'}</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {fetchProgress.analysisProgress}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div 
                className="bg-blue-500 h-2.5 rounded-full" 
                style={{ width: `${fetchProgress.analysisProgress}%` }}
              ></div>
            </div>
          </div>
        )}
        
        <div className="mt-2 text-right">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {completionPercent}% {language === 'TR' ? 'Tamamlandı' : 'Complete'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="relative">
      <div className="w-full max-w-4xl mx-auto p-4">
        {initialLoading ? (
          // İlk yükleme ekranını göster
          renderLoadingScreen()
        ) : (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">
              {t.appTitle}
            </h2>
            
            {isParallelFetching && renderProgressDisplay()}
            
            {showLoginForm && !isParallelFetching && (
              <Card className="mb-8">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label={t.blueskyUsername}
                    placeholder="e.g. username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    isBlueskyUsername={true}
                  />
                  <Input
                    label={t.blueskyPassword}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setShowAppPasswordInfo(false)}
                  />
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setShowAppPasswordInfo(!showAppPasswordInfo)}
                      className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 text-sm flex items-center"
                    >
                      <FiInfo className="mr-1" />
                      {showAppPasswordInfo ? t.hideAppPasswordInfo : t.whatIsAppPassword}
                    </button>
                  </div>
                  {showAppPasswordInfo && renderAppPasswordInfo()}
                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    <Button
                      type="submit"
                      className="w-full max-w-xs"
                      isLoading={isLoading}
                    >
                      {isLoading ? t.loading : t.analyze}
                    </Button>

                    {savedOperationInfo && (
                      <Button
                        onClick={continueFromLastPoint}
                        disabled={!password || isLoading || followInProgress}
                        variant="secondary"
                      >
                        {t.continueProcess} ({savedOperationInfo.currentIndex}/{savedOperationInfo.totalItems})
                      </Button>
                    )}
                  </div>
                </form>
              </Card>
            )}

            {!showLoginForm && (
              <div className="mb-4 flex justify-end">
                <Button
                  onClick={handleNewSearch}
                  variant="outline"
                  size="sm"
                >
                  {t.newSearch}
                </Button>
              </div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-8 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200 rounded-lg flex items-start"
              >
                <FiAlertTriangle className="mt-1 mr-2 flex-shrink-0" />
                <div>{error}</div>
              </motion.div>
            )}

            {followersData && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className="mb-8">
                  <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
                    {t.resultsFor} @{username.split('.')[0]}
                  </h2>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex justify-center mb-2">
                        <FiUser className="text-blue-500 text-xl" />
                      </div>
                      <div className="text-2xl font-bold">{followersData.followerCount}</div>
                      <div className="text-gray-500 dark:text-gray-400 text-sm">{t.followers}</div>
                    </div>

                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex justify-center mb-2">
                        <FiUserPlus className="text-green-500 text-xl" />
                      </div>
                      <div className="text-2xl font-bold">{followersData.followingCount}</div>
                      <div className="text-gray-500 dark:text-gray-400 text-sm">{t.following}</div>
                    </div>

                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex justify-center mb-2">
                        <FiUserCheck className="text-purple-500 text-xl" />
                      </div>
                      <div className="text-2xl font-bold">{followersData.mutuals.length}</div>
                      <div className="text-gray-500 dark:text-gray-400 text-sm">{t.mutuals}</div>
                    </div>
                  </div>

                  <div className="border-b dark:border-gray-700 mb-6">
                    <div className="flex flex-nowrap overflow-x-auto -mb-px">
                      <button
                        className={`py-2 px-4 mr-2 flex items-center ${
                          activeTab === 'notFollowingBack'
                            ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                        onClick={() => setActiveTab('notFollowingBack')}
                      >
                        <FiUserMinus className="mr-2" />
                        <span>{t.notFollowingBack} ({followersData?.notFollowingBack.length || 0})</span>
                      </button>

                      <button
                        className={`py-2 px-4 mr-2 flex items-center ${
                          activeTab === 'notFollowedBack'
                            ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                        onClick={() => setActiveTab('notFollowedBack')}
                      >
                        <FiUserPlus className="mr-2" />
                        <span>{t.notFollowedBack} ({followersData?.notFollowedBack.length || 0})</span>
                      </button>

                      <button
                        className={`py-2 px-4 mr-2 flex items-center ${
                          activeTab === 'mutuals'
                            ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                        onClick={() => setActiveTab('mutuals')}
                      >
                        <FiUserCheck className="mr-2" />
                        <span>{t.mutuals} ({followersData?.mutuals.length || 0})</span>
                      </button>
                      
                      <button
                        className={`py-2 px-4 mr-2 flex items-center ${
                          activeTab === 'targetFollow'
                            ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                        onClick={() => setActiveTab('targetFollow')}
                      >
                        <FiTarget className="mr-2" />
                        <span>{t.targetFollow}</span>
                      </button>

                      <button
                        className={`py-2 px-4 mr-2 flex items-center ${
                          activeTab === 'unfollowAll'
                            ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                        onClick={() => setActiveTab('unfollowAll')}
                      >
                        <FiTrash className="mr-2" />
                        <span>{language === 'TR' ? 'Tümünü Takipten Çıkar' : 'Unfollow All'}</span>
                      </button>
                    </div>
                  </div>

                  {activeTab === 'notFollowingBack' && followersData?.notFollowingBack.length > 0 && (
                    <div className="mb-4 flex justify-end">
                      <Button
                        className="flex items-center"
                        variant="danger"
                        onClick={() => setShowUnfollowModal(true)}
                      >
                        <FiUserMinus className="mr-2" /> {t.unfollowAllNonFollowers}
                      </Button>
                    </div>
                  )}

                  {activeTab === 'notFollowedBack' && followersData?.notFollowedBack.length > 0 && (
                    <div className="mb-4 flex justify-end">
                      <Button
                        className="flex items-center"
                        variant="primary"
                        onClick={() => {
                          // Direkt olarak tüm 'Not Followed Back' kullanıcılarını takip et
                          setNetworkUsers(followersData.notFollowedBack);
                          setShowFollowModal(true);
                        }}
                      >
                        <FiUserPlus className="mr-2" /> {language === 'TR' ? 'Tümünü Takip Et' : 'Follow All'}
                      </Button>
                    </div>
                  )}

                  {(activeTab === 'mutuals') && !showMutualsSelection && (
                    <div className="mb-4 flex justify-end">
                      <Button
                        className="flex items-center"
                        variant="primary"
                        onClick={showMutualSelectionUI}
                      >
                        <FiUsers className="mr-2" /> View Network Options
                      </Button>
                    </div>
                  )}

                  {activeTab === 'notFollowingBack' && renderUserList(followersData?.notFollowingBack || [])}
                  {activeTab === 'notFollowedBack' && renderUserList(followersData?.notFollowedBack || [])}
                  {activeTab === 'mutuals' && renderUserList(followersData?.mutuals || [])}
                  {activeTab === 'targetFollow' && <TargetFollow />}
                  {activeTab === 'unfollowAll' && <UnfollowAll />}
                </Card>
              </motion.div>
            )}

            {/* Unfollow modal */}
            {showUnfollowModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {t.unfollowAllNonFollowers}
                    </h3>
                    <button
                      onClick={() => setShowUnfollowModal(false)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                      <FiX className="text-xl" />
                    </button>
                  </div>

                  <p className="mb-4 text-gray-700 dark:text-gray-300">
                    {language === 'TR' 
                      ? `${followersData && whitelistedNotFollowingUsers.length > 0 
                          ? followersData.notFollowingBack.length - whitelistedNotFollowingUsers.length 
                          : followersData?.notFollowingBack.length} hesabı takipten çıkmak üzeresiniz. Bu işlem geri alınamaz.`
                      : `You are about to unfollow ${followersData && whitelistedNotFollowingUsers.length > 0 
                          ? followersData.notFollowingBack.length - whitelistedNotFollowingUsers.length 
                          : followersData?.notFollowingBack.length} accounts. This action cannot be undone.`
                    }
                  </p>
                  
                  {whitelistedNotFollowingUsers.length > 0 && (
                    <p className="mb-4 text-gray-700 dark:text-gray-300 flex items-center">
                      <FiShield className="mr-2 text-green-600 dark:text-green-400" />
                      {language === 'TR'
                        ? `${whitelistedNotFollowingUsers.length} korumalı hesap takipten çıkarılmayacak.`
                        : `${whitelistedNotFollowingUsers.length} whitelisted accounts will be preserved.`
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
                      <p className="text-sm text-blue-600 dark:text-blue-400 text-center mt-1">
                        {language === 'TR'
                          ? "Gerçek takipten çıkarma işlemi yürütülüyor, lütfen bekleyin..."
                          : "Real unfollow operation in progress, please wait..."
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
                    <div className="flex flex-col space-y-4">
                      {/* Şifre alanı kaldırıldı */}
                      
                      <div className="flex items-center space-x-4">
                        <Button
                          variant="secondary"
                          className="flex-1"
                          onClick={cancelUnfollowOperation}
                        >
                          {language === 'TR' ? 'İptal' : 'Cancel'}
                        </Button>
                        <Button
                          onClick={initiateUnfollowWithWhitelist}
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

            {/* Follow modal */}
            {showFollowModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {language === 'TR' ? 'Seçili Kullanıcıları Takip Et' : 'Follow Selected Users'}
                    </h3>
                    <button
                      onClick={() => setShowFollowModal(false)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                      <FiX className="text-xl" />
                    </button>
                  </div>

                  <p className="mb-4 text-gray-700 dark:text-gray-300">
                    {language === 'TR'
                      ? `Seçili ${networkUsers.length} hesabı takip etmek üzeresiniz.`
                      : `You are about to follow ${networkUsers.length} selected accounts.`
                    }
                  </p>

                  {followError && (
                    <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200 rounded text-sm">
                      {followError}
                    </div>
                  )}

                  {followSuccess && (
                    <div className={`mb-4 p-3 ${
                        followSuccess.success > 0 && followSuccess.failed === 0 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-200' 
                          : followSuccess.success === 0 && followSuccess.failed > 0
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200'
                            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-200'
                      } rounded text-sm`}>
                      <div className="flex items-start">
                        {followSuccess.success > 0 && followSuccess.failed === 0 ? (
                          <FiCheck className="mr-2 mt-0.5 text-green-600 dark:text-green-400" />
                        ) : followSuccess.success === 0 && followSuccess.failed > 0 ? (
                          <FiAlertTriangle className="mr-2 mt-0.5 text-red-600 dark:text-red-400" />
                        ) : (
                          <FiInfo className="mr-2 mt-0.5 text-yellow-600 dark:text-yellow-400" />
                        )}
                        <div>
                          {language === 'TR'
                            ? (
                                <>
                                  {followSuccess.success > 0 && <span className="font-medium">{followSuccess.success} hesap başarıyla takip edildi.</span>}
                                  {followSuccess.failed > 0 && <span className="font-medium">{followSuccess.success > 0 ? ' ' : ''}{followSuccess.failed} hesap takip edilemedi.</span>}
                                  {followSuccess.success === 0 && followSuccess.failed > 0 && <div className="mt-1">Tekrar denemek için aşağıdaki butona tıklayın.</div>}
                                </>
                              )
                            : (
                                <>
                                  {followSuccess.success > 0 && <span className="font-medium">Successfully followed {followSuccess.success} accounts.</span>}
                                  {followSuccess.failed > 0 && <span className="font-medium">{followSuccess.success > 0 ? ' ' : ''}Failed to follow {followSuccess.failed} accounts.</span>}
                                  {followSuccess.success === 0 && followSuccess.failed > 0 && <div className="mt-1">Click the button below to try again.</div>}
                                </>
                              )
                          }
                        </div>
                      </div>
                    </div>
                  )}

                  {showDebugInfo && renderDebugInfo()}

                  {followInProgress ? (
                    <div className="mb-4">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-2">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full"
                          style={{ width: `${(followProgress.completed / followProgress.total) * 100}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                        {language === 'TR'
                          ? `İşleniyor: ${followProgress.completed} / ${followProgress.total}`
                          : `Processing ${followProgress.completed} of ${followProgress.total}`
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col space-y-4">
                      {/* Şifre girişi sadece oturum yoksa gösterilsin */}
                      {!getSession() && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t.blueskyPassword}
                          </label>
                          <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="App Password"
                          />
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-4">
                        <Button
                          variant="secondary"
                          className="flex-1"
                          onClick={() => setShowFollowModal(false)}
                        >
                          {language === 'TR' ? 'İptal' : 'Cancel'}
                        </Button>
                        <Button
                          onClick={handleBatchFollow}
                          variant="primary"
                          className="flex-1"
                          isLoading={followInProgress}
                        >
                          {language === 'TR' ? 'Takip Et' : 'Follow'}
                        </Button>
                      </div>
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

            {/* Mutual Network Modal */}
            {showMutualNetworkModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Network Options</h3>
                    <button
                      onClick={() => setShowMutualNetworkModal(false)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                      <FiX className="text-xl" />
                    </button>
                  </div>

                  <p className="mb-4 text-gray-700 dark:text-gray-300">
                    You've selected <strong>{getSelectedMutualUsers().length}</strong> mutual accounts. 
                    Choose which network of these accounts you'd like to follow:
                  </p>

                  {networkFetchError && (
                    <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200 rounded text-sm">
                      {networkFetchError}
                    </div>
                  )}

                  {fetchingNetworkUsers ? (
                    <div className="mb-4">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-2">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full"
                          style={{ width: `${(networkFetchProgress.completed / networkFetchProgress.total) * 100}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                        Fetching networks: {networkFetchProgress.completed} of {networkFetchProgress.total}
                      </p>
                    </div>
                  ) : resetFlag ? (
                    <div className="mb-6 grid grid-cols-1 gap-4">
                      <Button
                        className="flex items-center justify-center"
                        onClick={() => {
                          setNetworkOption('followers');
                          setResetFlag(false);
                          // Temiz bir başlangıç için networkUsers'ı sıfırla
                          setNetworkUsers([]);
                          fetchNetworkUsers();
                        }}
                        variant="outline"
                      >
                        <FiUserPlus className="mr-2" /> Follow their followers
                      </Button>
                      <Button
                        className="flex items-center justify-center"
                        onClick={() => {
                          setNetworkOption('following');
                          setResetFlag(false);
                          // Temiz bir başlangıç için networkUsers'ı sıfırla
                          setNetworkUsers([]);
                          fetchNetworkUsers();
                        }}
                        variant="outline"
                      >
                        <FiUserCheck className="mr-2" /> Follow accounts they follow
                      </Button>
                      <Button
                        className="flex items-center justify-center"
                        onClick={() => {
                          setNetworkOption('both');
                          setResetFlag(false);
                          // Temiz bir başlangıç için networkUsers'ı sıfırla
                          setNetworkUsers([]);
                          fetchNetworkUsers();
                        }}
                        variant="primary"
                      >
                        <FiUsers className="mr-2" /> Follow their entire network
                      </Button>
                    </div>
                  ) : networkUsers.length > 0 ? (
                    <div className="mb-4">
                      <p className="text-green-600 dark:text-green-400 font-medium">
                        Found {networkUsers.length} unique accounts in the selected network!
                      </p>
                      <div className="mt-4 flex flex-col space-y-2">
                        <Button 
                          onClick={() => {
                            setShowMutualNetworkModal(false);
                            setTimeout(() => setShowFollowModal(true), 100);
                          }}
                          variant="primary"
                        >
                          Follow these {networkUsers.length} accounts
                        </Button>
                        <Button
                          onClick={() => {
                            // Start over butonuna tıklandığında
                            // Sadece resetFlag'i değiştir, networkUsers henüz temizleme
                            setResetFlag(true);
                          }}
                          variant="secondary"
                        >
                          Start over
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-6 grid grid-cols-1 gap-4">
                      <Button
                        className="flex items-center justify-center"
                        onClick={() => {
                          setNetworkOption('followers');
                          setResetFlag(false);
                          fetchNetworkUsers();
                        }}
                        variant="outline"
                      >
                        <FiUserPlus className="mr-2" /> Follow their followers
                      </Button>
                      <Button
                        className="flex items-center justify-center"
                        onClick={() => {
                          setNetworkOption('following');
                          setResetFlag(false);
                          fetchNetworkUsers();
                        }}
                        variant="outline"
                      >
                        <FiUserCheck className="mr-2" /> Follow accounts they follow
                      </Button>
                      <Button
                        className="flex items-center justify-center"
                        onClick={() => {
                          setNetworkOption('both');
                          setResetFlag(false);
                          fetchNetworkUsers();
                        }}
                        variant="primary"
                      >
                        <FiUsers className="mr-2" /> Follow their entire network
                      </Button>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button
                      variant="secondary"
                      onClick={() => setShowMutualNetworkModal(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Yarım kalan işlem bilgisi */}
            {savedOperationInfo && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-md text-sm">
                <p><span className="font-medium">Process:</span> {savedOperationInfo.operation === 'unfollow' ? 'Unfollow' : 'Follow'}</p>
                <p><span className="font-medium">Progress:</span> {savedOperationInfo.currentIndex}/{savedOperationInfo.totalItems} ({Math.round((savedOperationInfo.currentIndex / savedOperationInfo.totalItems) * 100)}%)</p>
                <p><span className="font-medium">Started:</span> {formatRemainingTime(savedOperationInfo.timestamp)}</p>
              </div>
            )}

            {/* Footer ile feedback button */}
            <div className="mt-8 mb-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Found this app useful? Have a suggestion?
              </p>
              <Button
                variant="outline"
                className="inline-flex items-center"
                onClick={() => setShowFeedbackModal(true)}
              >
                <FiMessageSquare className="mr-2" />
                {t.sendFeedback}
              </Button>
              
              <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                Built with 💙 by{" "}
                <a 
                  href="https://bsky.app/profile/vortic0.bsky.social" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 inline-flex items-center"
                >
                  vortic0 <FiExternalLink className="ml-1 text-xs" />
                </a>
              </div>
            </div>
            
            {/* Feedback modal */}
            {showFeedbackModal && renderFeedbackModal()}

            {/* Mobile Images Modal */}
            {showMobileImagesModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full p-6"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {language === 'TR' ? 'Nasıl yapılır?' : 'How to do it?'}
                    </h3>
                    <button
                      onClick={() => {
                        setShowMobileImagesModal(false);
                        setCurrentImageIndex(0);
                      }}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                      <FiX className="text-xl" />
                    </button>
                  </div>

                  <div className="relative">
                    <div className="relative aspect-[9/16] w-full max-w-md mx-auto">
                      <img
                        src={`/mobile/${currentImageIndex + 1}.${currentImageIndex + 1 === 5 ? 'jpeg' : 'PNG'}`}
                        alt={`Mobile screenshot ${currentImageIndex + 1}`}
                        className="w-full h-full object-contain rounded-lg"
                      />
                    </div>

                    {/* Navigation Buttons */}
                    <button
                      onClick={() => setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : 6))}
                      className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-white dark:bg-gray-800 p-2 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <FiChevronLeft className="text-xl" />
                    </button>
                    <button
                      onClick={() => setCurrentImageIndex((prev) => (prev < 6 ? prev + 1 : 0))}
                      className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-white dark:bg-gray-800 p-2 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <FiChevronRight className="text-xl" />
                    </button>
                  </div>

                  {/* Image Counter */}
                  <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
                    {currentImageIndex + 1} / 7
                  </div>

                  {/* Thumbnail Navigation */}
                  <div className="mt-4 flex justify-center gap-2">
                    {[1, 2, 3, 4, 5, 6, 7].map((num, index) => (
                      <button
                        key={num}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`w-12 h-12 rounded overflow-hidden ${
                          currentImageIndex === index ? 'ring-2 ring-blue-500' : ''
                        }`}
                      >
                        <img
                          src={`/mobile/${num}.${num === 5 ? 'jpeg' : 'PNG'}`}
                          alt={`Thumbnail ${num}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </motion.div>
              </div>
            )}

            {cacheInfo && renderCacheInfo()}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default FollowerAnalysis; 