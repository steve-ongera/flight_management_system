import { useState, useEffect, useCallback } from 'react';
import { userAPI } from '../services/api.js';
import { SearchInput, Modal, FormGroup, PageLoader, EmptyState, SectionHeader, showToast, ToastContainer, StatusBadge } from '../components/common/index.jsx';

export default function UsersPage() {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    userAPI.list({ search })
      .then(r => setUsers(r.data.results || r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (id) => {
    try { await userAPI.toggleActive(id); load(); showToast('User status updated'); }
    catch { showToast('Error', 'danger'); }
  };

  const ROLE_COLOR = { admin:'var(--danger)', ops:'var(--primary)', pilot:'var(--accent)', client:'var(--gray-600)' };

  return (
    <div className="page-container">
      <ToastContainer />
      <SectionHeader title="User Management" subtitle={`${users.length} users`}
        actions={<button className="btn btn-brand" onClick={() => setShowAdd(true)}><i className="bi bi-plus-lg" /> Add User</button>} />
      <div className="filters-row">
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, email…" />
      </div>
      {loading ? <PageLoader /> : users.length === 0 ? <EmptyState icon="bi-people" title="No users found" /> : (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>User</th><th>Role</th><th>Company</th><th>Phone</th><th>Joined</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:34,height:34,borderRadius:'50%',background:'var(--brand)',color:'var(--gold)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:13,flexShrink:0 }}>
                        {(u.full_name || u.username)?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight:600,fontSize:13 }}>{u.full_name || u.username}</div>
                        <div style={{ fontSize:11,color:'var(--gray-500)' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ padding:'2px 10px', borderRadius:'var(--r-full)', fontSize:11, fontWeight:700, background:`${ROLE_COLOR[u.role]}22`, color:ROLE_COLOR[u.role] }}>
                      {u.role_display || u.role}
                    </span>
                  </td>
                  <td style={{ fontSize:13 }}>{u.company || '—'}</td>
                  <td style={{ fontSize:13 }}>{u.phone || '—'}</td>
                  <td style={{ fontSize:12,color:'var(--gray-500)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <span style={{ fontSize:11,fontWeight:700, color: u.is_active ? 'var(--accent)' : 'var(--danger)' }}>
                      <i className={`bi ${u.is_active ? 'bi-check-circle' : 'bi-x-circle'}`} style={{ marginRight:4 }} />
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-success'}`}
                      onClick={() => toggle(u.id)}>
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <AddUserModal open={showAdd} onClose={() => setShowAdd(false)}
        onCreated={() => { setShowAdd(false); load(); showToast('User created'); }} />
    </div>
  );
}

function AddUserModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ username:'',email:'',first_name:'',last_name:'',phone:'',company:'',role:'client',password:'',password2:'' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const inp = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const submit = async () => {
    if (form.password !== form.password2) { setErrors({ password2:['Passwords do not match.'] }); return; }
    setSaving(true); setErrors({});
    try { await userAPI.create(form); onCreated(); }
    catch (e) { setErrors(e.response?.data || {}); }
    finally { setSaving(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Add User" size="modal-lg"
      footer={<><button className="btn btn-outline" onClick={onClose}>Cancel</button><button className="btn btn-brand" onClick={submit} disabled={saving}>{saving?'Saving…':'Create User'}</button></>}
    >
      <div className="form-row form-row-2">
        <FormGroup label="First Name"><input className="form-control" value={form.first_name} onChange={inp('first_name')} /></FormGroup>
        <FormGroup label="Last Name"><input className="form-control" value={form.last_name} onChange={inp('last_name')} /></FormGroup>
      </div>
      <div className="form-row form-row-2">
        <FormGroup label="Username" required error={errors.username?.[0]}><input className="form-control" value={form.username} onChange={inp('username')} /></FormGroup>
        <FormGroup label="Email" required><input className="form-control" type="email" value={form.email} onChange={inp('email')} /></FormGroup>
      </div>
      <div className="form-row form-row-2">
        <FormGroup label="Phone"><input className="form-control" value={form.phone} onChange={inp('phone')} /></FormGroup>
        <FormGroup label="Role">
          <select className="form-control" value={form.role} onChange={inp('role')}>
            {['admin','ops','pilot','client'].map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
          </select>
        </FormGroup>
      </div>
      <FormGroup label="Company"><input className="form-control" value={form.company} onChange={inp('company')} /></FormGroup>
      <div className="form-row form-row-2">
        <FormGroup label="Password" required><input className="form-control" type="password" value={form.password} onChange={inp('password')} /></FormGroup>
        <FormGroup label="Confirm Password" required error={errors.password2?.[0]}><input className="form-control" type="password" value={form.password2} onChange={inp('password2')} /></FormGroup>
      </div>
    </Modal>
  );
}