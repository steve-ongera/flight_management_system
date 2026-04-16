/**
 * ClientPortal.jsx
 */
import { useState, useEffect } from 'react';
import { dashboardAPI, publicBookingAPI } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { StatusBadge, showToast, ToastContainer } from '../components/common/index.jsx';

export default function ClientPortal() {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [tab, setTab]   = useState('overview');
  const [track, setTrack]   = useState('');
  const [tracked, setTracked] = useState(null);
  const [trackError, setTrackError] = useState('');

  useEffect(() => {
    dashboardAPI.client().then(r => setData(r.data)).catch(()=>{});
  }, []);

  const doTrack = async () => {
    setTrackError(''); setTracked(null);
    try { const r = await publicBookingAPI.track(track.trim()); setTracked(r.data); }
    catch { setTrackError('Booking not found. Check your reference number.'); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--brand)' }}>
      {/* Header */}
      <header style={{ background:'rgba(255,255,255,0.05)', borderBottom:'1px solid rgba(255,255,255,0.1)', padding:'0 32px', height:64, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:36,height:36,borderRadius:'var(--r-md)',background:'var(--gold)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,color:'var(--brand)' }}>
            <i className="bi bi-airplane-fill" />
          </div>
          <div>
            <div style={{ fontWeight:800,fontSize:14,color:'#fff' }}>Paramount Charters</div>
            <div style={{ fontSize:11,color:'rgba(255,255,255,0.5)' }}>Client Portal</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:13,color:'rgba(255,255,255,0.7)' }}>
            Welcome, {user?.first_name || user?.username}
          </span>
          <button className="btn btn-outline btn-sm" style={{ color:'#fff',borderColor:'rgba(255,255,255,0.3)' }} onClick={logout}>
            <i className="bi bi-box-arrow-left" /> Sign Out
          </button>
        </div>
      </header>

      <ToastContainer />

      <div style={{ maxWidth:900, margin:'0 auto', padding:'32px 20px' }}>
        {/* Tabs */}
        <div style={{ display:'flex', gap:4, marginBottom:28, background:'rgba(255,255,255,0.05)', borderRadius:'var(--r-lg)', padding:4, width:'fit-content' }}>
          {[['overview','bi-speedometer2','Overview'],['track','bi-search','Track Booking']].map(([k,icon,label]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              padding:'8px 20px', borderRadius:'var(--r-md)', fontSize:13, fontWeight:600,
              background: tab===k ? 'var(--gold)' : 'transparent',
              color: tab===k ? 'var(--brand)' : 'rgba(255,255,255,0.65)',
              border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:7, transition:'all 0.2s'
            }}>
              <i className={`bi ${icon}`} />{label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <>
            {/* KPIs */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
              {[
                { icon:'bi-calendar2-check', label:'Total Bookings',    val: data?.total_bookings || 0 },
                { icon:'bi-check2-circle',   label:'Flights Completed', val: data?.completed_flights || 0 },
                { icon:'bi-currency-dollar', label:'Total Spent',       val: `$${Number(data?.total_spent||0).toLocaleString()}` },
              ].map(({ icon,label,val }) => (
                <div key={label} style={{ background:'rgba(255,255,255,0.07)', borderRadius:'var(--r-lg)', padding:'18px 20px', border:'1px solid rgba(255,255,255,0.1)' }}>
                  <i className={`bi ${icon}`} style={{ fontSize:22, color:'var(--gold)', display:'block', marginBottom:8 }} />
                  <div style={{ fontSize:24, fontWeight:800, color:'#fff' }}>{val}</div>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginTop:2 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Upcoming */}
            <div style={{ background:'rgba(255,255,255,0.05)', borderRadius:'var(--r-lg)', border:'1px solid rgba(255,255,255,0.1)', padding:0, overflow:'hidden' }}>
              <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.1)' }}>
                <h3 style={{ fontSize:14, fontWeight:700, color:'#fff' }}>
                  <i className="bi bi-calendar2-event" style={{ marginRight:8, color:'var(--gold)' }} />Upcoming Flights
                </h3>
              </div>
              {data?.upcoming_bookings?.length > 0 ? data.upcoming_bookings.map(b => (
                <div key={b.id} style={{ padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:16 }}>
                  <div style={{ background:'rgba(232,160,32,0.15)', borderRadius:'var(--r-md)', padding:'10px 14px', textAlign:'center', minWidth:52 }}>
                    <div style={{ fontSize:18, fontWeight:800, color:'var(--gold)', fontFamily:'var(--font-mono)' }}>{b.origin_detail?.code}</div>
                    <i className="bi bi-arrow-down" style={{ color:'rgba(255,255,255,0.4)', fontSize:11 }} />
                    <div style={{ fontSize:18, fontWeight:800, color:'var(--gold)', fontFamily:'var(--font-mono)' }}>{b.destination_detail?.code}</div>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, color:'#fff', fontSize:14 }}>{b.origin_detail?.city} → {b.destination_detail?.city}</div>
                    <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginTop:2 }}>{b.departure_date} · {b.passenger_count} pax</div>
                  </div>
                  <StatusBadge value={b.status} />
                </div>
              )) : (
                <div style={{ padding:32, textAlign:'center', color:'rgba(255,255,255,0.4)', fontSize:13 }}>
                  <i className="bi bi-calendar-x" style={{ fontSize:28, display:'block', marginBottom:8 }} />
                  No upcoming flights
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'track' && (
          <div style={{ background:'rgba(255,255,255,0.05)', borderRadius:'var(--r-xl)', border:'1px solid rgba(255,255,255,0.1)', padding:32 }}>
            <h3 style={{ fontSize:16, fontWeight:800, color:'#fff', marginBottom:6 }}>Track Your Booking</h3>
            <p style={{ fontSize:13, color:'rgba(255,255,255,0.5)', marginBottom:20 }}>Enter the reference number from your confirmation.</p>
            <div style={{ display:'flex', gap:10 }}>
              <input
                style={{ flex:1, padding:'10px 14px', borderRadius:'var(--r-md)', border:'1.5px solid rgba(255,255,255,0.2)', background:'rgba(255,255,255,0.08)', color:'#fff', fontSize:13, fontFamily:'var(--font-mono)', outline:'none' }}
                value={track} onChange={e => setTrack(e.target.value)}
                placeholder="e.g. a1b2c3d4-…"
                onKeyDown={e => e.key === 'Enter' && doTrack()}
              />
              <button className="btn btn-gold" onClick={doTrack}><i className="bi bi-search" /> Track</button>
            </div>
            {trackError && <p style={{ color:'var(--danger)', fontSize:13, marginTop:10 }}>{trackError}</p>}
            {tracked && (
              <div style={{ marginTop:20, background:'rgba(255,255,255,0.07)', borderRadius:'var(--r-lg)', padding:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                  <div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:22, fontWeight:800, color:'var(--gold)' }}>{tracked.route}</div>
                    <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginTop:2 }}>Ref: {String(tracked.reference).slice(0,16)}…</div>
                  </div>
                  <StatusBadge value={tracked.status} />
                </div>
                {[
                  ['Departure', tracked.departure],
                  ['Passengers', tracked.passengers],
                  ['Aircraft', tracked.aircraft || 'TBA'],
                  ['Quoted Price', tracked.quoted_price ? `$${Number(tracked.quoted_price).toLocaleString()}` : 'Pending'],
                ].map(([l,v]) => (
                  <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                    <span style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>{l}</span>
                    <span style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}