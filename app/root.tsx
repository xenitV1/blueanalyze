import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { OperationProvider } from './contexts/OperationContext';

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
  { rel: "shortcut icon", href: "/blueanalyze.png" },
  { rel: "icon", type: "image/png", href: "/blueanalyze.png" },
  { rel: "apple-touch-icon", href: "/blueanalyze.png" },
];

// SEO content for each language
const seoContent = {
  EN: {
    title: "BlueAnalyze - Bluesky Follower Analytics Tool",
    description: "Analyze your Bluesky followers and following relationships. Track mutual connections, find non-followers and manage your Bluesky social network with BlueAnalyze.",
    keywords: "bluesky, bluesky analytics, follower analysis, social media, blue analyze, bluesky followers, mutual connections",
    ogDescription: "Analyze your Bluesky followers and following relationships. Track mutual connections, find non-followers and manage your Bluesky social network.",
    locale: "en_US",
  },
  TR: {
    title: "BlueAnalyze - Bluesky Takipçi Analiz Aracı",
    description: "Bluesky takipçilerinizi ve takip ilişkilerinizi analiz edin. Karşılıklı takipleşenlerinizi takip edin, takip etmeyenleri bulun ve Bluesky sosyal ağınızı BlueAnalyze ile yönetin.",
    keywords: "bluesky, bluesky analiz, takipçi analizi, sosyal medya, blue analyze, bluesky takipçileri, karşılıklı takipleşenler",
    ogDescription: "Bluesky takipçilerinizi ve takip ilişkilerinizi analiz edin. Karşılıklı takipleşenlerinizi takip edin, takip etmeyenleri bulun ve Bluesky sosyal ağınızı yönetin.",
    locale: "tr_TR",
  }
};

function LayoutWithLanguage({ children }: { children: React.ReactNode }) {
  const { language } = useLanguage();
  const seo = seoContent[language];

  return (
    <html lang={language === 'EN' ? 'en' : 'tr'} className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#f3f4f6" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#1f2937" />
        {/* SEO Meta Tags */}
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <meta name="keywords" content={seo.keywords} />
        <meta name="language" content={language === 'EN' ? 'English' : 'Turkish'} />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="BlueAnalyze" />
        <meta name="revisit-after" content="7 days" />
        <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        <meta name="bingbot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        <meta http-equiv="content-language" content={language === 'EN' ? 'en' : 'tr'} />
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://blue-analyze.com/" />
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.ogDescription} />
        <meta property="og:image" content="https://blue-analyze.com/blueanalyze.png" />
        <meta property="og:locale" content={seo.locale} />
        <meta property="og:site_name" content="BlueAnalyze" />
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://blue-analyze.com/" />
        <meta property="twitter:title" content={seo.title} />
        <meta property="twitter:description" content={seo.ogDescription} />
        <meta property="twitter:image" content="https://blue-analyze.com/blueanalyze.png" />
        {/* Google Analytics */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-WFQ4TVVZ8N"></script>
        <script dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-WFQ4TVVZ8N');
          `
        }} />
        {/* Hreflang Etiketleri */}
        <link rel="alternate" hrefLang="en" href="https://blue-analyze.com/?lang=EN" />
        <link rel="alternate" hrefLang="tr" href="https://blue-analyze.com/?lang=TR" />
        <link rel="alternate" hrefLang="x-default" href="https://blue-analyze.com/" />
        {/* Schema.org yapısal verileri */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{
          __html: `
            {
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "${seo.title}",
              "description": "${seo.description}",
              "applicationCategory": "AnalyticsApplication",
              "operatingSystem": "Web",
              "url": "https://blue-analyze.com/",
              "inLanguage": "${language === 'EN' ? 'en-US' : 'tr-TR'}",
              "keywords": "${seo.keywords}",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "author": {
                "@type": "Organization",
                "name": "BlueAnalyze",
                "url": "https://blue-analyze.com/"
              }
            }
          `
        }} />
        <Meta />
        <Links />
      </head>
      <body className="h-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <LayoutWithLanguage>{children}</LayoutWithLanguage>
    </LanguageProvider>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <OperationProvider>
        <Outlet />
      </OperationProvider>
    </LanguageProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const errorMessages = {
    EN: {
      default: "Oops!",
      details: "An unexpected error occurred.",
      notFound: "The requested page could not be found."
    },
    TR: {
      default: "Hata!",
      details: "Beklenmedik bir hata oluştu.",
      notFound: "İstenen sayfa bulunamadı."
    }
  };

  // Try to use language context, fall back to English if not available
  let language: 'EN' | 'TR' = 'EN';
  try {
    const { language: contextLanguage } = useLanguage();
    language = contextLanguage;
  } catch (e) {
    // If context is not available, default to EN
  }
  
  const messages = errorMessages[language];
  
  let message = messages.default;
  let details = messages.details;
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : messages.default;
    details =
      error.status === 404
        ? messages.notFound
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <LanguageProvider>
      <main className="pt-16 p-4 container mx-auto">
        <h1>{message}</h1>
        <p>{details}</p>
        {stack && (
          <pre className="w-full p-4 overflow-x-auto">
            <code>{stack}</code>
          </pre>
        )}
      </main>
    </LanguageProvider>
  );
}
