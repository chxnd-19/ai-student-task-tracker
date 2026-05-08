import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Users, Copy, Check, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Layout from '../components/Layout';
import GlassCard from '../components/GlassCard';
import Spinner from '../components/Spinner';

function ClassesPage() {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get("/api/classes");
        setWorkspaces(res.data.data || []);
      } catch {
        // Non-fatal — error state is shown via setLoadError
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, []);

  const copyToClipboard = (e, code) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (loading) return <Layout><div className="p-20"><Spinner text="Loading your classes..." /></div></Layout>;

  return (
    <Layout>
      <div className="flex flex-col gap-10">
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-3 text-purple-500 font-black text-xs uppercase tracking-[0.3em]">
            <BookOpen size={14} />
            <span>Academic Registry</span>
          </div>
          <h1 className="text-5xl font-black tracking-tight text-white">
            My <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Classes</span>
          </h1>
          <p className="text-white/40 mt-2 font-medium">You are enrolled in <span className="text-white">{workspaces.length} active classes</span>.</p>
        </header>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {workspaces.length === 0 ? (
            <GlassCard className="col-span-full p-20 flex flex-col items-center justify-center text-center gap-6 border-dashed border-white/10">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-white/20">
                <Users size={40} />
              </div>
              <div>
                <h3 className="text-xl font-bold">No classes joined yet</h3>
                <p className="text-white/30 text-sm max-w-xs mt-1">Head to the dashboard to join a class using a code provided by your instructor.</p>
              </div>
            </GlassCard>
          ) : (
            workspaces.map((cls, i) => (
              <motion.div
                key={cls._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => navigate(`/classes/${cls._id}`)}
                className="cursor-pointer"
              >
                <GlassCard className="p-8 h-full flex flex-col gap-6 group hover:border-purple-500/30">
                  <div className="flex justify-between items-start">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/5 flex items-center justify-center text-white font-black text-xl group-hover:scale-110 transition-transform duration-500">
                      {cls.name[0]}
                    </div>
                    <div 
                      onClick={(e) => copyToClipboard(e, cls.joinCode)}
                      className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-[10px] font-mono text-purple-400 flex items-center gap-2 cursor-pointer hover:bg-white/10 transition-all"
                    >
                      {cls.joinCode || '—'}
                      {copiedCode === cls.joinCode ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-white/20" />}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold group-hover:text-purple-400 transition-colors">{cls.name}</h3>
                    <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mt-1">{cls.subject || "General Academic"}</p>
                  </div>

                  <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/30">
                      <Users size={14} />
                      <span className="text-xs font-bold">{cls.students?.length || 0} Students</span>
                    </div>
                    <button className="text-purple-400 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                      View Details <ExternalLink size={12} />
                    </button>
                  </div>
                </GlassCard>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}

export default ClassesPage;
