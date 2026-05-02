import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { signup, saveToken } from '../services/authService';
import Spinner from '../components/Spinner';
import GlassCard from '../components/GlassCard';
import Toast from '../components/Toast';
import { parseError } from '../utils/errorParser';

import Button from '../components/Button';

function Signup({ onLogin }) {
  const navigate = useNavigate();
  const nameRef  = useRef(null);
  const [form, setForm]       = useState({ name: '', email: '', password: '', role: 'student' });
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { nameRef.current?.focus(); }, []);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const { data: res } = await signup(form);
      setSuccess('Account created successfully! Redirecting...');
      setTimeout(() => {
        saveToken(res.data.token);
        onLogin(res.data);
        window.scrollTo(0, 0);
        navigate('/');
      }, 1500);
    } catch (err) {
      setError(parseError(err, 'Signup failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="auth-card-v2 max-w-[520px] mx-auto px-6"
    >
      <Toast message={success} type="success" onClose={() => setSuccess('')} />
      <GlassCard className="p-12">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-primary-gradient flex items-center justify-center text-white mb-6 shadow-lg shadow-primary/20">
            <span className="text-3xl">✨</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight mb-2">Create Account</h2>
          <p className="text-muted">Start your academic journey today</p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm font-medium"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted ml-1" htmlFor="signup-name">Full Name</label>
              <input 
                id="signup-name" ref={nameRef} placeholder="John Doe"
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                value={form.name} onChange={set('name')} required autoComplete="name" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted ml-1" htmlFor="signup-role">I am a</label>
              <select 
                id="signup-role" 
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none cursor-pointer"
                value={form.role} onChange={set('role')}
              >
                <option value="student">Student</option>
                <option value="teacher">Instructor</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted ml-1" htmlFor="signup-email">Email Address</label>
            <input 
              id="signup-email" type="email" placeholder="john@university.edu"
              className="w-full bg-surface border border-border rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              value={form.email} onChange={set('email')} required autoComplete="email" 
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted ml-1" htmlFor="signup-password">Password</label>
            <input 
              id="signup-password" type="password" placeholder="Min. 6 characters"
              className="w-full bg-surface border border-border rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              value={form.password} onChange={set('password')} required autoComplete="new-password" 
            />
          </div>
          
          <Button type="submit" className="w-full py-4 text-base font-bold shadow-xl" disabled={loading}>
            {loading ? <Spinner small /> : 'Create Account'}
          </Button>
        </form>

        <div className="mt-10 pt-8 border-t border-border text-center">
          <p className="text-sm text-muted">Already have an account? <Link to="/login/student" className="text-primary font-bold hover:underline">Sign in</Link></p>
        </div>
      </GlassCard>
    </motion.div>
  );
}

export default Signup;
