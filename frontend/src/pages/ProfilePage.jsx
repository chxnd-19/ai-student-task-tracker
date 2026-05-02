import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit3, X, Save, User, BookOpen, Award, Building2, Hash, GraduationCap } from 'lucide-react';
import { fetchProfile, updateProfile } from '../services/profileService';
import GlassCard from '../components/GlassCard';
import Spinner from '../components/Spinner';
import Toast from '../components/Toast';

// ── Field definitions per role ────────────────────────────────────────────────
const STUDENT_FIELDS = [
  { key: 'name',        label: 'Full Name',          type: 'text',   section: 'personal',  icon: <User size={16} /> },
  { key: 'usn',         label: 'USN',                type: 'text',   section: 'personal',  icon: <Hash size={16} /> },
  { key: 'college',     label: 'College',            type: 'text',   section: 'academic',  icon: <Building2 size={16} /> },
  { key: 'department',  label: 'Department',         type: 'text',   section: 'academic',  icon: <BookOpen size={16} /> },
  { key: 'semester',    label: 'Semester',           type: 'number', section: 'academic',  icon: <GraduationCap size={16} />, min: 1, max: 8 },
  { key: 'year',        label: 'Current Year',       type: 'number', section: 'academic',  icon: <GraduationCap size={16} />, min: 1, max: 4 },
  { key: 'overallSGPA', label: 'Overall SGPA',       type: 'number', section: 'performance', icon: <Award size={16} />, step: '0.01', min: 0, max: 10 },
  { key: 'currentSGPA', label: 'Current Sem SGPA',   type: 'number', section: 'performance', icon: <Award size={16} />, step: '0.01', min: 0, max: 10 },
];

const TEACHER_FIELDS = [
  { key: 'name',          label: 'Full Name',      type: 'text', section: 'personal',  icon: <User size={16} /> },
  { key: 'teacherId',     label: 'Teacher ID',     type: 'text', section: 'personal',  icon: <Hash size={16} /> },
  { key: 'qualification', label: 'Qualification',  type: 'text', section: 'personal',  icon: <Award size={16} /> },
  { key: 'college',       label: 'College',        type: 'text', section: 'academic',  icon: <Building2 size={16} /> },
  { key: 'department',    label: 'Department',     type: 'text', section: 'academic',  icon: <BookOpen size={16} /> },
];

const SECTIONS = {
  personal:    { label: 'Personal Info',    color: '#6366f1' },
  academic:    { label: 'Academic Info',    color: '#0ea5e9' },
  performance: { label: 'Performance',      color: '#10b981' },
};

function InfoRow({ icon, label, value }) {
  return (
    <div className="profile-info-row">
      <span className="profile-info-icon">{icon}</span>
      <div>
        <p className="profile-info-label">{label}</p>
        <p className="profile-info-value">{value ?? <span className="text-muted italic">Not set</span>}</p>
      </div>
    </div>
  );
}

function ProfilePage({ user }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile,   setProfile]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [showEdit,  setShowEdit]  = useState(false);
  const [form,      setForm]      = useState({});
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState('');
  const [toast,     setToast]     = useState({ message: '', type: 'success' });

  const showToast = (message, type = 'success') => setToast({ message, type });

  const fields = user?.role === 'teacher' ? TEACHER_FIELDS : STUDENT_FIELDS;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await fetchProfile();
      setProfile(data);
      // Pre-fill form with existing values
      const initial = {};
      fields.forEach(({ key }) => { initial[key] = data[key] ?? ''; });
      setForm(initial);
    } catch {
      showToast('Failed to load profile.', 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => { load(); }, [load]);

  // Open edit modal if ?edit=1 is in URL
  useEffect(() => {
    if (searchParams.get('edit') === '1' && !loading) {
      setShowEdit(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, loading, setSearchParams]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (saving) return;
    setFormError('');

    // Validation
    if (!form.name?.trim()) {
      setFormError('Full Name is required.');
      return;
    }

    setSaving(true);
    try {
      const { data } = await updateProfile(form);
      setProfile(data);
      setShowEdit(false);
      showToast('Profile updated successfully! ✅');
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  // Group fields by section
  const grouped = {};
  fields.forEach((f) => {
    if (!grouped[f.section]) grouped[f.section] = [];
    grouped[f.section].push(f);
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="dashboard-container max-w-[900px] mx-auto px-8"
    >
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      {loading ? (
        <div className="flex justify-center p-20"><Spinner text="Loading profile..." /></div>
      ) : (
        <>
          {/* ── Hero card ── */}
          <GlassCard className="p-10 mb-8 relative overflow-hidden">
            {/* Gradient blob */}
            <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-primary-gradient opacity-10 blur-3xl pointer-events-none" />

            <div className="flex items-center gap-8">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-3xl bg-primary-gradient flex items-center justify-center text-white font-extrabold text-3xl shadow-xl flex-shrink-0">
                {initials}
              </div>

              <div className="flex-1">
                <h1 className="text-3xl font-extrabold tracking-tight mb-1">
                  {profile?.name || user?.name || 'Your Profile'}
                </h1>
                <p className="text-muted text-sm mb-3">
                  {user?.role === 'teacher' ? '🎓 Instructor' : '📖 Student'}
                  {profile?.college && ` · ${profile.college}`}
                  {profile?.department && ` · ${profile.department}`}
                </p>
                {user?.role === 'student' && profile?.overallSGPA && (
                  <div className="flex gap-4">
                    <span className="sgpa-chip">
                      Overall SGPA: <strong>{profile.overallSGPA}</strong>
                    </span>
                    {profile?.currentSGPA && (
                      <span className="sgpa-chip">
                        Current SGPA: <strong>{profile.currentSGPA}</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>

              <button
                className="btn btn-primary flex items-center gap-2 hover:shadow-[0_10px_20px_rgba(124,58,237,0.3)] hover:-translate-y-0.5 transition-all"
                onClick={() => setShowEdit(true)}
              >
                <Edit3 size={16} /> Edit Profile
              </button>
            </div>
          </GlassCard>

          {/* ── Sectioned info cards ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(grouped).map(([sectionKey, sectionFields]) => {
              const sec = SECTIONS[sectionKey];
              return (
                <GlassCard key={sectionKey} className="p-6 hover:shadow-[0_15px_30px_rgba(0,0,0,0.2)] hover:scale-[1.01] transition-all duration-300">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-1 h-5 rounded-full" style={{ background: sec.color }} />
                    <h3 className="font-bold text-sm uppercase tracking-wider" style={{ color: sec.color }}>
                      {sec.label}
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {sectionFields.map(({ key, label, icon }) => (
                      <InfoRow key={key} icon={icon} label={label} value={profile?.[key]} />
                    ))}
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </>
      )}

      {/* ── Edit Modal ── */}
      <AnimatePresence>
        {showEdit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowEdit(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="edit-profile-modal glass-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Edit Profile</h2>
                <button className="icon-btn" onClick={() => setShowEdit(false)} aria-label="Close">
                  <X size={18} />
                </button>
              </div>

              {formError && (
                <p className="text-danger text-sm mb-4 bg-danger/10 p-3 rounded-xl border border-danger/20">
                  {formError}
                </p>
              )}

              <form onSubmit={handleSave} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {fields.map(({ key, label, type, step, min, max }) => (
                  <div key={key}>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted mb-1 block">
                      {label}
                    </label>
                    <input
                      type={type}
                      step={step}
                      min={min}
                      max={max}
                      value={form[key] ?? ''}
                      onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                      className="modal-input"
                      placeholder={`Enter ${label.toLowerCase()}`}
                    />
                  </div>
                ))}
              </form>

              <div className="flex gap-3 mt-6">
                <button type="button" className="btn btn-ghost flex-1" onClick={() => setShowEdit(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                  disabled={saving}
                  onClick={handleSave}
                >
                  {saving ? <Spinner small /> : <><Save size={16} /> Save Changes</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default ProfilePage;
