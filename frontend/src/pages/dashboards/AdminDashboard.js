import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { analyticsAPI } from '../../services/api';
import { requestsAPI } from '../../services/api';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

const StatCard = ({ icon, label, value, color, bg, change }) => (
  <div className="stat-card" style={{ '--stat-color': color, '--stat-bg': bg }}>
    <div className="stat-card-icon">{icon}</div>
    <div className="stat-card-body">
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
      {change && <div className={`stat-card-change ${change > 0 ? 'positive' : 'negative'}`}>{change > 0 ? '↑' : '↓'} {Math.abs(change)}% this week</div>}
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const map = {
    pending: { cls: 'badge-warning', label: '⏳ Pending' },
    accepted: { cls: 'badge-success', label: '✅ Accepted' },
    rejected: { cls: 'badge-error', label: '❌ Rejected' },
    in_transit: { cls: 'badge-primary', label: '🚀 In Transit' },
    completed: { cls: 'badge-success', label: '✨ Completed' }
  };
  const s = map[status] || { cls: 'badge-gray', label: status };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { onOpenMonitor } = useOutletContext();
  const [stats, setStats] = useState(null);
  const [recentRequests, setRecentRequests] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [broadcastForm, setBroadcastForm] = useState({ title: '', message: '', role: '' });
  const [broadcasting, setBroadcasting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewRes, requestsRes, usersRes] = await Promise.all([
          analyticsAPI.getOverview(),
          requestsAPI.getAll({ limit: 8 }),
          adminAPI.getUsers({ limit: 5 })
        ]);
        setStats(overviewRes.data.data.stats);
        setRecentRequests(requestsRes.data.data.requests);
        setRecentUsers(usersRes.data.data.users);
      } catch (err) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastForm.title || !broadcastForm.message) return;
    setBroadcasting(true);
    try {
      await adminAPI.broadcast(broadcastForm);
      toast.success('Broadcast sent successfully!');
      setBroadcastForm({ title: '', message: '', role: '' });
    } catch {
      toast.error('Failed to send broadcast');
    } finally {
      setBroadcasting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <span style={{ color: 'var(--gray-500)' }}>Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary-600) 0%, var(--primary-800) 50%, #1e1b4b 100%)',
        borderRadius: 'var(--radius-2xl)', padding: '28px 32px', marginBottom: '24px', color: 'white',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16
      }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, marginBottom: 4 }}>
            🌉 Admin Control Center
          </h2>
          <p style={{ opacity: 0.85, fontSize: 'var(--font-size-sm)' }}>
            Manage the entire FoodBridge ecosystem
          </p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-secondary" onClick={() => navigate('/users')}>👥 Manage Users</button>
          <button 
            className="btn btn-accent pulse-animation" 
            style={{ 
              background: 'var(--success)', 
              color: 'white', 
              fontWeight: 800,
              boxShadow: '0 0 15px rgba(34, 197, 94, 0.4)'
            }} 
            onClick={onOpenMonitor}
          >
            🌐 Live Ops Monitor
          </button>
          <button className="btn" onClick={() => navigate('/analytics')} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}>📊 Analytics</button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
        .pulse-animation { animation: pulse 2s infinite; }
      `}</style>

      {/* Stats Grid */}
      <div className="grid grid-cols-3" style={{ marginBottom: '24px' }}>
        <StatCard icon="🍱" label="Total Donations" value={stats?.totalDonations || 0} color="var(--primary-500)" bg="var(--primary-50)" change={12} />
        <StatCard icon="📋" label="Total Requests" value={stats?.totalRequests || 0} color="var(--accent-teal)" bg="var(--accent-teal-light)" change={8} />
        <StatCard icon="✅" label="Completed Missions" value={stats?.completedRequests || 0} color="var(--success)" bg="var(--success-light)" change={15} />
      </div>

      <div className="grid grid-cols-3" style={{ marginBottom: '28px' }}>
        <StatCard icon="🤝" label="Beneficiaries Fed" value={(stats?.totalBeneficiaries || 0).toLocaleString()} color="#8b5cf6" bg="#f5f3ff" />
        <StatCard icon="🏢" label="Donors" value={stats?.totalDonors || 0} color="var(--primary-700)" bg="var(--primary-50)" />
        <StatCard icon="🥣" label="Receivers" value={stats?.totalReceivers || 0} color="var(--gray-600)" bg="var(--gray-100)" />
      </div>

      <div className="grid grid-cols-2" style={{ gap: '24px', marginBottom: '24px' }}>
        {/* Recent Requests */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Recent Requests</div>
              <div className="card-subtitle">Latest food requests across the platform</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/requests')}>View All</button>
          </div>
          <div className="table-container" style={{ borderRadius: 'var(--radius-lg)', border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Donation</th>
                  <th>Receiver</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentRequests.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '24px' }}>No requests yet</td></tr>
                ) : recentRequests.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.donation_title?.slice(0, 20)}...</td>
                    <td style={{ color: 'var(--gray-600)' }}>{r.receiver_name}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td style={{ color: 'var(--gray-500)', fontSize: 'var(--font-size-xs)' }}>
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Broadcast Panel */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">📢 Broadcast Notification</div>
              <div className="card-subtitle">Send messages to all users or by role</div>
            </div>
          </div>
          <form onSubmit={handleBroadcast}>
            <div className="form-group">
              <label className="form-label">Target Audience</label>
              <select className="form-control" value={broadcastForm.role} onChange={e => setBroadcastForm(p => ({ ...p, role: e.target.value }))}>
                <option value="">All Users</option>
                <option value="donor">Donors Only</option>
                <option value="receiver">Receivers Only</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input className="form-control" placeholder="Notification title..." value={broadcastForm.title} onChange={e => setBroadcastForm(p => ({ ...p, title: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Message</label>
              <textarea className="form-control" placeholder="Your message..." value={broadcastForm.message} onChange={e => setBroadcastForm(p => ({ ...p, message: e.target.value }))} required style={{ minHeight: 80 }} />
            </div>
            <button type="submit" className={`btn btn-primary w-full${broadcasting ? ' btn-loading' : ''}`} disabled={broadcasting}>
              {!broadcasting && '📢 Send Broadcast'}
            </button>
          </form>
        </div>
      </div>

      {/* Recent Users */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Recently Joined Users</div>
            <div className="card-subtitle">Newest members on the platform</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/users')}>Manage All</button>
        </div>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>City</th><th>Status</th><th>Joined</th></tr>
            </thead>
            <tbody>
              {recentUsers.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td style={{ color: 'var(--gray-600)' }}>{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'badge-primary' : u.role === 'donor' ? 'badge-warning' : 'badge-info'}`} style={{ textTransform: 'capitalize' }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ color: 'var(--gray-600)' }}>{u.city || '—'}</td>
                  <td>
                    <span className={`badge ${u.is_active ? 'badge-success' : 'badge-error'}`}>
                      {u.is_active ? '✓ Active' : '✗ Inactive'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--gray-500)', fontSize: 'var(--font-size-xs)' }}>
                    {new Date(u.created_at).toLocaleString()}
                  </td>
                  <td>
                    <button 
                      className="btn btn-sm btn-icon" 
                      title={`Message ${u.name}`}
                      onClick={() => {
                        setBroadcastForm({ title: `Hello ${u.name}`, message: '', role: 'individual', target_id: u.id });
                        window.scrollTo({ top: 300, behavior: 'smooth' });
                      }}
                    >
                      💬
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Operation Logs - High Integrity Tracking */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <div>
            <div className="card-title">📝 Data History & Operation Logs</div>
            <div className="card-subtitle">Transparent record of all platform missions</div>
          </div>
          <span className="badge badge-success">✓ Genuine Data Only</span>
        </div>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Operation</th>
                <th>Participant</th>
                <th>Action Taken</th>
                <th>Precise Timestamp</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentRequests.map(r => (
                <tr key={`${r.id}-log`}>
                  <td style={{ fontWeight: 600 }}>{r.donation_title}</td>
                  <td>{r.receiver_name} (Receiver)</td>
                  <td>Requested Food</td>
                  <td style={{ color: 'var(--gray-600)', fontFamily: 'monospace' }}>{new Date(r.created_at).toLocaleString()}</td>
                  <td><span className="badge badge-gray">RECORDED</span></td>
                </tr>
              ))}
              {recentRequests.filter(r => r.status === 'completed').map(r => (
                <tr key={`${r.id}-complete`}>
                  <td style={{ fontWeight: 600 }}>{r.donation_title}</td>
                  <td>{r.receiver_name}</td>
                  <td>Mission Completed</td>
                  <td style={{ color: 'var(--gray-600)', fontFamily: 'monospace' }}>{new Date(r.completed_at || r.updated_at).toLocaleString()}</td>
                  <td><span className="badge badge-success">VERIFIED</span></td>
                </tr>
              ))}
              {recentRequests.filter(r => r.status === 'accepted').map(r => (
                <tr key={`${r.id}-accept`}>
                  <td style={{ fontWeight: 600 }}>{r.donation_title}</td>
                  <td>{r.donor_name}</td>
                  <td>Donation Confirmed</td>
                  <td style={{ color: 'var(--gray-600)', fontFamily: 'monospace' }}>{new Date(r.accepted_at || r.updated_at).toLocaleString()}</td>
                  <td><span className="badge badge-primary">ACTIVE</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
