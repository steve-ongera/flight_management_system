/**
 * LoginPage.jsx
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const [form, setForm]       = useState({ username: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { login }             = useAuth();
  const navigate              = useNavigate();

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form);
      if (user.role === 'client') navigate('/client');
      else if (user.role === 'pilot') navigate('/pilot');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-brand-icon">
            <i className="bi bi-airplane-fill" />
          </div>
          <div>
            <h1>Paramount Charters</h1>
            <span>Flight Management System</span>
          </div>
        </div>

        <h2 style={{ fontSize:20, fontWeight:800, color:'var(--gray-900)', marginBottom:6 }}>
          Welcome back
        </h2>
        <p style={{ fontSize:13, color:'var(--gray-500)', marginBottom:28 }}>
          Sign in to access the operations portal
        </p>

        {error && (
          <div className="alert alert-danger mb-4">
            <i className="bi bi-exclamation-circle" />
            {error}
          </div>
        )}

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <div style={{ position:'relative' }}>
              <i className="bi bi-person" style={{
                position:'absolute', left:12, top:'50%', transform:'translateY(-50%)',
                color:'var(--gray-400)', fontSize:16 }} />
              <input
                className="form-control"
                style={{ paddingLeft:38 }}
                name="username"
                value={form.username}
                onChange={handle}
                placeholder="Enter your username"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position:'relative' }}>
              <i className="bi bi-lock" style={{
                position:'absolute', left:12, top:'50%', transform:'translateY(-50%)',
                color:'var(--gray-400)', fontSize:16 }} />
              <input
                className="form-control"
                style={{ paddingLeft:38 }}
                type="password"
                name="password"
                value={form.password}
                onChange={handle}
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-brand btn-block btn-lg"
            style={{ marginTop:8 }}
            disabled={loading}
          >
            {loading ? (
              <><div className="spinner spinner-sm" style={{ borderTopColor:'#fff' }} /> Signing in…</>
            ) : (
              <><i className="bi bi-box-arrow-in-right" /> Sign In</>
            )}
          </button>
        </form>

        <div style={{
          marginTop:28, paddingTop:20, borderTop:'1px solid var(--gray-100)',
          textAlign:'center'
        }}>
          <p style={{ fontSize:12, color:'var(--gray-400)' }}>
            <i className="bi bi-shield-lock" style={{ marginRight:5 }} />
            Secured by Paramount Charters Operations
          </p>
        </div>

        {/* Demo credentials hint */}
        <div style={{
          marginTop:14, padding:'12px 16px',
          background:'var(--gray-50)', borderRadius:'var(--r-md)',
          border:'1px solid var(--gray-200)'
        }}>
          <p style={{ fontSize:11, fontWeight:700, color:'var(--gray-500)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.5px' }}>
            Demo Credentials
          </p>
          {[
            { role:'Admin', u:'admin', p:'admin123' },
            { role:'Ops',   u:'ops',   p:'ops12345' },
            { role:'Pilot', u:'pilot', p:'pilot123' },
            { role:'Client',u:'client',p:'client12' },
          ].map(d => (
            <div key={d.role} style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
              <span style={{
                fontSize:10, fontWeight:700, background:'var(--brand)', color:'var(--gold)',
                padding:'1px 7px', borderRadius:'var(--r-full)', minWidth:46, textAlign:'center'
              }}>{d.role}</span>
              <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--gray-600)' }}>
                {d.u} / {d.p}
              </span>
              <button
                type="button"
                style={{ marginLeft:'auto', fontSize:10, color:'var(--primary)', background:'none', border:'none', cursor:'pointer' }}
                onClick={() => setForm({ username: d.u, password: d.p })}
              >
                Use
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}