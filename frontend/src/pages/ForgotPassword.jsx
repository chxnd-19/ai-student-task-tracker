import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Mail, ArrowRight, ArrowLeft, KeyRound, ExternalLink } from 'lucide-react';
import Spinner from '../components/Spinner';
import api from '../services/api';

function ForgotPassword() {
  const [email, setEmail]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [resetLink, setResetLink] = useState(null); // null = not yet generated

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setError('');
    setLoading(true);

    try {
      const res = await api.post('/api/auth/forgot-password', { email });

      if (res.data?.reset_url) {
        // User exists — show the clickable reset link
        setResetLink(res.data.reset_url);
      } else {
        // User not found — still show a neutral success state
        setResetLink('NOT_FOUND');
      }
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Success state: reset link generated ────────────────────────────────────
  if (resetLink) {
    const linkExists = resetLink !== 'NOT_FOUND';

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-transparent overflow-hidden relative">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 20, repeat: Infinity }}
          className="absolute top-0 -left-20 w-[500px] h-[500px] bg-purple-500/20 blur-[120px] rounded-full"
        />
        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0.15, 0.1] }}
          transition={{ duration: 25, repeat: Infinity }}
          className="absolute bottom-0 -right-20 w-[600px] h-[600px] bg-pink-500/20 blur-[150px] rounded-full"
        />

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="glass-card w-full max-w-md p-10 relative z-10 text-center"
        >
          {/* Top accent bar */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-t-2xl" />

          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 220 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 mx-auto mb-6"
          >
            <KeyRound size={30} />
          </motion.div>

          <h1 className="text-2xl font-black tracking-tight text-white mb-2">
            {linkExists ? 'Reset Link Generated' : 'Request Received'}
          </h1>

          {linkExists ? (
            <>
              <p className="text-white/50 text-sm mb-1">
                A reset link was generated for
              </p>
              <p className="text-white font-semibold mb-4">{email}</p>

              {/* Dev mode badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Development mode — email is not sent
              </div>

              {/* Clickable reset button */}
              <a
                href={resetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary w-full h-14 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 mb-4"
              >
                <span>Open Reset Page</span>
                <ExternalLink size={16} />
              </a>

              {/* Raw link for copy-paste */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-left mb-6">
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mb-1">Reset URL</p>
                <p className="text-white/60 text-xs break-all font-mono">{resetLink}</p>
              </div>
            </>
          ) : (
            <p className="text-white/50 text-sm mb-8 leading-relaxed">
              If an account exists for <span className="text-white font-medium">{email}</span>,
              a reset link has been generated.
            </p>
          )}

          <Link
            to="/login"
            className="text-purple-400 font-bold hover:text-purple-300 transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <ArrowLeft size={15} />
            Back to Login
          </Link>
        </motion.div>
      </div>
    );
  }

  // ── Default state: email input form ────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-transparent overflow-hidden relative">
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 20, repeat: Infinity }}
        className="absolute top-0 -left-20 w-[500px] h-[500px] bg-purple-500/20 blur-[120px] rounded-full"
      />
      <motion.div
        animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0.15, 0.1] }}
        transition={{ duration: 25, repeat: Infinity }}
        className="absolute bottom-0 -right-20 w-[600px] h-[600px] bg-pink-500/20 blur-[150px] rounded-full"
      />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass-card w-full max-w-md p-10 relative z-10"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-t-2xl" />

        {/* Header */}
        <div className="flex flex-col items-center mb-10">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 10 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-xl shadow-purple-500/20 mb-6"
          >
            <Sparkles size={32} />
          </motion.div>
          <h1 className="text-3xl font-black tracking-tight text-white text-center">
            Reset{' '}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Password
            </span>
          </h1>
          <p className="text-white/40 mt-2 font-medium text-center text-sm">
            Enter your email to generate a reset link
          </p>
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-sm font-medium flex items-center gap-3"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            {error}
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] px-1">
              Email Address
            </label>
            <div className="relative group">
              <Mail
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-purple-400 transition-colors"
                size={18}
              />
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-glass pl-12"
                required
                autoFocus
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full h-14 text-sm uppercase font-black tracking-widest"
          >
            {loading ? (
              <Spinner small />
            ) : (
              <>
                <span>Generate Reset Link</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-white/5 text-center">
          <Link
            to="/login"
            className="text-purple-400 font-bold hover:text-purple-300 transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <ArrowLeft size={15} />
            Back to Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default ForgotPassword;
