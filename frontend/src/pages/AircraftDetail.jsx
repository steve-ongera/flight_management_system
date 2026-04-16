import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { aircraftAPI, maintenanceAPI } from '../services/api.js';
import { StatusBadge, Modal, FormGroup, PageLoader, showToast, ToastContainer } from '../components/common/index.jsx';

export default function AircraftDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [aircraft, setAircraft] = useState(null);
  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [hoursModal, setHoursModal] = useState(false);
  const [hours, setHours] = useState('');
  const [editModal, setEditModal] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      aircraftAPI.get(id),
      maintenanceAPI.list({ aircraft: id })
    ]).then(([ar, ml]) => {
      setAircraft(ar.data);
      setLogs(ml.data.results || ml.data);
    }).catch(() => navigate('/fleet'))
    .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <PageLoader />;
  if (!aircraft) return null;
  const a = aircraft;

  const logHours = async () => {
    try {
      await aircraftAPI.logHours(id, hours);
      showToast('Hours logged'); setHoursModal(false); load();
    } catch { showToast('Error', 'danger'); }
  };

  const quickStatus = async (s) => {
    try { await aircraftAPI.setStatus(id, s); showToast(`Status → ${s}`); load(); }
    catch { showToast('Error', 'danger'); }
  };

  const maintenancePct = a.maintenance_interval_hrs > 0
    ? Math.min(100, ((a.total_flight_hours - a.last_maintenance_hrs) / a.maintenance_interval_hrs) * 100)
    : 0;

  return (
    <div className="page-container">
      <ToastContainer />
      <div className="page-header">
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/fleet')}><i className="bi bi-arrow-left" /></button>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <h1 style={{ fontSize:18 }}>{a.name}</h1>
              <StatusBadge value={a.status} />
            </div>
            <p style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--gray-500)' }}>{a.registration} · {a.category_display}</p>
          </div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline btn-sm" onClick={() => setHoursModal(true)}><i className="bi bi-clock" /> Log Hours</button>
          <button className="btn btn-brand btn-sm" onClick={() => setEditModal(true)}><i className="bi bi-pencil" /> Edit</button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
        {/* Specs */}
        <div className="card">
          <div className="card-header"><h2>Aircraft Specifications</h2></div>
          <div className="card-body">
            <div className="detail-grid">
              {[
                ['Registration', a.registration], ['Model', `${a.manufacturer} ${a.model}`],
                ['Year', a.year_of_manufacture || '—'], ['Category', a.category_display],
                ['Passengers', a.passenger_capacity], ['Range', `${a.range_km?.toLocaleString()} km`],
                ['Cruise Speed', `${a.cruise_speed_kmh} km/h`], ['Hourly Rate', `$${Number(a.hourly_rate_usd).toLocaleString()}/hr`],
                ['Base Airport', a.base_airport_detail ? `${a.base_airport_detail.code} — ${a.base_airport_detail.city}` : '—'],
              ].map(([l,v]) => (
                <div key={l}>
                  <label style={{ fontSize:10.5,fontWeight:700,color:'var(--gray-400)',textTransform:'uppercase',letterSpacing:'0.5px',display:'block',marginBottom:2 }}>{l}</label>
                  <p style={{ fontSize:13,fontWeight:500 }}>{v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Maintenance */}
        <div className="card">
          <div className="card-header"><h2>Maintenance Status</h2></div>
          <div className="card-body">
            {a.maintenance_due && (
              <div className="alert alert-danger mb-4"><i className="bi bi-exclamation-triangle" /> Maintenance overdue — ground aircraft!</div>
            )}
            <div style={{ marginBottom:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:13, fontWeight:600 }}>Hours until next maintenance</span>
                <span style={{ fontSize:14, fontWeight:800, color: a.maintenance_due ? 'var(--danger)' : 'var(--accent)' }}>
                  {Math.max(0, a.hours_until_maintenance).toFixed(0)}h
                </span>
              </div>
              <div style={{ height:8, background:'var(--gray-100)', borderRadius:'var(--r-full)', overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:'var(--r-full)', width:`${maintenancePct}%`, background: maintenancePct > 90 ? 'var(--danger)' : maintenancePct > 70 ? 'var(--warning)' : 'var(--accent)', transition:'width 0.5s' }} />
              </div>
            </div>
            {[
              ['Total Flight Hours', `${a.total_flight_hours}h`],
              ['Maintenance Interval', `${a.maintenance_interval_hrs}h`],
              ['Last Maintenance At', `${a.last_maintenance_hrs}h`],
              ['Insurance Expiry', a.insurance_expiry || '—'],
              ['Airworthiness Expiry', a.airworthiness_expiry || '—'],
            ].map(([l,v]) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--gray-100)' }}>
                <span style={{ fontSize:12.5, color:'var(--gray-600)' }}>{l}</span>
                <span style={{ fontSize:13, fontWeight:600 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick status */}
      <div className="card mb-4">
        <div className="card-header"><h2>Quick Status Change</h2></div>
        <div className="card-body" style={{ display:'flex', gap:10 }}>
          {['available','in_flight','maintenance','inactive'].filter(s => s !== a.status).map(s => (
            <button key={s} className="btn btn-outline btn-sm" onClick={() => quickStatus(s)}>
              → {s.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Maintenance Log */}
      <div className="card">
        <div className="card-header"><h2>Maintenance History</h2></div>
        <div className="table-wrapper" style={{ border:'none' }}>
          <table>
            <thead><tr><th>Type</th><th>Scheduled</th><th>Completed</th><th>Technician</th><th>Cost</th><th>Status</th></tr></thead>
            <tbody>
              {logs.length > 0 ? logs.map(m => (
                <tr key={m.id}>
                  <td><span className="badge badge-info">{m.type_display}</span></td>
                  <td style={{ fontSize:13 }}>{m.scheduled_date}</td>
                  <td style={{ fontSize:13 }}>{m.completed_date || '—'}</td>
                  <td style={{ fontSize:13 }}>{m.technician || '—'}</td>
                  <td style={{ fontWeight:600 }}>{m.cost_usd ? `$${Number(m.cost_usd).toLocaleString()}` : '—'}</td>
                  <td><StatusBadge value={m.status} /></td>
                </tr>
              )) : (
                <tr><td colSpan={6} style={{ textAlign:'center', padding:32, color:'var(--gray-400)' }}>No maintenance records</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Hours Modal */}
      <Modal open={hoursModal} onClose={() => setHoursModal(false)} title="Log Flight Hours"
        footer={<><button className="btn btn-outline" onClick={() => setHoursModal(false)}>Cancel</button><button className="btn btn-brand" onClick={logHours}>Log Hours</button></>}
      >
        <FormGroup label="Hours to Add" hint="Enter hours flown since last log entry">
          <input className="form-control" type="number" step="0.1" min="0" value={hours} onChange={e => setHours(e.target.value)} placeholder="2.5" />
        </FormGroup>
      </Modal>
    </div>
  );
}