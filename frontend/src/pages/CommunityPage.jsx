import React from 'react';
import { motion } from 'framer-motion';
import { Users, Sparkles } from 'lucide-react';
import Layout from '../components/Layout';
import GlassCard from '../components/GlassCard';

function CommunityPage() {
  return (
    <Layout>
      <div className="flex flex-col gap-10">
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-3 text-purple-500 font-black text-xs uppercase tracking-[0.3em]">
            <Users size={14} />
            <span>Social Hub</span>
          </div>
          <h1 className="text-5xl font-black tracking-tight text-white">
            Peer <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Community</span>
          </h1>
        </header>

        <div className="flex flex-col items-center justify-center p-20 glass-card border-dashed">
          <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-purple-500 mb-8 animate-pulse">
            <Sparkles size={40} />
          </div>
          <h3 className="text-2xl font-black mb-2">Coming Soon</h3>
          <p className="text-white/40 text-center max-w-sm font-medium">
            We're building a space for you to connect with classmates, share resources, and collaborate on projects. Stay tuned!
          </p>
        </div>
      </div>
    </Layout>
  );
}

export default CommunityPage;
