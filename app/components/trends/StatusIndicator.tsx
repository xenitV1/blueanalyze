import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

interface StatusIndicatorProps {
  status: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  const { language } = useLanguage();
  
  // Status text translations
  const statusText = {
    EN: {
      connected: 'Live data stream',
      connecting: 'Connecting...',
      disconnected: 'Disconnected',
      error: 'Connection error',
      maintenance: 'Maintenance Mode',
    },
    TR: {
      connected: 'Canlı veri akışı',
      connecting: 'Bağlanıyor...',
      disconnected: 'Bağlantı kesildi',
      error: 'Bağlantı hatası',
      maintenance: 'Bakım Modu',
    }
  };

  // Durum sınıfları ve metinleri
  const statusConfig = {
    connected: {
      text: statusText[language].connected,
      bgColor: 'bg-green-100 dark:bg-green-900',
      textColor: 'text-green-700 dark:text-green-300',
      dotColor: 'bg-green-500',
    },
    connecting: {
      text: statusText[language].connecting,
      bgColor: 'bg-yellow-100 dark:bg-yellow-900',
      textColor: 'text-yellow-700 dark:text-yellow-300',
      dotColor: 'bg-yellow-500',
    },
    disconnected: {
      text: statusText[language].disconnected,
      bgColor: 'bg-red-100 dark:bg-red-900',
      textColor: 'text-red-700 dark:text-red-300',
      dotColor: 'bg-red-500',
    },
    error: {
      text: statusText[language].error,
      bgColor: 'bg-red-100 dark:bg-red-900',
      textColor: 'text-red-700 dark:text-red-300',
      dotColor: 'bg-red-500',
    },
    maintenance: {
      text: statusText[language].maintenance,
      bgColor: 'bg-purple-100 dark:bg-purple-900',
      textColor: 'text-purple-700 dark:text-purple-300',
      dotColor: 'bg-purple-500',
    },
  };

  // Varsayılan olarak connecting durumunu kullan
  const currentStatus = statusConfig[status as keyof typeof statusConfig] || statusConfig.connecting;

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full ${currentStatus.bgColor} ${currentStatus.textColor}`}>
      <div className={`w-2 h-2 rounded-full ${currentStatus.dotColor} mr-2`}></div>
      {currentStatus.text}
    </div>
  );
};

export default StatusIndicator; 