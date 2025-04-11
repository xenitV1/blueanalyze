import React from 'react';
import { redirect } from "react-router";
import { useLanguage } from '../contexts/LanguageContext';
import type { Route } from "./+types/home";
import type { LoaderFunction } from "@remix-run/node";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "BlueAnalyze - Bluesky Analytics Tool" },
    { name: "description", content: "Analyze your Bluesky followers and following relationships. Track mutual connections, find non-followers and manage your Bluesky social network." },
    { name: "keywords", content: "bluesky, bluesky analytics, follower analysis, social media, blue analyze, bluesky followers, mutual connections" },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://blue-analyze.com/" },
    { property: "og:title", content: "BlueAnalyze - Bluesky Analytics Tool" },
    { property: "og:description", content: "Analyze your Bluesky followers and following relationships. Track mutual connections, find non-followers and manage your Bluesky social network." },
    { property: "og:image", content: "https://blue-analyze.com/blueanalyze.png" },
    { property: "twitter:card", content: "summary_large_image" },
    { property: "twitter:url", content: "https://blue-analyze.com/" },
    { property: "twitter:title", content: "BlueAnalyze - Bluesky Analytics Tool" },
    { property: "twitter:description", content: "Analyze your Bluesky followers and following relationships. Track mutual connections, find non-followers and manage your Bluesky social network." },
    { property: "twitter:image", content: "https://blue-analyze.com/blueanalyze.png" },
    { tagName: "link", rel: "canonical", href: "https://blue-analyze.com/" }
  ];
}

export const loader: LoaderFunction = async () => {
  // Redirect the home page to the /home route
  return redirect("/home");
};

export default function Index() {
  const { language } = useLanguage();
  
  // This component won't render due to the redirect, but it's good to have proper HTML structure
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          {language === 'EN' ? 'BlueAnalyze - Bluesky Analytics Tool' : 'BlueAnalyze - Bluesky Analiz Aracı'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {language === 'EN' 
            ? 'Analyze your Bluesky followers and following relationships.' 
            : 'Bluesky takipçilerinizi ve takip ilişkilerinizi analiz edin.'}
        </p>
      </main>
    </div>
  );
} 