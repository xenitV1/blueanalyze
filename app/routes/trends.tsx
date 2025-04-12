import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import CountrySelector from '../components/trends/CountrySelector';
import TrendsList from '../components/trends/TrendsList';
import NavBar from '../components/follower-analysis/NavBar';
import Footer from '../components/follower-analysis/Footer';
import { getTrendingHashtags, getConnectionStatus, initializeJetstreamClient, COUNTRIES } from '../services/trendingAPI';
import type { Trend, Country } from '../services/trendingAPI';
import type { Route } from "./+types/trends";
import StatusIndicator from '../components/trends/StatusIndicator';
import { useLanguage } from '../contexts/LanguageContext';
import { FirebaseTrendStore } from '../services/firebaseTrendStore';

// Translation object for the trends page
const translations = {
  EN: {
    pageTitle: "Bluesky Trending Tags | BlueAnalyze",
    pageDescription: "Discover trending tags and popular hashtags on Bluesky. Follow real-time updates and analyze social media activity.",
    pageKeywords: "bluesky, bluesky trends, trend analysis, hashtag, popular tags, social media statistics",
    trendingTags: "Trending Tags",
    discoverTrendingTags: "Discover current trending tags on Bluesky",
    lastUpdate: "Last update:",
    refreshing: "Refreshing...",
    refresh: "Refresh",
    dataSource: "Data is collected through the Bluesky Firehose API.",
    trends: "Trends",
    maintenanceTitle: "Under Maintenance",
    maintenanceMessage: "The trends feature is currently under maintenance. We're working to improve this service and will be back soon. Thank you for your patience."
  },
  TR: {
    pageTitle: "Bluesky Trend Etiketler | BlueAnalyze",
    pageDescription: "Bluesky'daki güncel trend etiketleri ve popüler hashtag'leri keşfedin. Gerçek zamanlı güncellemeleri takip edin ve sosyal medya hareketliliğini analiz edin.",
    pageKeywords: "bluesky, bluesky trends, trend analizi, hashtag, popüler etiketler, sosyal medya istatistikleri",
    trendingTags: "Trend Etiketler",
    discoverTrendingTags: "Bluesky'daki güncel trend etiketleri keşfedin",
    lastUpdate: "Son güncelleme:",
    refreshing: "Yenileniyor...",
    refresh: "Yenile",
    dataSource: "Veriler Bluesky Firehose API'si üzerinden toplanmaktadır.",
    trends: "Trendleri",
    maintenanceTitle: "Bakım Aşamasında",
    maintenanceMessage: "Trend özelliği şu anda bakım aşamasındadır. Bu hizmeti iyileştirmek için çalışıyoruz ve en kısa sürede tekrar aktif olacak. Anlayışınız için teşekkür ederiz."
  }
};

export function meta({ location }: Route.MetaArgs) {
  // Determine language from URL search param
  const urlParams = new URLSearchParams(location.search);
  const lang = urlParams.get('lang') === 'TR' ? 'TR' : 'EN';
  
  // Use the appropriate translation based on detected language
  const t = translations[lang];
  
  return [
    { title: t.pageTitle },
    { property: "og:url", content: "https://blue-analyze.com/trends" },
    { property: "og:title", content: t.pageTitle },
    { property: "twitter:url", content: "https://blue-analyze.com/trends" },
    { property: "twitter:title", content: t.pageTitle },
    { tagName: "link", rel: "canonical", href: "https://blue-analyze.com/trends" }
  ];
}

export default function TrendsPage() {
  const { language } = useLanguage();
  const t = translations[language];
  
  // Bakım modu aktif - eski state değişkenlerini ve API çağrılarını kaldırıyoruz
  // const [selectedCountry, setSelectedCountry] = useState<string>('global');
  // const [trends, setTrends] = useState<Trend[]>([]);
  // const [status, setStatus] = useState<string>('connecting');
  // const [loading, setLoading] = useState<boolean>(true);
  // const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // API çağrıları devre dışı bırakıldı
  // const checkConnectionStatus = useCallback(() => {
  //   const newStatus = getConnectionStatus();
  //   if (newStatus !== status) {
  //     setStatus(newStatus);
  //   }
  // }, [status]);

  // const fetchTrends = useCallback(async () => {
  //   try {
  //     setLoading(true);
  //     const data = await getTrendingHashtags(selectedCountry);
  //     
  //     if (!data || data.length === 0) {
  //       setLoading(false);
  //       return;
  //     }
  //     
  //     setTrends(data);
  //     setLastUpdate(new Date());
  //     setLoading(false);
  //   } catch (error) {
  //     console.error('Trend verileri alınırken hata:', error);
  //     setLoading(false);
  //   }
  // }, [selectedCountry]);

  // useEffect(() => {
  //   fetchTrends();
  // }, [selectedCountry, fetchTrends]);

  // useEffect(() => {
  //   initializeJetstreamClient();
  //   
  //   const statusInterval = setInterval(checkConnectionStatus, 3000);
  //   
  //   return () => {
  //     clearInterval(statusInterval);
  //   };
  // }, [checkConnectionStatus]);

  // useEffect(() => {
  //   if (typeof window !== 'undefined') {
  //     try {
  //       FirebaseTrendStore.triggerCleanupNow();
  //     } catch (error) {
  //       console.error('Trend temizleme hatası:', error);
  //     }
  //   }
  // }, []);

  // const handleCountryChange = (countryCode: string) => {
  //   setSelectedCountry(countryCode);
  // };

  // const handleRefresh = () => {
  //   fetchTrends();
  // };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <NavBar />
      
      <main className="py-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="container mx-auto px-4"
        >
          <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {t.trendingTags}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {t.discoverTrendingTags}
              </p>
              
              <div className="flex items-center gap-2 mb-2 mt-2">
                <StatusIndicator status="maintenance" />
              </div>
            </div>
            
            <button 
              disabled={true}
              className="mt-4 md:mt-0 px-4 py-2 bg-gray-400 text-white rounded-md cursor-not-allowed flex items-center gap-2"
            >
              {t.refreshing}
            </button>
          </div>
          
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {t.dataSource}
          </div>
          
          {/* Bakım modu mesajı */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
            <div className="text-center py-10">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                {t.maintenanceTitle}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                {t.maintenanceMessage}
              </p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
              {COUNTRIES.find(c => c.code === 'global')?.flag || '🌎'} {COUNTRIES.find(c => c.code === 'global')?.name || 'Global'} {t.trends}
            </h2>
            
            <TrendsList 
              trends={[]}
              isLoading={false}
            />
          </div>
        </motion.div>
      </main>
      
      <Footer />
      
      {/* Schema.org JSON-LD veri işaretlemesi */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": t.pageTitle,
          "description": t.pageDescription,
          "url": "https://blue-analyze.com/trends",
          "publisher": {
            "@type": "Organization",
            "name": "BlueAnalyze",
            "logo": {
              "@type": "ImageObject",
              "url": "https://blue-analyze.com/blueanalyze.png"
            }
          },
          "mainEntity": {
            "@type": "ItemList",
            "itemListElement": []
          }
        })
      }} />
    </div>
  );
} 