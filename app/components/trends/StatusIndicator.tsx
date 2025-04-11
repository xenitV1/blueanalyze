import React from 'react';

interface StatusIndicatorProps {
  status: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  // Durum sınıfları ve metinleri
  const statusConfig = {
    connected: {
      text: 'Canlı veri akışı',
      bgColor: 'bg-green-100 dark:bg-green-900',
      textColor: 'text-green-700 dark:text-green-300',
      dotColor: 'bg-green-500',
    },
    connecting: {
      text: 'Bağlanıyor...',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900',
      textColor: 'text-yellow-700 dark:text-yellow-300',
      dotColor: 'bg-yellow-500',
    },
    disconnected: {
      text: 'Bağlantı kesildi',
      bgColor: 'bg-red-100 dark:bg-red-900',
      textColor: 'text-red-700 dark:text-red-300',
      dotColor: 'bg-red-500',
    },
    error: {
      text: 'Bağlantı hatası',
      bgColor: 'bg-red-100 dark:bg-red-900',
      textColor: 'text-red-700 dark:text-red-300',
      dotColor: 'bg-red-500',
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