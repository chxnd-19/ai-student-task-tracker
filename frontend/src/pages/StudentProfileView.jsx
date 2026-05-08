import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fetchStudentById } from '../services/taskService';
import GlassCard from '../components/GlassCard';
import Spinner from '../components/Spinner';
import {
  ArrowLeft, User, Mail, Hash, Building2, BookOpen,
  GraduationCap, Award, CheckCircle2, AlertCircle, Clock, Timer,
} from 'lucide-react';

function StatChip({ icon, label, value, color, bg }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-2xl border border-white/5" style={{ background: bg }}>
      <div style={{ color }}>{icon}</div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p>
        <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-muted flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p>
        <p className="text-sm font-semibold mt-0.5">
          {value ?? <span className="text-muted italic font-normal">Not set</span>}
        </p>
      </div>
    </div>
  );
}

export default function StudentProfileView() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    fetchStudentById(id)
      .then(({ data: d }) => setData(d))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load student profile.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <Spinner text="Loading student profile…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[900px] mx-auto px-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted hover:text-main mb-8 transition-colors">
          <ArrowLeft size={18} /> Back
        </button>
        <GlassCard className="p-10 text-center text-danger">{error}</GlassCard>
      </div>
    );
  }

  const { user: studentUser, profile, stats } = data;
  const initials = studentUser.name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() ?? '?';
  const completionPct = stats?.total > 0 ? Math.round((stats.submitted / stats.total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-[900px] mx-auto px-8"
    >
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-muted hover:text-main mb-8 transition-colors text-sm font-medium"
      >
        <ArrowLeft size={18} /> Back to Students
      </button>

      {/* ── Hero card ── */}
      <GlassCard className="p-10 mb-8 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-primary-gradient opacity-10 blur-3xl pointer-events-none" />

        <div className="flex items-center gap-8">
          <div className="w-24 h-24 rounded-3xl bg-primary-gradient flex items-center justify-center text-white font-extrabold text-3xl shadow-xl flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-extrabold tracking-tight mb-1">{studentUser.name}</h1>
            <p className="text-muted text-sm flex items-center gap-2 mb-3">
              <Mail size={14} /> {studentUser.email}
            </p>
            {(profile.college_name || profile.department) && (
              <p className="text-muted text-sm">
                {[profile.college_name, profile.department].filter(Boolean).join(' · ')}
              </p>
            )}
            {profile.overall_sgpa && (
              <div className="flex gap-3 mt-3">
                <span className="px-3 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold">
                  Academic SGPA: {profile.overall_sgpa.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      {/* ── Performance stats ── */}
      <GlassCard className="p-8 mb-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1 h-5 rounded-full bg-primary" />
          <h3 className="font-bold text-sm uppercase tracking-wider text-primary">Assignment Performance</h3>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs font-bold mb-2">
            <span className="text-muted uppercase tracking-wider">Completion Rate</span>
            <span className="text-primary">{completionPct}%</span>
          </div>
          <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completionPct}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-primary-gradient"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatChip icon={<BookOpen size={20} />}     label="Total"     value={stats.total}     color="#6366f1" bg="rgba(99,102,241,0.08)" />
          <StatChip icon={<CheckCircle2 size={20} />} label="Submitted" value={stats.submitted} color="#10b981" bg="rgba(16,185,129,0.08)" />
          <StatChip icon={<Timer size={20} />}        label="Late"      value={stats.late}      color="#f97316" bg="rgba(249,115,22,0.08)" />
          <StatChip icon={<AlertCircle size={20} />}  label="Overdue"   value={stats.overdue}   color="#ef4444" bg="rgba(239,68,68,0.08)" />
        </div>
      </GlassCard>

      {/* ── Academic info ── */}
      {Object.keys(profile).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-5 rounded-full bg-indigo-500" />
              <h3 className="font-bold text-sm uppercase tracking-wider text-indigo-400">Personal Info</h3>
            </div>
            <div className="space-y-4">
              <InfoRow icon={<User size={14} />}         label="Full Name"   value={profile.full_name || studentUser.name} />
              <InfoRow icon={<Hash size={14} />}         label="USN"         value={profile.usn} />
              <InfoRow icon={<Building2 size={14} />}    label="College"     value={profile.college_name} />
              <InfoRow icon={<BookOpen size={14} />}     label="Department"  value={profile.department} />
            </div>
          </GlassCard>

          {/* Academic */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-5 rounded-full bg-sky-500" />
              <h3 className="font-bold text-sm uppercase tracking-wider text-sky-400">Academic Info</h3>
            </div>
            <div className="space-y-4">
              <InfoRow icon={<GraduationCap size={14} />} label="Semester"       value={profile.semester} />
              <InfoRow icon={<GraduationCap size={14} />} label="Current Year"   value={profile.year} />
              <InfoRow icon={<Award size={14} />}         label="Overall SGPA"   value={profile.overall_sgpa} />
            </div>
          </GlassCard>
        </div>
      )}
    </motion.div>
  );
}
