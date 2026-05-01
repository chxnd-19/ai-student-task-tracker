import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { login, saveToken } from '../services/authService';
import Spinner from '../components/Spinner';

/**
 * Login page — authenticates an existing user and stores the JWT token.
 *
 * Reads ?reason= from the URL (set by the axios interceptor on 401).
 * The reason is sanitized (HTML stripped, length capped) before rendering.
 * The query param is cleared from the URL after the first render so it
 * doesn't persist on refresh or back-navigation.
 */
function Login({ onLogin }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const emailRef = useRef(null);

  const [form, setForm]       = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  // Sanitize the ?reason= value: strip HTML tags, cap at 200 chars
  const rawReason = searchParams.get('reason') || '';
  const safeReason = rawReason.replace(/<[^>]*>/g, '').slice(0, 200);
  const [error, setError] = useState(safeReason);

  // Clear ?reason= from the URL after showing it once (clean address bar)
  useEffect(() => {
    if (searchParams.has('reason')) {
      setSearchParams({}, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { emailRef.current?.focus(); }, []);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data: res } = await login(form);
      saveToken(res.data.token);
      onLogin(res.data);
      window.scrollTo(0, 0);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <h2>Welcome back 👋</h2>

      {error && <p className="error-msg" role="alert">{error}</p>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            ref={emailRef}
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={set('email')}
            required
            aria-required="true"
            autoComplete="email"
          />
        </div>
        <div className="form-group">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={set('password')}
            required
            aria-required="true"
            autoComplete="current-password"
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary btn-full"
          disabled={loading}
          aria-label="Log in to your account"
        >
          {loading ? <Spinner small /> : 'Login'}
        </button>
      </form>

      <p className="auth-footer">
        Don't have an account? <Link to="/signup">Sign up</Link>
      </p>
    </div>
  );
}

export default Login;
