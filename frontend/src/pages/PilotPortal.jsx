/**
 * PilotPortal.jsx
 */
import { useState, useEffect } from 'react';
import { dashboardAPI } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { StatusBadge } from '../components/common/index.jsx';

export default function PilotPortal() {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    dashboardAPI.pilot().then(r => setData(r.data)).catch(()=>{});
  }, []);

  const crew = data?.crew;

  return (
    <div style={{ minHeight:'100vh', background:'var(--brand)' }}>
      <header style={{ background:'rgba(255,255,255,0.05)', borderBottom:'1px solid rgba(255,255,255,0.1)', padding:'0 32px', height:64, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:36,height:36,borderRadius:'var(--r-md)',background:'var(--gold)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,color:'var(--brand)' }}>
            <i className="bi bi-airplane-fill" />
          </div>
          <div>
            <div style={{ fontWeight:800,fontSize:14,color:'#fff' }}>Paramount Charters</div>
            <div style={{ fontSize:11,color:'rgba(255,255,255,0.5)' }}>Crew Portal</div>
          </div>
        </div>
        <button className="btn btn-outline btn-sm" style={{ color:'#fff',borderColor:'rgba(255,255,255,0.3)' }} onClick={logout}>
          <i className="bi bi-box-arrow-left" /> Sign Out
        </button>
      </header>

      <div style={{ maxWidth:800, margin:'0 auto', padding:'32px 20px' }}>
        {/* Crew Profile */}
        {crew && (
          <div style={{ background:'rgba(255,255,255,0.07)', borderRadius:'var(--r-xl)', border:'1px solid rgba(255,255,255,0.1)', padding:24, marginBottom:24, display:'flex', alignItems:'center', gap:20 }}>
            <div style={{ width:60,height:60,borderRadius:'50%',background:'var(--gold)',color:'var(--brand)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:22,flexShrink:0 }}>
              {user?.first_name?.[0] || user?.username?.[0] || '?'}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:800, color:'#fff', fontSize:18 }}>{user?.first_name} {user?.last_name}</div>
              <div style={{ fontSize:13, color:'var(--gold)', marginTop:2 }}>{crew.crew_role_display}</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginTop:4 }}>
                License: {crew.license_number || '—'} · Total Hours: {crew.total_hours}h
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', marginBottom:4 }}>Status</div>
              <StatusBadge value={crew.status} />
            </div>
          </div>
        )}

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:14, marginBottom:24 }}>
          {[
            { icon:'bi-calendar2-check', label:'Total Assignments', val: data?.total_assignments || 0 },
            { icon:'bi-clock',           label:'Flight Hours',       val: `${crew?.total_hours || 0}h` },
          ].map(({ icon,label,val }) => (
            <div key={label} style={{ background:'rgba(255,255,255,0.07)', borderRadius:'var(--r-lg)', padding:'18px 20px', border:'1px solid rgba(255,255,255,0.1)' }}>
              <i className={`bi ${icon}`} style={{ fontSize:22,color:'var(--gold)',display:'block',marginBottom:8 }} />
              <div style={{ fontSize:24,fontWeight:800,color:'#fff' }}>{val}</div>
              <div style={{ fontSize:12,color:'rgba(255,255,255,0.5)',marginTop:2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Upcoming Flights */}
        <div style={{ background:'rgba(255,255,255,0.05)', borderRadius:'var(--r-xl)', border:'1px solid rgba(255,255,255,0.1)', overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ fontSize:14,fontWeight:700,color:'#fff' }}>
              <i className="bi bi-airplane" style={{ marginRight:8,color:'var(--gold)' }} />My Upcoming Flights
            </h3>
          </div>
          {data?.upcoming_flights?.length > 0 ? data.upcoming_flights.map(b => (
            <div key={b.id} style={{ padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:16 }}>
              <div style={{ background:'rgba(232,160,32,0.15)', borderRadius:'var(--r-md)', padding:'8px 12px', textAlign:'center', minWidth:50 }}>
                <div style={{ fontSize:16,fontWeight:800,color:'var(--gold)',fontFamily:'var(--font-mono)' }}>{b.origin_detail?.code}</div>
                <i className="bi bi-arrow-down" style={{ color:'rgba(255,255,255,0.4)',fontSize:11 }} />
                <div style={{ fontSize:16,fontWeight:800,color:'var(--gold)',fontFamily:'var(--font-mono)' }}>{b.destination_detail?.code}</div>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600,color:'#fff',fontSize:13 }}>{b.origin_detail?.city} → {b.destination_detail?.city}</div>
                <div style={{ fontSize:12,color:'rgba(255,255,255,0.5)',marginTop:2 }}>
                  {b.departure_date}{b.departure_time ? ` at ${b.departure_time}` : ''} · {b.passenger_count} pax
                </div>
                {b.aircraft_detail && (
                  <div style={{ fontSize:11,color:'rgba(255,255,255,0.4)',marginTop:2 }}>
                    <i className="bi bi-airplane" style={{ marginRight:4 }} />{b.aircraft_detail.name} ({b.aircraft_detail.registration})
                  </div>
                )}
              </div>
              <StatusBadge value={b.status} />
            </div>
          )) : (
            <div style={{ padding:32,textAlign:'center',color:'rgba(255,255,255,0.4)',fontSize:13 }}>
              <i className="bi bi-calendar-x" style={{ fontSize:28,display:'block',marginBottom:8 }} />
              No upcoming assignments
            </div>
          )}
        </div>

        {/* Expiry alerts */}
        {crew && (
          <div style={{ marginTop:20, display:'flex', flexDirection:'column', gap:10 }}>
            {crew.license_expiry && new Date(crew.license_expiry) < new Date(Date.now() + 30*24*60*60*1000) && (
              <div className="alert alert-warning">
                <i className="bi bi-exclamation-triangle" />
                License expires {crew.license_expiry}. Please renew soon.
              </div>
            )}
            {crew.medical_expiry && new Date(crew.medical_expiry) < new Date(Date.now() + 30*24*60*60*1000) && (
              <div className="alert alert-warning">
                <i className="bi bi-heart-pulse" />
                Medical certificate expires {crew.medical_expiry}. Please renew.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}