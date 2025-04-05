import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiSearch, FiUserPlus, FiUsers, FiLoader, FiSettings, FiClock } from 'react-icons/fi';
import type { BlueSkyUser } from '../../services/blueskyAPI';
import { searchUsers, getUserFollowers, getUserFollowing, batchFollowUsersWithProgress, validateSession } from '../../services/blueskyAPI';
import { useLanguage } from '../../contexts/LanguageContext';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import axios from 'axios';

interface TargetUserCardProps {
  user: BlueSkyUser;
  onSelectFollowers: () => void;
  onSelectFollowing: () => void;
  isLoading: boolean;
  t: any; // Translations
}

const TargetUserCard: React.FC<TargetUserCardProps> = ({ user, onSelectFollowers, onSelectFollowing, isLoading, t }) => {
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
              <strong>{user.followersCount || 0}</strong> takipçi
            </span>
            <span className="text-gray-700 dark:text-gray-300">
              <strong>{user.followsCount || 0}</strong> takip
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
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [targetUser, setTargetUser] = useState<BlueSkyUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [followCount, setFollowCount] = useState<number>(0);
  const [showFollowOptions, setShowFollowOptions] = useState(false);
  const [customFollowCount, setCustomFollowCount] = useState<string>('');
  const [waitingTimeout, setWaitingTimeout] = useState(false);
  const [timeoutSeconds, setTimeoutSeconds] = useState(0);
  const [pauseProcess, setPauseProcess] = useState(false);

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
      setError('Lütfen bir kullanıcı adı girin');
      return;
    }
    
    setIsSearching(true);
    setError(null);
    setTargetUser(null);
    
    try {
      await checkActiveSession();
      
      const results = await searchUsers(searchTerm, 1);
      if (results.length > 0) {
        const fullProfile = await fetchFullUserProfile(results[0].handle);
        
        if (fullProfile) {
          setTargetUser(fullProfile);
        } else {
          setTargetUser(results[0]);
        }
      } else {
        setError('Kullanıcı bulunamadı');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kullanıcı arama başarısız oldu');
    } finally {
      setIsSearching(false);
    }
  };
  
  // Hedef kullanıcının takipçilerini analiz et
  const analyzeUserFollowers = async () => {
    if (!targetUser) return;
    
    setIsAnalyzing(true);
    setError(null);
    setAnalysisProgress({ phase: 'Takipçiler Alınıyor', completed: 0, total: 100 });

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
      setAnalysisProgress({ phase: 'Takipçiler Alınıyor', completed: 0, total: 100 });
      
      // Kullanıcının tahmini takipçi sayısı
      const estimatedFollowerCount = targetUser.followersCount || 0;
      // Maksimum 5000 takipçi alınacak - API kısıtlamaları nedeniyle
      const fetchLimit = Math.min(estimatedFollowerCount, 5000);
      
      const allFollowers = await getUserFollowers(targetUser.did, fetchLimit);
      
      // Takipçi alımı bitti, şimdi filtreleme aşaması
      setAnalysisProgress({ phase: 'Takipçiler Filtreleniyor', completed: 0, total: 100 });
      
      // Takip edilmeyen kullanıcıları filtrelemek için kullanıcının takip ettiklerini al
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
              phase: 'Takip Edilenler Alınıyor', 
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
                    phase: 'Takip Edilenler Alınıyor', 
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
          
          setAnalysisProgress({ phase: 'Takip Edilmeyenler Filtreleniyor', completed: 0, total: 100 });
          
          // Takip edilmeyen kullanıcıları filtrele
          const followingDids = new Set(allUserFollowing.map((u: any) => u.did));
          const notFollowing = allFollowers.filter(user => !followingDids.has(user.did));
          
          setFilteredUsers(notFollowing);
          setFollowCount(notFollowing.length); // Varsayılan olarak tüm filtrelenmiş kullanıcıları takip et
          setCustomFollowCount(notFollowing.length.toString());
        }
      } else {
        // Oturum yoksa filtreleme yapmadan tüm takipçileri göster
        setFilteredUsers(allFollowers);
        setFollowCount(allFollowers.length);
        setCustomFollowCount(allFollowers.length.toString());
      }
      
      setShowFollowOptions(true);
      setIsProcessing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Takipçi analizi başarısız oldu');
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
    setAnalysisProgress({ phase: 'Takip Edilenler Alınıyor', completed: 0, total: 100 });

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
      setAnalysisProgress({ phase: 'Takip Edilenler Alınıyor', completed: 0, total: 100 });
      
      // Kullanıcının tahmini takip ettiği sayısı
      const estimatedFollowingCount = targetUser.followsCount || 0;
      // Maksimum 5000 takip edilen alınacak - API kısıtlamaları nedeniyle
      const fetchLimit = Math.min(estimatedFollowingCount, 5000);
      
      const allFollowing = await getUserFollowing(targetUser.did, fetchLimit);
      
      // Takip edilen alımı bitti, şimdi filtreleme aşaması
      setAnalysisProgress({ phase: 'Takip Edilenler Filtreleniyor', completed: 0, total: 100 });
      
      // Takip edilmeyen kullanıcıları filtrelemek için kullanıcının takip ettiklerini al
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
              phase: 'Kendi Takip Edilenleriniz Alınıyor', 
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
                    phase: 'Kendi Takip Edilenleriniz Alınıyor', 
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
          
          setAnalysisProgress({ phase: 'Takip Edilmeyenler Filtreleniyor', completed: 0, total: 100 });
          
          // Takip edilmeyen kullanıcıları filtrele
          const followingDids = new Set(allUserFollowing.map((u: any) => u.did));
          const notFollowing = allFollowing.filter(user => !followingDids.has(user.did));
          
          setFilteredUsers(notFollowing);
          setFollowCount(notFollowing.length); // Varsayılan olarak tüm filtrelenmiş kullanıcıları takip et
          setCustomFollowCount(notFollowing.length.toString());
        }
      } else {
        // Oturum yoksa filtreleme yapmadan tüm takip ettiklerini göster
        setFilteredUsers(allFollowing);
        setFollowCount(allFollowing.length);
        setCustomFollowCount(allFollowing.length.toString());
      }
      
      setShowFollowOptions(true);
      setIsProcessing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Takip analizi başarısız oldu');
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
    if (!targetUser || (!useExistingSession && !password) || !followType) {
      setError('Gerekli bilgileri eksik');
      return;
    }
    
    // Takip edilecek kullanıcı sayısını kontrol et
    const usersToFollow = filteredUsers.slice(0, followCount);
    
    if (usersToFollow.length === 0) {
      setError('Takip edilecek kullanıcı yok');
      return;
    }
    
    setShowFollowOptions(false);
    setIsLoading(true);
    setError(null);
    setFollowSuccess(null);
    setFollowProgress({ completed: 0, total: usersToFollow.length });
    setIsProcessComplete(false);
    setWaitingTimeout(false);
    setPauseProcess(false);
    
    try {
      let completed = 0;
      let success = 0;
      let failed = 0;
      let errors: any[] = [];
      
      // Her 500 kullanıcıda bir 2 dakika bekleme süresi ekle
      for (let i = 0; i < usersToFollow.length; i++) {
        // İşlem durduruldu mu kontrol et
        if (pauseProcess) {
          setError('İşlem kullanıcı tarafından durduruldu');
          break;
        }

        // Her 500 kullanıcıda bir 2 dakika bekle (1000+ kullanıcı varsa)
        if (i > 0 && i % 500 === 0 && usersToFollow.length >= 1000) {
          setWaitingTimeout(true);
          
          // 2 dakika (120 saniye) geri sayım
          for (let seconds = 120; seconds > 0; seconds--) {
            if (pauseProcess) {
              break; // Kullanıcı işlemi durdurduysa beklemeden çık
            }
            
            setTimeoutSeconds(seconds);
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 saniye bekle
          }
          
          setWaitingTimeout(false);
          
          // İşlem durduruldu mu tekrar kontrol et
          if (pauseProcess) {
            setError('İşlem kullanıcı tarafından durduruldu');
            break;
          }
        }
        
        // Takip işlemini gerçekleştir
        try {
          const currentUsers = [usersToFollow[i]];
          const result = await batchFollowUsersWithProgress(
            targetUser.handle,
            useExistingSession ? null : password,
            currentUsers,
            0,
            (completedCount, totalCount) => {
              // İlerleme durumunu güncelle
            }
          );
          
          success += result.success;
          failed += result.failed;
          
          if (result.errors && result.errors.length > 0) {
            errors = [...errors, ...result.errors];
          }
        } catch (err) {
          failed++;
          console.error('Takip işlemi hatası:', err);
        }
        
        completed++;
        setFollowProgress({ completed, total: usersToFollow.length });
        
        // Kısa bir gecikme ekleyerek API'ye fazla yük bindirmekten kaçın
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      setFollowSuccess({
        success,
        failed
      });
      
      setIsProcessComplete(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Takip işlemi başarısız oldu');
    } finally {
      setIsLoading(false);
      setWaitingTimeout(false);
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
    setPauseProcess(false);
    setWaitingTimeout(false);
  };
  
  // İşlemi durdur/devam ettir
  const togglePauseProcess = () => {
    setPauseProcess(!pauseProcess);
  };
  
  return (
    <div className="space-y-4">
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
        />
      )}
      
      {isProcessing && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <h3 className="text-lg font-bold mb-2">{analysisProgress.phase || (followType === 'followers' ? 'Takipçileri Analiz Ediliyor...' : 'Takip Edilenleri Analiz Ediliyor...')}</h3>
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
              : 'Bu işlem biraz zaman alabilir, lütfen bekleyin...'}
          </p>
        </div>
      )}
      
      {showPasswordInput && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow mb-4">
          <h3 className="text-lg font-bold mb-2">
            {followType === 'followers' ? t.followFollowers : t.followFollowing}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {targetUser?.displayName || targetUser?.handle} isimli kullanıcının {followType === 'followers' ? 'takipçilerini' : 'takip ettiklerini'} analiz etmek için App Password girmelisiniz.
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
              Analiz Et
            </Button>
            <Button 
              onClick={() => {
                setShowPasswordInput(false);
                setFollowType(null);
              }} 
              variant="secondary"
              disabled={isAnalyzing}
            >
              {language === 'TR' ? 'Geri' : 'Back'}
            </Button>
          </div>
        </div>
      )}
      
      {showFollowOptions && filteredUsers.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow mb-4">
          <h3 className="text-lg font-bold mb-2">
            {followType === 'followers' ? 'Takipçileri Takip Et' : 'Takip Edilenleri Takip Et'}
          </h3>
          
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded">
            <p>
              <strong>{targetUser?.displayName || targetUser?.handle}</strong> kullanıcısının {followType === 'followers' ? 'takipçilerinden' : 'takip ettiklerinden'}{' '}
              <strong>{filteredUsers.length}</strong> hesabı henüz takip etmiyorsunuz.
            </p>
            <p className="mt-2">
              Takip etmek istediğiniz hesap sayısını seçin:
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
              <span className="text-gray-600 dark:text-gray-400">/ {filteredUsers.length} hesap</span>
            </div>
            
            <Button
              onClick={handleFollowAll}
              variant="secondary"
              className="mr-2"
            >
              Tümünü Takip Et
            </Button>
            
            {filteredUsers.length >= 1000 && (
              <div className="mt-3 text-yellow-600 dark:text-yellow-400 text-sm">
                <FiClock className="inline mr-1" />
                Not: 1000+ hesap takip edilirken, her 500 takip sonrası sistem 2 dakika bekleyecektir.
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
              {followCount} Hesabı Takip Et
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
              {language === 'TR' ? 'Geri' : 'Back'}
            </Button>
          </div>
        </div>
      )}
      
      {(isLoading || isAnalyzing) && !waitingTimeout && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <h3 className="text-lg font-bold mb-2">{t.processing}</h3>
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
              onClick={togglePauseProcess} 
              variant={pauseProcess ? "primary" : "danger"}
              size="sm"
            >
              {pauseProcess ? "Devam Et" : "Durdur"}
            </Button>
          </div>
        </div>
      )}
      
      {waitingTimeout && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <h3 className="text-lg font-bold mb-2 flex items-center">
            <FiClock className="mr-2" /> Rate Limit Önlemi
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-3">
            Çok fazla istek göndermemek için {timeoutSeconds} saniye bekleniyor...
          </p>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-4">
            <div 
              className="bg-yellow-500 h-2.5 rounded-full" 
              style={{ width: `${(120 - timeoutSeconds) / 120 * 100}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-gray-600 dark:text-gray-400">
              {followProgress.completed} / {followProgress.total} {t.userProcessed}
            </p>
            
            <Button 
              onClick={togglePauseProcess} 
              variant={pauseProcess ? "primary" : "danger"}
              size="sm"
            >
              {pauseProcess ? "Devam Et" : "Durdur"}
            </Button>
          </div>
        </div>
      )}
      
      {isProcessComplete && followSuccess && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <h3 className="text-lg font-bold mb-2">{t.operationComplete}</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            <span className="text-green-500">{followSuccess.success}</span> {t.successful},{' '}
            <span className="text-red-500">{followSuccess.failed}</span> {t.failed}.
          </p>
          <Button onClick={resetProcess} variant="primary">
            {t.newSearch}
          </Button>
        </div>
      )}
      
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
};

export default TargetFollow; 