import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FiEye, FiEyeOff, FiMail } from 'react-icons/fi';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTitle } from '../components/lib';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useTitle('Forgot Password');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      setSent((await api('/auth/forgot', { method: 'POST', body: { email } })).message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <h2>Forgot Password</h2>
        {sent ? (
          <div className="page-fade">
            <div className="success-note"><FiMail /> {sent}</div>
            <p className="muted" style={{ fontSize: 14 }}>The link expires in 30 minutes. Check your spam folder if you don't see it.</p>
            <Link to="/login" className="btn btn-block">Back to Login</Link>
          </div>
        ) : (
          <>
            <p className="muted">Enter your account email and we'll send you a link to reset your password.</p>
            {error && <div className="error-box">{error}</div>}
            <div className="field"><label>Email address</label>
              <input className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button className="btn btn-block" disabled={busy}>{busy ? 'Sending…' : 'Send Reset Link'}</button>
            <p className="center muted" style={{ marginTop: 16 }}><Link className="link" to="/login">Back to login</Link></p>
          </>
        )}
      </form>
    </div>
  );
}

export function ResetPassword() {
  const { token } = useParams();
  const { setSession } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [pw, setPw] = useState({ password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useTitle('Reset Password');

  const submit = async (e) => {
    e.preventDefault();
    if (pw.password !== pw.confirm) return setError('Passwords do not match');
    setBusy(true);
    setError('');
    try {
      const { token: t, user } = await api('/auth/reset', { method: 'POST', body: { token, password: pw.password } });
      setSession(t, user);
      toast('Password updated, you are now logged in');
      nav('/', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <h2>Set a New Password</h2>
        <p className="muted">Choose a new password with at least 6 characters.</p>
        {error && <div className="error-box">{error} {/expired|invalid/i.test(error) && <Link className="link" to="/forgot-password">Request a new link</Link>}</div>}
        <div className="field"><label>New password</label>
          <PasswordInput autoComplete="new-password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} />
        </div>
        <div className="field"><label>Confirm new password</label>
          <PasswordInput autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
        </div>
        <button className="btn btn-block" disabled={busy}>{busy ? 'Saving…' : 'Update Password'}</button>
      </form>
    </div>
  );
}

// Only allow same-site relative redirects.
const safeNext = (n) => (n && n.startsWith('/') && !n.startsWith('//') ? n : null);

function PasswordInput(props) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw-wrap">
      <input className="input" type={show ? 'text' : 'password'} minLength={6} required {...props} />
      <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>
        {show ? <FiEyeOff /> : <FiEye />}
      </button>
    </div>
  );
}

export function Login() {
  const { user, login } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const next = safeNext(params.get('next'));
  useTitle('Login');

  if (user && !busy) return <Navigate to={next || (user.role === 'admin' ? '/admin' : '/account')} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const u = await login(form.email, form.password);
      toast(`Welcome back, ${u.name.split(' ')[0]}!`);
      nav(next || (u.role === 'admin' ? '/admin' : '/'), { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <h2>Login</h2>
        <p className="muted">Welcome back! Sign in to your account.</p>
        {error && <div className="error-box">{error}</div>}
        <div className="field"><label>Email address</label>
          <input className="input" type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="field"><label>Password</label>
          <PasswordInput autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <div style={{ textAlign: 'right', margin: '-6px 0 14px' }}>
          <Link className="link" style={{ fontSize: 13 }} to="/forgot-password">Forgot password?</Link>
        </div>
        <button className="btn btn-block" disabled={busy}>{busy ? 'Signing in…' : 'Log In'}</button>
        <p className="center muted" style={{ marginTop: 16 }}>
          New to SG Mobiles? <Link className="link" to={`/register${next ? `?next=${encodeURIComponent(next)}` : ''}`}>Create an account</Link>
        </p>
      </form>
    </div>
  );
}

export function Register() {
  const { user, register } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const next = safeNext(params.get('next'));
  useTitle('Create Account');

  if (user && !busy) return <Navigate to={next || '/account'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await register(form);
      toast('Account created, welcome to SG Mobiles!');
      nav(next || '/', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const f = (k) => ({ value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }) });

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <h2>Create Account</h2>
        <p className="muted">Register to track orders, save your wishlist and check out faster.</p>
        {error && <div className="error-box">{error}</div>}
        <div className="field"><label>Full name</label><input className="input" required autoComplete="name" {...f('name')} /></div>
        <div className="field"><label>Email address</label><input className="input" type="email" required autoComplete="email" {...f('email')} /></div>
        <div className="field"><label>Phone (optional)</label><input className="input" type="tel" autoComplete="tel" {...f('phone')} /></div>
        <div className="field"><label>Password (min 6 characters)</label><PasswordInput autoComplete="new-password" {...f('password')} /></div>
        <button className="btn btn-block" disabled={busy}>{busy ? 'Creating account…' : 'Register'}</button>
        <p className="center muted" style={{ marginTop: 16 }}>
          Already have an account? <Link className="link" to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
