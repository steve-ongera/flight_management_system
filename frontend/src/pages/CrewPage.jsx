/**
 * CrewPage.jsx
 */
import { useState, useEffect, useCallback } from 'react';
import { crewAPI, userAPI } from '../services/api.js';
import {
  StatusBadge, SearchInput, Modal, FormGroup,
  PageLoader, EmptyState, SectionHeader,
  showToast, ToastContainer
} from '../components/common/index.jsx';

export default function CrewPage() {
  const [crew, setCrew]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [roleFilter, setRole] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [users, setUsers]     = useState([]);

  const load = useCallback(() => {
    setLoading(true);
    const params = { search };
    if (roleFilter) params.crew_role = roleFilter;
    crewAPI.list(params)
      .then(r => setCrew(r.data.results || r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, roleFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    userAPI.list({ role: 'pilot' }).then(r => setUsers(r.data.results || r.data)).catch(() => {});
  }, []);

  const ROLES = ['captain','first_officer','cabin_crew','engineer'];

  return (
    <div className="page-container">
      <ToastContainer />
      <SectionHeader
        title="Crew Management"
        subtitle={`${crew.length} crew members`}
        actions={
          <button className="btn btn-brand" onClick={() => setShowAdd(true)}>
            <i className="bi bi-plus-lg" /> Add Crew
          </button>
        }
      />
      <div className="filters-row">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name…" />
        <select className="filter-select" value={roleFilter} onChange={e => setRole(e.target.value)}>
          <option value="">Role: All</option>
          {ROLES.map(r => <option key={r} value={r}>{r.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
        </select>
      </div>
      {loading ? <PageLoader /> : crew.length === 0 ? (
        <EmptyState icon="bi-people" title="No crew members" message="Add crew to assign them to flights." />
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Role</th><th>License</th><th>License Expiry</th>
                <th>Medical Expiry</th><th>Total Hours</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {crew.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:34,height:34,borderRadius:'50%',background:'var(--brand)',color:'var(--gold)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:13,flexShrink:0 }}>
                        {c.full_name?.[0] || '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight:600, fontSize:13 }}>{c.full_name}</div>
                        <div style={{ fontSize:11, color:'var(--gray-500)' }}>{c.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="badge badge-info">{c.crew_role_display}</span></td>
                  <td style={{ fontFamily:'var(--font-mono)', fontSize:12 }}>{c.license_number || '—'}</td>
                  <td style={{ fontSize:12 }}>
                    {c.license_expiry ? (
                      <span style={{ color: new Date(c.license_expiry) < new Date() ? 'var(--danger)' : 'var(--accent)' }}>
                        {c.license_expiry}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ fontSize:12 }}>
                    {c.medical_expiry ? (
                      <span style={{ color: new Date(c.medical_expiry) < new Date() ? 'var(--danger)' : 'var(--accent)' }}>
                        {c.medical_expiry}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ fontFamily:'var(--font-mono)', fontSize:13, fontWeight:600 }}>{c.total_hours}h</td>
                  <td><StatusBadge value={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <AddCrewModal open={showAdd} onClose={() => setShowAdd(false)} users={users}
        onCreated={() => { setShowAdd(false); load(); showToast('Crew member added'); }} />
    </div>
  );
}

function AddCrewModal({ open, onClose, users, onCreated }) {
  const [form, setForm] = useState({ user:'', crew_role:'captain', license_number:'', license_expiry:'', medical_expiry:'', total_hours:0 });
  const [saving, setSaving] = useState(false);
  const inp = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const submit = async () => {
    setSaving(true);
    try { await crewAPI.create(form); onCreated(); }
    catch (e) { showToast(JSON.stringify(e.response?.data), 'danger'); }
    finally { setSaving(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Add Crew Member"
      footer={<><button className="btn btn-outline" onClick={onClose}>Cancel</button><button className="btn btn-brand" onClick={submit} disabled={saving}>{saving?'Saving…':'Add Crew'}</button></>}
    >
      <FormGroup label="User (Pilot role)" required>
        <select className="form-control" value={form.user} onChange={inp('user')}>
          <option value="">Select user…</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.username} — {u.email}</option>)}
        </select>
      </FormGroup>
      <FormGroup label="Crew Role">
        <select className="form-control" value={form.crew_role} onChange={inp('crew_role')}>
          {['captain','first_officer','cabin_crew','engineer'].map(r => <option key={r} value={r}>{r.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
        </select>
      </FormGroup>
      <div className="form-row form-row-2">
        <FormGroup label="License Number"><input className="form-control" value={form.license_number} onChange={inp('license_number')} /></FormGroup>
        <FormGroup label="Total Hours"><input className="form-control" type="number" value={form.total_hours} onChange={inp('total_hours')} /></FormGroup>
      </div>
      <div className="form-row form-row-2">
        <FormGroup label="License Expiry"><input className="form-control" type="date" value={form.license_expiry} onChange={inp('license_expiry')} /></FormGroup>
        <FormGroup label="Medical Expiry"><input className="form-control" type="date" value={form.medical_expiry} onChange={inp('medical_expiry')} /></FormGroup>
      </div>
    </Modal>
  );
}