import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Lock, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import Spinner from '../components/Spinner';
import api from '../services/api';

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const timerRef = useRef(null);

  // Cleanup redirect timer on unmount to prevent setState after unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await api.post(`/api/auth/reset-password/${token}`, { 
        token,
        password 
      });
      
      setSuccess(true);
      timerRef.current = setTimeout(() => navigate('/login'), 3000);
      
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.message || 
                          'Failed to reset password. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-transparent overflow-hidden relative">
        {/* Background Animated Elements */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
            rotate: [0, 90, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-0 -left-20 w-[500px] h-[500px] bg-purple-500/20 blur-[120px] rounded-full" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.5, 1],
            opacity: [0.1, 0.15, 0.1],
            rotate: [0, -90, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-0 -right-20 w-[600px] h-[600px] bg-pink-500/20 blur-[150px] rounded-full" 
        />

        <motion.div 
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, cubicBezier: [0.23, 1, 0.32, 1] }}
          className="glass-card w-full max-w-md p-10 relative z-10 overflow-hidden text-center"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-blue-500" />
          
          <div className="flex flex-col items-center mb-8">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 mb-6"
            >
              <CheckCircle size={32} />
            </motion.div>
            <h1 className="text-3xl font-black tracking-tight text-white">
              Password <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">Reset</span>
            </h1>
            <p className="text-white/60 mt-4 leading-relaxed">
              Your password has been successfully reset!
            </p>
            <p className="text-white/40 text-sm mt-2">
              Redirecting to login page in 3 seconds...
            </p>
          </div>

          <Link 
            to="/login"
            className="btn-primary w-full h-12 text-sm font-bold flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} />
            Go to Login
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-transparent overflow-hidden relative">
      {/* Background Animated Elements */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1],
          rotate: [0, 90, 0]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute top-0 -left-20 w-[500px] h-[500px] bg-purple-500/20 blur-[120px] rounded-full" 
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.5, 1],
          opacity: [0.1, 0.15, 0.1],
          rotate: [0, -90, 0]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-0 -right-20 w-[600px] h-[600px] bg-pink-500/20 blur-[150px] rounded-full" 
      />

      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, cubicBezier: [0.23, 1, 0.32, 1] }}
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
            Reset <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Password</span>
          </h1>
          <p className="text-white/40 mt-2 font-medium text-center">
            Enter your new password
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium flex items-center gap-3"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] px-1">New Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-purple-500 transition-colors" size={18} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-glass pl-12"
                required
                autoFocus
                minLength={6}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] px-1">Confirm Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-purple-500 transition-colors" size={18} />
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-glass pl-12"
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary w-full h-14 text-sm uppercase font-black tracking-widest"
            disabled={loading}
          >
            {loading ? <Spinner small /> : (
              <>
                <span>Reset Password</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="mt-10 pt-10 border-t border-white/5 text-center">
          <Link 
            to="/login" 
            className="text-purple-400 font-bold hover:text-purple-300 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default ResetPassword;