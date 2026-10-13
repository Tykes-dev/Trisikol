import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import InputField from '../components/common/InputField';
import logoImage from '../assets/trisikol-logo.png';
import { roleHome, useAuth } from '../features/auth/AuthContext';
import { api } from '../services/api';

export default function Login() {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate();
  const { user, loading, signIn } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const normalizedMobile = () => mobile.replace(/[\s-]/g, '').replace(/^\+63/, '0');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      const account = await signIn(normalizedMobile(), password);
      navigate(roleHome(account.role), { replace: true });
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (password !== confirmPassword) { setMessage('Passwords do not match.'); return; }
    setBusy(true); setMessage('');
    try {
      await api('/auth/register', { method: 'POST', body: { name, mobile: normalizedMobile(), password } });
      setPassword(''); setConfirmPassword(''); setAuthMode('login');
      setMessage('Passenger account created. Sign in to continue.');
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setMessage('Password recovery is not available yet. No SMS has been sent.');
  };

  const resetForm = () => {
    setMobile('');
    setPassword('');
    setName('');
    setConfirmPassword('');
    setMessage('');
  };

  if (loading) return <p role="status">Checking your session…</p>;
  if (user) return <Navigate to={roleHome(user.role)} replace />;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-brand-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      fontFamily: 'sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Background decorative circles */}
      <div style={{ position:'absolute', borderRadius:'50%', width:'320px', height:'320px', background:'rgba(187,162,136,0.08)', top:'-100px', right:'-80px', pointerEvents:'none' }} />
      <div style={{ position:'absolute', borderRadius:'50%', width:'220px', height:'220px', background:'rgba(187,162,136,0.05)', bottom:'-70px', left:'-60px', pointerEvents:'none' }} />
      <div style={{ position:'absolute', borderRadius:'50%', width:'120px', height:'120px', background:'rgba(255,255,255,0.03)', bottom:'80px', right:'40px', pointerEvents:'none' }} />

      {/* Card — tan border + soft glow */}
      <div style={{
        background: 'var(--color-brand-light)',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '370px',
        boxSizing: 'border-box',
        position: 'relative',
        zIndex: 1,
        overflow: 'hidden',
        border: '2px solid var(--color-brand-primary)',
        boxShadow: '0 0 0 4px rgba(187,162,136,0.15), 0 20px 40px rgba(0,0,0,0.4)',
      }}>

        {/* Maroon header banner */}
        <div style={{
          background: 'var(--color-brand-mid)',
          padding: '32px 32px 28px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position:'absolute', width:'200px', height:'200px', borderRadius:'50%', background:'rgba(187,162,136,0.12)', top:'-80px', right:'-60px', pointerEvents:'none' }} />
          <div style={{ position:'absolute', width:'120px', height:'120px', borderRadius:'50%', background:'rgba(255,255,255,0.05)', bottom:'-40px', left:'-30px', pointerEvents:'none' }} />

          {/* Logo ring */}
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            border: '3px solid var(--color-brand-primary)',
            boxShadow: '0 0 0 5px rgba(187,162,136,0.25)',
            overflow: 'hidden', background: 'var(--color-brand-primary)',
            position: 'relative', zIndex: 1,
          }}>
            <img src={logoImage} alt="TrisiKol logo" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
          </div>

          <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <h1 style={{ fontSize:'24px', fontWeight:700, color:'var(--color-brand-light)', margin:'0 0 2px', letterSpacing:'0.5px' }}>TrisiKol</h1>
            <p style={{ fontSize:'13px', color:'var(--color-brand-primary)', margin:0, fontWeight:500 }}>Book a ride or start driving</p>
          </div>
        </div>

        {/* Wave SVG divider */}
        <svg viewBox="0 0 370 28" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"
          style={{ display:'block', background:'var(--color-brand-light)', marginBottom:'-2px' }}>
          <path d="M0,0 C90,28 280,28 370,0 L370,0 L0,0 Z" fill="#4D1A1A" />
        </svg>

        {/* Form body */}
        <div style={{ padding:'24px 32px 32px', background:'var(--color-brand-light)' }}>
          {message && <p role="status" style={{ color: '#5C1A1A', fontSize: '13px' }}>{message}</p>}
          <p style={{ fontSize:'13px', fontWeight:600, color:'rgba(56,20,20,0.45)', margin:'0 0 20px', letterSpacing:'0.04em' }}>
            {authMode === 'signup' ? 'Create your account' : authMode === 'forgot' ? 'Recover your account' : 'Sign in to your account'}
          </p>

          {authMode === 'signup' ? (
            <form onSubmit={handleSignUp}>
              <InputField
                label="Full Name"
                icon="ti-user"
                type="text"
                placeholder="Juan Dela Cruz"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <InputField
                label="Mobile Number"
                icon="ti-device-mobile"
                type="text"
                placeholder="09XX XXX XXXX"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
              />
              <InputField
                label="Password"
                icon="ti-lock"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <InputField
                label="Confirm Password"
                icon="ti-lock-check"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />

              <p style={{ fontSize: '12px' }}>Passenger signup. Use at least 12 password characters. Driver accounts are created by an administrator.</p>
              <Button type="submit" disabled={busy}>{busy ? 'Creating account…' : 'Sign Up'}</Button>

              <p style={{ textAlign:'center', fontSize:'13px', color:'rgba(56,20,20,0.4)', marginTop:'20px' }}>
                Already have an account?{' '}
                <span onClick={() => { setAuthMode('login'); resetForm(); }} style={{ color:'var(--color-brand-dark)', textDecoration:'none', fontWeight:700, cursor:'pointer' }}>Log in</span>
              </p>
            </form>
          ) : authMode === 'forgot' ? (
            <form onSubmit={handleForgotPassword}>
              <div style={{ background:'rgba(187,162,136,0.12)', border:'1px solid rgba(187,162,136,0.35)', borderRadius:'14px', padding:'14px', marginBottom:'18px' }}>
                <p style={{ margin:0, color:'rgba(56,20,20,0.65)', fontSize:'13px', lineHeight:1.5 }}>
                  Automated password recovery is not connected yet.
                </p>
              </div>

              <InputField
                label="Mobile Number"
                icon="ti-device-mobile"
                type="text"
                placeholder="09XX XXX XXXX"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
              />

              <Button type="submit">Send Reset Instructions</Button>

              <p style={{ textAlign:'center', fontSize:'13px', color:'rgba(56,20,20,0.4)', marginTop:'20px' }}>
                Remembered your password?{' '}
                <span onClick={() => { setAuthMode('login'); resetForm(); }} style={{ color:'var(--color-brand-dark)', textDecoration:'none', fontWeight:700, cursor:'pointer' }}>Back to login</span>
              </p>
            </form>
          ) : (
            <form onSubmit={handleLogin}>
              <InputField
                label="Mobile Number"
                icon="ti-device-mobile"
                type="text"
                placeholder="09XX XXX XXXX"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
              />
              <InputField
                label="Password"
                icon="ti-lock"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <div style={{ textAlign:'right', marginTop:'-8px', marginBottom:'4px' }}>
                <span onClick={() => { setAuthMode('forgot'); resetForm(); }} style={{ fontSize:'12px', color:'var(--color-brand-dark)', opacity:0.55, textDecoration:'none', cursor:'pointer' }}>
                  Forgot password?
                </span>
              </div>

              <Button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Log In'}</Button>

              <p style={{ textAlign:'center', fontSize:'13px', color:'rgba(56,20,20,0.4)', marginTop:'20px' }}>
                No account yet?{' '}
                <span onClick={() => { setAuthMode('signup'); resetForm(); }} style={{ color:'var(--color-brand-dark)', textDecoration:'none', fontWeight:700, cursor:'pointer' }}>Sign up</span>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
