// Netlify build öncesi çalışacak build hook
const fs = require('fs');
const path = require('path');

exports.handler = async (event) => {
  console.log('Firebase yapılandırma dosyası oluşturuluyor...');
  
  try {
    // Çevre değişkenlerini kontrol et
    const requiredEnvVars = [
      'FIREBASE_API_KEY',
      'FIREBASE_AUTH_DOMAIN',
      'FIREBASE_DATABASE_URL',
      'FIREBASE_PROJECT_ID',
      'FIREBASE_STORAGE_BUCKET',
      'FIREBASE_MESSAGING_SENDER_ID',
      'FIREBASE_APP_ID',
      'FIREBASE_MEASUREMENT_ID'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.warn(`Eksik çevre değişkenleri: ${missingVars.join(', ')}. Örnek değerler kullanılacak.`);
    }
    
    // Yapılandırma içeriği
    const firebaseConfig = `// Firebase yapılandırma dosyası
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAnalytics } from 'firebase/analytics';

// Firebase yapılandırma detayları
const firebaseConfig = {
  apiKey: "${process.env.FIREBASE_API_KEY || ''}",
  authDomain: "${process.env.FIREBASE_AUTH_DOMAIN || ''}",
  databaseURL: "${process.env.FIREBASE_DATABASE_URL || ''}",
  projectId: "${process.env.FIREBASE_PROJECT_ID || ''}",
  storageBucket: "${process.env.FIREBASE_STORAGE_BUCKET || ''}",
  messagingSenderId: "${process.env.FIREBASE_MESSAGING_SENDER_ID || ''}",
  appId: "${process.env.FIREBASE_APP_ID || ''}",
  measurementId: "${process.env.FIREBASE_MEASUREMENT_ID || ''}"
};

// Firebase uygulamasını başlat
const app = initializeApp(firebaseConfig);

// Realtime Database referansını al
export const db = getDatabase(app);

// Analytics'i sadece tarayıcı ortamında başlat
let analytics = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

// Firebase bağlantısı için yardımcı fonksiyonlar
export function getFirebaseDatabase() {
  return db;
}

// Bu dosyayı import eden Netlify Functions veya diğer servisler için
export default {
  app,
  db,
  analytics,
  getFirebaseDatabase,
};`;

    // Dosya yolu belirleme
    const dirPath = path.join(process.cwd(), 'app/services');
    const filePath = path.join(dirPath, 'firebaseConfig.ts');
    
    // Klasör yapısı kontrol
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    // Dosyayı oluştur
    fs.writeFileSync(filePath, firebaseConfig);
    
    console.log('Firebase yapılandırma dosyası başarıyla oluşturuldu:', filePath);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Firebase yapılandırma dosyası oluşturuldu' })
    };
  } catch (error) {
    console.error('Firebase yapılandırma dosyası oluşturulurken hata:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Hata oluştu', error: error.message })
    };
  }
}; 