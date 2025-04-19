import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiSearch, FiUserPlus, FiUsers, FiLoader, FiSettings, FiClock, FiAlertCircle, FiCheck } from 'react-icons/fi';
import type { BlueSkyUser, DebugInfo } from '../../services/blueskyAPI';
import { searchUsers, getUserFollowers, getUserFollowing, batchFollowUsersWithProgress, validateSession, invalidateAnalysisCache } from '../../services/blueskyAPI';
import { useLanguage } from '../../contexts/LanguageContext';
import { useOperation } from '../../contexts/OperationContext';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import axios from 'axios';
import * as idb from '../../services/indexedDBService';

interface TargetUserCardProps {
  user: BlueSkyUser;
  onSelectFollowers: () => void;
  onSelectFollowing: () => void;
  isLoading: boolean;
  t: any; // Translations
  language: string; // Add language prop
}

const TargetUserCard: React.FC<TargetUserCardProps> = ({ user, onSelectFollowers, onSelectFollowing, isLoading, t, language }) => {
  return (
    <Card className="my-4 overflow-hidden">
      <div className="flex items-center p-4">
        <div className="flex-shrink-0">
          <img 
            src={user.avatar || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png'} 
            alt={user.displayName}
            className="h-16 w-16 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
          />
        </div>
        <div className="ml-4 flex-1">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{user.displayName}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">@{user.handle}</p>
          <div className="flex mt-2 space-x-4 text-sm">
            <span className="text-gray-700 dark:text-gray-300">
              <strong>{user.followersCount || 0}</strong> {language === 'EN' ? 'followers' : 'takipçi'}
            </span>
            <span className="text-gray-700 dark:text-gray-300">
              <strong>{user.followsCount || 0}</strong> {language === 'EN' ? 'following' : 'takip'}
            </span>
          </div>
        </div>
      </div>
      <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 sm:flex sm:justify-end space-x-2">
        <Button 
          onClick={onSelectFollowers}
          variant="primary"
          disabled={isLoading}
          className="mb-2 sm:mb-0"
        >
          {isLoading ? <FiLoader className="animate-spin mr-2" /> : <FiUsers className="mr-2" />}
          {t.followFollowers}
        </Button>
        <Button 
          onClick={onSelectFollowing}
          variant="secondary"
          disabled={isLoading}
        >
          {isLoading ? <FiLoader className="animate-spin mr-2" /> : <FiUserPlus className="mr-2" />}
          {t.followFollowing}
        </Button>
      </div>
    </Card>
  );
};

const TargetFollow: React.FC = () => {
  const { t, language } = useLanguage();
  const { 
    operation, 
    startOperation, 
    updateProgress, 
    setTimeoutStatus, 
    togglePause, 
    completeOperation, 
    resetOperation 
  } = useOperation();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [targetUser, setTargetUser] = useState<BlueSkyUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [followProgress, setFollowProgress] = useState({ completed: 0, total: 0 });
  const [analysisProgress, setAnalysisProgress] = useState({ phase: '', completed: 0, total: 0 });
  const [followSuccess, setFollowSuccess] = useState<{success: number, failed: number} | null>(null);
  const [isProcessComplete, setIsProcessComplete] = useState(false);
  const [password, setPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [targetUsers, setTargetUsers] = useState<BlueSkyUser[]>([]);
  const [followType, setFollowType] = useState<'followers' | 'following' | null>(null);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState<BlueSkyUser[]>([]);
  const [followCount, setFollowCount] = useState<number>(0);
  const [showFollowOptions, setShowFollowOptions] = useState(false);
  const [customFollowCount, setCustomFollowCount] = useState<string>('');
  const [followError, setFollowError] = useState<string>('');
  const [followInProgress, setFollowInProgress] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Record<string, boolean>>({});
  const [followingUsers, setFollowingUsers] = useState<BlueSkyUser[]>([]);
  const [username, setUsername] = useState('');
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [showUserResults, setShowUserResults] = useState(false);
  
  // İşlem durumu için UI'da kullanılacak referanslar
  const isActiveProcess = operation.type === 'targetFollow' && operation.isProcessing;
  const isWaitingTimeout = operation.waitingTimeout;
  const isPaused = operation.isPaused;
  
  // Add abort controller reference for cancelling operations
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Sayfa yüklendiğinde devam eden bir targetFollow işlemi var mı kontrol et
  useEffect(() => {
    if (operation.type === 'targetFollow' && operation.isProcessing) {
      console.log("Continuing existing target follow operation", operation);
      
      if (operation.targetUserDid) {
        // Hedef kullanıcı bilgilerini yükle
        const user: BlueSkyUser = {
          did: operation.targetUserDid,
          handle: operation.targetUser || '',
          displayName: operation.targetUserDisplayName || operation.targetUser || '',
        };
        
        setTargetUser(user);
        setFollowType(operation.followType || null);
        
        // İşlem durumunu UI'a yansıt
        setFollowProgress({
          completed: operation.completed,
          total: operation.totalUsers
        });
        
        // Aktif işlemi göster
        setIsLoading(true);
        
        // İşlem tamamlandıysa başarı mesajını göster
        if (operation.isComplete) {
          setFollowSuccess({
            success: operation.success,
            failed: operation.failed
          });
          setIsProcessComplete(true);
          setIsLoading(false);
        }
      }
    }
  }, [operation]);

  // Kullanıcının aktif oturumunu kontrol eden fonksiyon
  const checkActiveSession = async () => {
    const session = await validateSession();
    setHasActiveSession(!!session);
    return !!session;
  };
  
  // Kullanıcı profil bilgisini daha detaylı getir
  const fetchFullUserProfile = async (handle: string): Promise<BlueSkyUser | null> => {
    try {
      const session = await validateSession();
      const response = await axios.get('https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile', {
        params: { actor: handle },
        headers: session ? { 'Authorization': `Bearer ${session.accessJwt}` } : {}
      });
      
      if (response.data) {
        return {
          did: response.data.did,
          handle: response.data.handle,
          displayName: response.data.displayName || response.data.handle,
          avatar: response.data.avatar,
          description: response.data.description,
          followersCount: response.data.followersCount || 0,
          followsCount: response.data.followsCount || 0
        };
      }
      return null;
    } catch (error) {
      console.error('Kullanıcı profili getirme hatası:', error);
      return null;
    }
  };
  
  // Hedef kullanıcıyı arama fonksiyonu
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      setError(t.usernameRequired);
      return;
    }
    
    // Kullanıcı adını temizle ve formatla
    let formattedSearchTerm = searchTerm.trim();
    if (formattedSearchTerm.startsWith('@')) {
      formattedSearchTerm = formattedSearchTerm.substring(1);
    }
    if (!formattedSearchTerm.includes('.')) {
      formattedSearchTerm = `${formattedSearchTerm}.bsky.social`;
    }
    
    // Temizlenmiş kullanıcı adını state'e kaydet
    setSearchTerm(formattedSearchTerm);
    
    setIsSearching(true);
    setError(null);
    setTargetUser(null);
    
    try {
      await checkActiveSession();
      
      const results = await searchUsers(formattedSearchTerm, 1);
      if (results.length > 0) {
        const fullProfile = await fetchFullUserProfile(results[0].handle);
        
        if (fullProfile) {
          setTargetUser(fullProfile);
        } else {
          setTargetUser(results[0]);
        }
      } else {
        setError(t.userNotFound);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : (language === 'EN' ? 'User search failed' : 'Kullanıcı arama başarısız oldu'));
    } finally {
      setIsSearching(false);
    }
  };
  
  // Get cached user follows to avoid redundant API calls
  const getCachedUserFollows = async (): Promise<Set<string> | null> => {
    try {
      // Check if there's a session and get username
      const session = await validateSession();
      if (!session) return null;
      
      // Try to get cached analysis results
      const cachedData = await idb.getAnalysisResults(session.did);
      if (!cachedData || !cachedData.result) return null;
      
      // Create a Set of DIDs the user is already following
      const followingDids = new Set<string>();
      
      // Add DIDs from mutuals
      if (cachedData.result.mutuals) {
        cachedData.result.mutuals.forEach((user: BlueSkyUser) => {
          followingDids.add(user.did);
        });
      }
      
      // Add DIDs from notFollowingBack
      if (cachedData.result.notFollowingBack) {
        cachedData.result.notFollowingBack.forEach((user: BlueSkyUser) => {
          followingDids.add(user.did);
        });
      }
      
      console.log(`Using cached following data with ${followingDids.size} follows`);
      return followingDids;
    } catch (error) {
      console.error('Error getting cached follows:', error);
      return null;
    }
  };
  
  // Hedef kullanıcının takipçilerini analiz et
  const analyzeUserFollowers = async () => {
    if (!targetUser) return;
    
    setIsAnalyzing(true);
    setError(null);
    setAnalysisProgress({ phase: language === 'EN' ? 'Getting Followers' : 'Takipçiler Alınıyor', completed: 0, total: 100 });

    try {
      // Aktif oturum kontrolü
      const hasSession = await checkActiveSession();
      
      if (!hasSession && !password) {
        setShowPasswordInput(true);
        setFollowType('followers');
        setIsAnalyzing(false);
        return;
      }
      
      // Hedef kullanıcının tüm takipçilerini al
      setIsProcessing(true);
      setAnalysisProgress({ phase: language === 'EN' ? 'Getting Followers' : 'Takipçiler Alınıyor', completed: 0, total: 100 });
      
      // Kullanıcının tahmini takipçi sayısı
      const estimatedFollowerCount = targetUser.followersCount || 0;
      // Maksimum 5000 takipçi alınacak - API kısıtlamaları nedeniyle
      const fetchLimit = Math.min(estimatedFollowerCount, 5000);
      
      const allFollowers = await getUserFollowers(targetUser.did, fetchLimit);
      
      // Takipçi alımı bitti, şimdi filtreleme aşaması
      setAnalysisProgress({ phase: language === 'EN' ? 'Filtering Followers' : 'Takipçiler Filtreleniyor', completed: 0, total: 100 });
      
      // İlk olarak önbelleğe alınmış takip edilen verilerini kontrol et
      const cachedFollowingDids = await getCachedUserFollows();
      
      if (cachedFollowingDids) {
        // Önbellekten takip edilen verilerini kullan
        setAnalysisProgress({ phase: language === 'EN' ? 'Filtering From Cache' : 'Önbellekten Filtreleniyor', completed: 0, total: 100 });
        
        // Takip edilmeyen kullanıcıları filtrele
        const notFollowing = allFollowers.filter(user => !cachedFollowingDids.has(user.did));
        
        setFilteredUsers(notFollowing);
        setTargetUsers(notFollowing);
        setFollowCount(notFollowing.length);
        setCustomFollowCount(notFollowing.length.toString());
        
        setShowFollowOptions(true);
        setIsProcessing(false);
        setIsAnalyzing(false);
        return;
      }
      
      // Önbellekte veri yoksa, API ile al
      if (hasSession) {
        const session = await validateSession();
        if (session) {
          // Mevcut oturum ile takip ettiklerini al
          const userFollowing = await axios.get('https://public.api.bsky.app/xrpc/app.bsky.graph.getFollows', {
            params: { actor: session.did, limit: 100 },
            headers: { 'Authorization': `Bearer ${session.accessJwt}` }
          });
          
          // İlk sayfa alındı, toplam takip edilen sayısını belirle
          let allUserFollowing: any[] = userFollowing.data.follows || [];
          let cursor = userFollowing.data.cursor;
          const totalFollowing = userFollowing.data.follows?.length || 0;
          
          // 100'den fazla takip edileni varsa, sayfalar halinde tümünü al
          if (cursor) {
            setAnalysisProgress({ 
              phase: language === 'EN' ? 'Getting Your Following' : 'Kendi Takip Edilenleriniz Alınıyor', 
              completed: allUserFollowing.length, 
              total: Math.min(5000, totalFollowing * 2) // tahmini toplam
            });
            
            // Takip edilenleri sayfalı olarak al
            while (cursor && allUserFollowing.length < 5000) {
              try {
                const nextPage = await axios.get('https://public.api.bsky.app/xrpc/app.bsky.graph.getFollows', {
                  params: { actor: session.did, cursor, limit: 100 },
                  headers: { 'Authorization': `Bearer ${session.accessJwt}` }
                });
                
                if (nextPage.data && nextPage.data.follows) {
                  allUserFollowing = [...allUserFollowing, ...nextPage.data.follows];
                  cursor = nextPage.data.cursor;
                  
                  setAnalysisProgress({ 
                    phase: language === 'EN' ? 'Getting Your Following' : 'Kendi Takip Edilenleriniz Alınıyor', 
                    completed: allUserFollowing.length, 
                    total: Math.min(5000, totalFollowing * 2)
                  });
                  
                  // API rate limit koruması
                  await new Promise(resolve => setTimeout(resolve, 300));
                } else {
                  cursor = undefined;
                }
              } catch (error) {
                console.error('Takip edilenler alınırken hata:', error);
                break;
              }
            }
          }
          
          setAnalysisProgress({ phase: language === 'EN' ? 'Filtering Non-Following' : 'Takip Edilmeyenler Filtreleniyor', completed: 0, total: 100 });
          
          // Takip edilmeyen kullanıcıları filtrele
          const followingDids = new Set(allUserFollowing.map((u: any) => u.did));
          const notFollowing = allFollowers.filter(user => !followingDids.has(user.did));
          
          setFilteredUsers(notFollowing);
          setTargetUsers(notFollowing);
          setFollowCount(notFollowing.length); // Varsayılan olarak tüm filtrelenmiş kullanıcıları takip et
          setCustomFollowCount(notFollowing.length.toString());
        }
      } else {
        // Oturum yoksa filtreleme yapmadan tüm takipçilerini göster
        setFilteredUsers(allFollowers);
        setTargetUsers(allFollowers);
        setFollowCount(allFollowers.length);
        setCustomFollowCount(allFollowers.length.toString());
      }
      
      setShowFollowOptions(true);
      setIsProcessing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.analysisFailed);
      setIsProcessing(false);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Hedef kullanıcının takip ettiklerini analiz et
  const analyzeUserFollowing = async () => {
    if (!targetUser) return;
    
    setIsAnalyzing(true);
    setError(null);
    setAnalysisProgress({ phase: language === 'EN' ? 'Getting Following Users' : 'Takip Edilenler Alınıyor', completed: 0, total: 100 });

    try {
      // Aktif oturum kontrolü
      const hasSession = await checkActiveSession();
      
      if (!hasSession && !password) {
        setShowPasswordInput(true);
        setFollowType('following');
        setIsAnalyzing(false);
        return;
      }
      
      // Hedef kullanıcının tüm takip ettiklerini al
      setIsProcessing(true);
      setAnalysisProgress({ phase: language === 'EN' ? 'Getting Following Users' : 'Takip Edilenler Alınıyor', completed: 0, total: 100 });
      
      // Kullanıcının tahmini takip ettiği sayısı
      const estimatedFollowingCount = targetUser.followsCount || 0;
      // Maksimum 5000 takip edilen alınacak - API kısıtlamaları nedeniyle
      const fetchLimit = Math.min(estimatedFollowingCount, 5000);
      
      const allFollowing = await getUserFollowing(targetUser.did, fetchLimit);
      
      // Takip edilen alımı bitti, şimdi filtreleme aşaması
      setAnalysisProgress({ phase: language === 'EN' ? 'Filtering Following Users' : 'Takip Edilenler Filtreleniyor', completed: 0, total: 100 });
      
      // İlk olarak önbelleğe alınmış takip edilen verilerini kontrol et
      const cachedFollowingDids = await getCachedUserFollows();
      
      if (cachedFollowingDids) {
        // Önbellekten takip edilen verilerini kullan
        setAnalysisProgress({ phase: language === 'EN' ? 'Filtering From Cache' : 'Önbellekten Filtreleniyor', completed: 0, total: 100 });
        
        // Takip edilmeyen kullanıcıları filtrele
        const notFollowing = allFollowing.filter(user => !cachedFollowingDids.has(user.did));
        
        setFilteredUsers(notFollowing);
        setTargetUsers(notFollowing);
        setFollowCount(notFollowing.length);
        setCustomFollowCount(notFollowing.length.toString());
        
        setShowFollowOptions(true);
        setIsProcessing(false);
        setIsAnalyzing(false);
        return;
      }
      
      // Önbellekte veri yoksa, API ile al
      if (hasSession) {
        const session = await validateSession();
        if (session) {
          // Mevcut oturum ile takip ettiklerini al
          const userFollowing = await axios.get('https://public.api.bsky.app/xrpc/app.bsky.graph.getFollows', {
            params: { actor: session.did, limit: 100 },
            headers: { 'Authorization': `Bearer ${session.accessJwt}` }
          });
          
          // İlk sayfa alındı, toplam takip edilen sayısını belirle
          let allUserFollowing: any[] = userFollowing.data.follows || [];
          let cursor = userFollowing.data.cursor;
          const totalFollowing = userFollowing.data.follows?.length || 0;
          
          // 100'den fazla takip edileni varsa, sayfalar halinde tümünü al
          if (cursor) {
            setAnalysisProgress({ 
              phase: language === 'EN' ? 'Getting Your Following' : 'Kendi Takip Edilenleriniz Alınıyor', 
              completed: allUserFollowing.length, 
              total: Math.min(5000, totalFollowing * 2) // tahmini toplam
            });
            
            // Takip edilenleri sayfalı olarak al
            while (cursor && allUserFollowing.length < 5000) {
              try {
                const nextPage = await axios.get('https://public.api.bsky.app/xrpc/app.bsky.graph.getFollows', {
                  params: { actor: session.did, cursor, limit: 100 },
                  headers: { 'Authorization': `Bearer ${session.accessJwt}` }
                });
                
                if (nextPage.data && nextPage.data.follows) {
                  allUserFollowing = [...allUserFollowing, ...nextPage.data.follows];
                  cursor = nextPage.data.cursor;
                  
                  setAnalysisProgress({ 
                    phase: language === 'EN' ? 'Getting Your Following' : 'Kendi Takip Edilenleriniz Alınıyor', 
                    completed: allUserFollowing.length, 
                    total: Math.min(5000, totalFollowing * 2)
                  });
                  
                  // API rate limit koruması
                  await new Promise(resolve => setTimeout(resolve, 300));
                } else {
                  cursor = undefined;
                }
              } catch (error) {
                console.error('Takip edilenler alınırken hata:', error);
                break;
              }
            }
          }
          
          setAnalysisProgress({ phase: language === 'EN' ? 'Filtering Non-Following' : 'Takip Edilmeyenler Filtreleniyor', completed: 0, total: 100 });
          
          // Takip edilmeyen kullanıcıları filtrele
          const followingDids = new Set(allUserFollowing.map((u: any) => u.did));
          const notFollowing = allFollowing.filter(user => !followingDids.has(user.did));
          
          setFilteredUsers(notFollowing);
          setTargetUsers(notFollowing);
          setFollowCount(notFollowing.length); // Varsayılan olarak tüm filtrelenmiş kullanıcıları takip et
          setCustomFollowCount(notFollowing.length.toString());
        }
      } else {
        // Oturum yoksa filtreleme yapmadan tüm takip ettiklerini göster
        setFilteredUsers(allFollowing);
        setTargetUsers(allFollowing);
        setFollowCount(allFollowing.length);
        setCustomFollowCount(allFollowing.length.toString());
      }
      
      setShowFollowOptions(true);
      setIsProcessing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.analysisFailed);
      setIsProcessing(false);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Takipçileri takip etme seçeneğine tıklandığında
  const handleSelectFollowers = async () => {
    if (!targetUser) return;
    
    setFollowType('followers');
    analyzeUserFollowers();
  };
  
  // Takip ettiklerini takip etme seçeneğine tıklandığında
  const handleSelectFollowing = async () => {
    if (!targetUser) return;
    
    setFollowType('following');
    analyzeUserFollowing();
  };
  
  // Takip etme işlemini başlat
  const startFollowProcess = async (useExistingSession = false) => {
    setError(null);
    
    if (!targetUser || !followType || targetUsers.length === 0) {
      setError(language === 'EN' ? 'Target user or follow type not selected' : 'Hedef kullanıcı veya takip türü seçilmedi');
      return;
    }
    
    // Aktif oturum kontrolü
    let hasSession = false;
    if (useExistingSession) {
      hasSession = await checkActiveSession();
    }
    
    // Eğer aktif oturum yoksa ve şifre girilmediyse şifre isteyin
    if (!hasSession && !password) {
      setShowPasswordInput(true);
      return;
    }
    
    // İşlemi başlat
    setIsProcessing(true);
    setFollowProgress({ completed: 0, total: targetUsers.length });
    setFollowSuccess(null);
    
    // Takip edilecek kullanıcı sayısını belirle
    const usersToFollow = followCount > 0 && followCount < targetUsers.length 
      ? targetUsers.slice(0, followCount) 
      : targetUsers;
    
    // Operation context'te işlemi başlat
    startOperation('targetFollow', usersToFollow, {
      targetUserDid: targetUser.did,
      targetUser: targetUser.handle,
      targetUserDisplayName: targetUser.displayName,
      followType: followType
    });
    
    // Create a new AbortController instance
    abortControllerRef.current = new AbortController();
    
    try {
      // Kullanıcıları takip et
      const result = await batchFollowUsersWithProgress(
        password ? targetUser.handle : '', // oturum için gerekli
        password,
        usersToFollow,
        0,
        (completed, total, lastError) => {
          setFollowProgress({ completed, total });
          
          // Operation context'i güncelle - result henüz tanımlanmadığı için geçici değerler kullanıyoruz
          updateProgress(completed, total, completed, 0, lastError);
          
          if (lastError) {
            console.log('Target follow operation error:', lastError);
            
            // Rate limiting hatası kontrolü
            if (lastError.status === 429 || 
                (lastError.message && lastError.message.includes('rate limit'))) {
              console.log('Rate limiting detected, adding timeout');
              setTimeoutStatus(true, 60); // 60 saniye bekle
            }
          }
        }
      );
      
      console.log('Target follow batch operation completed:', result);
      
      // Operation context'i tamamlandı olarak işaretle
      completeOperation(result.success, result.failed);
      
      // UI'a başarı durumunu yansıt
      setFollowSuccess({
        success: result.success,
        failed: result.failed
      });
      
      // Invalidate the cache after successful follow operations
      if (result.success > 0) {
        // Ensure cache is invalidated for proper refresh
        await invalidateAnalysisCache(targetUser.handle);
      }
      
      setIsProcessComplete(true);
    } catch (error) {
      console.error('Follow process error:', error);
      
      // If the error was due to abortion (user clicked stop), don't show error message
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Operation was aborted by user');
      } else {
        setError(error instanceof Error ? error.message : (language === 'EN' ? 'Follow operation failed' : 'Takip işlemi başarısız oldu'));
      }
      
      // Hata durumunda operation'ı sıfırla
      resetOperation();
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };
  
  // Takip sayısını özelleştir
  const handleCustomFollowCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomFollowCount(value);
    
    const parsedValue = parseInt(value);
    if (!isNaN(parsedValue) && parsedValue > 0) {
      setFollowCount(Math.min(parsedValue, filteredUsers.length));
    } else {
      setFollowCount(0);
    }
  };
  
  // Tüm kullanıcıları takip et
  const handleFollowAll = () => {
    setFollowCount(filteredUsers.length);
    setCustomFollowCount(filteredUsers.length.toString());
  };
  
  // İşlemi sıfırla
  const resetProcess = () => {
    setTargetUser(null);
    setSearchTerm('');
    setError(null);
    setFollowSuccess(null);
    setIsProcessComplete(false);
    setShowPasswordInput(false);
    setShowFollowOptions(false);
    setFollowType(null);
    setTargetUsers([]);
    setFilteredUsers([]);
    setFollowCount(0);
    setCustomFollowCount('');
  };
  
  // İşlemi durdur/devam ettir
  const handleTogglePause = () => {
    // Toggle the pause state in the context
    togglePause();
    
    // If we're pausing and there's an active abort controller, abort the operation
    if (!operation.isPaused && abortControllerRef.current) {
      console.log('Aborting follow operation');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };
  
  // İşlemi sıfırla
  const handleReset = () => {
    resetOperation();
    resetProcess();
  };

  return (
    <div className="space-y-4 relative">
      {/* İşlem devam ediyor banner'ı - diğer sayfalara gidildiğinde de görünecek */}
      {(isActiveProcess || (operation.type === 'targetFollow' && operation.isProcessing)) && (
        <div className="fixed bottom-0 left-0 right-0 bg-blue-600 text-white py-2 px-4 shadow-lg z-50">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center">
              <FiLoader className="animate-spin mr-2" />
              <span>
                {operation.targetUserDisplayName} {operation.followType === 'followers' ? (language === 'EN' ? 'followers' : 'takipçileri') : (language === 'EN' ? 'following' : 'takip ettikleri')} {language === 'EN' ? 'are being followed:' : 'takip ediliyor:'} 
                {operation.completed}/{operation.totalUsers}
              </span>
            </div>
            <Button 
              onClick={handleTogglePause} 
              variant={isPaused ? "primary" : "danger"}
              size="sm"
            >
              {isPaused ? t.resume : t.pause}
            </Button>
          </div>
        </div>
      )}
      
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">{t.targetFollow}</h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t.targetFollowDescription}
        </p>
      </div>
      
      {!showPasswordInput && !showFollowOptions && !isLoading && !isProcessComplete && !isProcessing && !isAnalyzing && (
        <form onSubmit={handleSearch} className="mb-4">
          <div className="flex space-x-2">
            <Input
              type="text"
              placeholder={t.enterUsername}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
              isBlueskyUsername={true}
            />
            <Button 
              type="submit" 
              variant="primary"
              disabled={isSearching}
            >
              {isSearching ? <FiLoader className="animate-spin mr-2" /> : <FiSearch className="mr-2" />}
              {t.searchUser}
            </Button>
          </div>
          {error && <p className="text-red-500 mt-2">{error}</p>}
        </form>
      )}
      
      {targetUser && !showPasswordInput && !showFollowOptions && !isLoading && !isProcessComplete && !isProcessing && !isAnalyzing && (
        <TargetUserCard 
          user={targetUser} 
          onSelectFollowers={handleSelectFollowers}
          onSelectFollowing={handleSelectFollowing}
          isLoading={isAnalyzing}
          t={t}
          language={language}
        />
      )}
      
      {targetUser && showUserResults && (
        <div className="mb-6">
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-4">
              <h3 className="text-xl font-bold text-white">
                {language === 'TR' ? 'Sonuçlar' : 'Results'} - @{targetUser.handle.split('.')[0]}
              </h3>
            </div>
          </Card>
        </div>
      )}
      
      {isProcessing && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <h3 className="text-lg font-bold mb-2">{analysisProgress.phase || (followType === 'followers' ? (language === 'EN' ? 'Analyzing Followers...' : 'Takipçileri Analiz Ediliyor...') : (language === 'EN' ? 'Analyzing Following...' : 'Takip Edilenleri Analiz Ediliyor...'))}</h3>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-4">
            <div className="bg-blue-600 h-2.5 rounded-full animate-pulse" 
                style={{ 
                  width: analysisProgress.total > 0 
                    ? `${Math.min(100, (analysisProgress.completed / analysisProgress.total) * 100)}%` 
                    : '100%'
                }}>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            {analysisProgress.completed > 0 && analysisProgress.total > 0 
              ? `${analysisProgress.completed} / ${analysisProgress.total}` 
              : language === 'EN' ? 'This process may take some time, please wait...' : 'Bu işlem biraz zaman alabilir, lütfen bekleyin...'}
          </p>
        </div>
      )}
      
      {showPasswordInput && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow mb-4">
          <h3 className="text-lg font-bold mb-2">
            {followType === 'followers' ? t.followFollowers : t.followFollowing}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {language === 'EN' ? `You need to enter App Password to analyze ${followType === 'followers' ? 'followers' : 'following'} of ${targetUser?.displayName || targetUser?.handle}.` : `${targetUser?.displayName || targetUser?.handle} isimli kullanıcının ${followType === 'followers' ? 'takipçilerini' : 'takip ettiklerini'} analiz etmek için App Password girmelisiniz.`}
          </p>
          
          <div className="mb-4">
            <Input
              type="password"
              placeholder={t.blueskyPassword}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full"
            />
          </div>
          
          <div className="flex space-x-2">
            <Button 
              onClick={() => {
                setShowPasswordInput(false);
                if (followType === 'followers') {
                  analyzeUserFollowers();
                } else {
                  analyzeUserFollowing();
                }
              }} 
              variant="primary"
              disabled={!password}
            >
              {isAnalyzing ? <FiLoader className="animate-spin mr-2" /> : <FiUserPlus className="mr-2" />}
              {t.analyze}
            </Button>
            <Button 
              onClick={() => {
                setShowPasswordInput(false);
                setFollowType(null);
              }} 
              variant="secondary"
              disabled={isAnalyzing}
            >
              {language === 'EN' ? 'Back' : 'Geri'}
            </Button>
          </div>
        </div>
      )}
      
      {showFollowOptions && filteredUsers.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow mb-4">
          <h3 className="text-lg font-bold mb-2">
            {followType === 'followers' ? (language === 'EN' ? 'Follow Followers' : 'Takipçileri Takip Et') : (language === 'EN' ? 'Follow Following' : 'Takip Edilenleri Takip Et')}
          </h3>
          
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded">
            <p>
              <strong>{targetUser?.displayName || targetUser?.handle}</strong> {language === 'EN' ? `has ${filteredUsers.length} ${followType === 'followers' ? 'followers' : 'following'} that you are not following yet.` : `kullanıcısının ${followType === 'followers' ? 'takipçilerinden' : 'takip ettiklerinden'} ${filteredUsers.length} hesabı henüz takip etmiyorsunuz.`}
            </p>
            <p className="mt-2">
              {t.selectFollowCount}
            </p>
          </div>
          
          <div className="mb-4">
            <div className="flex items-center space-x-2 mb-2">
              <Input
                type="number"
                min="1"
                max={filteredUsers.length}
                value={customFollowCount}
                onChange={handleCustomFollowCountChange}
                className="w-1/2"
              />
              <span className="text-gray-600 dark:text-gray-400">/ {filteredUsers.length} {t.accounts}</span>
            </div>
            
            <Button
              onClick={handleFollowAll}
              variant="secondary"
              className="mr-2"
            >
              {t.followAll}
            </Button>
            
            {filteredUsers.length >= 1000 && (
              <div className="mt-3 text-yellow-600 dark:text-yellow-400 text-sm">
                <FiClock className="inline mr-1" />
                {t.rateLimit1000Note}
              </div>
            )}
          </div>
          
          <div className="flex space-x-2">
            <Button 
              onClick={() => {
                const hasSession = !!hasActiveSession;
                startFollowProcess(hasSession);
              }} 
              variant="primary"
              disabled={followCount <= 0}
            >
              <FiUserPlus className="mr-2" />
              {followCount} {t.followAccounts}
            </Button>
            <Button 
              onClick={() => {
                setShowFollowOptions(false);
                setFilteredUsers([]);
                setFollowCount(0);
                setCustomFollowCount('');
              }} 
              variant="secondary"
            >
              {language === 'EN' ? 'Back' : 'Geri'}
            </Button>
          </div>
        </div>
      )}
      
      {(isLoading || isAnalyzing) && !isWaitingTimeout && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <h3 className="text-lg font-bold mb-2">{analysisProgress.phase || t.processing}</h3>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-4">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${followProgress.total > 0 ? (followProgress.completed / followProgress.total) * 100 : 0}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-gray-600 dark:text-gray-400">
              {followProgress.completed} / {followProgress.total} {t.userProcessed}
            </p>
            
            <Button 
              onClick={handleTogglePause} 
              variant={isPaused ? "primary" : "danger"}
              size="sm"
            >
              {isPaused ? t.resume : t.pause}
            </Button>
          </div>
        </div>
      )}
      
      {/* Timeout modal - global timeout state kullanarak */}
      {isWaitingTimeout && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold mb-2">{t.waitingRateLimit}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {language === 'EN' ? "You need to wait before continuing the process due to Bluesky API limitations." : "Bluesky API kısıtlamaları nedeniyle işleme devam etmeden önce beklemeniz gerekiyor."}
            </p>
            
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-4">
              <div className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ 
                    width: `${Math.max(0, (60 - operation.remainingTimeout) / 60 * 100)}%`
                  }}>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div>
                <span className="text-2xl font-bold">{Math.floor(operation.remainingTimeout / 60)}:{(operation.remainingTimeout % 60).toString().padStart(2, '0')}</span>
                <span className="ml-2 text-gray-500">{language === 'EN' ? "time remaining" : "kalan süre"}</span>
              </div>
              
              <Button 
                onClick={handleTogglePause}
                variant="danger"
              >
                {t.stopProcess}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* İşlem tamamlandı mesajı */}
      {operation.isComplete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold mb-2 flex items-center">
              <FiCheck className="text-green-500 mr-2" /> {t.processCompleted}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {operation.targetUserDisplayName} {operation.followType === 'followers' ? t.followers : t.following} {t.haveBeenFollowed}.
            </p>
            
            <div className="flex justify-between gap-2">
              <div className="flex-1 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
                <span className="block text-xl font-bold text-green-600 dark:text-green-400">{t.successful}</span>
                <span className="text-sm text-green-700 dark:text-green-300">{t.successful}</span>
              </div>
              <div className="flex-1 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-center">
                <span className="block text-xl font-bold text-red-600 dark:text-red-400">{t.failed}</span>
                <span className="text-sm text-red-700 dark:text-red-300">{t.failed}</span>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <Button 
                onClick={handleReset}
                variant="primary"
              >
                {t.ok}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TargetFollow; 