import React from 'react';
import { motion } from 'framer-motion';
import TrendItem from './TrendItem';
import type { Trend } from '../../services/trendingAPI';

interface TrendsListProps {
  trends: Trend[];
  isLoading?: boolean;
}

const TrendsList: React.FC<TrendsListProps> = ({ 
  trends, 
  isLoading = false 
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (trends.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg text-center"
      >
        <p className="text-gray-600 dark:text-gray-400">
          Henüz trend veri yok. Lütfen daha sonra tekrar kontrol edin.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-4">
        {trends.map((trend, index) => (
          <TrendItem 
            key={trend.id} 
            trend={trend} 
            index={index}
          />
        ))}
      </div>
    </div>
  );
};

export default TrendsList; 