import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

// Desteklenen diller
export type Language = 'EN' | 'TR';

// Tüm çevrilebilir metinler için tip tanımı
export interface Translations {
  // NavBar
  darkMode: string;
  lightMode: string;
  changeLanguage: string;
  
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
  
  // Follower Analysis
  appTitle: 'BlueAnalyze',
  blueskyUsername: 'Bluesky Username',
  blueskyPassword: 'Bluesky Password or App Password',
  analyze: 'Analyze',
  loading: 'Loading...',
  followers: 'Followers',
  following: 'Following',
  mutuals: 'Mutuals',
  notFollowingBack: 'Not Following Back',
  notFollowedBack: 'Not Followed Back',
  unfollowAll: 'Unfollow All',
  followAll: 'Follow All',
  noUsersToUnfollow: 'No users to unfollow',
  noUsersToFollow: 'No users to follow',
  continueProcess: 'Continue Process',
  userProcessed: 'users processed',
  successful: 'successful',
  failed: 'failed',
  tokenExpiryNote: 'Note: Tokens expire after 2 hours. If your process was interrupted due to token expiration, enter your password and continue from where you left off.',
  resultsFor: 'Results for',
  batchFollowUsers: 'Batch Follow Users',
  unfollowAllNonFollowers: 'Unfollow All Non-Followers',
  whatIsAppPassword: 'What is an App Password?',
  hideAppPasswordInfo: 'Hide App Password info',
  
  // Feedback
  feedbackTitle: 'Send Feedback',
  feedbackIntro: 'We\'d love to hear your thoughts about the BlueAnalyze tool!',
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
  
  // Follower Analysis
  appTitle: 'BlueAnalyze',
  blueskyUsername: 'Bluesky Kullanıcı Adı',
  blueskyPassword: 'Bluesky Şifresi veya App Password',
  analyze: 'Analiz Et',
  loading: 'Yükleniyor...',
  followers: 'Takipçiler',
  following: 'Takip Edilenler',
  mutuals: 'Karşılıklı Takipleşenler',
  notFollowingBack: 'Takip Ettiklerim Ama Takip Etmeyenler',
  notFollowedBack: 'Takip Edenler Ama Takip Etmediklerim',
  unfollowAll: 'Tümünü Takipten Çık',
  followAll: 'Tümünü Takip Et',
  noUsersToUnfollow: 'Takipten çıkılacak kullanıcı yok',
  noUsersToFollow: 'Takip edilecek kullanıcı yok',
  continueProcess: 'Kaldığı Yerden Devam Et',
  userProcessed: 'kullanıcı işlendi',
  successful: 'başarılı',
  failed: 'başarısız',
  tokenExpiryNote: 'Not: Token süresi 2 saat geçerlidir. İşlem token süresi dolduğu için kesintiye uğradıysa, şifrenizi girerek kaldığınız yerden devam edebilirsiniz.',
  resultsFor: 'Sonuçlar',
  batchFollowUsers: 'Toplu Takip Et',
  unfollowAllNonFollowers: 'Takip Etmeyenleri Takipten Çık',
  whatIsAppPassword: 'App Password nedir?',
  hideAppPasswordInfo: 'App Password bilgisini gizle',
  
  // Feedback
  feedbackTitle: 'Geri Bildirim Gönder',
  feedbackIntro: 'BlueAnalyze aracı hakkındaki düşüncelerinizi duymak isteriz!',
  feedbackAbout: 'Şu konularda geri bildirim gönderebilirsiniz:',
  featureSuggestions: 'Özellik önerileri',
  bugReports: 'Hata raporları',
  userExperience: 'Kullanıcı deneyimi iyileştirmeleri',
  designFeedback: 'Tasarım geri bildirimleri',
  otherFeedback: 'Paylaşmak istediğiniz diğer konular!',
  sendEmail: 'E-posta Gönder',
  contactUs: 'Bize Ulaşın',
  responseTime: 'Genellikle 1-2 iş günü içinde yanıt veririz.',
  sendFeedback: 'Geri Bildirim Gönder',
  emailAt: 'E-posta adresimiz:',
  connectOn: 'Bluesky\'da bağlanın:',
  
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
    // localStorage'dan dil tercihini al
    const savedLanguage = localStorage.getItem('blueanalyze-language');
    if (savedLanguage === 'TR' || savedLanguage === 'EN') {
      setLanguage(savedLanguage as Language);
    }
  }, []);
  
  // Dil değiştiğinde çevirileri güncelle
  useEffect(() => {
    // Dil tercihini localStorage'a kaydet
    localStorage.setItem('blueanalyze-language', language);
    
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