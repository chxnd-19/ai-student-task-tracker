import React, { useState, useEffect, useMemo } from 'react';
import { useProfile, useUpdateProfile } from '../hooks/useProfile';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Toast from '../components/Toast';
import {
  User, Save, Loader2, GraduationCap, School,
  BookOpen, Layers, Award, Phone, Mail, CheckCircle2,
  Pencil, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Normalize payload before sending ─────────────────────────────────────────
// Cleared fields are sent as null so the backend can $unset them in MongoDB.
// This prevents old values from ghosting back after a refetch.
function normalizePayload(formData) {
  const out = {};
  for (const [key, raw] of Object.entries(formData)) {
    if (raw === '' || raw === undefined || raw === null) {
      out[key] = null;   // explicitly cleared — backend will $unset
      continue;
    }
    let val = raw;
    if (typeof val === 'string') val = val.trim();
    if (key === 'department' && typeof val === 'string') val = val.toUpperCase();
    if (key === 'overall_sgpa') val = parseFloat(val) || null;
    if (key === 'semester' || key === 'year') val = parseInt(val) || null;
    if (key === 'contact_number' && typeof val === 'string')
      val = val.replace(/\D/g, '') || null;
    out[key] = val;
  }
  // Return ALL fields including nulls — backend handles $set vs $unset
  return out;
}

function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="h-40 bg-white/5 rounded-3xl border border-white/10" />
      <div className="grid grid-cols-2 gap-6">
        <div className="h-64 bg-white/5 rounded-3xl border border-white/10" />
        <div className="h-64 bg-white/5 rounded-3xl border border-white/10" />
      </div>
    </div>
  );
}

function Field({ label, icon, error, children, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-xs font-black uppercase tracking-widest text-white/40 flex items-center gap-2 px-1">
        {icon}
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-rose-400 px-1">{error}</p>}
    </div>
  );
}

function ViewField({ label, icon, value, placeholder = '—' }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
        {icon}
        {label}
      </p>
      <p className={`text-sm font-semibold px-1 ${value ? 'text-white/80' : 'text-white/20 italic'}`}>
        {value !== null && value !== undefined && value !== '' ? String(value) : placeholder}
      </p>
    </div>
  );
}

const inputCls = (err) =>
  `w-full bg-white/5 border rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-white/20 ${
    err ? 'border-rose-500/60' : 'border-white/10'
  }`;

// ── Student field definitions ─────────────────────────────────────────────────
const STUDENT_FIELDS = ['college_name', 'full_name', 'usn', 'department', 'semester', 'year', 'overall_sgpa'];
// ── Teacher field definitions ─────────────────────────────────────────────────
const TEACHER_FIELDS = ['college_name', 'full_name', 'qualification', 'department', 'contact_number', 'email'];

// ── Main component ────────────────────────────────────────────────────────────
const Profile = () => {
  const { user } = useAuth();
  const { data, isLoading }    = useProfile();
  const updateMutation         = useUpdateProfile();
  const [formData, setFormData] = useState({});
  const [errors, setErrors]    = useState({});
  const [editMode, setEditMode] = useState(false);
  const [toast, setToast]      = useState({ message: '', type: 'success' });

  // ── STEP 1: role comes exclusively from AuthContext ───────────────────────
  const role = user?.role;

  useEffect(() => {
    // Only sync from server when NOT in edit mode — prevents overwriting
    // in-progress edits when the background refetch completes.
    if (!editMode && data?.profile) {
      setFormData(data.profile);
    }
  }, [data, editMode]);

  // ── STEP 7: safety fallback — render nothing until role is known ──────────
  if (!role) return null;

  // ── Completeness — scoped to the correct field set ────────────────────────
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const completeness = useMemo(() => {
    const fields = role === 'teacher' ? TEACHER_FIELDS : STUDENT_FIELDS;
    const filled = fields.filter(f => {
      const v = formData[f];
      return v !== null && v !== undefined && v !== '';
    });
    return Math.round((filled.length / fields.length) * 100);
  }, [formData, role]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = normalizePayload(formData);
    updateMutation.mutate(payload, {
      onSuccess: () => {
        setToast({ message: 'Profile saved successfully!', type: 'success' });
        setEditMode(false);
      },
      onError: (err) => setToast({
        message: err?.response?.data?.message || 'Failed to save profile.',
        type: 'error',
      }),
    });
  };

  const handleCancel = () => {
    if (data?.profile) setFormData(data.profile);
    setErrors({});
    setEditMode(false);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto p-10">
          <ProfileSkeleton />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto py-10 px-4 space-y-10"
      >
        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 font-black text-xs uppercase tracking-[0.3em] mb-3">
              <User size={14} className={role === 'teacher' ? 'text-blue-400' : 'text-purple-400'} />
              <span className={role === 'teacher' ? 'text-blue-400' : 'text-purple-400'}>
                {role === 'teacher' ? 'Instructor Profile' : 'Student Profile'}
              </span>
            </div>
            <h1 className="text-5xl font-black tracking-tight text-white">
              {formData.full_name || user?.name || 'Profile'}
            </h1>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 text-sm">
              {formData.department && (
                <span className="flex items-center gap-2">
                  <BookOpen size={14} className={role === 'teacher' ? 'text-blue-500' : 'text-purple-500'} />
                  <span className="font-bold text-white/60">{formData.department}</span>
                </span>
              )}
              {/* Student-only header meta */}
              {role === 'student' && formData.semester && (
                <span className="text-white/40">Sem {formData.semester}</span>
              )}
              {role === 'student' && formData.overall_sgpa && (
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <Award size={13} /> SGPA {formData.overall_sgpa}
                </span>
              )}
              {/* Teacher-only header meta */}
              {role === 'teacher' && formData.qualification && (
                <span className="text-white/40 flex items-center gap-1">
                  <GraduationCap size={13} className="text-blue-400" />
                  {formData.qualification}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-4">
            {/* Completeness bar */}
            <div className="w-full md:w-64 space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1">
                <span className="text-white/40">Profile Completeness</span>
                <span className={role === 'teacher' ? 'text-blue-400' : 'text-purple-400'}>{completeness}%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div
                  className={`h-full transition-all duration-1000 ease-out ${
                    role === 'teacher'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
                      : 'bg-gradient-to-r from-purple-500 to-pink-500'
                  }`}
                  style={{ width: `${completeness}%` }}
                />
              </div>
            </div>

            {/* Edit / Cancel toggle */}
            {!editMode ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setEditMode(true)}
                className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold text-sm text-white/70 hover:text-white transition-all"
              >
                <Pencil size={15} />
                Edit Profile
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCancel}
                className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/30 rounded-xl font-bold text-sm text-white/50 hover:text-rose-400 transition-all"
              >
                <X size={15} />
                Cancel
              </motion.button>
            )}
          </div>
        </div>

        {/* ── VIEW / EDIT PANEL ──────────────────────────────────────────── */}
        <AnimatePresence mode="wait">

          {/* ════════════════════════════════════════════════════════════════
              VIEW MODE
          ════════════════════════════════════════════════════════════════ */}
          {!editMode && (
            <motion.div
              key="view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="glass-card p-8 border border-white/5 shadow-2xl"
            >
              <div className="grid md:grid-cols-2 gap-x-10 gap-y-7">

                {/* ── STUDENT VIEW ─────────────────────────────────────── */}
                {role === 'student' && (
                  <>
                    <ViewField label="College Name"    icon={<School size={12} />}   value={formData.college_name} />
                    <ViewField label="Full Name"       icon={<User size={12} />}     value={formData.full_name} />
                    <ViewField label="USN / Student ID" icon={<Award size={12} />}   value={formData.usn} />
                    <ViewField label="Department"      icon={<Layers size={12} />}   value={formData.department} />
                    <ViewField label="Semester"        icon={<BookOpen size={12} />} value={formData.semester ? `Semester ${formData.semester}` : null} />
                    <ViewField label="Year"            icon={<Layers size={12} />}   value={formData.year ? `Year ${formData.year}` : null} />
                    <div className="md:col-span-2">
                      <ViewField label="Overall SGPA"  icon={<Award size={12} />}   value={formData.overall_sgpa} />
                    </div>
                  </>
                )}

                {/* ── TEACHER VIEW ─────────────────────────────────────── */}
                {role === 'teacher' && (
                  <>
                    <ViewField label="College Name"          icon={<School size={12} />}        value={formData.college_name} />
                    <ViewField label="Full Name"             icon={<User size={12} />}          value={formData.full_name} />
                    <ViewField label="Qualification"         icon={<GraduationCap size={12} />} value={formData.qualification} />
                    <ViewField label="Department"            icon={<Layers size={12} />}        value={formData.department} />
                    <ViewField label="Contact Number"        icon={<Phone size={12} />}         value={formData.contact_number} />
                    <div className="md:col-span-2">
                      <ViewField label="Public Email (Contact)" icon={<Mail size={12} />}      value={formData.email} />
                    </div>
                  </>
                )}

              </div>

              {/* Completeness footer */}
              {completeness === 100 ? (
                <div className="flex items-center gap-2 mt-8 pt-6 border-t border-white/5 text-emerald-400">
                  <CheckCircle2 size={14} />
                  <span className="text-xs font-semibold">Profile complete — AI recommendations are fully personalised</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 mt-8 pt-6 border-t border-white/5">
                  <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        role === 'teacher'
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
                          : 'bg-gradient-to-r from-purple-500 to-pink-500'
                      }`}
                      style={{ width: `${completeness}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-white/30 shrink-0">
                    {completeness}% complete — fill all fields for best AI recommendations
                  </span>
                </div>
              )}
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              EDIT MODE
          ════════════════════════════════════════════════════════════════ */}
          {editMode && (
            <motion.form
              key="edit"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSubmit}
              className="space-y-8"
            >
              <div className="glass-card p-8 border border-white/5 shadow-2xl">
                <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">

                  {/* ── STUDENT EDIT FIELDS ──────────────────────────── */}
                  {role === 'student' && (
                    <>
                      <Field label="College Name" icon={<School size={12} />}>
                        <input
                          type="text"
                          name="college_name"
                          value={formData.college_name || ''}
                          onChange={handleChange}
                          className={inputCls(false)}
                          placeholder="e.g. RV College of Engineering"
                        />
                      </Field>

                      <Field label="Full Name" icon={<User size={12} />}>
                        <input
                          type="text"
                          name="full_name"
                          value={formData.full_name || ''}
                          onChange={handleChange}
                          className={inputCls(false)}
                          placeholder="Enter your full name"
                        />
                      </Field>

                      <Field label="USN / Student ID" icon={<Award size={12} />}>
                        <input
                          type="text"
                          name="usn"
                          value={formData.usn || ''}
                          onChange={handleChange}
                          className={inputCls(false)}
                          placeholder="e.g. 1RV19CS001"
                        />
                      </Field>

                      <Field label="Department" icon={<Layers size={12} />}>
                        <input
                          type="text"
                          name="department"
                          value={formData.department || ''}
                          onChange={handleChange}
                          className={inputCls(false)}
                          placeholder="e.g. CSE (auto-uppercased)"
                        />
                      </Field>

                      <Field label="Semester" icon={<BookOpen size={12} />} error={errors.semester}>
                        <select
                          name="semester"
                          value={formData.semester || ''}
                          onChange={handleChange}
                          className={inputCls(errors.semester) + ' appearance-none cursor-pointer'}
                        >
                          <option value="" disabled className="bg-[#121214]">Select Semester</option>
                          {[1,2,3,4,5,6,7,8].map(s => (
                            <option key={s} value={s} className="bg-[#121214]">{s}</option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Year" icon={<Layers size={12} />} error={errors.year}>
                        <select
                          name="year"
                          value={formData.year || ''}
                          onChange={handleChange}
                          className={inputCls(errors.year) + ' appearance-none cursor-pointer'}
                        >
                          <option value="" disabled className="bg-[#121214]">Select Year</option>
                          {[1,2,3,4].map(y => (
                            <option key={y} value={y} className="bg-[#121214]">{y}</option>
                          ))}
                        </select>
                      </Field>

                      <div className="md:col-span-2">
                        <Field label="Overall SGPA" icon={<Award size={12} />} error={errors.overall_sgpa}>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="10"
                            name="overall_sgpa"
                            value={formData.overall_sgpa || ''}
                            onChange={handleChange}
                            className={inputCls(errors.overall_sgpa)}
                            placeholder="0.00 – 10.00"
                          />
                        </Field>
                      </div>
                    </>
                  )}

                  {/* ── TEACHER EDIT FIELDS ──────────────────────────── */}
                  {role === 'teacher' && (
                    <>
                      <Field label="College Name" icon={<School size={12} />}>
                        <input
                          type="text"
                          name="college_name"
                          value={formData.college_name || ''}
                          onChange={handleChange}
                          className={inputCls(false)}
                          placeholder="e.g. RV College of Engineering"
                        />
                      </Field>

                      <Field label="Full Name" icon={<User size={12} />}>
                        <input
                          type="text"
                          name="full_name"
                          value={formData.full_name || ''}
                          onChange={handleChange}
                          className={inputCls(false)}
                          placeholder="Enter your full name"
                        />
                      </Field>

                      <Field label="Qualification" icon={<GraduationCap size={12} />}>
                        <input
                          type="text"
                          name="qualification"
                          value={formData.qualification || ''}
                          onChange={handleChange}
                          className={inputCls(false)}
                          placeholder="e.g. PhD in Machine Learning"
                        />
                      </Field>

                      <Field label="Department" icon={<Layers size={12} />}>
                        <input
                          type="text"
                          name="department"
                          value={formData.department || ''}
                          onChange={handleChange}
                          className={inputCls(false)}
                          placeholder="e.g. CSE (auto-uppercased)"
                        />
                      </Field>

                      <Field label="Contact Number" icon={<Phone size={12} />} error={errors.contact_number}>
                        <input
                          type="text"
                          name="contact_number"
                          value={formData.contact_number || ''}
                          onChange={handleChange}
                          className={inputCls(errors.contact_number)}
                          placeholder="Digits only, 10–15 digits"
                        />
                      </Field>

                      <div className="md:col-span-2">
                        <Field label="Public Email (Contact)" icon={<Mail size={12} />} error={errors.email}>
                          <input
                            type="email"
                            name="email"
                            value={formData.email || ''}
                            onChange={handleChange}
                            className={inputCls(errors.email)}
                            placeholder="instructor@college.edu"
                          />
                        </Field>
                      </div>
                    </>
                  )}

                </div>
              </div>

              <div className="flex justify-end pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-2xl font-black text-white shadow-2xl shadow-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {updateMutation.isPending
                    ? <Loader2 className="w-5 h-5 animate-spin" />
                    : <Save size={20} className="group-hover:rotate-12 transition-transform" />
                  }
                  <span>{updateMutation.isPending ? 'Saving...' : 'Save Changes'}</span>
                </motion.button>
              </div>
            </motion.form>
          )}

        </AnimatePresence>
      </motion.div>
    </Layout>
  );
};

export default Profile;
