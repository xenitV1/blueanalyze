import React, { useState } from 'react';
import { FiMail, FiExternalLink, FiX } from 'react-icons/fi';
import { useLanguage } from '../../contexts/LanguageContext';

const Footer: React.FC = () => {
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const { t, language } = useLanguage();

  const renderTermsModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.terms}</h3>
          <button
            onClick={() => setShowTerms(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <FiX className="text-xl" />
          </button>
        </div>
        <div className="prose dark:prose-invert prose-sm max-w-none">
          {language === 'EN' ? (
            <>
              <h4>1. Acceptance of Terms</h4>
              <p>
                By accessing and using BlueAnalyze, you accept and agree to be bound by the terms and provisions of this agreement.
              </p>
              
              <h4>2. Description of Service</h4>
              <p>
                BlueAnalyze is an unofficial tool that helps users analyze their Bluesky followers and following. The service is not affiliated with, endorsed by, or in any way connected to Bluesky Social or its parent company.
              </p>
              
              <h4>3. User Responsibilities</h4>
              <p>
                You are responsible for safeguarding your password and for all activities that occur under your account. We recommend using App Passwords instead of your main Bluesky password.
              </p>
              
              <h4>4. Data Usage</h4>
              <p>
                We do not store your password or authentication tokens on our servers. All processing happens in your browser.
              </p>
              
              <h4>5. Rate Limits</h4>
              <p>
                BlueAnalyze respects Bluesky's API rate limits. Extensive use of batch operations may result in temporary throttling of your requests by Bluesky's servers.
              </p>
              
              <h4>6. Disclaimer of Warranties</h4>
              <p>
                The service is provided "as is" without warranties of any kind, either express or implied. We do not warrant that the service will be uninterrupted or error-free.
              </p>
              
              <h4>7. Limitation of Liability</h4>
              <p>
                In no event shall BlueAnalyze be liable for any indirect, incidental, special, consequential or punitive damages resulting from your use of or inability to use the service.
              </p>
              
              <h4>8. Changes to Terms</h4>
              <p>
                We reserve the right to modify these terms at any time. Your continued use of BlueAnalyze after any such changes constitutes your acceptance of the new terms.
              </p>
            </>
          ) : (
            <>
              <h4>1. Kabul Beyanı</h4>
              <p>
                BlueAnalyze'a erişerek ve kullanarak, bu sözleşmenin hüküm ve koşullarına bağlı kalmayı kabul etmiş olursunuz.
              </p>
              
              <h4>2. Hizmet Açıklaması</h4>
              <p>
                BlueAnalyze, kullanıcıların Bluesky takipçilerini ve takip ettiklerini analiz etmelerine yardımcı olan gayri resmi bir araçtır. Bu hizmet, Bluesky Social veya ana şirketi ile bağlantılı, onların onayını almış veya herhangi bir şekilde ilişkili değildir.
              </p>
              
              <h4>3. Kullanıcı Sorumlulukları</h4>
              <p>
                Şifrenizin güvenliğinden ve hesabınız altında gerçekleşen tüm etkinliklerden siz sorumlusunuz. Ana Bluesky şifreniz yerine App Passwords kullanmanızı öneririz.
              </p>
              
              <h4>4. Veri Kullanımı</h4>
              <p>
                Şifrenizi veya kimlik doğrulama tokenlarınızı sunucularımızda saklamıyoruz. Tüm işlemler tarayıcınızda gerçekleşir.
              </p>
              
              <h4>5. Hız Sınırları</h4>
              <p>
                BlueAnalyze, Bluesky'nin API hız sınırlarına saygı gösterir. Toplu işlemlerin yoğun kullanımı, Bluesky sunucuları tarafından isteklerinizin geçici olarak kısıtlanmasına neden olabilir.
              </p>
              
              <h4>6. Garanti Reddi</h4>
              <p>
                Hizmet, açık veya zımni hiçbir garanti olmaksızın "olduğu gibi" sağlanır. Hizmetin kesintisiz veya hatasız olacağını garanti etmiyoruz.
              </p>
              
              <h4>7. Sorumluluk Sınırlaması</h4>
              <p>
                BlueAnalyze, hiçbir durumda, hizmeti kullanmanızdan veya kullanamamanızdan kaynaklanan dolaylı, arızi, özel, ardıl veya cezai zararlardan sorumlu tutulmayacaktır.
              </p>
              
              <h4>8. Şartlarda Değişiklikler</h4>
              <p>
                Bu şartları herhangi bir zamanda değiştirme hakkını saklı tutarız. Bu tür değişikliklerden sonra BlueAnalyze'ı kullanmaya devam etmeniz, yeni şartları kabul ettiğiniz anlamına gelir.
              </p>
            </>
          )}
          
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-6">
            {language === 'EN' ? 'Last updated:' : 'Son güncelleme:'} {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );

  const renderPrivacyModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.privacy}</h3>
          <button
            onClick={() => setShowPrivacy(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <FiX className="text-xl" />
          </button>
        </div>
        <div className="prose dark:prose-invert prose-sm max-w-none">
          {language === 'EN' ? (
            <>
              <h4>Information Collection and Use</h4>
              <p>
                BlueAnalyze is designed with your privacy in mind. Here's what you should know about how we handle your data:
              </p>
              
              <h4>Browser Processing</h4>
              <p>
                All data processing happens directly in your browser. Your Bluesky password or App Password is used only to authenticate with Bluesky's API and is never stored on our servers.
              </p>
              
              <h4>Local Storage</h4>
              <p>
                For your convenience, we store progress information for batch operations in your browser's local storage. This allows you to resume operations if they get interrupted due to token expiration or other issues.
              </p>
              
              <h4>API Requests</h4>
              <p>
                When you use BlueAnalyze, your browser makes direct API requests to Bluesky's servers. We do not proxy or store this data on our end.
              </p>
              
              <h4>Feedback and Contact Information</h4>
              <p>
                If you choose to contact us via email, any information you provide in your message will be used solely for responding to your inquiry or improving our service.
              </p>
              
              <h4>Updates to This Policy</h4>
              <p>
                We may update this privacy policy from time to time. Any changes will be reflected on this page.
              </p>
            </>
          ) : (
            <>
              <h4>Bilgi Toplama ve Kullanımı</h4>
              <p>
                BlueAnalyze, gizliliğiniz düşünülerek tasarlanmıştır. Verilerinizin nasıl işlendiği hakkında bilmeniz gerekenler:
              </p>
              
              <h4>Tarayıcı İşleme</h4>
              <p>
                Tüm veri işleme doğrudan tarayıcınızda gerçekleşir. Bluesky şifreniz veya App Password sadece Bluesky API'si ile kimlik doğrulaması için kullanılır ve asla sunucularımızda saklanmaz.
              </p>
              
              <h4>Yerel Depolama</h4>
              <p>
                Kolaylık sağlamak amacıyla, toplu işlemler için ilerleme bilgilerini tarayıcınızın yerel depolama alanında saklıyoruz. Bu, token süresi dolması veya başka sorunlar nedeniyle işlemler kesintiye uğrarsa devam etmenizi sağlar.
              </p>
              
              <h4>API İstekleri</h4>
              <p>
                BlueAnalyze'ı kullandığınızda, tarayıcınız Bluesky sunucularına doğrudan API istekleri gönderir. Bu verileri kendi tarafımızda proxy yapmaz veya saklamayız.
              </p>
              
              <h4>Geri Bildirim ve İletişim Bilgileri</h4>
              <p>
                E-posta yoluyla bizimle iletişime geçmeyi seçerseniz, mesajınızda sağladığınız herhangi bir bilgi yalnızca sorunuza yanıt vermek veya hizmetimizi iyileştirmek için kullanılacaktır.
              </p>
              
              <h4>Bu Politikadaki Güncellemeler</h4>
              <p>
                Bu gizlilik politikasını zaman zaman güncelleyebiliriz. Herhangi bir değişiklik bu sayfada yansıtılacaktır.
              </p>
            </>
          )}
          
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-6">
            {language === 'EN' ? 'Last updated:' : 'Son güncelleme:'} {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );

  const renderContactModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.contactUs}</h3>
          <button
            onClick={() => setShowContact(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <FiX className="text-xl" />
          </button>
        </div>
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            {language === 'EN' 
              ? 'Have questions, feedback, or need assistance? We\'d love to hear from you!'
              : 'Sorularınız, geri bildirimleriniz veya yardıma mı ihtiyacınız var? Sizden haber almak isteriz!'}
          </p>
          
          <div className="flex items-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md">
            <FiMail className="text-blue-500 mr-3 flex-shrink-0" />
            <div>
              <p className="font-medium">{t.emailAt}</p>
              <a 
                href="mailto:blueanalyze@outlook.com"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                blueanalyze@outlook.com
              </a>
            </div>
          </div>
          
          <div className="flex items-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md">
            <FiExternalLink className="text-blue-500 mr-3 flex-shrink-0" />
            <div>
              <p className="font-medium">{t.connectOn}</p>
              <a 
                href="https://bsky.app/profile/vortic0.bsky.social"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                @vortic0.bsky.social
              </a>
            </div>
          </div>
          
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            {t.responseTime}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <footer className="bg-white dark:bg-gray-900 py-6 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              &copy; {new Date().getFullYear()} BlueAnalyze. {t.allRightsReserved}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {t.unofficialTool}
            </p>
            <div className="mt-4 flex justify-center space-x-6">
              <button
                onClick={() => setShowTerms(true)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {t.terms}
              </button>
              <button
                onClick={() => setShowPrivacy(true)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {t.privacy}
              </button>
              <button
                onClick={() => setShowContact(true)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {t.contact}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {showTerms && renderTermsModal()}
      {showPrivacy && renderPrivacyModal()}
      {showContact && renderContactModal()}
    </footer>
  );
};

export default Footer; 