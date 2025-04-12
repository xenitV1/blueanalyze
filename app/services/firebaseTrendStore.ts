// Firebase Trend Store - Merkezi trend verileri için Firebase hizmeti
import { ref, set, onValue, get, query, orderByChild, limitToLast } from 'firebase/database';
import { db } from './firebaseConfig';
import type { Trend } from './trendingAPI';

// TTL değeri - 5 saat (milisaniye cinsinden)
const DATA_EXPIRY_TIME = 5 * 60 * 60 * 1000;

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
  private lastUpdated: Date = new Date(); // Son güncelleme zamanını takip et

  // Singleton instance için
  public static getInstance(): FirebaseTrendStore {
    if (!FirebaseTrendStore.instance) {
      FirebaseTrendStore.instance = new FirebaseTrendStore();
    }
    return FirebaseTrendStore.instance;
  }

  // Constructor - temizlik işlemlerini daha sık yapacak şekilde düzenle
  constructor() {
    // Temizlik işlemini başlat (eğer zaten başlatılmamışsa)
    if (!this.scheduledCleanup && typeof window !== 'undefined') {
      // Sayfa açılır açılmaz ilk temizliği yap
      this.cleanupExpiredData().catch(err => {
        console.error("İlk temizleme başarısız:", err);
      });
      
      // Her 30 dakikada bir temizliği kontrol et (daha sık)
      this.scheduledCleanup = setInterval(() => {
        this.cleanupExpiredData().catch(err => {
          console.error("Planlanmış temizleme başarısız:", err);
        });
      }, 30 * 60 * 1000); // 30 dakika
    }
    
    // Son güncelleme zamanını şimdiki zaman olarak ayarla
    this.lastUpdated = new Date();
  }

  // Tag'i artır
  public incrementTag(tag: string, country: string = 'global'): void {
    // MAINTENANCE MODE: İşlemleri devre dışı bırak
    console.log('Bakım modu: Trend işlemleri geçici olarak devre dışı.');
    return;
    
    /* Eski kod
    try {
      // SSR ortamı kontrolü
      if (typeof window === 'undefined') {
        console.warn('SSR ortamında Firebase işlemleri gerçekleştirilmiyor');
        return;
      }
      
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
            console.log(`"${cleanTag}" etiketi güncellendi, sayı: ${count}`);
            
            // Son güncelleme zamanını güncelle
            this.lastUpdated = new Date();
          })
          .catch((error) => {
            // Hata daha ayrıntılı bir şekilde işleniyor
            console.error(`"${cleanTag}" güncellenirken hata:`, error);
            // Büyük hataları konsola yazdırmak yerine kullanıcıya daha anlamlı bir mesaj göster
            if (error && error.code === 'PERMISSION_DENIED') {
              console.warn(`Firebase izin hatası: Etiket "${cleanTag}" güncellenemedi. Firebase kurallarınızı kontrol edin.`);
            }
          });
      }).catch((error) => {
        console.error(`"${cleanTag}" okunurken hata:`, error);
      });
    } catch (error) {
      console.error(`Tag artırılırken hata (${tag}):`, error);
    }
    */
  }
  
  // Trendleri getir
  public async getTrends(country: string = 'global', limit: number = 20): Promise<Trend[]> {
    // MAINTENANCE MODE: Bakım modu aktif, boş trend listesi döndür
    console.log('Bakım modu: Trend işlemleri geçici olarak devre dışı.');
    return [];

    /* Eski kod
    try {
      // SSR ortamı kontrolü
      if (typeof window === 'undefined') {
        console.warn('SSR ortamında Firebase işlemleri gerçekleştirilmiyor');
        return [];
      }
      
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
      console.error(`Trendler alınırken hata (${country}):`, error);
      return [];
    }
    */
  }
  
  // Temizlik işlemi - süresi dolmuş trendleri kaldır
  public async cleanupExpiredData(): Promise<void> {
    // MAINTENANCE MODE: Temizlik işlemlerini devre dışı bırak
    console.log('Bakım modu: Temizlik işlemleri geçici olarak devre dışı.');
    return;
    
    /* Eski kod
    try {
      // SSR ortamı kontrolü
      if (typeof window === 'undefined') {
        return;
      }
      
      console.log('Trend verilerini temizleme işlemi başlatılıyor...');
      
      // Her ülke için temizleme işlemi yap
      for (const country of COUNTRY_CODES) {
        // Ülke trendlerini al
        const trendsRef = ref(db, `trends/${country}`);
        const snapshot = await get(trendsRef);
        
        if (!snapshot.exists()) {
          continue; // Bu ülke için veri yoksa devam et
        }
        
        const trendsData = snapshot.val();
        
        // Her trend için süre kontrolü yap
        for (const key in trendsData) {
          try {
            const trendData = trendsData[key];
            
            // Veri yok veya güncelleme tarihi yok ise sil
            if (!trendData || !trendData.updatedAt) {
              console.log(`Eski veri silindi: ${key} (${country})`);
              await set(ref(db, `trends/${country}/${key}`), null);
              continue;
            }
            
            // Süresi dolmuş ise sil
            const updatedAt = new Date(trendData.updatedAt);
            const now = new Date();
            if (now.getTime() - updatedAt.getTime() > DATA_EXPIRY_TIME) {
              console.log(`Eski veri silindi: ${key} (${country})`);
              await set(ref(db, `trends/${country}/${key}`), null);
            }
          } catch (error) {
            console.error(`Trend temizleme hatası (${key}, ${country}):`, error);
          }
        }
      }
      
      console.log('Trend verileri temizleme işlemi tamamlandı.');
    } catch (error) {
      console.error(`Trendler temizlenirken genel hata:`, error);
    }
    */
  }
  
  // Statik temizlik fonksiyonu
  public static triggerCleanupNow(): void {
    // MAINTENANCE MODE: Temizlik tetiklemeyi devre dışı bırak
    console.log('Bakım modu: Temizlik tetikleme işlemi geçici olarak devre dışı.');
    return;
    
    /* Eski kod
    const instance = FirebaseTrendStore.getInstance();
    instance.cleanupExpiredData().catch(err => {
      console.error("Manuel temizleme hatası:", err);
    });
    */
  }
  
  // Tüm trend verilerini sıfırla (tehlikeli!)
  public async resetAllTrends(): Promise<void> {
    // MAINTENANCE MODE: Sıfırlama işlemlerini devre dışı bırak
    console.log('Bakım modu: Sıfırlama işlemleri geçici olarak devre dışı.');
    return;
    
    /* Eski kod
    try {
      // SSR ortamı kontrolü
      if (typeof window === 'undefined') {
        return;
      }
      
      // Güvenlik için onay gerektiren tehlikeli bir işlem
      console.warn('⚠️ TÜM TREND VERİLERİ SİLİNECEK! Bu işlem geri alınamaz!');
      
      // Tüm ülke trend verilerini sıfırla
      for (const country of COUNTRY_CODES) {
        try {
          await set(ref(db, `trends/${country}`), null);
          console.log(`${country} trend verileri sıfırlandı.`);
        } catch (error) {
          console.error(`${country} trend verileri sıfırlanırken hata:`, error);
        }
      }
      
      console.log('Tüm trend verileri başarıyla sıfırlandı.');
    } catch (error) {
      console.error('Trend verileri sıfırlanırken genel hata:', error);
    }
    */
  }
  
  // Son güncelleme zamanını getir
  public getLastUpdatedTime(): Date {
    return this.lastUpdated;
  }
}

// FirebaseTrendStore singleton'ını getir
export function getFirebaseTrendStore(): FirebaseTrendStore {
  return FirebaseTrendStore.getInstance();
}

// Eğer tarayıcı ortamında isek, temizlik zamanlayıcısını başlat
if (typeof window !== 'undefined') {
  // Sayfanın yüklenmesi tamamlandığında işlemleri başlat
  window.addEventListener('load', () => {
    // MAINTENANCE MODE: Firebase trend izleme devre dışı
    console.log('Bakım modu: Firebase trend izleme başlatılmadı');
    // getFirebaseTrendStore(); // Singleton instance'ı oluşturma
  });
} 