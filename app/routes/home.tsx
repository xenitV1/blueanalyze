import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import FollowerAnalysis from '../components/follower-analysis/FollowerAnalysis';
import NavBar from '../components/follower-analysis/NavBar';
import Footer from '../components/follower-analysis/Footer';
import type { Route } from "./+types/home";
import { FirebaseTrendStore } from '../services/firebaseTrendStore';

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Bluesky Follower Analysis" },
  ];
}

export default function Home() {
  // Sayfa yüklendiğinde trend verilerini temizle
  useEffect(() => {
    // Sayfa yüklendiğinde ve görünür olduğunda trend verilerini temizle
    if (typeof window !== 'undefined') {
      try {
        // Trend verilerini temizlemeyi dene
        FirebaseTrendStore.triggerCleanupNow();
      } catch (error) {
        console.error('Trend temizleme hatası:', error);
      }
    }
  }, []);
  
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
          <h1 className="sr-only">BlueAnalyze - Bluesky Follower Analytics Tool</h1>
          
          <FollowerAnalysis />
        </motion.div>
      </main>
      
      <Footer />
    </div>
  );
}
