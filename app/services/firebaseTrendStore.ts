// Firebase Trend Store - Merkezi trend verileri için Firebase hizmeti
import { ref, set, onValue, get, query, orderByChild, limitToLast } from 'firebase/database';
import { db } from './firebaseConfig';
import type { Trend } from './trendingAPI';
import { COUNTRIES } from './trendingAPI';

// TTL değeri - 24 saat (milisaniye cinsinden)
const DATA_EXPIRY_TIME = 24 * 60 * 60 * 1000;

// Firebase'de trendleri saklamak için sınıf
export class FirebaseTrendStore {
  private static instance: FirebaseTrendStore;

  // Singleton instance için
  public static getInstance(): FirebaseTrendStore {
    if (!FirebaseTrendStore.instance) {
      FirebaseTrendStore.instance = new FirebaseTrendStore();
    }
    return FirebaseTrendStore.instance;
  }

  // Yeni bir hashtag ekle/güncelle
  public async incrementTag(tag: string, country: string = 'global'): Promise<void> {
    try {
      // Önce mevcut değeri al
      const tagRef = ref(db, `trends/${country}/${tag}`);
      const snapshot = await get(tagRef);
      
      // Mevcut değer veya varsayılan değer 0
      let currentCount = 0;
      if (snapshot.exists()) {
        currentCount = snapshot.val().count || 0;
      }
      
      // Değeri artır
      const newCount = currentCount + 1;
      
      // Firebase'e yaz
      await set(tagRef, {
        tag: tag,
        count: newCount, 
        id: `${tag}-${country}`,
        updatedAt: new Date().toISOString()
      });
      
      console.log(`Firebase: ${tag} etiketinin sayısı ${country} için ${newCount} olarak güncellendi`);
      
      // Global değil ise, global değeri de güncelle
      if (country !== 'global') {
        await this.incrementTag(tag, 'global');
      }
    } catch (error) {
      console.error('Firebase trend verisi güncellenirken hata:', error);
    }
  }
  
  // Trendleri getir
  public async getTrends(country: string = 'global', limit: number = 20): Promise<Trend[]> {
    try {
      // Veritabanı referansını al
      const trendsRef = ref(db, `trends/${country}`);
      
      // Verileri al
      const snapshot = await get(trendsRef);
      
      if (!snapshot.exists()) {
        console.log(`${country} için trend verisi bulunamadı`);
        return [];
      }
      
      // Verileri dönüştür ve sırala
      const trendsData = snapshot.val();
      const trends: Trend[] = [];
      
      // Verileri diziye dönüştür
      for (const key in trendsData) {
        const trendData = trendsData[key];
        
        // Süresi dolmuş verileri atla
        const updatedAt = new Date(trendData.updatedAt);
        const now = new Date();
        if (now.getTime() - updatedAt.getTime() > DATA_EXPIRY_TIME) {
          continue;
        }
        
        trends.push({
          tag: trendData.tag,
          count: trendData.count,
          id: trendData.id
        });
      }
      
      // Sayıya göre azalan sırada sırala ve limitlendir
      return trends
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
      
    } catch (error) {
      console.error('Firebase trendleri getirilirken hata:', error);
      return [];
    }
  }

  // Eski verileri temizle - günlük olarak çalıştırılabilir
  public async cleanupExpiredData(): Promise<void> {
    try {
      const now = new Date().getTime();
      
      // Tüm ülkeler için kontrol et
      for (const country of COUNTRIES) {
        const countryCode = country.code;
        const trendsRef = ref(db, `trends/${countryCode}`);
        
        // Verileri oku
        const snapshot = await get(trendsRef);
        
        if (!snapshot.exists()) {
          continue;
        }
        
        // Tüm trend verileri
        const trendsData = snapshot.val();
        
        // Her bir trendi kontrol et ve eski ise sil
        for (const key in trendsData) {
          const trendData = trendsData[key];
          const updatedAt = new Date(trendData.updatedAt).getTime();
          
          if (now - updatedAt > DATA_EXPIRY_TIME) {
            // Süre dolmuş veriyi sil
            await set(ref(db, `trends/${countryCode}/${key}`), null);
            console.log(`Eski veri silindi: ${key} (${countryCode})`);
          }
        }
      }
      
      console.log('Veri temizleme tamamlandı:', new Date().toISOString());
    } catch (error) {
      console.error('Veri temizleme sırasında hata:', error);
    }
  }
  
  // Temizlik zamanlayıcısını başlat (günde bir kez çalıştır)
  public startCleanupScheduler(): NodeJS.Timeout {
    // İlk temizliği hemen yap
    this.cleanupExpiredData();
    
    // Her 24 saatte bir temizlik işlemini tekrarla
    return setInterval(() => {
      this.cleanupExpiredData();
    }, DATA_EXPIRY_TIME);
  }
}

// Dışa aktarılan fonksiyonlar
export function getFirebaseTrendStore(): FirebaseTrendStore {
  return FirebaseTrendStore.getInstance();
}

// Eğer tarayıcı ortamında isek, temizlik zamanlayıcısını başlat
if (typeof window !== 'undefined') {
  const trendStore = getFirebaseTrendStore();
  trendStore.startCleanupScheduler();
} 