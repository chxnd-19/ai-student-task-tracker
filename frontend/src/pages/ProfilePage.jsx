import React from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Shield, Award, BookOpen } from 'lucide-react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

function ProfilePage() {
  const { user } = useAuth();
  
  return (
    <Layout>
      <div className="flex flex-col gap-10">
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-3 text-purple-500 font-black text-xs uppercase tracking-[0.3em]">
            <User size={14} />
            <span>Profile</span>
          </div>
          <h1 className="text-5xl font-black tracking-tight text-white">My <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Profile</span></h1>
        </header>

        <div className="grid lg:grid-cols-[400px_1fr] gap-10">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-10 flex flex-col items-center text-center"
          >
            <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-white text-5xl font-black border-4 border-white/10 mb-6 shadow-2xl shadow-purple-500/20">
              {user?.name?.[0] || 'U'}
            </div>
            <h2 className="text-2xl font-black">{user?.name}</h2>
            <div className="mt-2 px-4 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-widest">
              {user?.role}
            </div>
            
            <div className="w-full mt-10 space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                <Mail size={18} className="text-white/20" />
                <div className="text-left">
                  <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">Email</p>
                  <p className="text-sm font-bold truncate">{user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                <Shield size={18} className="text-white/20" />
                <div className="text-left">
                  <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">Permissions</p>
                  <p className="text-sm font-bold">{user?.role === 'teacher' ? 'Instructor Level' : 'Student Level'}</p>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="flex flex-col gap-8">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="glass-card p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <Award size={20} />
                  </div>
                  <h3 className="font-bold">Academic Achievement</h3>
                </div>
                <div className="space-y-4">
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-blue-500 rounded-full" />
                  </div>
                  <p className="text-xs text-white/40">Level 12 Scholar — 750 / 1000 XP</p>
                </div>
              </div>

              <div className="glass-card p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center text-pink-400">
                    <BookOpen size={20} />
                  </div>
                  <h3 className="font-bold">Active Courses</h3>
                </div>
                <p className="text-3xl font-black tracking-tight">4</p>
                <p className="text-xs text-white/40 mt-1">Enrolled in spring semester</p>
              </div>
            </div>

            <div className="glass-card p-8">
              <h3 className="font-bold mb-6">Activity History</h3>
              <div className="space-y-6">
                {[1, 2, 3].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 pb-6 border-b border-white/5 last:border-0 last:pb-0">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <div className="flex-1">
                      <p className="text-sm font-bold">Submitted assignment "Final Project"</p>
                      <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">2 hours ago</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default ProfilePage;
