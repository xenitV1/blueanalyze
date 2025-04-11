import React from 'react';
import { motion } from 'framer-motion';
import type { Country } from '../../services/trendingAPI';

interface CountrySelectorProps {
  selectedCountry: string;
  countries: Country[];
  onChange: (country: string) => void;
}

const CountrySelector: React.FC<CountrySelectorProps> = ({
  selectedCountry,
  countries,
  onChange,
}) => {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200">
        Bölge Seçin
      </h2>
      
      <div className="flex flex-wrap gap-2">
        {countries.map((country) => (
          <motion.button
            key={country.code}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(country.code)}
            className={`
              flex items-center px-3 py-2 rounded-full border 
              ${selectedCountry === country.code 
                ? 'bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}
              transition-colors duration-200
            `}
          >
            <span className="mr-2 text-lg">{country.flag}</span>
            <span>{country.name}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default CountrySelector; 