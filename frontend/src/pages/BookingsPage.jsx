/**
 * BookingsPage.jsx — Full bookings list with filters, search, create modal
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingAPI, aircraftAPI, airportAPI } from '../services/api.js';
import {
  StatusBadge, PriorityBadge, SearchInput, Modal,
  PageLoader, EmptyState, Pagination, SectionHeader,
  FormGroup, showToast, ToastContainer
} from '../components/common/index.jsx';

const STATUS_OPTS = ['', 'inquiry','quoted','confirmed','in_flight','completed','cancelled'];
const PRIORITY_OPTS = ['', 'normal', 'high', 'vip'];
const TRIP_OPTS = ['', 'one_way', 'round_trip', 'multi_leg'];

export default function BookingsPage() {
  const navigate = useNavigate();
  const [bookings, setBookings]   = useState([]);
  const [count, setCount]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  const [filters, setFilters]     = useState({ status:'', priority:'', trip_type:'' });
  const [showCreate, setShowCreate] = useState(false);
  const [airports, setAirports]   = useState([]);
  const [aircraft, setAircraft]   = useState([]);

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, search, ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) };
    bookingAPI.list(params)
      .then(r => { setBookings(r.data.results || r.data); setCount(r.data.count || r.data.length); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, search, filters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    airportAPI.list().then(r => setAirports(r.data.results || r.data));
    aircraftAPI.list().then(r => setAircraft(r.data.results || r.data));
  }, []);

  const setFilter = (k, v) => { setFilters(f => ({ ...f, [k]: v })); setPage(1); };

  return (
    <div className="page-container">
      <ToastContainer />
      <SectionHeader
        title="Flight Bookings"
        subtitle="Manage charter requests and bookings"
        actions={
          <button className="btn btn-brand" onClick={() => setShowCreate(true)}>
            <i className="bi bi-plus-lg" /> New Booking
          </button>
        }
      />

      {/* Filters */}
      <div className="filters-row">
        <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }}
          placeholder="Search name, email, reference…" />
        {[
          { key:'status',    opts: STATUS_OPTS,   label:'Status' },
          { key:'priority',  opts: PRIORITY_OPTS, label:'Priority' },
          { key:'trip_type', opts: TRIP_OPTS,     label:'Trip Type' },
        ].map(({ key, opts, label }) => (
          <select key={key} className="filter-select" value={filters[key]}
            onChange={e => setFilter(key, e.target.value)}>
            <option value="">{label}: All</option>
            {opts.filter(Boolean).map(o => (
              <option key={o} value={o}>{o.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>
            ))}
          </select>
        ))}
        {(search || Object.values(filters).some(Boolean)) && (
          <button className="btn btn-outline btn-sm"
            onClick={() => { setSearch(''); setFilters({ status:'',priority:'',trip_type:'' }); setPage(1); }}>
            <i className="bi bi-x" /> Clear
          </button>
        )}
        <span style={{ marginLeft:'auto', fontSize:12, color:'var(--gray-500)' }}>
          {count} booking{count !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      {loading ? <PageLoader /> : (
        <>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Client</th>
                  <th>Route</th>
                  <th>Departure</th>
                  <th>Pax</th>
                  <th>Aircraft</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Price</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length > 0 ? bookings.map(b => (
                  <tr key={b.id}>
                    <td>
                      <span className="text-mono" style={{ fontSize:11.5, color:'var(--gray-500)' }}>
                        {String(b.reference).slice(0,8)}…
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight:600, fontSize:13 }}>{b.guest_name}</div>
                      <div style={{ fontSize:11, color:'var(--gray-500)' }}>{b.company || b.guest_email}</div>
                    </td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:13, color:'var(--brand)' }}>
                          {b.origin_detail?.code || '—'}
                        </span>
                        <i className="bi bi-arrow-right" style={{ fontSize:11, color:'var(--gray-400)' }} />
                        <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:13, color:'var(--brand)' }}>
                          {b.destination_detail?.code || '—'}
                        </span>
                      </div>
                      <div style={{ fontSize:11, color:'var(--gray-400)' }}>
                        {b.trip_type_display}
                      </div>
                    </td>
                    <td style={{ fontSize:13 }}>
                      <div style={{ fontWeight:500 }}>{b.departure_date}</div>
                      {b.departure_time && <div style={{ fontSize:11, color:'var(--gray-500)' }}>{b.departure_time}</div>}
                    </td>
                    <td style={{ textAlign:'center', fontWeight:600 }}>{b.passenger_count}</td>
                    <td style={{ fontSize:12, color:'var(--gray-600)' }}>
                      {b.aircraft_detail?.name || <span style={{ color:'var(--gray-400)' }}>TBA</span>}
                    </td>
                    <td><StatusBadge value={b.status} /></td>
                    <td><PriorityBadge value={b.priority} /></td>
                    <td style={{ fontWeight:700, fontSize:13 }}>
                      {b.quoted_price_usd
                        ? <span style={{ color:'var(--accent)' }}>${Number(b.quoted_price_usd).toLocaleString()}</span>
                        : <span style={{ color:'var(--gray-400)' }}>—</span>}
                    </td>
                    <td>
                      <button className="btn btn-outline btn-sm"
                        onClick={() => navigate(`/bookings/${b.id}`)}>
                        <i className="bi bi-eye" /> View
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={10}>
                    <EmptyState icon="bi-calendar2-x" title="No bookings found"
                      message="Try adjusting filters or create a new booking." />
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} count={count} onChange={setPage} />
        </>
      )}

      {/* Create Modal */}
      <CreateBookingModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        airports={airports}
        aircraft={aircraft}
        onCreated={() => { setShowCreate(false); load(); showToast('Booking created successfully'); }}
      />
    </div>
  );
}

/* ── Create Booking Modal ──────────────────────────────────────── */
function CreateBookingModal({ open, onClose, airports, aircraft, onCreated }) {
  const blank = {
    guest_name:'', guest_email:'', guest_phone:'', company:'',
    trip_type:'one_way', origin:'', destination:'',
    departure_date:'', departure_time:'', return_date:'',
    passenger_count:1, aircraft:'',
    catering_requested:false, ground_transport_requested:false,
    concierge_requested:false, special_requests:'', priority:'normal',
  };
  const [form, setForm]     = useState(blank);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const chk = (k) => (e) => set(k, e.target.checked);
  const inp = (k) => (e) => set(k, e.target.value);

  const submit = async () => {
    setSaving(true);
    setErrors({});
    try {
      await bookingAPI.create(form);
      setForm(blank);
      onCreated();
    } catch (err) {
      setErrors(err.response?.data || {});
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Charter Booking" size="modal-lg"
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-brand" onClick={submit} disabled={saving}>
            {saving ? <><div className="spinner spinner-sm" style={{ borderTopColor:'#fff' }} /> Saving…</> : <><i className="bi bi-check2" /> Create Booking</>}
          </button>
        </>
      }
    >
      <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
        {/* Client */}
        <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.7px', color:'var(--gray-400)', marginBottom:12 }}>
          Client Information
        </p>
        <div className="form-row form-row-2">
          <FormGroup label="Full Name" required error={errors.guest_name?.[0]}>
            <input className={`form-control ${errors.guest_name ? 'is-error' : ''}`}
              value={form.guest_name} onChange={inp('guest_name')} placeholder="John Smith" />
          </FormGroup>
          <FormGroup label="Email" required error={errors.guest_email?.[0]}>
            <input className="form-control" type="email"
              value={form.guest_email} onChange={inp('guest_email')} placeholder="john@example.com" />
          </FormGroup>
        </div>
        <div className="form-row form-row-2">
          <FormGroup label="Phone">
            <input className="form-control" value={form.guest_phone} onChange={inp('guest_phone')} placeholder="+254 700 000 000" />
          </FormGroup>
          <FormGroup label="Company">
            <input className="form-control" value={form.company} onChange={inp('company')} />
          </FormGroup>
        </div>

        <hr style={{ border:'none', borderTop:'1px solid var(--gray-100)', margin:'8px 0 16px' }} />
        <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.7px', color:'var(--gray-400)', marginBottom:12 }}>
          Flight Details
        </p>
        <div className="form-row form-row-3">
          <FormGroup label="Trip Type">
            <select className="form-control" value={form.trip_type} onChange={inp('trip_type')}>
              <option value="one_way">One Way</option>
              <option value="round_trip">Round Trip</option>
              <option value="multi_leg">Multi-Leg</option>
            </select>
          </FormGroup>
          <FormGroup label="Priority">
            <select className="form-control" value={form.priority} onChange={inp('priority')}>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="vip">VIP</option>
            </select>
          </FormGroup>
          <FormGroup label="Passengers" required>
            <input className="form-control" type="number" min="1" max="200"
              value={form.passenger_count} onChange={inp('passenger_count')} />
          </FormGroup>
        </div>
        <div className="form-row form-row-2">
          <FormGroup label="Origin Airport" required error={errors.origin?.[0]}>
            <select className="form-control" value={form.origin} onChange={inp('origin')}>
              <option value="">Select airport…</option>
              {airports.map(a => <option key={a.id} value={a.id}>{a.code} — {a.city}, {a.country}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Destination Airport" required error={errors.destination?.[0]}>
            <select className="form-control" value={form.destination} onChange={inp('destination')}>
              <option value="">Select airport…</option>
              {airports.map(a => <option key={a.id} value={a.id}>{a.code} — {a.city}, {a.country}</option>)}
            </select>
          </FormGroup>
        </div>
        <div className="form-row form-row-2">
          <FormGroup label="Departure Date" required>
            <input className="form-control" type="date" value={form.departure_date} onChange={inp('departure_date')} />
          </FormGroup>
          <FormGroup label="Departure Time">
            <input className="form-control" type="time" value={form.departure_time} onChange={inp('departure_time')} />
          </FormGroup>
        </div>
        {form.trip_type === 'round_trip' && (
          <FormGroup label="Return Date">
            <input className="form-control" type="date" value={form.return_date} onChange={inp('return_date')} />
          </FormGroup>
        )}
        <FormGroup label="Preferred Aircraft">
          <select className="form-control" value={form.aircraft} onChange={inp('aircraft')}>
            <option value="">Any / TBD</option>
            {aircraft.map(a => <option key={a.id} value={a.id}>{a.registration} — {a.name} ({a.category_display})</option>)}
          </select>
        </FormGroup>

        <hr style={{ border:'none', borderTop:'1px solid var(--gray-100)', margin:'8px 0 16px' }} />
        <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.7px', color:'var(--gray-400)', marginBottom:12 }}>
          Extras
        </p>
        <div style={{ display:'flex', gap:20, flexWrap:'wrap', marginBottom:16 }}>
          {[
            { k:'catering_requested', label:'Catering', icon:'bi-cup-hot' },
            { k:'ground_transport_requested', label:'Ground Transport', icon:'bi-car-front' },
            { k:'concierge_requested', label:'Concierge', icon:'bi-person-check' },
          ].map(({ k, label, icon }) => (
            <label key={k} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, fontWeight:500 }}>
              <input type="checkbox" checked={form[k]} onChange={chk(k)}
                style={{ width:15, height:15, accentColor:'var(--brand)' }} />
              <i className={`bi ${icon}`} style={{ color:'var(--gray-500)' }} />
              {label}
            </label>
          ))}
        </div>
        <FormGroup label="Special Requests">
          <textarea className="form-control" rows={3}
            value={form.special_requests} onChange={inp('special_requests')}
            placeholder="Any dietary requirements, accessibility needs, etc." />
        </FormGroup>
      </div>
    </Modal>
  );
}