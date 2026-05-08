import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { login, saveAuthData } from '../services/authService';
import Spinner from '../components/Spinner';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Mail, Lock, ArrowRight, User, GraduationCap, RefreshCw } from 'lucide-react';

function Login({ onLogin }) {
  const navigate      = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const emailRef      = useRef(null);

  const [form, setForm]           = useState({ email: '', password: '', role: 'student' });
  const [loading, setLoading]     = useState(false);
  // roleMismatch: { message, actualRole } — set when backend returns 403
  const [roleMismatch, setRoleMismatch] = useState(null);
  // notFound: { hint? } — set when backend returns 404
  const [notFound, setNotFound]   = useState(null);

  const rawReason  = searchParams.get('reason') || '';
  const safeReason = rawReason.replace(/<[^>]*>/g, '').slice(0, 200);
  const [error, setError] = useState(safeReason);

  useEffect(() => {
    if (searchParams.has('reason')) setSearchParams({}, { replace: true });
  }, []);

  useEffect(() => { emailRef.current?.focus(); }, []);

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    // Clear errors when user edits
    setError('');
    setRoleMismatch(null);
    setNotFound(null);
  };

  const switchRole = () => {
    if (!roleMismatch) return;
    // Switch to the actual role the account is registered as
    const frontendRole = roleMismatch.actualRole === 'teacher' ? 'instructor' : 'student';
    setForm(f => ({ ...f, role: frontendRole }));
    setRoleMismatch(null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setRoleMismatch(null);
    setLoading(true);

    try {
      const backendRole    = form.role === 'instructor' ? 'teacher' : 'student';
      const loginPayload   = { email: form.email, password: form.password, role: backendRole };
      const response       = await login(loginPayload);
      const user           = response.user || response;

      saveAuthData(response.token, user);
      onLogin(user);
      window.scrollTo(0, 0);
      navigate('/');
    } catch (err) {
      const httpStatus = err.response?.status;
      const detail     = err.response?.data?.detail || '';

      if (httpStatus === 403) {
        const actualRoleHeader = err.response?.headers?.['x-actual-role'];
        let actualRole = actualRoleHeader;
        if (!actualRole && detail) {
          if (detail.toLowerCase().includes('as instructor')) actualRole = 'teacher';
          else if (detail.toLowerCase().includes('as student')) actualRole = 'student';
        }
        setRoleMismatch({ message: detail || 'This account is registered under a different role.', actualRole });
      } else if (httpStatus === 404) {
        // Check for email-change hint header
        const hint = err.response?.headers?.['x-email-hint'] || null;
        setNotFound({ hint });
      } else if (httpStatus === 401) {
        setError('Incorrect password. Please try again.');
      } else if (detail) {
        setError(detail);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedLabel = form.role === 'student' ? 'Student' : 'Instructor';

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-transparent overflow-hidden relative">
      {/* Background glows */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1], rotate: [0, 90, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        className="absolute top-0 -left-20 w-[500px] h-[500px] bg-purple-500/20 blur-[120px] rounded-full"
      />
      <motion.div
        animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0.15, 0.1], rotate: [0, -90, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        className="absolute bottom-0 -right-20 w-[600px] h-[600px] bg-pink-500/20 blur-[150px] rounded-full"
      />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="glass-card w-full max-w-md p-10 relative z-10 overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500" />

        <div className="flex flex-col items-center mb-10">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 10 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-xl shadow-purple-500/20 mb-6"
          >
            <Sparkles size={32} />
          </motion.div>
          <h1 className="text-3xl font-black tracking-tight text-white text-center">
            Welcome to <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">ScholarOS</span>
          </h1>
          <p className="text-white/40 mt-2 font-medium">AI-Powered Academic Workflow Platform</p>
        </div>

        {/* ── Generic error ── */}
        <AnimatePresence>
          {error && !roleMismatch && !notFound && (
            <motion.div
              key="error"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm font-medium flex items-center gap-3"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              {error}
            </motion.div>
          )}

          {/* ── Not found — rich card with hint + sign-up link ── */}
          {notFound && (
            <motion.div
              key="not-found"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 mt-1.5" />
                <div className="space-y-1">
                  <p className="text-red-300 text-sm font-semibold leading-snug">
                    No account found with this email.
                  </p>
                  <p className="text-red-400/70 text-xs leading-relaxed">
                    Check if you mistyped your email, or{' '}
                    <Link to="/signup" className="text-purple-400 hover:text-purple-300 font-bold underline underline-offset-2">
                      sign up
                    </Link>{' '}
                    to create a new account.
                  </p>
                </div>
              </div>

              {/* Email-change hint from audit log */}
              {notFound.hint && (
                <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg">
                  <Mail size={12} className="text-white/30 shrink-0" />
                  <p className="text-[11px] text-white/40 leading-relaxed">
                    Did you previously use a different email?{' '}
                    <span className="text-white/60 font-semibold">{notFound.hint}</span>{' '}
                    was associated with this account.
                  </p>
                </div>
              )}

              {!notFound.hint && (
                <p className="text-[11px] text-white/30 px-1">
                  Did you previously use a different email address?
                </p>
              )}
            </motion.div>
          )}

          {/* ── Role mismatch error + switch button ── */}
          {roleMismatch && (
            <motion.div
              key="role-mismatch"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                <p className="text-amber-300 text-sm font-medium leading-relaxed">
                  {roleMismatch.message}
                </p>
              </div>
              {roleMismatch.actualRole && (
                <button
                  type="button"
                  onClick={switchRole}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-lg text-amber-300 text-xs font-bold uppercase tracking-widest transition-all"
                >
                  <RefreshCw size={13} />
                  Switch to {roleMismatch.actualRole === 'teacher' ? 'Instructor' : 'Student'}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Role Selection */}
          <div className="space-y-3">
            <label className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] px-1">
              Account Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setForm(f => ({ ...f, role: 'student' })); setRoleMismatch(null); setError(''); setNotFound(null); }}
                className={`p-4 rounded-xl border transition-all flex items-center gap-3 ${
                  form.role === 'student'
                    ? 'bg-purple-500/20 border-purple-500/40 text-white'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                }`}
              >
                <User size={18} />
                <span className="text-sm font-medium">Student</span>
              </button>
              <button
                type="button"
                onClick={() => { setForm(f => ({ ...f, role: 'instructor' })); setRoleMismatch(null); setError(''); setNotFound(null); }}
                className={`p-4 rounded-xl border transition-all flex items-center gap-3 ${
                  form.role === 'instructor'
                    ? 'bg-purple-500/20 border-purple-500/40 text-white'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                }`}
              >
                <GraduationCap size={18} />
                <span className="text-sm font-medium">Instructor</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] px-1">
              Email Address
            </label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-purple-500 transition-colors" size={18} />
              <input
                ref={emailRef}
                type="email"
                placeholder="name@example.com"
                value={form.email}
                onChange={set('email')}
                className="input-glass pl-12"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] px-1">
              Password
            </label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-purple-500 transition-colors" size={18} />
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={set('password')}
                className="input-glass pl-12"
                required
              />
            </div>
          </div>

          <div className="text-right">
            <Link
              to="/forgot-password"
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors font-medium"
            >
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            className="btn-primary w-full h-14 text-sm uppercase font-black tracking-widest mt-4"
            disabled={loading}
          >
            {loading ? <Spinner small /> : (
              <>
                <span>Sign In as {selectedLabel}</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="mt-10 pt-10 border-t border-white/5 text-center">
          <p className="text-white/30 text-sm">
            Don't have an account?{' '}
            <Link to="/signup" className="text-purple-400 font-bold hover:text-purple-300 transition-colors">
              Create Account
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default Login;
