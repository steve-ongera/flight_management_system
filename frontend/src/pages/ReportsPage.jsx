/**
 * ReportsPage.jsx
 */
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { dashboardAPI } from '../services/api.js';
import { PageLoader, StatCard } from '../components/common/index.jsx';

export default function ReportsPage() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [months, setMonths]   = useState(12);

  useEffect(() => {
    setLoading(true);
    dashboardAPI.get(months)
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, [months]);

  if (loading) return <PageLoader />;

  const { stats, revenue_chart } = data || {};

  return (
    <div className="page-container">
      <div className="page-header">
        <div><h1>Reports & Analytics</h1><p>Financial performance and operational metrics</p></div>
        <select className="filter-select" value={months} onChange={e => setMonths(Number(e.target.value))}>
          {[3,6,12,24].map(m => <option key={m} value={m}>Last {m} months</option>)}
        </select>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns:'repeat(4,1fr)' }}>
        <StatCard icon="bi-currency-dollar" label="Total Revenue"    value={`$${Number(stats?.total_revenue||0).toLocaleString()}`} color="gold" />
        <StatCard icon="bi-graph-up"        label="Commission"       value={`$${Number(stats?.total_commission||0).toLocaleString()}`} color="green" />
        <StatCard icon="bi-calendar2-check" label="Total Bookings"   value={stats?.total_bookings || 0} color="blue" />
        <StatCard icon="bi-check2-circle"   label="Completed"        value={stats?.completed || 0} color="green" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
        <div className="card">
          <div className="card-header"><h2>Monthly Revenue</h2></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenue_chart} margin={{ top:5,right:10,left:10,bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
                <XAxis dataKey="label" tick={{ fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v=>`$${v>=1000?`${(v/1000).toFixed(0)}k`:v}`} />
                <Tooltip formatter={v=>[`$${Number(v).toLocaleString()}`]} />
                <Legend iconSize={10} />
                <Bar dataKey="gross"      name="Gross"      fill="#1a56db" radius={[4,4,0,0]} />
                <Bar dataKey="commission" name="Commission" fill="#e8a020" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h2>Booking Trend</h2></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={revenue_chart} margin={{ top:5,right:10,left:0,bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
                <XAxis dataKey="label" tick={{ fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:11 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" name="Bookings" stroke="#0f1f3d" strokeWidth={2.5} dot={{ r:4, fill:'#0f1f3d' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Revenue table */}
      <div className="card">
        <div className="card-header"><h2>Monthly Breakdown</h2></div>
        <div className="table-wrapper" style={{ border:'none', borderRadius:0 }}>
          <table>
            <thead><tr><th>Month</th><th>Bookings</th><th>Gross Revenue</th><th>Commission</th><th>Net</th></tr></thead>
            <tbody>
              {revenue_chart?.length > 0 ? revenue_chart.map((r,i) => (
                <tr key={i}>
                  <td style={{ fontWeight:600 }}>{r.label}</td>
                  <td>{r.count}</td>
                  <td style={{ fontWeight:600 }}>${Number(r.gross).toLocaleString()}</td>
                  <td style={{ color:'var(--gold-dark)' }}>${Number(r.commission).toLocaleString()}</td>
                  <td style={{ color:'var(--accent)', fontWeight:600 }}>${Number(r.net).toLocaleString()}</td>
                </tr>
              )) : (
                <tr><td colSpan={5} style={{ textAlign:'center', padding:32, color:'var(--gray-400)' }}>No data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}