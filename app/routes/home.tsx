import React from 'react';
import { motion } from 'framer-motion';
import FollowerAnalysis from '../components/follower-analysis/FollowerAnalysis';
import NavBar from '../components/follower-analysis/NavBar';
import Footer from '../components/follower-analysis/Footer';
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Bluesky Follower Analysis" },
  ];
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <NavBar />
      
      <main className="py-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="container mx-auto px-4"
        >
          <h1 className="sr-only">AHMET - Bluesky Follower Analytics Tool</h1>
          
          <FollowerAnalysis />
        </motion.div>
      </main>
      
      <Footer />
    </div>
  );
}
