import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { login, saveAuthData } from '../services/authService';
import Spinner from '../components/Spinner';
import GlassCard from '../components/GlassCard';
import { parseError } from '../utils/errorParser';

import Button from '../components/Button';

function StudentLogin({ onLogin }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const emailRef = useRef(null);

  const rawReason  = searchParams.get('reason') || '';
  const safeReason = rawReason.replace(/<[^>]*>/g, '').slice(0, 200);

  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState(safeReason);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.has('reason')) setSearchParams({}, { replace: true });
  }, []);

  useEffect(() => { emailRef.current?.focus(); }, []);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const response = await login({ ...form, role: 'student' });
      saveAuthData(response.token, response.user);
      onLogin(response.user);
      window.scrollTo(0, 0);
      navigate('/');
    } catch (err) {
      setError(parseError(err, 'Login failed. Please check your credentials.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="auth-card-v2 max-w-[480px] mx-auto px-6"
    >
      <GlassCard className="p-12">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-6">
            <span className="text-3xl">📖</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight mb-2">Student Login</h2>
          <p className="text-muted">Enter your credentials to access your dashboard</p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm font-medium"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted ml-1" htmlFor="s-email">Email Address</label>
            <input
              id="s-email" ref={emailRef} type="email"
              placeholder="name@university.edu"
              className="w-full bg-surface border border-border rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              value={form.email} onChange={set('email')}
              required autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted ml-1" htmlFor="s-password">Password</label>
            <input
              id="s-password" type="password" placeholder="••••••••"
              className="w-full bg-surface border border-border rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              value={form.password} onChange={set('password')}
              required autoComplete="current-password"
            />
          </div>
          
          <Button type="submit" className="w-full py-4 text-base font-bold shadow-xl" disabled={loading}>
            {loading ? <Spinner small /> : 'Sign In'}
          </Button>
        </form>

        <div className="mt-10 pt-8 border-t border-border space-y-4 text-center">
          <p className="text-sm text-muted">Are you a teacher? <Link to="/login/teacher" className="text-primary font-bold hover:underline">Teacher Portal</Link></p>
          <p className="text-sm text-muted">New student? <Link to="/signup" className="text-primary font-bold hover:underline">Create account</Link></p>
        </div>
      </GlassCard>
    </motion.div>
  );
}

export default StudentLogin;
