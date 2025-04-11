import React, { useState, useEffect } from 'react';
import { FiGlobe, FiLoader, FiActivity, FiGithub, FiHash } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { useOperation } from '../../contexts/OperationContext';
import type { Language } from '../../contexts/LanguageContext';

const NavBar: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const { operation, togglePause } = useOperation();
  
  // Geçerli sayfayı kontrol et
  const isHomePage = window.location.pathname === '/';
  const isTrendsPage = window.location.pathname === '/trends';

  // İşlem aktif mi kontrol et
  const isActiveOperation = operation.type !== 'none' && operation.isProcessing;

  // Toggle language
  const toggleLanguage = () => {
    setLanguage(language === 'EN' ? 'TR' : 'EN');
  };

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex-shrink-0 flex items-center">
            <a
              href="/" 
              className="text-xl font-semibold text-primary hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              {t.appTitle}
            </a>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Ana sayfa ve Trendler sayfası bağlantıları */}
            <div className="hidden md:flex space-x-2 mr-2">
              <a
                href="/"
                className={`px-3 py-1 rounded-full transition-colors ${
                  isHomePage
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                Ana Sayfa
              </a>
              <a
                href="/trends"
                className={`px-3 py-1 rounded-full transition-colors flex items-center ${
                  isTrendsPage
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                <FiHash className="h-4 w-4 mr-1" />
                Trendler
              </a>
            </div>
            
            {/* Aktif işlem bilgisi - Varsa göster */}
            {isActiveOperation && (
              <div className="flex items-center text-xs md:text-sm px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                <FiActivity className="h-3 w-3 mr-1 animate-pulse" />
                <span className="hidden md:inline-block">
                  {operation.type === 'targetFollow' ? 'Hedef Takip: ' : 
                   operation.type === 'follow' ? 'Takip: ' : 'Takipten Çıkma: '}
                </span>
                <span>{operation.completed}/{operation.totalUsers}</span>
              </div>
            )}

            {/* GitHub linki */}
            <a
              href="https://github.com/vortic-0/blueanalyze"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none flex items-center"
              aria-label="GitHub Repository"
            >
              <FiGithub className="h-4 w-4" />
            </a>

            {/* Dil değiştirme butonu */}
            <button
              onClick={toggleLanguage}
              className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none flex items-center"
              aria-label={t.changeLanguage}
            >
              <FiGlobe className="h-4 w-4 mr-1" />
              <span className="text-sm font-medium">{language}</span>
            </button>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default NavBar; 