// Firebase yapılandırma dosyası
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAnalytics } from 'firebase/analytics';

// Firebase yapılandırma detayları
// Bu değerleri kendi Firebase projenizin bilgileriyle değiştirin
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.REGION.firebasedatabase.app",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
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
}; 