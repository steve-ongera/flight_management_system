/**
 * MaintenancePage.jsx
 */
import { useState, useEffect, useCallback } from 'react';
import { maintenanceAPI, aircraftAPI } from '../services/api.js';
import {
  StatusBadge, SearchInput, Modal, FormGroup,
  PageLoader, EmptyState, SectionHeader, showToast, ToastContainer
} from '../components/common/index.jsx';

export default function MaintenancePage() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [aircraft, setAircraft] = useState([]);

  const load = useCallback(() => {
    setLoading(true);
    const params = { search };
    if (filter) params.status = filter;
    maintenanceAPI.list(params)
      .then(r => setLogs(r.data.results || r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, filter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { aircraftAPI.list().then(r => setAircraft(r.data.results || r.data)); }, []);

  const updateStatus = async (id, status) => {
    try {
      await maintenanceAPI.update(id, { status });
      showToast('Status updated'); load();
    } catch { showToast('Error', 'danger'); }
  };

  return (
    <div className="page-container">
      <ToastContainer />
      <SectionHeader title="Maintenance" subtitle="Aircraft maintenance schedule and logs"
        actions={<button className="btn btn-brand" onClick={() => setShowAdd(true)}><i className="bi bi-plus-lg" /> Log Maintenance</button>} />
      <div className="filters-row">
        <SearchInput value={search} onChange={setSearch} placeholder="Search aircraft…" />
        <select className="filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">Status: All</option>
          {['scheduled','in_progress','completed','cancelled'].map(s => <option key={s} value={s}>{s.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
        </select>
      </div>
      {loading ? <PageLoader /> : logs.length === 0 ? (
        <EmptyState icon="bi-tools" title="No maintenance records" />
      ) : (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Aircraft</th><th>Type</th><th>Scheduled</th><th>Technician</th><th>Cost</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {logs.map(m => (
                <tr key={m.id}>
                  <td>
                    <div style={{ fontWeight:600 }}>{m.aircraft_name}</div>
                    <div style={{ fontSize:11, color:'var(--gray-500)' }}>{m.aircraft_reg}</div>
                  </td>
                  <td><span className="badge badge-info">{m.type_display}</span></td>
                  <td style={{ fontSize:13 }}>{m.scheduled_date}</td>
                  <td style={{ fontSize:13 }}>{m.technician || '—'}</td>
                  <td style={{ fontWeight:600, fontSize:13 }}>{m.cost_usd ? `$${Number(m.cost_usd).toLocaleString()}` : '—'}</td>
                  <td><StatusBadge value={m.status} /></td>
                  <td>
                    <select className="filter-select" style={{ padding:'4px 8px', fontSize:11 }}
                      value={m.status}
                      onChange={e => updateStatus(m.id, e.target.value)}>
                      {['scheduled','in_progress','completed','cancelled'].map(s => <option key={s} value={s}>{s.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <AddMaintenanceModal open={showAdd} onClose={() => setShowAdd(false)} aircraft={aircraft}
        onCreated={() => { setShowAdd(false); load(); showToast('Maintenance logged'); }} />
    </div>
  );
}

function AddMaintenanceModal({ open, onClose, aircraft, onCreated }) {
  const [form, setForm] = useState({ aircraft:'', maintenance_type:'routine', scheduled_date:'', flight_hours_at:0, description:'', technician:'', facility:'', cost_usd:'' });
  const [saving, setSaving] = useState(false);
  const inp = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const submit = async () => {
    setSaving(true);
    try { await maintenanceAPI.create(form); onCreated(); }
    catch (e) { showToast(JSON.stringify(e.response?.data), 'danger'); }
    finally { setSaving(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Log Maintenance"
      footer={<><button className="btn btn-outline" onClick={onClose}>Cancel</button><button className="btn btn-brand" onClick={submit} disabled={saving}>{saving?'Saving…':'Save'}</button></>}
    >
      <FormGroup label="Aircraft" required>
        <select className="form-control" value={form.aircraft} onChange={inp('aircraft')}>
          <option value="">Select…</option>
          {aircraft.map(a => <option key={a.id} value={a.id}>{a.registration} — {a.name}</option>)}
        </select>
      </FormGroup>
      <div className="form-row form-row-2">
        <FormGroup label="Type">
          <select className="form-control" value={form.maintenance_type} onChange={inp('maintenance_type')}>
            {['routine','repair','inspection','upgrade','aog'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
          </select>
        </FormGroup>
        <FormGroup label="Scheduled Date" required>
          <input className="form-control" type="date" value={form.scheduled_date} onChange={inp('scheduled_date')} />
        </FormGroup>
      </div>
      <FormGroup label="Description" required>
        <textarea className="form-control" rows={3} value={form.description} onChange={inp('description')} />
      </FormGroup>
      <div className="form-row form-row-3">
        <FormGroup label="Technician"><input className="form-control" value={form.technician} onChange={inp('technician')} /></FormGroup>
        <FormGroup label="Flight Hours At"><input className="form-control" type="number" value={form.flight_hours_at} onChange={inp('flight_hours_at')} /></FormGroup>
        <FormGroup label="Cost (USD)"><input className="form-control" type="number" value={form.cost_usd} onChange={inp('cost_usd')} /></FormGroup>
      </div>
    </Modal>
  );
}