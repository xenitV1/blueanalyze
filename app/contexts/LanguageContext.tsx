import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { getLanguagePreference, saveLanguagePreference } from '../services/indexedDBService';

// Desteklenen diller
export type Language = 'EN' | 'TR';

// Tüm çevrilebilir metinler için tip tanımı
export interface Translations {
  // NavBar
  darkMode: string;
  lightMode: string;
  changeLanguage: string;
  clearCache: string;  // Önbelleği Temizle çevirisi
  cacheCleared: string; // Temizlendi çevirisi
  trends: string;      // Trendler çevirisi
  
  // Follower Analysis
  appTitle: string;
  blueskyUsername: string;
  blueskyPassword: string;
  analyze: string;
  loading: string;
  followers: string;
  following: string;
  mutuals: string;
  notFollowingBack: string;
  notFollowedBack: string;
  unfollowAll: string;
  followAll: string;
  noUsersToUnfollow: string;
  noUsersToFollow: string;
  continueProcess: string;
  userProcessed: string;
  successful: string;
  failed: string;
  tokenExpiryNote: string;
  resultsFor: string;
  batchFollowUsers: string;
  unfollowAllNonFollowers: string;
  whatIsAppPassword: string;
  hideAppPasswordInfo: string;
  
  // Target Follow
  targetFollow: string;
  targetFollowDescription: string;
  searchUser: string;
  followFollowers: string;
  followFollowing: string;
  enterUsername: string;
  userNotFound: string;
  requiresPassword: string;
  processing: string;
  operationComplete: string;
  newSearch: string;
  waitingRateLimit: string;
  resume: string;
  pause: string;
  ok: string;
  stopProcess: string;
  processCompleted: string;
  haveBeenFollowed: string;
  selectFollowCount: string;
  accounts: string;
  followAccounts: string;
  rateLimit1000Note: string;
  targetUser: string;
  
  // Feedback
  feedbackTitle: string;
  feedbackIntro: string;
  feedbackAbout: string;
  featureSuggestions: string;
  bugReports: string;
  userExperience: string;
  designFeedback: string;
  otherFeedback: string;
  sendEmail: string;
  contactUs: string;
  responseTime: string;
  sendFeedback: string;
  emailAt: string;
  connectOn: string;
  officialAccount: string;
  
  // Footer
  allRightsReserved: string;
  unofficialTool: string;
  terms: string;
  privacy: string;
  contact: string;
  builtWith: string;
  
  // Error messages
  usernameRequired: string;
  passwordRequired: string;
  analysisFailed: string;
  unfollowFailed: string;
  followFailed: string;
  noOperationToContinue: string;
}

// İngilizce çeviriler
const enTranslations: Translations = {
  // NavBar
  darkMode: 'Switch to dark mode',
  lightMode: 'Switch to light mode',
  changeLanguage: 'Change language',
  clearCache: 'Clear Cache',
  cacheCleared: 'Cleared!',
  trends: 'Trends',
  
  // Follower Analysis
  appTitle: 'BlueAnalyze - Bluesky Analytics Tool',
  blueskyUsername: 'Bluesky Username',
  blueskyPassword: 'App Password',
  analyze: 'Analyze',
  loading: 'Loading...',
  followers: 'Followers',
  following: 'Following',
  mutuals: 'Mutual Connections',
  notFollowingBack: 'Not Following You Back',
  notFollowedBack: 'You\'re Not Following Back',
  unfollowAll: 'Unfollow All',
  followAll: 'Follow All',
  noUsersToUnfollow: 'No users to unfollow',
  noUsersToFollow: 'No users to follow',
  continueProcess: 'Resume Process',
  userProcessed: 'users processed',
  successful: 'successful',
  failed: 'failed',
  tokenExpiryNote: 'Your session may expire after some time. Please re-login if needed.',
  resultsFor: 'Results for',
  batchFollowUsers: 'Batch Follow Users',
  unfollowAllNonFollowers: 'Unfollow Non-Followers',
  whatIsAppPassword: 'IMPORTANT: What is an App Password?',
  hideAppPasswordInfo: 'Hide App Password info',
  
  // Target Follow
  targetFollow: 'Target Based Follow',
  targetFollowDescription: 'Efficiently batch follow the followers or following of any Bluesky user.',
  searchUser: 'Search',
  followFollowers: 'Follow Their Followers',
  followFollowing: 'Follow Their Following',
  enterUsername: 'Bluesky username',
  userNotFound: 'User not found',
  requiresPassword: 'Password required',
  processing: 'Processing...',
  operationComplete: 'Operation Complete',
  newSearch: 'New Search',
  waitingRateLimit: 'Rate Limit Waiting',
  resume: 'Resume',
  pause: 'Pause',
  ok: 'OK',
  stopProcess: 'Stop Process',
  processCompleted: 'Process Completed',
  haveBeenFollowed: 'have been followed',
  selectFollowCount: 'Select how many accounts you want to follow:',
  accounts: 'accounts',
  followAccounts: 'Follow Accounts',
  rateLimit1000Note: 'Note: When following 1000+ accounts, the system will wait 1 minute after every 1000 follows.',
  targetUser: 'user',
  
  // Feedback
  feedbackTitle: 'Send Feedback',
  feedbackIntro: 'We appreciate your thoughts about the BlueAnalyze tool!',
  feedbackAbout: 'You can provide feedback about:',
  featureSuggestions: 'Feature suggestions',
  bugReports: 'Bug reports',
  userExperience: 'User experience improvements',
  designFeedback: 'Design feedback',
  otherFeedback: 'Anything else you\'d like to share!',
  sendEmail: 'Send Email',
  contactUs: 'Contact Us',
  responseTime: 'We typically respond within 1-2 business days.',
  sendFeedback: 'Send Feedback',
  emailAt: 'Email us at:',
  connectOn: 'Connect on Bluesky:',
  officialAccount: 'Official Bluesky Account',
  
  // Footer
  allRightsReserved: 'All rights reserved.',
  unofficialTool: 'This is an unofficial tool and is not affiliated with Bluesky Social.',
  terms: 'Terms',
  privacy: 'Privacy',
  contact: 'Contact',
  builtWith: 'Built with',
  
  // Error messages
  usernameRequired: 'Please enter a username',
  passwordRequired: 'Please enter password and username',
  analysisFailed: 'Failed to analyze followers',
  unfollowFailed: 'Unfollow operation failed',
  followFailed: 'Follow operation failed',
  noOperationToContinue: 'No operation to continue or missing information.'
};

// Türkçe çeviriler
const trTranslations: Translations = {
  // NavBar
  darkMode: 'Karanlık moda geç',
  lightMode: 'Aydınlık moda geç',
  changeLanguage: 'Dili değiştir',
  clearCache: 'Önbelleği Temizle',
  cacheCleared: 'Temizlendi!',
  trends: 'Trendler',
  
  // Follower Analysis
  appTitle: 'BlueAnalyze - Bluesky Analiz Aracı',
  blueskyUsername: 'Bluesky Kullanıcı Adı',
  blueskyPassword: 'App Password',
  analyze: 'Analiz Et',
  loading: 'Yükleniyor...',
  followers: 'Takipçiler',
  following: 'Takip Edilenler',
  mutuals: 'Karşılıklı Takipleşenler',
  notFollowingBack: 'Sizi Takip Etmeyenler',
  notFollowedBack: 'Takip Etmedikleriniz',
  unfollowAll: 'Tümünü Takipten Çık',
  followAll: 'Tümünü Takip Et',
  noUsersToUnfollow: 'Takipten çıkılacak kullanıcı yok',
  noUsersToFollow: 'Takip edilecek kullanıcı yok',
  continueProcess: 'Kaldığı Yerden Devam Et',
  userProcessed: 'kullanıcı işlendi',
  successful: 'başarılı',
  failed: 'başarısız',
  tokenExpiryNote: 'Oturumunuz bir süre sonra sona erebilir. Gerekirse yeniden giriş yapın.',
  resultsFor: 'Sonuçlar',
  batchFollowUsers: 'Toplu Takip Et',
  unfollowAllNonFollowers: 'Takip Etmeyenleri Takipten Çık',
  whatIsAppPassword: 'ÖNEMLİ: App Password nedir?',
  hideAppPasswordInfo: 'App Password bilgisini gizle',
  
  // Target Follow
  targetFollow: 'Hedef Bazlı Takip',
  targetFollowDescription: 'Herhangi bir Bluesky kullanıcısının takipçilerini veya takip ettiklerini verimli şekilde toplu olarak takip edebilirsiniz.',
  searchUser: 'Ara',
  followFollowers: 'Takipçilerini Takip Et',
  followFollowing: 'Takip Ettiklerini Takip Et',
  enterUsername: 'Bluesky kullanıcı adı',
  userNotFound: 'Kullanıcı bulunamadı',
  requiresPassword: 'Şifre gerekli',
  processing: 'İşlem Devam Ediyor',
  operationComplete: 'İşlem Tamamlandı',
  newSearch: 'Yeni Arama',
  waitingRateLimit: 'Rate Limit Bekleniyor',
  resume: 'Devam Et',
  pause: 'Durdur',
  ok: 'Tamam',
  stopProcess: 'İşlemi Durdur',
  processCompleted: 'İşlem Tamamlandı',
  haveBeenFollowed: 'takip edildi',
  selectFollowCount: 'Takip etmek istediğiniz hesap sayısını seçin:',
  accounts: 'hesap',
  followAccounts: 'Hesabı Takip Et',
  rateLimit1000Note: 'Not: 1000+ hesap takip edilirken, her 1000 takip sonrası sistem 1 dakika bekleyecektir.',
  targetUser: 'kullanıcısının',
  
  // Feedback
  feedbackTitle: 'Geri Bildirim Gönder',
  feedbackIntro: 'BlueAnalyze aracı hakkındaki düşüncelerinizi değerlendiriyoruz!',
  feedbackAbout: 'Şunlar hakkında geri bildirim sağlayabilirsiniz:',
  featureSuggestions: 'Özellik önerileri',
  bugReports: 'Hata raporları',
  userExperience: 'Kullanıcı deneyimi iyileştirmeleri',
  designFeedback: 'Tasarım geri bildirimi',
  otherFeedback: 'Paylaşmak istediğiniz başka bir şey!',
  sendEmail: 'E-posta Gönder',
  contactUs: 'Bize Ulaşın',
  responseTime: 'Genellikle 1-2 iş günü içinde yanıt veriyoruz.',
  sendFeedback: 'Geri Bildirim Gönder',
  emailAt: 'Bize e-posta gönderin:',
  connectOn: 'Bluesky\'da bağlantı kurun:',
  officialAccount: 'Resmi Bluesky Hesabı',
  
  // Footer
  allRightsReserved: 'Tüm hakları saklıdır.',
  unofficialTool: 'Bu, resmi olmayan bir araçtır ve Bluesky Social ile bağlantılı değildir.',
  terms: 'Kullanım Şartları',
  privacy: 'Gizlilik',
  contact: 'İletişim',
  builtWith: 'Geliştiren',
  
  // Error messages
  usernameRequired: 'Lütfen bir kullanıcı adı girin',
  passwordRequired: 'Lütfen şifre ve kullanıcı adı girin',
  analysisFailed: 'Takipçi analizi başarısız oldu',
  unfollowFailed: 'Takipten çıkma işlemi başarısız oldu',
  followFailed: 'Takip etme işlemi başarısız oldu',
  noOperationToContinue: 'Devam edilecek işlem bulunamadı veya eksik bilgi var.'
};

// Context için başlangıç değerleri
interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;  // t = translations kısaltması (i18n'de yaygın bir kullanım)
}

// Context oluştur
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Provider bileşeni
interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('EN');
  const [translations, setTranslations] = useState<Translations>(enTranslations);
  
  // Dil değiştiğinde çevirileri güncelle
  useEffect(() => {
    // IndexedDB'den dil tercihini al
    const fetchLanguagePreference = async () => {
      try {
        const savedLanguage = await getLanguagePreference();
        if (savedLanguage === 'TR' || savedLanguage === 'EN') {
          setLanguage(savedLanguage as Language);
        }
      } catch (error) {
        console.error('Dil tercihi alınamadı:', error);
      }
    };
    
    fetchLanguagePreference();
  }, []);
  
  // Dil değiştiğinde çevirileri güncelle
  useEffect(() => {
    // Dil tercihini IndexedDB'ye kaydet
    const updateLanguage = async () => {
      try {
        await saveLanguagePreference(language);
      } catch (error) {
        console.error('Dil tercihi kaydedilemedi:', error);
      }
    };
    
    updateLanguage();
    
    // Doğru çeviri setini seç
    setTranslations(language === 'EN' ? enTranslations : trTranslations);
    
    // HTML lang özelliğini güncelle
    document.documentElement.lang = language === 'EN' ? 'en' : 'tr';
  }, [language]);
  
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Context'i kullanmak için hook
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}; 