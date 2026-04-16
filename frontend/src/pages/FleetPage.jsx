/**
 * FleetPage.jsx — Aircraft management
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { aircraftAPI, airportAPI } from '../services/api.js';
import {
  StatusBadge, SearchInput, Modal, FormGroup,
  PageLoader, EmptyState, SectionHeader,
  showToast, ToastContainer
} from '../components/common/index.jsx';

const CATEGORIES = ['turboprop','light','midsize','super_midsize','heavy','ultra_long','vip_airliner'];
const STATUSES   = ['available','in_flight','maintenance','inactive'];

export default function FleetPage() {
  const navigate = useNavigate();
  const [fleet, setFleet]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [catFilter, setCat]     = useState('');
  const [statusFilter, setStat] = useState('');
  const [showAdd, setShowAdd]   = useState(false);
  const [airports, setAirports] = useState([]);

  const load = useCallback(() => {
    setLoading(true);
    const params = { search };
    if (catFilter)    params.category = catFilter;
    if (statusFilter) params.status   = statusFilter;
    aircraftAPI.list(params)
      .then(r => setFleet(r.data.results || r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, catFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    airportAPI.list().then(r => setAirports(r.data.results || r.data));
  }, []);

  return (
    <div className="page-container">
      <ToastContainer />
      <SectionHeader
        title="Fleet Management"
        subtitle={`${fleet.length} aircraft registered`}
        actions={
          <button className="btn btn-brand" onClick={() => setShowAdd(true)}>
            <i className="bi bi-plus-lg" /> Add Aircraft
          </button>
        }
      />

      <div className="filters-row">
        <SearchInput value={search} onChange={v => setSearch(v)} placeholder="Search registration, name…" />
        <select className="filter-select" value={catFilter} onChange={e => setCat(e.target.value)}>
          <option value="">Category: All</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_',' ').replace(/\b\w/g,x=>x.toUpperCase())}</option>)}
        </select>
        <select className="filter-select" value={statusFilter} onChange={e => setStat(e.target.value)}>
          <option value="">Status: All</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace('_',' ').replace(/\b\w/g,x=>x.toUpperCase())}</option>)}
        </select>
      </div>

      {loading ? <PageLoader /> : fleet.length === 0 ? (
        <EmptyState icon="bi-airplane" title="No aircraft found" message="Add your first aircraft to get started."
          action={<button className="btn btn-brand" onClick={() => setShowAdd(true)}><i className="bi bi-plus-lg" /> Add Aircraft</button>} />
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px,1fr))', gap:16 }}>
          {fleet.map(a => (
            <AircraftCard key={a.id} aircraft={a} onClick={() => navigate(`/fleet/${a.id}`)} onRefresh={load} />
          ))}
        </div>
      )}

      <AddAircraftModal open={showAdd} onClose={() => setShowAdd(false)} airports={airports}
        onCreated={() => { setShowAdd(false); load(); showToast('Aircraft added'); }} />
    </div>
  );
}

function AircraftCard({ aircraft: a, onClick, onRefresh }) {
  const [statusLoading, setStatusLoading] = useState(false);

  const quickStatus = async (e, status) => {
    e.stopPropagation();
    setStatusLoading(true);
    try {
      await aircraftAPI.setStatus(a.id, status);
      showToast(`Status updated to ${status}`);
      onRefresh();
    } catch { showToast('Failed to update', 'danger'); }
    finally { setStatusLoading(false); }
  };

  const maintenancePct = a.maintenance_interval_hrs > 0
    ? Math.min(100, ((a.total_flight_hours - a.last_maintenance_hrs) / a.maintenance_interval_hrs) * 100)
    : 0;

  return (
    <div className="card" style={{ cursor:'pointer', transition:'all 0.2s' }}
      onClick={onClick}
      onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-lg)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
    >
      {/* Top bar */}
      <div style={{ background:'var(--brand)', borderRadius:'var(--r-lg) var(--r-lg) 0 0', padding:'14px 18px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:16, color:'var(--gold)' }}>{a.registration}</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.6)', marginTop:1 }}>{a.category_display}</div>
        </div>
        <StatusBadge value={a.status} />
      </div>

      <div style={{ padding:'16px 18px' }}>
        <div style={{ fontWeight:700, fontSize:15, color:'var(--gray-900)', marginBottom:4 }}>{a.name}</div>
        <div style={{ fontSize:12, color:'var(--gray-500)', marginBottom:14 }}>{a.manufacturer} {a.model}</div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:14 }}>
          {[
            { icon:'bi-people', val: a.passenger_capacity, label:'Pax' },
            { icon:'bi-globe2', val: `${a.range_km?.toLocaleString()}km`, label:'Range' },
            { icon:'bi-currency-dollar', val: `$${Number(a.hourly_rate_usd).toLocaleString()}`, label:'/ hr' },
          ].map(({ icon, val, label }) => (
            <div key={label} style={{ textAlign:'center', background:'var(--gray-50)', borderRadius:'var(--r-sm)', padding:'8px 4px' }}>
              <i className={`bi ${icon}`} style={{ color:'var(--gray-400)', fontSize:14 }} />
              <div style={{ fontWeight:700, fontSize:13, color:'var(--gray-800)', marginTop:2 }}>{val}</div>
              <div style={{ fontSize:10, color:'var(--gray-400)' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Maintenance bar */}
        <div style={{ marginBottom:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
            <span style={{ fontSize:11, fontWeight:600, color: a.maintenance_due ? 'var(--danger)' : 'var(--gray-500)' }}>
              {a.maintenance_due
                ? <><i className="bi bi-exclamation-triangle" /> Maintenance Due!</>
                : <>Maintenance: {Math.max(0, a.hours_until_maintenance).toFixed(0)}h remaining</>}
            </span>
            <span style={{ fontSize:11, color:'var(--gray-400)' }}>{a.total_flight_hours}h total</span>
          </div>
          <div style={{ height:5, background:'var(--gray-100)', borderRadius:'var(--r-full)', overflow:'hidden' }}>
            <div style={{
              height:'100%', borderRadius:'var(--r-full)', transition:'width 0.5s ease',
              width:`${maintenancePct}%`,
              background: maintenancePct > 90 ? 'var(--danger)' : maintenancePct > 70 ? 'var(--warning)' : 'var(--accent)'
            }} />
          </div>
        </div>

        {/* Quick status */}
        <div style={{ display:'flex', gap:'6' }} onClick={e => e.stopPropagation()}>
          {STATUSES.filter(s => s !== a.status).slice(0,2).map(s => (
            <button key={s} className="btn btn-outline btn-sm" disabled={statusLoading}
              onClick={e => quickStatus(e, s)} style={{ fontSize:11 }}>
              → {s.replace('_',' ')}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AddAircraftModal({ open, onClose, airports, onCreated }) {
  const blank = {
    registration:'', name:'', model:'', manufacturer:'', category:'light',
    year_of_manufacture:'', passenger_capacity:'', range_km:'', cruise_speed_kmh:'',
    hourly_rate_usd:'', base_airport:'', description:'',
    maintenance_interval_hrs:200,
  };
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const inp = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setSaving(true); setErrors({});
    try {
      await aircraftAPI.create(form);
      setForm(blank); onCreated();
    } catch (err) { setErrors(err.response?.data || {}); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Aircraft" size="modal-lg"
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-brand" onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : <><i className="bi bi-check2" /> Add Aircraft</>}
          </button>
        </>
      }
    >
      <div className="form-row form-row-2">
        <FormGroup label="Registration" required error={errors.registration?.[0]}>
          <input className="form-control" value={form.registration} onChange={inp('registration')} placeholder="5Y-ABC" style={{ textTransform:'uppercase' }} />
        </FormGroup>
        <FormGroup label="Aircraft Name" required>
          <input className="form-control" value={form.name} onChange={inp('name')} placeholder="Cessna Citation XLS" />
        </FormGroup>
      </div>
      <div className="form-row form-row-3">
        <FormGroup label="Category">
          <select className="form-control" value={form.category} onChange={inp('category')}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_',' ').replace(/\b\w/g,x=>x.toUpperCase())}</option>)}
          </select>
        </FormGroup>
        <FormGroup label="Manufacturer">
          <input className="form-control" value={form.manufacturer} onChange={inp('manufacturer')} placeholder="Cessna" />
        </FormGroup>
        <FormGroup label="Model">
          <input className="form-control" value={form.model} onChange={inp('model')} placeholder="Citation XLS+" />
        </FormGroup>
      </div>
      <div className="form-row form-row-3">
        <FormGroup label="Passengers" required>
          <input className="form-control" type="number" value={form.passenger_capacity} onChange={inp('passenger_capacity')} />
        </FormGroup>
        <FormGroup label="Range (km)" required>
          <input className="form-control" type="number" value={form.range_km} onChange={inp('range_km')} />
        </FormGroup>
        <FormGroup label="Cruise Speed (km/h)" required>
          <input className="form-control" type="number" value={form.cruise_speed_kmh} onChange={inp('cruise_speed_kmh')} />
        </FormGroup>
      </div>
      <div className="form-row form-row-2">
        <FormGroup label="Hourly Rate (USD)" required>
          <input className="form-control" type="number" step="0.01" value={form.hourly_rate_usd} onChange={inp('hourly_rate_usd')} />
        </FormGroup>
        <FormGroup label="Base Airport">
          <select className="form-control" value={form.base_airport} onChange={inp('base_airport')}>
            <option value="">Select…</option>
            {airports.map(a => <option key={a.id} value={a.id}>{a.code} — {a.city}</option>)}
          </select>
        </FormGroup>
      </div>
      <FormGroup label="Description">
        <textarea className="form-control" rows={2} value={form.description} onChange={inp('description')} />
      </FormGroup>
    </Modal>
  );
}