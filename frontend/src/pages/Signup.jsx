import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { signup, saveToken } from '../services/authService';
import Spinner from '../components/Spinner';
import Toast from '../components/Toast';
import { parseError } from '../utils/errorParser';
import { Sparkles, Mail, Lock, User, UserCircle, ArrowRight } from 'lucide-react';

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
      const response = await signup(form);
      setSuccess('Account created successfully! Redirecting...');
      setTimeout(() => {
        saveToken(response.token);
        onLogin(response.user);
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
    <div className="min-h-screen flex items-center justify-center p-6 bg-transparent overflow-hidden relative">
      {/* Background Animated Elements */}
      <motion.div 
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.1, 0.2, 0.1],
          x: [0, 50, 0]
        }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        className="absolute top-0 -left-20 w-[600px] h-[600px] bg-purple-500/20 blur-[130px] rounded-full" 
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.4, 1],
          opacity: [0.1, 0.15, 0.1],
          x: [0, -50, 0]
        }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-0 -right-20 w-[700px] h-[700px] bg-pink-500/20 blur-[160px] rounded-full" 
      />

      <Toast message={success} type="success" onClose={() => setSuccess('')} />

      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, cubicBezier: [0.23, 1, 0.32, 1] }}
        className="glass-card w-full max-w-lg p-10 relative z-10 overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
        
        <div className="flex flex-col items-center mb-10">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: -10 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-xl shadow-purple-500/20 mb-6"
          >
            <Sparkles size={32} />
          </motion.div>
          <h1 className="text-3xl font-black tracking-tight text-white text-center">
            Create <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Account</span>
          </h1>
          <p className="text-white/40 mt-2 font-medium">Join our academic platform today</p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-sm font-medium flex items-center gap-3"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] px-1">Full Name</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-purple-500 transition-colors" size={18} />
                <input
                  ref={nameRef}
                  placeholder="John Doe"
                  value={form.name}
                  onChange={set('name')}
                  className="input-glass pl-12"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] px-1">I am a</label>
              <div className="relative group">
                <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-purple-500 transition-colors" size={18} />
                <select 
                  className="input-glass pl-12 appearance-none cursor-pointer"
                  value={form.role}
                  onChange={set('role')}
                >
                  <option value="student">Student</option>
                  <option value="teacher">Instructor</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] px-1">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-purple-500 transition-colors" size={18} />
              <input
                type="email"
                placeholder="name@university.edu"
                value={form.email}
                onChange={set('email')}
                className="input-glass pl-12"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] px-1">Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-purple-500 transition-colors" size={18} />
              <input
                type="password"
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={set('password')}
                className="input-glass pl-12"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary w-full h-14 text-sm uppercase font-black tracking-widest mt-4"
            disabled={loading}
          >
            {loading ? <Spinner small /> : (
              <>
                <span>Create Account</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="mt-10 pt-10 border-t border-white/5 text-center">
          <p className="text-white/30 text-sm">
            Already have an account? <Link to="/login" className="text-purple-400 font-bold hover:text-purple-300 transition-colors">Sign In</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default Signup;
