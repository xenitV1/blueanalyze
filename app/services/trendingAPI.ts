import axios from 'axios';
import { getFirebaseTrendStore } from './firebaseTrendStore';

// Trend arayüzü
export interface Trend {
  tag: string;
  count: number;
  id: string;
}

// Ülke arayüzü
export interface Country {
  code: string;
  name: string;
  flag: string;
}

// WebSocket bağlantı durumları
type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

// Merkezi veritabanı kullanımı için bayrak
export const USE_FIREBASE = true; // true: Firebase kullan, false: IndexedDB kullan

// Desteklenen ülkeler listesi
export const COUNTRIES: Country[] = [
  { code: 'global', name: 'Global', flag: '🌎' },
  { code: 'TR', name: 'Türkiye', flag: '🇹🇷' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
];

// Trend verilerini saklamak için sınıf
class TrendStore {
  private globalTrends: Map<string, number> = new Map();
  private countryTrends: Map<string, Map<string, number>> = new Map();
  private lastUpdated: Date = new Date();
  private expiryTime: number = 24 * 60 * 60 * 1000; // 24 saat (milisaniye)
  private dbName: string = 'blueanalyze_trends';
  private dbVersion: number = 1;
  private db: IDBDatabase | null = null;
  
  constructor() {
    // Her ülke için boş trend haritası başlat
    COUNTRIES.forEach(country => {
      if (country.code !== 'global') {
        this.countryTrends.set(country.code, new Map());
      }
    });
    
    // Veritabanını başlat ve mevcut verileri yükle
    if (typeof window !== 'undefined' && !USE_FIREBASE) {
      this.initDatabase().then(() => {
        this.loadFromDatabase();
      });
    }
    
    // Veri temizleme zamanlayıcısı - her 30 dakikada bir kontrol et
    setInterval(() => this.cleanupExpiredData(), 30 * 60 * 1000);
  }
  
  // IndexedDB veritabanını başlat
  private async initDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        console.warn('Bu tarayıcı IndexedDB desteklemiyor. Önbellekleme devre dışı.');
        resolve();
        return;
      }
      
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = (event) => {
        console.error('IndexedDB açılırken hata oluştu:', event);
        reject(new Error('IndexedDB açılamadı'));
      };
      
      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        
        // Trend verilerini saklayacak object store oluştur
        if (!this.db.objectStoreNames.contains('trends')) {
          const store = this.db.createObjectStore('trends', { keyPath: 'id' });
          store.createIndex('country', 'country', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
        
        // Meta veriler için store
        if (!this.db.objectStoreNames.contains('meta')) {
          this.db.createObjectStore('meta', { keyPath: 'key' });
        }
      };
    });
  }
  
  // Veritabanından verileri yükle
  private async loadFromDatabase(): Promise<void> {
    if (!this.db) return;
    
    try {
      // Önce son güncelleme zamanını kontrol et
      const metaData = await this.getMetaData('lastUpdated');
      if (metaData) {
        this.lastUpdated = new Date(metaData.value);
        
        // Veriler süresi dolmuşsa yüklemeye gerek yok
        const now = new Date();
        if (now.getTime() - this.lastUpdated.getTime() >= this.expiryTime) {
          this.cleanupExpiredData();
          return;
        }
      }
      
      // Veritabanından tüm trend verilerini yükle
      const transaction = this.db.transaction(['trends'], 'readonly');
      const store = transaction.objectStore('trends');
      const request = store.getAll();
      
      request.onsuccess = () => {
        const trends = request.result;
        
        if (trends && trends.length > 0) {
          // Verileri haritalarımıza yükle
          trends.forEach(item => {
            if (item.country === 'global') {
              this.globalTrends.set(item.tag, item.count);
            } else {
              const countryMap = this.countryTrends.get(item.country) || new Map();
              countryMap.set(item.tag, item.count);
              this.countryTrends.set(item.country, countryMap);
            }
          });
        }
      };
      
      request.onerror = (error) => {
        console.error('Trend verileri yüklenirken hata:', error);
      };
    } catch (error) {
      console.error('Veritabanından veri yüklerken hata:', error);
    }
  }
  
  // Veritabanına trendi kaydet
  private async saveTrendToDatabase(tag: string, count: number, country: string): Promise<void> {
    if (!this.db) return;
    
    try {
      const transaction = this.db.transaction(['trends'], 'readwrite');
      const store = transaction.objectStore('trends');
      
      const trendData = {
        id: `${tag}-${country}`,
        tag,
        count,
        country,
        updatedAt: new Date().toISOString()
      };
      
      store.put(trendData);
      
      // Son güncelleme zamanını da kaydet
      this.updateMetaData('lastUpdated', new Date().toISOString());
      
    } catch (error) {
      console.error('Trend verisi kaydedilirken hata:', error);
    }
  }
  
  // Meta verileri güncelle
  private async updateMetaData(key: string, value: any): Promise<void> {
    if (!this.db) return;
    
    try {
      const transaction = this.db.transaction(['meta'], 'readwrite');
      const store = transaction.objectStore('meta');
      
      store.put({
        key,
        value
      });
    } catch (error) {
      console.error('Meta veri güncellenirken hata:', error);
    }
  }
  
  // Meta verileri getir
  private async getMetaData(key: string): Promise<any> {
    if (!this.db) return null;
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction(['meta'], 'readonly');
        const store = transaction.objectStore('meta');
        const request = store.get(key);
        
        request.onsuccess = () => {
          resolve(request.result);
        };
        
        request.onerror = (error) => {
          console.error('Meta veri okunurken hata:', error);
          reject(error);
        };
      } catch (error) {
        console.error('Meta veri getirilirken hata:', error);
        reject(error);
      }
    });
  }
  
  private cleanupExpiredData() {
    const now = new Date();
    // Veriler 24 saatten eskiyse sıfırla
    if (now.getTime() - this.lastUpdated.getTime() >= this.expiryTime) {
      console.log('Cleaning up expired trend data');
      this.globalTrends = new Map();
      COUNTRIES.forEach(country => {
        if (country.code !== 'global') {
          this.countryTrends.set(country.code, new Map());
        }
      });
      this.lastUpdated = now;
      
      // Veritabanını da temizle
      if (this.db) {
        try {
          const transaction = this.db.transaction(['trends'], 'readwrite');
          const store = transaction.objectStore('trends');
          store.clear();
          
          // Meta verileri güncelle
          this.updateMetaData('lastUpdated', now.toISOString());
        } catch (error) {
          console.error('Veritabanı temizlenirken hata:', error);
        }
      }
    }
  }
  
  // Etiket sayısını artır
  incrementTag(tag: string, country: string = 'global') {
    // Firebase kullanılıyorsa, işleme gerek yok - veriler websocket tarafından Firebase'e gönderilecek
    if (USE_FIREBASE) return;
    
    // Global sayacı güncelle
    this.globalTrends.set(tag, (this.globalTrends.get(tag) || 0) + 1);
    
    // Ülkeye özgü sayacı güncelle (eğer ülke geçerliyse)
    if (country !== 'global' && this.countryTrends.has(country)) {
      const countryMap = this.countryTrends.get(country)!;
      countryMap.set(tag, (countryMap.get(tag) || 0) + 1);
    }
    
    // Son güncelleme zamanını yenile
    this.lastUpdated = new Date();
    
    // Veritabanına kaydet
    const globalCount = this.globalTrends.get(tag) || 0;
    this.saveTrendToDatabase(tag, globalCount, 'global');
    
    if (country !== 'global' && this.countryTrends.has(country)) {
      const countryCount = this.countryTrends.get(country)!.get(tag) || 0;
      this.saveTrendToDatabase(tag, countryCount, country);
    }
  }
  
  // Bir ülke veya global için trendleri getir
  getTrends(country: string = 'global', limit: number = 20): Trend[] {
    // Hangi trend haritasını kullanacağımızı belirle
    const trendsMap = country === 'global' 
      ? this.globalTrends 
      : (this.countryTrends.get(country) || new Map());
    
    // Etiketleri sayılara göre sırala ve istenen sayıya kısıtla
    return Array.from(trendsMap.entries())
      .map(([tag, count]) => ({ 
        tag, 
        count,
        id: `${tag}-${country}` // Benzersiz ID oluştur
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}

// Singleton trend deposu
const trendStore = new TrendStore();
// Firebase trend deposu
const firebaseTrendStore = USE_FIREBASE ? getFirebaseTrendStore() : null;

// WebSocket bağlantı yöneticisi
class JetstreamClient {
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 2000; // 2 saniye
  
  constructor() {
    // Bağlantıyı başlat
    this.connect();
  }
  
  // WebSocket bağlantısını başlat
  connect() {
    if (this.status === 'connecting' || this.status === 'connected') {
      return;
    }
    
    this.status = 'connecting';
    
    try {
      // Jetstream WebSocket'e bağlan - sadece 'app.bsky.feed.post' koleksiyonunu dinle
      const url = 'wss://jetstream1.us-east.bsky.network/subscribe?wantedCollections=app.bsky.feed.post';
      
      this.ws = new WebSocket(url);
      
      this.ws.onopen = () => {
        console.log('Connected to Bluesky Jetstream');
        this.status = 'connected';
        this.reconnectAttempts = 0;
      };
      
      this.ws.onmessage = async (event) => {
        try {
          // Gelen JSON mesajını işle
          const data = JSON.parse(event.data);
          
          // Düzeltilmiş veri yapısı - Gelen veriler data.commit içinde
          if (data.kind === 'commit' && data.commit) {
            // Sadece post oluşturma olaylarını işle - düzeltilmiş yol
            if (data.commit.operation === 'create' && data.commit.collection === 'app.bsky.feed.post') {
              // Record veri yapısını kontrol et
              if (!data.commit.record) {
                return;
              }
              
              // Post dil bilgisini kontrol et
              const postLangs = data.commit.record.langs || [];
              
              // Post içeriği kontrol et
              const postText = data.commit.record.text;
              
              if (!postText) {
                return;
              }
              
              // Dil bilgisine göre ülke eşleştirme
              const countryCode = this.getCountryCodeFromLangs(postLangs);
              
              // Facets özelliğini kontrol et - Bluesky'da hashtag'ler burada olabilir
              if (data.commit.record.facets && Array.isArray(data.commit.record.facets)) {
                // Facets içinden hashtag özelliğine sahip olanları bul
                const hashtagFacets = [];
                for (const facet of data.commit.record.facets) {
                  if (facet.features && Array.isArray(facet.features)) {
                    for (const feature of facet.features) {
                      if (feature.$type === 'app.bsky.richtext.facet#tag') {
                        hashtagFacets.push(feature.tag);
                      }
                    }
                  }
                }
                
                // Facets'ten hashtag'ler bulunduysa işle
                if (hashtagFacets.length > 0) {
                  for (const tag of hashtagFacets) {
                    const normalizedTag = tag.toLowerCase();
                    
                    if (USE_FIREBASE && firebaseTrendStore) {
                      // Firebase için
                      await firebaseTrendStore.incrementTag(normalizedTag, 'global'); // Global için
                      if (countryCode !== 'global') {
                        await firebaseTrendStore.incrementTag(normalizedTag, countryCode); // Ülke için
                      }
                    } else {
                      // Yerel depolama için
                      trendStore.incrementTag(normalizedTag, 'global'); // Global için
                      if (countryCode !== 'global') {
                        trendStore.incrementTag(normalizedTag, countryCode); // Ülke için
                      }
                    }
                  }
                  
                  // İşlem tamamlandı, geri dön
                  return;
                }
              }
              
              // Eğer facets içinde hashtag bulunamadıysa, metin içinden çıkar
              const hashtags = this.extractHashtags(postText);
              
              // Her hashtag için trend verisini güncelle
              if (hashtags.length > 0) {
                for (const tag of hashtags) {
                  if (USE_FIREBASE && firebaseTrendStore) {
                    // Firebase için
                    await firebaseTrendStore.incrementTag(tag, 'global'); // Global için
                    if (countryCode !== 'global') {
                      await firebaseTrendStore.incrementTag(tag, countryCode); // Ülke için
                    }
                  } else {
                    // Yerel depolama için
                    trendStore.incrementTag(tag, 'global'); // Global için
                    if (countryCode !== 'global') {
                      trendStore.incrementTag(tag, countryCode); // Ülke için
                    }
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };
      
      this.ws.onclose = () => {
        console.log('Disconnected from Bluesky Jetstream');
        this.status = 'disconnected';
        this.attemptReconnect();
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.status = 'error';
        this.attemptReconnect();
      };
      
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.status = 'error';
      this.attemptReconnect();
    }
  }
  
  // Bağlantıyı yeniden kurma girişimi
  private attemptReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
      
      console.log(`Attempting to reconnect in ${delay / 1000} seconds (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      this.reconnectTimer = setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('Max reconnect attempts reached. Please retry manually.');
    }
  }
  
  // Bağlantıyı sonlandır
  disconnect() {
    if (this.ws && (this.status === 'connected' || this.status === 'connecting')) {
      this.ws.close();
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.status = 'disconnected';
  }
  
  // Gönderiden hashtag'leri çıkar
  private extractHashtags(text: string): string[] {
    if (!text) {
      return [];
    }
    
    // Klasik hashtag regex (# işareti ile başlayan kelimeler)
    const hashtagRegex = /#([a-zA-Z0-9_üşıöğçÜŞİÖĞÇ]+)/g;
    const matches = text.match(hashtagRegex);
    
    if (matches && matches.length > 0) {
      // '#' işaretini kaldır ve küçük harfe çevir
      const hashtags = matches.map(tag => tag.slice(1).toLowerCase());
      return hashtags;
    }
    
    return [];
  }
  
  // Dil kodlarından ülke kodlarına dönüşüm için yardımcı metot
  private getCountryCodeFromLangs(langs: string[]): string {
    if (!langs || !Array.isArray(langs) || langs.length === 0) {
      return 'global'; // Dil bilgisi yoksa global olarak işaretle
    }
    
    // Dili ilk 2 karakterine göre eşleştir (en-US -> en)
    const langCode = langs[0].substring(0, 2).toLowerCase();
    
    // Dil kodlarını ülke kodlarına eşleştirme
    const langToCountryMap: Record<string, string> = {
      'tr': 'TR', // Türkçe
      'en': 'US', // İngilizce
      'de': 'DE', // Almanca
      'fr': 'FR', // Fransızca
      'ja': 'JP', // Japonca
      'pt': 'BR', // Portekizce (Brezilya)
      'ko': 'KR', // Korece
      'hi': 'IN', // Hintçe
      'zh': 'CN', // Çince
      'es': 'ES', // İspanyolca
      'it': 'IT', // İtalyanca
      'ru': 'RU', // Rusça
      'ar': 'SA', // Arapça
      'id': 'ID', // Endonezya dili
      'nl': 'NL', // Hollandaca
      'pl': 'PL', // Lehçe
      'sv': 'SE', // İsveççe
      'th': 'TH', // Tayca
      'uk': 'UA', // Ukraynaca
      'vi': 'VN', // Vietnamca
    };
    
    // Dil kodunu ülke koduna çevir
    const countryCode = langToCountryMap[langCode];
    
    // Eğer desteklenen bir ülke koduna çevrilebiliyorsa ve COUNTRIES listesinde varsa kullan
    if (countryCode && COUNTRIES.some(country => country.code === countryCode)) {
      return countryCode;
    }
    
    // Diğer durumlarda global olarak işaretle
    return 'global';
  }
  
  // Bağlantı durumunu getir
  getStatus(): ConnectionStatus {
    return this.status;
  }
}

// Singleton JetstreamClient örneği
let jetstreamClient: JetstreamClient | null = null;

// Jetstream bağlantısını başlat
export function initializeJetstreamClient() {
  if (!jetstreamClient) {
    jetstreamClient = new JetstreamClient();
  }
  return jetstreamClient;
}

// Belirli bir ülke için trend etiketlerini getir
export async function getTrendingHashtags(country: string = 'global', limit: number = 20): Promise<Trend[]> {
  // Eğer Jetstream istemcisi başlatılmamışsa başlat
  if (!jetstreamClient) {
    initializeJetstreamClient();
  }
  
  // Firebase kullanılıyorsa, Firebase'den al
  if (USE_FIREBASE && firebaseTrendStore) {
    return await firebaseTrendStore.getTrends(country, limit);
  } 
  
  // Aksi takdirde yerel depodan al
  return trendStore.getTrends(country, limit);
}

// WebSocket bağlantı durumunu getir
export function getConnectionStatus(): ConnectionStatus {
  if (!jetstreamClient) {
    return 'disconnected';
  }
  
  return jetstreamClient.getStatus();
}

// Eğer bu modül bir tarayıcı ortamında çalışıyorsa, otomatik başlat
if (typeof window !== 'undefined') {
  initializeJetstreamClient();
} 