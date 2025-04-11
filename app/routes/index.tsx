import React from 'react';
import { redirect } from "react-router";
import type { LoaderFunction } from "@remix-run/node";

// Don't define meta tags here as they're already defined in root.tsx
// which is causing duplication

export const loader: LoaderFunction = async () => {
  // Redirect the home page to the /home route
  return redirect("/home");
};

// Even though we redirect, it's important to have a proper component with H1 for SEO crawlers
export default function Index() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <main className="container mx-auto px-4 text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          BlueAnalyze - Bluesky Analytics Tool
        </h1>
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          Analyze your Bluesky followers and following relationships
        </p>
      </main>
    </div>
  );
} 