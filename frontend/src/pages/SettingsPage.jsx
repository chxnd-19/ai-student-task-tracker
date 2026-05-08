import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, User, Mail, Lock, Shield, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import GlassCard from '../components/GlassCard';
import Toast from '../components/Toast';

import api from '../services/api';

function SettingsPage() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: ''
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { 
        name: form.name, 
        email: form.email 
      };
      
      if (form.newPassword) {
        payload.password = form.newPassword;
      }
      
      const res = await api.put("/api/settings", payload);
      const updatedUser = res.data.data;
      
      updateUser(updatedUser);
      setToast({ message: 'Profile updated successfully!', type: 'success' });
      setForm(prev => ({ ...prev, currentPassword: '', newPassword: '' }));
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to update profile.';
      setToast({ message: msg, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
      
      <div className="flex flex-col gap-10">
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-3 text-purple-500 font-black text-xs uppercase tracking-[0.3em]">
            <Settings size={14} />
            <span>Account Control</span>
          </div>
          <h1 className="text-5xl font-black tracking-tight text-white">
            System <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Settings</span>
          </h1>
        </header>

        <div className="grid grid-cols-3 gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="col-span-2 w-full max-w-full overflow-hidden"
          >
            <GlassCard className="p-10">
              <form onSubmit={handleSave} className="space-y-8 w-full">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-xs text-gray-400 font-medium">Full Name</label>
                    <div className="relative">
                      <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                      <input 
                        className="w-full h-11 px-4 pl-12 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all" 
                        value={form.name} 
                        onChange={e => setForm({...form, name: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs text-gray-400 font-medium">Email Address</label>
                    <div className="relative">
                      <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                      <input 
                        className="w-full h-11 px-4 pl-12 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all" 
                        value={form.email} 
                        onChange={e => setForm({...form, email: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-white/5 space-y-6">
                  <h3 className="text-base font-semibold">Security & Authentication</h3>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-xs text-gray-400 font-medium">New Password</label>
                      <div className="relative">
                        <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                        <input 
                          type="password"
                          className="w-full h-11 px-4 pl-12 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all" 
                          placeholder="••••••••"
                          value={form.newPassword}
                          onChange={e => setForm({...form, newPassword: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs text-gray-400 font-medium">Confirm Identity</label>
                      <div className="relative">
                        <Shield size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                        <input 
                          type="password"
                          className="w-full h-11 px-4 pl-12 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all" 
                          placeholder="Current Password"
                          value={form.currentPassword}
                          onChange={e => setForm({...form, currentPassword: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <button type="submit" disabled={saving} className="w-full h-11 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  <Save size={18} />
                  <span>{saving ? 'Updating...' : 'Save Configuration'}</span>
                </button>
              </form>
            </GlassCard>
          </motion.div>

          <aside className="col-span-1 space-y-6">
            <GlassCard className="p-8 bg-gradient-to-br from-blue-500/5 to-indigo-500/5">
              <h4 className="font-bold mb-4">Account Status</h4>
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-white/90">Identity Verified</p>
                  <p className="text-[9px] text-white/40 font-black uppercase tracking-widest mt-0.5">Role: {user?.role}</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-8">
              <h4 className="font-bold mb-4">Danger Zone</h4>
              <p className="text-xs text-white/30 mb-6">Once you deactivate your account, there is no going back. Please be certain.</p>
              <button className="w-full h-12 rounded-xl border border-rose-500/20 text-rose-500 text-xs font-bold hover:bg-rose-500/5 transition-all">
                Deactivate Account
              </button>
            </GlassCard>
          </aside>
        </div>
      </div>
    </Layout>
  );
}

export default SettingsPage;
