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
import { LanguageProvider } from './contexts/LanguageContext';

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

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#f3f4f6" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#1f2937" />
        {/* SEO Meta Tags */}
        <title>BlueAnalyze - Bluesky Follower Analytics Tool</title>
        <meta name="description" content="Analyze your Bluesky followers and following relationships. Track mutual followers, find non-followers and manage your Bluesky social network with BlueAnalyze." />
        <meta name="keywords" content="bluesky, bluesky analytics, follower analysis, social media, blue analyze, bluesky followers" />
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://blue-analyze.com/" />
        <meta property="og:title" content="BlueAnalyze - Bluesky Follower Analytics Tool" />
        <meta property="og:description" content="Analyze your Bluesky followers and following relationships. Track mutual followers, find non-followers and manage your Bluesky social network." />
        <meta property="og:image" content="https://blue-analyze.com/blueanalyze.png" />
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://blue-analyze.com/" />
        <meta property="twitter:title" content="BlueAnalyze - Bluesky Follower Analytics Tool" />
        <meta property="twitter:description" content="Analyze your Bluesky followers and following relationships. Track mutual followers, find non-followers and manage your Bluesky social network." />
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

export default function App() {
  return (
    <LanguageProvider>
      <Outlet />
    </LanguageProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
