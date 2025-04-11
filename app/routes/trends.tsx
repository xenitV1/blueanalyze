import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import CountrySelector from '../components/trends/CountrySelector';
import TrendsList from '../components/trends/TrendsList';
import NavBar from '../components/follower-analysis/NavBar';
import Footer from '../components/follower-analysis/Footer';
import { getTrendingHashtags, getConnectionStatus, initializeJetstreamClient, COUNTRIES, USE_FIREBASE } from '../services/trendingAPI';
import type { Trend, Country } from '../services/trendingAPI';
import type { Route } from "./+types/trends";
import StatusIndicator from '../components/trends/StatusIndicator';

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Bluesky Trend Etiketler" },
    { name: "description", content: "Bluesky'daki güncel trend etiketleri keşfedin" },
  ];
}

export default function TrendsPage() {
  const [selectedCountry, setSelectedCountry] = useState<string>('global');
  const [trends, setTrends] = useState<Trend[]>([]);
  const [status, setStatus] = useState<string>('connecting');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchTrends = async () => {
    setLoading(true);
    try {
      const trendData = await getTrendingHashtags(selectedCountry);
      setTrends(trendData);
    } catch (error) {
      console.error('Trend verileri getirilirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setStatus(getConnectionStatus());
    
    const interval = setInterval(() => {
      setStatus(getConnectionStatus());
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchTrends();
    
    if (!USE_FIREBASE) {
      const interval = setInterval(() => {
        fetchTrends();
      }, 10000);
      
      return () => clearInterval(interval);
    } else {
      const interval = setInterval(() => {
        fetchTrends();
      }, 60000);
      
      return () => clearInterval(interval);
    }
  }, [selectedCountry]);

  const handleCountryChange = (countryCode: string) => {
    setSelectedCountry(countryCode);
  };

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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Trend Etiketler
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Bluesky'daki güncel trend etiketleri keşfedin
            </p>
            
            <div className="flex justify-center mb-4">
              <StatusIndicator status={status} />
            </div>
            
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Veriler Bluesky Firehose API'si üzerinden toplanmaktadır.
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
            <CountrySelector 
              countries={COUNTRIES}
              selectedCountry={selectedCountry}
              onChange={handleCountryChange}
            />
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
              {COUNTRIES.find(c => c.code === selectedCountry)?.flag || '🌎'} {COUNTRIES.find(c => c.code === selectedCountry)?.name || 'Global'} Trendleri
            </h2>
            
            <TrendsList 
              trends={trends}
              isLoading={loading}
            />
          </div>
        </motion.div>
      </main>
      
      <Footer />
    </div>
  );
} 