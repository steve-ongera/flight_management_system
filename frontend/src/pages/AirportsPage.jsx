import { useState, useEffect, useCallback } from 'react';
import { airportAPI } from '../services/api.js';
import { SearchInput, Modal, FormGroup, PageLoader, EmptyState, SectionHeader, showToast, ToastContainer } from '../components/common/index.jsx';

export default function AirportsPage() {
  const [airports, setAirports] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [showAdd, setShowAdd]   = useState(false);
  const [editing, setEditing]   = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    airportAPI.list(search)
      .then(r => setAirports(r.data.results || r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const del = async (id) => {
    if (!confirm('Delete this airport?')) return;
    try { await airportAPI.delete(id); load(); showToast('Deleted'); }
    catch { showToast('Failed to delete', 'danger'); }
  };

  return (
    <div className="page-container">
      <ToastContainer />
      <SectionHeader title="Airports" subtitle={`${airports.length} airports in database`}
        actions={<button className="btn btn-brand" onClick={() => setShowAdd(true)}><i className="bi bi-plus-lg" /> Add Airport</button>} />
      <div className="filters-row">
        <SearchInput value={search} onChange={setSearch} placeholder="Search code, city, country…" />
      </div>
      {loading ? <PageLoader /> : airports.length === 0 ? (
        <EmptyState icon="bi-geo-alt" title="No airports found" />
      ) : (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>ICAO/IATA</th><th>Airport Name</th><th>City</th><th>Country</th><th>Coordinates</th><th>Actions</th></tr></thead>
            <tbody>
              {airports.map(a => (
                <tr key={a.id}>
                  <td><span className="text-mono" style={{ fontWeight:700, fontSize:14, color:'var(--brand)' }}>{a.code}</span></td>
                  <td style={{ fontWeight:500 }}>{a.name}</td>
                  <td>{a.city}</td>
                  <td>{a.country}</td>
                  <td style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--gray-500)' }}>
                    {a.latitude && a.longitude ? `${a.latitude}, ${a.longitude}` : '—'}
                  </td>
                  <td style={{ display:'flex', gap:6 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setEditing(a)}><i className="bi bi-pencil" /></button>
                    <button className="btn btn-danger btn-sm" onClick={() => del(a.id)}><i className="bi bi-trash" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <AirportModal open={showAdd || !!editing} airport={editing}
        onClose={() => { setShowAdd(false); setEditing(null); }}
        onSaved={() => { setShowAdd(false); setEditing(null); load(); showToast(editing ? 'Updated' : 'Added'); }} />
    </div>
  );
}

function AirportModal({ open, onClose, airport, onSaved }) {
  const [form, setForm] = useState({ code:'', name:'', city:'', country:'', latitude:'', longitude:'' });
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (airport) setForm(airport); else setForm({ code:'', name:'', city:'', country:'', latitude:'', longitude:'' }); }, [airport]);
  const inp = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const submit = async () => {
    setSaving(true);
    try {
      if (airport) await airportAPI.update(airport.id, form);
      else await airportAPI.create(form);
      onSaved();
    } catch (e) { showToast(JSON.stringify(e.response?.data), 'danger'); }
    finally { setSaving(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title={airport ? 'Edit Airport' : 'Add Airport'}
      footer={<><button className="btn btn-outline" onClick={onClose}>Cancel</button><button className="btn btn-brand" onClick={submit} disabled={saving}>{saving?'Saving…':'Save'}</button></>}
    >
      <div className="form-row form-row-2">
        <FormGroup label="IATA/ICAO Code" required><input className="form-control" value={form.code} onChange={inp('code')} placeholder="NBO" style={{ textTransform:'uppercase' }} /></FormGroup>
        <FormGroup label="Airport Name" required><input className="form-control" value={form.name} onChange={inp('name')} placeholder="Jomo Kenyatta International" /></FormGroup>
      </div>
      <div className="form-row form-row-2">
        <FormGroup label="City" required><input className="form-control" value={form.city} onChange={inp('city')} /></FormGroup>
        <FormGroup label="Country" required><input className="form-control" value={form.country} onChange={inp('country')} /></FormGroup>
      </div>
      <div className="form-row form-row-2">
        <FormGroup label="Latitude"><input className="form-control" type="number" step="0.000001" value={form.latitude} onChange={inp('latitude')} /></FormGroup>
        <FormGroup label="Longitude"><input className="form-control" type="number" step="0.000001" value={form.longitude} onChange={inp('longitude')} /></FormGroup>
      </div>
    </Modal>
  );
}