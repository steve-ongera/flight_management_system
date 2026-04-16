/**
 * DashboardPage.jsx — KPIs + revenue chart + recent bookings
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { dashboardAPI } from '../services/api.js';
import { StatCard, PageLoader, StatusBadge, PriorityBadge, ToastContainer } from '../components/common/index.jsx';

const STATUS_COLORS = {
  inquiry:   '#9ca3af',
  quoted:    '#0ea5e9',
  confirmed: '#10b981',
  in_flight: '#1a56db',
  completed: '#059669',
  cancelled: '#ef4444',
};

const fmt = (n) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n?.toFixed(0) || 0}`;

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background:'var(--white)', border:'1px solid var(--gray-200)',
      borderRadius:'var(--r-md)', padding:'12px 16px', boxShadow:'var(--shadow-md)'
    }}>
      <p style={{ fontWeight:700, marginBottom:6, color:'var(--gray-700)', fontSize:13 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ fontSize:12, color: p.color, margin:'2px 0' }}>
          {p.name}: <strong>${Number(p.value).toLocaleString()}</strong>
        </p>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate              = useNavigate();

  useEffect(() => {
    dashboardAPI.get(12)
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;
  if (!data)   return <div className="page-container"><p>Failed to load dashboard.</p></div>;

  const { stats, revenue_chart, status_distribution, recent_bookings, maintenance_alerts } = data;

  const pieData = Object.entries(status_distribution || {})
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: k, value: v, color: STATUS_COLORS[k] || '#9ca3af' }));

  return (
    <div className="page-container">
      <ToastContainer />

      {/* Header */}
      <div className="page-header" style={{ marginBottom:24 }}>
        <div>
          <h1>Operations Dashboard</h1>
          <p>Live overview — Paramount Charters</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-brand" onClick={() => navigate('/bookings')}>
            <i className="bi bi-plus-lg" /> New Booking
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="stat-grid">
        <StatCard icon="bi-calendar2-check" label="Total Bookings"    value={stats.total_bookings}     color="blue" />
        <StatCard icon="bi-hourglass-split" label="Pending Inquiries" value={stats.pending_inquiries}  color="amber" />
        <StatCard icon="bi-airplane"        label="In Flight"         value={stats.in_flight}          color="brand" />
        <StatCard icon="bi-check2-circle"   label="Completed"         value={stats.completed}          color="green" />
        <StatCard
          icon="bi-currency-dollar"
          label="Total Revenue"
          value={`$${Number(stats.total_revenue).toLocaleString()}`}
          color="gold"
          sub={`$${Number(stats.monthly_revenue).toLocaleString()} this month`}
        />
        <StatCard icon="bi-graph-up-arrow"  label="Commission Earned"
          value={`$${Number(stats.total_commission).toLocaleString()}`} color="green" />
        <StatCard icon="bi-airplane-engines" label="Fleet Size"
          value={stats.total_aircraft}
          sub={`${stats.available_aircraft} available`} color="blue" />
        <StatCard icon="bi-person-badge"    label="Crew"
          value={stats.total_crew}
          sub={`${stats.crew_available} available`} color="brand" />
      </div>

      {/* Charts Row */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:20, marginBottom:20 }}>
        {/* Revenue Chart */}
        <div className="card">
          <div className="card-header">
            <h2><i className="bi bi-graph-up" style={{ marginRight:8, color:'var(--primary)' }} />Revenue — Last 12 Months</h2>
          </div>
          <div className="card-body" style={{ paddingBottom:12 }}>
            {revenue_chart?.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={revenue_chart} margin={{ top:5, right:10, left:10, bottom:0 }}>
                  <defs>
                    <linearGradient id="colGross" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1a56db" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#1a56db" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colComm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e8a020" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#e8a020" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
                  <XAxis dataKey="label" tick={{ fontSize:11, fill:'var(--gray-500)' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmt} tick={{ fontSize:11, fill:'var(--gray-500)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="gross"      name="Gross Revenue" stroke="#1a56db" strokeWidth={2} fill="url(#colGross)" />
                  <Area type="monotone" dataKey="commission" name="Commission"    stroke="#e8a020" strokeWidth={2} fill="url(#colComm)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:240,color:'var(--gray-400)',fontSize:13 }}>
                No revenue data yet
              </div>
            )}
          </div>
        </div>

        {/* Status Pie */}
        <div className="card">
          <div className="card-header">
            <h2><i className="bi bi-pie-chart" style={{ marginRight:8, color:'var(--accent)' }} />Booking Status</h2>
          </div>
          <div className="card-body">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="45%" innerRadius={55} outerRadius={85}
                    paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n.charAt(0).toUpperCase() + n.slice(1)]} />
                  <Legend iconType="circle" iconSize={9}
                    formatter={(v) => <span style={{ fontSize:11, color:'var(--gray-600)' }}>
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:240,color:'var(--gray-400)',fontSize:13 }}>
                No bookings yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:20 }}>

        {/* Recent Bookings */}
        <div className="card">
          <div className="card-header">
            <h2><i className="bi bi-clock-history" style={{ marginRight:8, color:'var(--primary)' }} />Recent Bookings</h2>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/bookings')}>
              View All <i className="bi bi-arrow-right" />
            </button>
          </div>
          <div className="table-wrapper" style={{ border:'none', borderRadius:0 }}>
            <table>
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Client</th>
                  <th>Route</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {recent_bookings?.length > 0 ? recent_bookings.map(b => (
                  <tr key={b.id} style={{ cursor:'pointer' }}
                    onClick={() => navigate(`/bookings/${b.id}`)}>
                    <td>
                      <span className="text-mono" style={{ fontSize:11, color:'var(--gray-500)' }}>
                        {String(b.reference).slice(0,8)}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight:600, fontSize:13 }}>{b.guest_name}</div>
                      <div style={{ fontSize:11, color:'var(--gray-500)' }}>{b.guest_email}</div>
                    </td>
                    <td>
                      <span style={{ fontFamily:'var(--font-mono)', fontWeight:600, fontSize:13 }}>
                        {b.origin_detail?.code} → {b.destination_detail?.code}
                      </span>
                    </td>
                    <td style={{ fontSize:12, color:'var(--gray-600)' }}>
                      {b.departure_date}
                    </td>
                    <td><StatusBadge value={b.status} /></td>
                    <td style={{ fontWeight:600, fontSize:13 }}>
                      {b.quoted_price_usd ? `$${Number(b.quoted_price_usd).toLocaleString()}` : '—'}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} style={{ textAlign:'center', padding:32, color:'var(--gray-400)' }}>
                    No bookings yet
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Maintenance Alerts */}
        <div className="card">
          <div className="card-header">
            <h2><i className="bi bi-tools" style={{ marginRight:8, color:'var(--warning)' }} />Maintenance Alerts</h2>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/maintenance')}>
              View All
            </button>
          </div>
          <div className="card-body" style={{ padding:0 }}>
            {maintenance_alerts?.length > 0 ? maintenance_alerts.map(m => (
              <div key={m.id} style={{
                padding:'14px 20px',
                borderBottom:'1px solid var(--gray-100)',
                display:'flex', alignItems:'flex-start', gap:12
              }}>
                <div style={{
                  width:36, height:36, borderRadius:'var(--r-md)',
                  background:'var(--warning-light)', display:'flex',
                  alignItems:'center', justifyContent:'center',
                  color:'var(--warning)', fontSize:16, flexShrink:0
                }}>
                  <i className="bi bi-wrench" />
                </div>
                <div>
                  <div style={{ fontWeight:600, fontSize:13 }}>{m.aircraft_name}</div>
                  <div style={{ fontSize:12, color:'var(--gray-500)', marginTop:2 }}>
                    {m.type_display} · {m.scheduled_date}
                  </div>
                  {m.technician && (
                    <div style={{ fontSize:11, color:'var(--gray-400)', marginTop:2 }}>
                      Tech: {m.technician}
                    </div>
                  )}
                </div>
                <StatusBadge value={m.status} />
              </div>
            )) : (
              <div style={{ padding:32, textAlign:'center', color:'var(--gray-400)', fontSize:13 }}>
                <i className="bi bi-check-circle" style={{ fontSize:28, display:'block', marginBottom:8, color:'var(--accent)' }} />
                No upcoming maintenance
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}