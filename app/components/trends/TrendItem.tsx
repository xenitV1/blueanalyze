import React from 'react';
import { motion } from 'framer-motion';
import type { Trend } from '../../services/trendingAPI';
import { useLanguage } from '../../contexts/LanguageContext';

interface TrendItemProps {
  trend: Trend;
  index: number;
}

const TrendItem: React.FC<TrendItemProps> = ({ trend, index }) => {
  const { language } = useLanguage();
  
  // Add translations for "posts"
  const translations = {
    EN: {
      posts: "posts",
      viewTagOnBluesky: "View tag #${tag} on Bluesky"
    },
    TR: {
      posts: "gönderi",
      viewTagOnBluesky: "Bluesky'da #${tag} etiketini görüntüle"
    }
  };
  
  const t = translations[language];
  
  // Animasyon zamanlamasını sıraya göre geciktirme
  const delay = index * 0.05;
  
  // Renkleri trende göre belirle
  const getColor = (count: number) => {
    if (count > 100) return 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800';
    if (count > 50) return 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-800';
    if (count > 20) return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-800';
    return 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800';
  };
  
  // Bluesky'da hashtag araması için URL oluştur
  const getBlueskyHashtagUrl = (tag: string) => {
    return `https://bsky.app/search?q=%23${encodeURIComponent(tag)}`;
  };
  
  // Bluesky'a yönlendirme fonksiyonu
  const handleClick = () => {
    window.open(getBlueskyHashtagUrl(trend.tag), '_blank');
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={`p-4 rounded-lg border ${getColor(trend.count)} flex justify-between items-center mb-2 cursor-pointer hover:shadow-md transition-shadow duration-200`}
      onClick={handleClick}
      title={translations[language].viewTagOnBluesky.replace('${tag}', trend.tag)}
    >
      <div className="flex items-center">
        <span className="text-xl mr-3 font-bold">{index + 1}</span>
        <span className="font-medium">#{trend.tag}</span>
      </div>
      
      <div className="flex items-center">
        <span className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full text-sm flex items-center">
          <span>{trend.count} {t.posts}</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </span>
      </div>
    </motion.div>
  );
};

export default TrendItem; 