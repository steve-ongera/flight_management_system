/**
 * BookingDetail.jsx — Full booking management page
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bookingAPI, crewAPI } from '../services/api.js';
import {
  StatusBadge, PriorityBadge, Modal, FormGroup,
  PageLoader, showToast, ToastContainer, ConfirmDialog
} from '../components/common/index.jsx';

const STATUS_FLOW = ['inquiry','quoted','confirmed','in_flight','completed','cancelled'];

export default function BookingDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [crew, setCrew]       = useState([]);

  // Modals
  const [priceOpen, setPriceOpen]   = useState(false);
  const [replyOpen, setReplyOpen]   = useState(false);
  const [crewOpen, setCrewOpen]     = useState(false);
  const [delOpen, setDelOpen]       = useState(false);

  const load = () => {
    setLoading(true);
    bookingAPI.get(id)
      .then(r => setBooking(r.data))
      .catch(() => navigate('/bookings'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    crewAPI.list().then(r => setCrew(r.data.results || r.data));
  }, []);

  if (loading) return <PageLoader />;
  if (!booking) return null;

  const b = booking;

  const quickStatus = async (status) => {
    try {
      await bookingAPI.updateStatus(id, status);
      showToast(`Status updated to ${status}`);
      load();
    } catch { showToast('Failed to update status', 'danger'); }
  };

  const handleDelete = async () => {
    try {
      await bookingAPI.delete(id);
      showToast('Booking deleted');
      navigate('/bookings');
    } catch { showToast('Failed to delete', 'danger'); }
  };

  return (
    <div className="page-container">
      <ToastContainer />

      {/* Header */}
      <div className="page-header">
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/bookings')}>
            <i className="bi bi-arrow-left" />
          </button>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <h1 style={{ fontSize:18 }}>Booking Detail</h1>
              <StatusBadge value={b.status} />
              <PriorityBadge value={b.priority} />
            </div>
            <p style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--gray-500)', marginTop:2 }}>
              REF: {b.reference}
            </p>
          </div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline btn-sm" onClick={() => setCrewOpen(true)}>
            <i className="bi bi-people" /> Assign Crew
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => setReplyOpen(true)}>
            <i className="bi bi-envelope" /> Reply
          </button>
          <button className="btn btn-gold" onClick={() => setPriceOpen(true)}>
            <i className="bi bi-currency-dollar" /> Set Price
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => setDelOpen(true)}>
            <i className="bi bi-trash" />
          </button>
        </div>
      </div>

      {/* Status stepper */}
      <div className="card mb-4">
        <div className="card-body" style={{ paddingTop:16, paddingBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:0 }}>
            {STATUS_FLOW.map((s, i) => {
              const current = STATUS_FLOW.indexOf(b.status);
              const done  = i < current;
              const active = i === current;
              const isCancel = s === 'cancelled';
              return (
                <div key={s} style={{ display:'flex', alignItems:'center', flex: isCancel ? 0 : 1 }}>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                    <button
                      onClick={() => quickStatus(s)}
                      style={{
                        width:32, height:32, borderRadius:'50%',
                        background: active ? 'var(--brand)' : done ? 'var(--accent)' : isCancel && active ? 'var(--danger)' : 'var(--gray-200)',
                        border: active ? '3px solid var(--brand)' : 'none',
                        color: (active || done) ? '#fff' : 'var(--gray-400)',
                        cursor:'pointer', fontSize:14,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        transition:'all 0.2s'
                      }}
                    >
                      {done ? <i className="bi bi-check2" /> : isCancel ? <i className="bi bi-x" /> : i + 1}
                    </button>
                    <span style={{
                      fontSize:10, fontWeight: active ? 700 : 500,
                      color: active ? 'var(--brand)' : done ? 'var(--accent)' : 'var(--gray-400)',
                      textTransform:'capitalize', whiteSpace:'nowrap'
                    }}>
                      {s.replace('_',' ')}
                    </span>
                  </div>
                  {!isCancel && i < STATUS_FLOW.length - 2 && (
                    <div style={{
                      flex:1, height:2, margin:'0 4px', marginBottom:20,
                      background: done ? 'var(--accent)' : 'var(--gray-200)',
                      transition:'background 0.3s'
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

        {/* Client */}
        <div className="card">
          <div className="card-header"><h2><i className="bi bi-person" style={{ marginRight:8 }} />Client Details</h2></div>
          <div className="card-body">
            <div className="detail-grid">
              <Detail label="Name"    value={b.guest_name} />
              <Detail label="Email"   value={<a href={`mailto:${b.guest_email}`}>{b.guest_email}</a>} />
              <Detail label="Phone"   value={b.guest_phone || '—'} />
              <Detail label="Company" value={b.company || '—'} />
            </div>
          </div>
        </div>

        {/* Flight */}
        <div className="card">
          <div className="card-header"><h2><i className="bi bi-airplane" style={{ marginRight:8 }} />Flight Details</h2></div>
          <div className="card-body">
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:24, fontWeight:800, fontFamily:'var(--font-mono)', color:'var(--brand)' }}>
                  {b.origin_detail?.code}
                </div>
                <div style={{ fontSize:11, color:'var(--gray-500)' }}>{b.origin_detail?.city}</div>
              </div>
              <div style={{ flex:1, textAlign:'center' }}>
                <i className="bi bi-airplane-fill" style={{ fontSize:20, color:'var(--gold)' }} />
                <div style={{ height:1, background:'var(--gray-200)', margin:'4px 0' }} />
                <div style={{ fontSize:11, color:'var(--gray-400)' }}>{b.trip_type_display}</div>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:24, fontWeight:800, fontFamily:'var(--font-mono)', color:'var(--brand)' }}>
                  {b.destination_detail?.code}
                </div>
                <div style={{ fontSize:11, color:'var(--gray-500)' }}>{b.destination_detail?.city}</div>
              </div>
            </div>
            <div className="detail-grid">
              <Detail label="Departure" value={`${b.departure_date}${b.departure_time ? ' ' + b.departure_time : ''}`} />
              <Detail label="Return"    value={b.return_date || '—'} />
              <Detail label="Passengers" value={b.passenger_count} />
              <Detail label="Aircraft"  value={b.aircraft_detail?.name || 'TBA'} />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="card">
          <div className="card-header">
            <h2><i className="bi bi-cash-stack" style={{ marginRight:8 }} />Pricing</h2>
            <button className="btn btn-gold btn-sm" onClick={() => setPriceOpen(true)}>
              <i className="bi bi-pencil" /> Edit
            </button>
          </div>
          <div className="card-body">
            {b.quoted_price_usd ? (
              <>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, paddingBottom:16, borderBottom:'1px solid var(--gray-100)' }}>
                  <span style={{ fontSize:13, color:'var(--gray-500)' }}>Quoted Price</span>
                  <span style={{ fontSize:24, fontWeight:800, color:'var(--brand)' }}>
                    ${Number(b.quoted_price_usd).toLocaleString()}
                  </span>
                </div>
                <div className="detail-grid">
                  <Detail label="Commission Rate" value={`${b.commission_pct}%`} />
                  <Detail label="Commission USD" value={b.commission_usd ? `$${Number(b.commission_usd).toLocaleString()}` : '—'} />
                  <Detail label="Net Revenue" value={b.net_revenue_usd ? `$${Number(b.net_revenue_usd).toLocaleString()}` : '—'} />
                  <Detail label="Est. Hours" value={b.estimated_hours ? `${b.estimated_hours}h` : '—'} />
                </div>
              </>
            ) : (
              <div style={{ textAlign:'center', padding:20, color:'var(--gray-400)' }}>
                <i className="bi bi-tag" style={{ fontSize:28, display:'block', marginBottom:8 }} />
                <p style={{ fontSize:13 }}>No price quoted yet</p>
                <button className="btn btn-gold btn-sm" style={{ marginTop:10 }} onClick={() => setPriceOpen(true)}>
                  Set Price
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Crew */}
        <div className="card">
          <div className="card-header">
            <h2><i className="bi bi-people" style={{ marginRight:8 }} />Crew Assignment</h2>
            <button className="btn btn-outline btn-sm" onClick={() => setCrewOpen(true)}>
              <i className="bi bi-pencil" /> Assign
            </button>
          </div>
          <div className="card-body">
            {b.captain_detail || b.fo_detail ? (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {b.captain_detail && <CrewCard label="Captain" crew={b.captain_detail} />}
                {b.fo_detail && <CrewCard label="First Officer" crew={b.fo_detail} />}
              </div>
            ) : (
              <div style={{ textAlign:'center', padding:20, color:'var(--gray-400)' }}>
                <i className="bi bi-person-dash" style={{ fontSize:28, display:'block', marginBottom:8 }} />
                <p style={{ fontSize:13 }}>No crew assigned yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Extras */}
        <div className="card">
          <div className="card-header"><h2><i className="bi bi-stars" style={{ marginRight:8 }} />Extras & Requests</h2></div>
          <div className="card-body">
            <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:16 }}>
              {[
                { k:'catering_requested', label:'Catering', icon:'bi-cup-hot' },
                { k:'ground_transport_requested', label:'Ground Transport', icon:'bi-car-front' },
                { k:'concierge_requested', label:'Concierge', icon:'bi-person-check' },
              ].map(({ k, label, icon }) => (
                <span key={k} style={{
                  display:'flex', alignItems:'center', gap:6,
                  padding:'5px 12px', borderRadius:'var(--r-full)',
                  background: b[k] ? 'var(--accent-light)' : 'var(--gray-100)',
                  color: b[k] ? '#065f46' : 'var(--gray-400)',
                  fontSize:12, fontWeight:600
                }}>
                  <i className={`bi ${icon}`} />
                  {label}
                  {b[k] && <i className="bi bi-check2" />}
                </span>
              ))}
            </div>
            {b.special_requests && (
              <div style={{ background:'var(--gray-50)', borderRadius:'var(--r-md)', padding:'12px 14px' }}>
                <p style={{ fontSize:11, fontWeight:700, color:'var(--gray-500)', textTransform:'uppercase', marginBottom:4 }}>Special Requests</p>
                <p style={{ fontSize:13, color:'var(--gray-700)', lineHeight:1.6 }}>{b.special_requests}</p>
              </div>
            )}
          </div>
        </div>

        {/* Internal Notes */}
        <div className="card">
          <div className="card-header"><h2><i className="bi bi-sticky" style={{ marginRight:8 }} />Internal Notes</h2></div>
          <div className="card-body">
            <InternalNotesEditor bookingId={id} notes={b.internal_notes} onSaved={load} />
          </div>
        </div>

      </div>

      {/* Modals */}
      <SetPriceModal    open={priceOpen}  onClose={() => setPriceOpen(false)}  bookingId={id} booking={b} onDone={load} />
      <ReplyModal       open={replyOpen}  onClose={() => setReplyOpen(false)}  bookingId={id} booking={b} onDone={load} />
      <AssignCrewModal  open={crewOpen}   onClose={() => setCrewOpen(false)}   bookingId={id} booking={b} crew={crew} onDone={load} />
      <ConfirmDialog    open={delOpen}    onClose={() => setDelOpen(false)}    onConfirm={handleDelete}
        title="Delete Booking" message="This will permanently delete this booking. Are you sure?" />
    </div>
  );
}

/* ── Sub components ────────────────────────────────────────────── */
function Detail({ label, value }) {
  return (
    <div>
      <label style={{ fontSize:10.5, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:2 }}>{label}</label>
      <p style={{ fontSize:13, fontWeight:500, color:'var(--gray-800)' }}>{value ?? '—'}</p>
    </div>
  );
}

function CrewCard({ label, crew }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'var(--gray-50)', borderRadius:'var(--r-md)' }}>
      <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--brand)', color:'var(--gold)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:13, flexShrink:0 }}>
        {crew.full_name?.[0] || '?'}
      </div>
      <div>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--gray-500)', textTransform:'uppercase', letterSpacing:'0.5px' }}>{label}</div>
        <div style={{ fontSize:13, fontWeight:600, color:'var(--gray-800)' }}>{crew.full_name}</div>
        <div style={{ fontSize:11, color:'var(--gray-400)' }}>{crew.crew_role_display}</div>
      </div>
    </div>
  );
}

function InternalNotesEditor({ bookingId, notes, onSaved }) {
  const [text, setText] = useState(notes || '');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await bookingAPI.update(bookingId, { internal_notes: text });
      showToast('Notes saved');
      onSaved();
    } catch { showToast('Failed to save', 'danger'); }
    finally { setSaving(false); }
  };
  return (
    <>
      <textarea className="form-control" rows={4} value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Internal ops notes (not visible to client)…" />
      <button className="btn btn-outline btn-sm" style={{ marginTop:8 }} onClick={save} disabled={saving}>
        {saving ? 'Saving…' : <><i className="bi bi-floppy" /> Save Notes</>}
      </button>
    </>
  );
}

/* ── Set Price Modal ───────────────────────────────────────────── */
function SetPriceModal({ open, onClose, bookingId, booking, onDone }) {
  const [form, setForm] = useState({
    quoted_price_usd: booking?.quoted_price_usd || '',
    commission_pct:   booking?.commission_pct || 10,
    status:           booking?.status || '',
    send_email:       true,
    email_message:    '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await bookingAPI.setPrice(bookingId, form);
      showToast('Price set and email sent');
      onClose(); onDone();
    } catch (e) { showToast(e.response?.data?.detail || 'Error', 'danger'); }
    finally { setSaving(false); }
  };

  const gross = Number(form.quoted_price_usd) || 0;
  const comm  = (gross * (Number(form.commission_pct) || 10) / 100).toFixed(2);
  const net   = (gross - comm).toFixed(2);

  return (
    <Modal open={open} onClose={onClose} title="Set Quote Price"
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-gold" onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : <><i className="bi bi-check2" /> Save & Send</>}
          </button>
        </>
      }
    >
      <div className="form-row form-row-2">
        <FormGroup label="Quoted Price (USD)" required>
          <input className="form-control" type="number" step="0.01"
            value={form.quoted_price_usd}
            onChange={e => setForm(f => ({ ...f, quoted_price_usd: e.target.value }))} />
        </FormGroup>
        <FormGroup label="Commission %">
          <input className="form-control" type="number" step="0.01"
            value={form.commission_pct}
            onChange={e => setForm(f => ({ ...f, commission_pct: e.target.value }))} />
        </FormGroup>
      </div>

      {gross > 0 && (
        <div style={{ background:'var(--gray-50)', borderRadius:'var(--r-md)', padding:'12px 16px', marginBottom:16 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
            {[
              { label:'Gross', val:`$${gross.toLocaleString()}` },
              { label:'Commission', val:`$${Number(comm).toLocaleString()}` },
              { label:'Net Revenue', val:`$${Number(net).toLocaleString()}` },
            ].map(x => (
              <div key={x.label} style={{ textAlign:'center' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase' }}>{x.label}</div>
                <div style={{ fontSize:16, fontWeight:800, color:'var(--brand)' }}>{x.val}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <FormGroup label="Update Status">
        <select className="form-control"
          value={form.status}
          onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
          <option value="">Keep current ({booking?.status})</option>
          {['inquiry','quoted','confirmed','in_flight','completed','cancelled'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </FormGroup>

      <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, fontWeight:500, marginBottom:12, cursor:'pointer' }}>
        <input type="checkbox" checked={form.send_email}
          onChange={e => setForm(f => ({ ...f, send_email: e.target.checked }))}
          style={{ accentColor:'var(--brand)' }} />
        Send quote email to client
      </label>

      {form.send_email && (
        <FormGroup label="Email Message (leave blank for default)">
          <textarea className="form-control" rows={4}
            value={form.email_message}
            onChange={e => setForm(f => ({ ...f, email_message: e.target.value }))}
            placeholder="Leave blank to use the default quote template…" />
        </FormGroup>
      )}
    </Modal>
  );
}

/* ── Reply Modal ───────────────────────────────────────────────── */
function ReplyModal({ open, onClose, bookingId, booking, onDone }) {
  const [form, setForm] = useState({
    subject: `Re: Your Charter Enquiry — ${booking?.origin_detail?.code || ''} → ${booking?.destination_detail?.code || ''}`,
    message: '',
    new_status: '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await bookingAPI.reply(bookingId, form);
      showToast('Reply sent');
      onClose(); onDone();
    } catch { showToast('Failed to send', 'danger'); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Reply to ${booking?.guest_name}`}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-brand" onClick={submit} disabled={saving}>
            {saving ? 'Sending…' : <><i className="bi bi-send" /> Send Reply</>}
          </button>
        </>
      }
    >
      <FormGroup label="Subject">
        <input className="form-control" value={form.subject}
          onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
      </FormGroup>
      <FormGroup label="Message" required>
        <textarea className="form-control" rows={6} value={form.message}
          onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
          placeholder="Write your reply…" />
      </FormGroup>
      <FormGroup label="Update Status">
        <select className="form-control" value={form.new_status}
          onChange={e => setForm(f => ({ ...f, new_status: e.target.value }))}>
          <option value="">No change</option>
          {['inquiry','quoted','confirmed','in_flight','completed','cancelled'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </FormGroup>
    </Modal>
  );
}

/* ── Assign Crew Modal ─────────────────────────────────────────── */
function AssignCrewModal({ open, onClose, bookingId, booking, crew, onDone }) {
  const [form, setForm] = useState({
    captain:        booking?.captain || '',
    first_officer:  booking?.first_officer || '',
  });
  const [saving, setSaving] = useState(false);

  const captains = crew.filter(c => c.crew_role === 'captain');
  const fos      = crew.filter(c => c.crew_role === 'first_officer');

  const submit = async () => {
    setSaving(true);
    try {
      await bookingAPI.assignCrew(bookingId, form);
      showToast('Crew assigned');
      onClose(); onDone();
    } catch { showToast('Error assigning crew', 'danger'); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Assign Crew"
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-brand" onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : <><i className="bi bi-check2" /> Assign</>}
          </button>
        </>
      }
    >
      <FormGroup label="Captain">
        <select className="form-control" value={form.captain}
          onChange={e => setForm(f => ({ ...f, captain: e.target.value }))}>
          <option value="">None</option>
          {captains.map(c => <option key={c.id} value={c.id}>{c.full_name} — {c.status_display}</option>)}
        </select>
      </FormGroup>
      <FormGroup label="First Officer">
        <select className="form-control" value={form.first_officer}
          onChange={e => setForm(f => ({ ...f, first_officer: e.target.value }))}>
          <option value="">None</option>
          {fos.map(c => <option key={c.id} value={c.id}>{c.full_name} — {c.status_display}</option>)}
        </select>
      </FormGroup>
    </Modal>
  );
}