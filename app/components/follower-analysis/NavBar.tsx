import React, { useState, useEffect } from 'react';
import { FiGlobe } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import type { Language } from '../../contexts/LanguageContext';

const NavBar: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();

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