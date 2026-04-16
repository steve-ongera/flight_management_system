/**
 * SettingsPage.jsx
 */
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { authAPI, commissionAPI } from '../services/api.js';
import { FormGroup, showToast, ToastContainer, SectionHeader } from '../components/common/index.jsx';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState({ first_name:'',last_name:'',phone:'',company:'' });
  const [commission, setCommission] = useState({ rate_pct:'', notes:'' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingComm, setSavingComm]       = useState(false);

  useEffect(() => {
    if (user) setProfile({ first_name:user.first_name||'', last_name:user.last_name||'', phone:user.phone||'', company:user.company||'' });
    commissionAPI.list().then(r => {
      const latest = (r.data.results || r.data)[0];
      if (latest) setCommission({ rate_pct: latest.rate_pct, notes: latest.notes || '' });
    }).catch(()=>{});
  }, [user]);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const { data } = await authAPI.updateProfile(profile);
      updateUser(data); showToast('Profile updated');
    } catch { showToast('Error saving profile', 'danger'); }
    finally { setSavingProfile(false); }
  };

  const saveCommission = async () => {
    setSavingComm(true);
    try {
      await commissionAPI.create(commission);
      showToast('Commission rate updated');
    } catch { showToast('Error', 'danger'); }
    finally { setSavingComm(false); }
  };

  return (
    <div className="page-container">
      <ToastContainer />
      <SectionHeader title="Settings" subtitle="Manage your profile and system settings" />

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        {/* Profile */}
        <div className="card">
          <div className="card-header"><h2><i className="bi bi-person-circle" style={{ marginRight:8 }} />My Profile</h2></div>
          <div className="card-body">
            <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:20, padding:'14px 18px', background:'var(--brand)', borderRadius:'var(--r-md)' }}>
              <div style={{ width:52,height:52,borderRadius:'50%',background:'var(--gold)',color:'var(--brand)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:20 }}>
                {user?.first_name?.[0] || user?.username?.[0] || '?'}
              </div>
              <div>
                <div style={{ fontWeight:700, color:'#fff', fontSize:15 }}>{user?.get_full_name || `${user?.first_name} ${user?.last_name}`.trim() || user?.username}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.6)' }}>{user?.email}</div>
                <div style={{ fontSize:11, background:'rgba(232,160,32,0.2)', color:'var(--gold)', padding:'2px 8px', borderRadius:'var(--r-full)', display:'inline-block', marginTop:4, fontWeight:700 }}>
                  {user?.role_display || user?.role}
                </div>
              </div>
            </div>
            <div className="form-row form-row-2">
              <FormGroup label="First Name"><input className="form-control" value={profile.first_name} onChange={e => setProfile(p=>({...p,first_name:e.target.value}))} /></FormGroup>
              <FormGroup label="Last Name"><input className="form-control" value={profile.last_name} onChange={e => setProfile(p=>({...p,last_name:e.target.value}))} /></FormGroup>
            </div>
            <FormGroup label="Phone"><input className="form-control" value={profile.phone} onChange={e => setProfile(p=>({...p,phone:e.target.value}))} /></FormGroup>
            <FormGroup label="Company"><input className="form-control" value={profile.company} onChange={e => setProfile(p=>({...p,company:e.target.value}))} /></FormGroup>
            <button className="btn btn-brand btn-block" onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? 'Saving…' : <><i className="bi bi-check2" /> Save Profile</>}
            </button>
          </div>
        </div>

        {/* Commission */}
        {user?.role === 'admin' && (
          <div className="card">
            <div className="card-header"><h2><i className="bi bi-percent" style={{ marginRight:8 }} />Platform Commission</h2></div>
            <div className="card-body">
              <div className="alert alert-info mb-4">
                <i className="bi bi-info-circle" />
                Changes apply to all new bookings. Existing bookings retain their rate.
              </div>
              <FormGroup label="Commission Rate (%)" hint="Applied to all new charter bookings">
                <input className="form-control" type="number" step="0.01" min="0" max="50"
                  value={commission.rate_pct}
                  onChange={e => setCommission(c=>({...c,rate_pct:e.target.value}))} />
              </FormGroup>
              <FormGroup label="Notes">
                <textarea className="form-control" rows={3} value={commission.notes}
                  onChange={e => setCommission(c=>({...c,notes:e.target.value}))} />
              </FormGroup>
              <button className="btn btn-brand btn-block" onClick={saveCommission} disabled={savingComm}>
                {savingComm ? 'Saving…' : <><i className="bi bi-check2" /> Update Commission Rate</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}