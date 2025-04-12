const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

/**
 * Her 5 saatte bir çalışan ve 5 saatten eski trend verilerini temizleyen zamanlı görev.
 * Bu görev PubSub tetikleyicisi ile çalışır ve her 5 saatte bir otomatik olarak çalıştırılır.
 */
exports.dailyCleanupTrends = functions.pubsub.schedule('every 5 hours').onRun(async (context) => {
  const now = new Date().getTime();
  const expiryTime = 5 * 60 * 60 * 1000; // 5 saat (milisaniye cinsinden)
  
  console.log('Zamanlı veri temizleme görevi başladı:', new Date().toISOString());
  
  try {
    // Realtime Database referansını al
    const db = admin.database();
    const trendsRef = db.ref('trends');
    
    // Tüm trend verilerini oku
    const snapshot = await trendsRef.once('value');
    const allData = snapshot.val();
    
    if (!allData) {
      console.log('Temizlenecek veri bulunamadı');
      return null;
    }
    
    // Tüm ülkeler için güncelleme topluluğu
    const updates = {};
    let totalCleanedItems = 0;
    
    // Her ülke için verileri kontrol et
    Object.keys(allData).forEach(countryCode => {
      const countryData = allData[countryCode];
      
      // Ülke içindeki her trend için kontrol et
      Object.keys(countryData || {}).forEach(tagKey => {
        const trendData = countryData[tagKey];
        
        // Eğer güncellenme tarihi yoksa veya format uygun değilse, sil
        if (!trendData.updatedAt) {
          updates[`trends/${countryCode}/${tagKey}`] = null;
          totalCleanedItems++;
          return;
        }
        
        // 5 saatten eski verileri sil
        const updatedAt = new Date(trendData.updatedAt).getTime();
        if (now - updatedAt > expiryTime) {
          updates[`trends/${countryCode}/${tagKey}`] = null;
          totalCleanedItems++;
        }
      });
    });
    
    // Eğer silinecek veri varsa, güncelleme yap
    if (Object.keys(updates).length > 0) {
      await db.ref().update(updates);
      console.log(`${totalCleanedItems} adet eski trend verisi silindi`);
    } else {
      console.log('Silinecek eski veri bulunamadı');
    }
    
    console.log('Veri temizleme görevi başarıyla tamamlandı:', new Date().toISOString());
    return null;
  } catch (error) {
    console.error('Veri temizleme sırasında hata oluştu:', error);
    return null;
  }
});

/**
 * Her gün gece yarısında çalışan ve günlük trend istatistiklerini kaydeden görev.
 * İsteğe bağlı olarak eklenebilir - şimdi dahil edilmedi.
 */
// exports.saveDailyStats = functions.pubsub.schedule('every day 00:00').onRun(async (context) => {
//   // Buraya günlük istatistikleri kaydetme kodu ekleyebilirsiniz
// }); 