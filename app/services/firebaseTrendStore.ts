// Firebase Trend Store - Merkezi trend verileri için Firebase hizmeti
import { ref, set, onValue, get, query, orderByChild, limitToLast } from 'firebase/database';
import { db } from './firebaseConfig';
import type { Trend } from './trendingAPI';
// İçeri aktarılan COUNTRIES'yi kaldırıyorum, kullanırken API'den alacağız
// import { COUNTRIES } from './trendingAPI';

// TTL değeri - 24 saat (milisaniye cinsinden)
const DATA_EXPIRY_TIME = 24 * 60 * 60 * 1000;

// Ülke kodları için sabit dizi (Circular dependency'yi önlemek için)
const COUNTRY_CODES = ['global', 'TR', 'US', 'GB', 'DE', 'FR', 'JP', 'BR', 'IN', 'KR'];

// Firebase için izin verilmeyen karakterleri temizleme fonksiyonu
function sanitizeTagForFirebase(tag: string): string {
  // Bazı özel hashtag'ler probleme neden olabilir, boş gelmişse güvenli bir değer dön
  if (!tag || tag.trim() === '') return 'empty_tag';
  
  // Uzunluk kontrolü - çok uzun tag'ler için kısaltma yap
  const maxLength = 100;
  let processedTag = tag.length > maxLength ? tag.substring(0, maxLength) : tag;
  
  // Firebase yollarında izin verilmeyen karakterleri kaldır veya değiştir: ".", "#", "$", "[", "]"
  processedTag = processedTag
    .replace(/[.#$[\]]/g, '_') // Yasak karakterleri alt çizgi ile değiştir
    .replace(/\//g, '-'); // Eğer '/' varsa çizgi ile değiştir
    
  // Bazı Emoji ve Unicode karakterleri sorun çıkarabilir
  // En basit çözüm: Sadece alfanümerik ve bazı güvenli karakterleri tut
  processedTag = processedTag.replace(/[^\w\s-_]/g, '_');
  
  return processedTag;
}

// Firebase'de trendleri saklamak için sınıf
export class FirebaseTrendStore {
  private static instance: FirebaseTrendStore;
  private scheduledCleanup: NodeJS.Timeout | null = null;

  // Singleton instance için
  public static getInstance(): FirebaseTrendStore {
    if (!FirebaseTrendStore.instance) {
      FirebaseTrendStore.instance = new FirebaseTrendStore();
    }
    return FirebaseTrendStore.instance;
  }

  // Constructor - sadece bir kez temizlik planla
  constructor() {
    // Temizlik işlemini başlat (eğer zaten başlatılmamışsa)
    if (!this.scheduledCleanup && typeof window !== 'undefined') {
      this.scheduledCleanup = this.startCleanupScheduler();
    }
  }

  // Tag'i artır
  public incrementTag(tag: string, country: string = 'global'): void {
    try {
      // Etiket verisini temizle
      const cleanTag = sanitizeTagForFirebase(tag);
      
      // Trend yolu
      const trendPath = `trends/${country}/${cleanTag}`;
      const trendRef = ref(db, trendPath);
      
      // Önce mevcut değeri oku
      get(trendRef).then((snapshot) => {
        let count = 1; // Varsayılan başlangıç sayısı
        let trendData: any = {
          tag: tag,
          count: count,
          updatedAt: new Date().toISOString()
        };
        
        // Eğer veri varsa, sayıyı artır
        if (snapshot.exists()) {
          const currentData = snapshot.val();
          
          // Mevcut count değerini al ve artır
          if (typeof currentData.count === 'number') {
            count = currentData.count + 1;
          } else if (typeof currentData.count === 'string') {
            count = parseInt(currentData.count, 10) + 1 || 1;
          } else {
            count = 1;
          }
          
          // Verileri güncelle
          trendData = {
            ...currentData,
            count: count,
            updatedAt: new Date().toISOString()
          };
        }
        
        // Verileri Firebase'e yaz
        set(trendRef, trendData)
          .then(() => {
            // Success
          })
          .catch((error) => {
            console.error(`"${cleanTag}" güncellenirken hata:`, error);
          });
      }).catch((error) => {
        console.error(`"${cleanTag}" okunurken hata:`, error);
      });
    } catch (error) {
      console.error(`Tag artırılırken hata (${tag}):`, error);
    }
  }
  
  // Trendleri getir
  public async getTrends(country: string = 'global', limit: number = 20): Promise<Trend[]> {
    try {
      // Veritabanı referansını al - orderByChild yerine doğrudan referans kullan
      const trendsRef = ref(db, `trends/${country}`);
      
      // Doğrudan tüm verileri al (orderByChild kullanmadan)
      const snapshot = await get(trendsRef);
      
      if (!snapshot.exists()) {
        return [];
      }
      
      // Verileri dönüştür ve istemci tarafında sırala
      const trendsData = snapshot.val();
      const trends: Trend[] = [];
      
      // Verileri diziye dönüştür
      for (const key in trendsData) {
        const trendData = trendsData[key];
        
        // Geçersiz verileri atla
        if (!trendData || !trendData.tag || typeof trendData.count === 'undefined' || !trendData.updatedAt) {
          continue;
        }
        
        // Süresi dolmuş verileri atla
        const updatedAt = new Date(trendData.updatedAt);
        const now = new Date();
        if (now.getTime() - updatedAt.getTime() > DATA_EXPIRY_TIME) {
          continue;
        }
        
        // Sayı değerini güvenli şekilde dönüştür
        let count: number;
        if (typeof trendData.count === 'number') {
          count = trendData.count;
        } else if (typeof trendData.count === 'string') {
          count = parseInt(trendData.count, 10) || 0;
        } else {
          count = 0;
        }
        
        // Düşük sayıları filtrele - sayısı 1'den büyükse dahil et
        if (count > 1) {
          trends.push({
            tag: trendData.tag || key, // Orijinal etiket yoksa key kullan
            count: count,
            id: trendData.id || `${key}-${country}` // ID yoksa oluştur
          });
        }
      }
      
      // İstemci tarafında sırala - en yüksek sayıdan en düşüğe
      const sortedTrends = trends
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
      
      return sortedTrends;
      
    } catch (error) {
      console.error('Firebase trendleri getirilirken hata:', error);
      return [];
    }
  }

  // Eski verileri temizle - günlük olarak çalıştırılabilir
  public async cleanupExpiredData(): Promise<void> {
    try {
      const now = new Date().getTime();
      
      // Ülke kodlarını kullan (Circular dependency'den kaçınmak için)
      for (const countryCode of COUNTRY_CODES) {
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
          try {
            const trendData = trendsData[key];
            
            // Geçersiz veri kontrolü
            if (!trendData || !trendData.updatedAt) continue;
            
            const updatedAt = new Date(trendData.updatedAt).getTime();
            
            if (now - updatedAt > DATA_EXPIRY_TIME) {
              // Süre dolmuş veriyi sil
              await set(ref(db, `trends/${countryCode}/${key}`), null);
              console.log(`Eski veri silindi: ${key} (${countryCode})`);
            }
          } catch (itemError) {
            console.error(`Veri temizleme hatası (${key}):`, itemError);
            // Tek bir itemdeki hata tüm işlemi durdurmaz
            continue;
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
    this.cleanupExpiredData().catch(err => {
      console.error("İlk temizleme başarısız:", err);
    });
    
    // Her 24 saatte bir temizlik işlemini tekrarla
    return setInterval(() => {
      this.cleanupExpiredData().catch(err => {
        console.error("Planlanmış temizleme başarısız:", err);
      });
    }, 24 * 60 * 60 * 1000); // 24 saat
  }
}

// Firebase Trend Store singleton instance'ını döndürür
export function getFirebaseTrendStore(): FirebaseTrendStore {
  return FirebaseTrendStore.getInstance();
}

// Eğer tarayıcı ortamında isek, temizlik zamanlayıcısını başlat
if (typeof window !== 'undefined') {
  getFirebaseTrendStore(); // Singleton instance'ı oluştur ve temizlik zamanlayıcısını başlat
} 