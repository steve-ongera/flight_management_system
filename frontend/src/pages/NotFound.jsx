import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight:'100vh', background:'var(--brand)', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16, padding:24 }}>
      <div style={{ fontSize:80, fontWeight:900, color:'var(--gold)', fontFamily:'var(--font-mono)', letterSpacing:-4 }}>404</div>
      <h2 style={{ fontSize:20, fontWeight:700, color:'#fff' }}>Page not found</h2>
      <p style={{ fontSize:14, color:'rgba(255,255,255,0.5)' }}>The page you're looking for doesn't exist.</p>
      <button className="btn btn-gold" onClick={() => navigate('/')}>
        <i className="bi bi-house" /> Go Home
      </button>
    </div>
  );
}