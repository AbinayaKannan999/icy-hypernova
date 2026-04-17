import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsAPI, donationsAPI, requestsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { useSocket } from '../../context/SocketContext';

const StatCard = ({ icon, label, value, color, bg }) => (
  <div className="stat-card" style={{ '--stat-color': color, '--stat-bg': bg }}>
    <div className="stat-card-icon">{icon}</div>
    <div className="stat-card-body">
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  </div>
);

const DonorDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentDonations, setRecentDonations] = useState([]);
  const [activeRequests, setActiveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [receiverLoc, setReceiverLoc] = useState(null); // { lat, lng, name, delivery_id }
  const { on, off } = useSocket();

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, donationsRes, requestsRes] = await Promise.all([
        analyticsAPI.getMyStats(),
        donationsAPI.getAll({ limit: 5 }),
        requestsAPI.getAll({ limit: 10 })
      ]);
      setStats(statsRes.data.data.stats);
      setRecentDonations(donationsRes.data.data.donations);
      setActiveRequests(requestsRes.data.data.requests);
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 🔔 Real-time: listen for receiver location + new requests
  useEffect(() => {
    const handleLocation = (data) => {
      setReceiverLoc({ lat: data.latitude, lng: data.longitude, name: data.receiver_name, delivery_id: data.delivery_id });
    };
    const handleNotification = () => { fetchData(); };
    on('receiver_location', handleLocation);
    on('notification', handleNotification);
    return () => {
      off('receiver_location', handleLocation);
      off('notification', handleNotification);
    };
  }, [on, off, fetchData]);

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  return (
    <div>
      <div style={{
        background: 'linear-gradient(135deg, var(--primary-600) 0%, var(--primary-800) 100%)',
        borderRadius: 'var(--radius-2xl)', padding: '28px 32px', marginBottom: '24px', color: 'white',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16
      }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, marginBottom: 4 }}>🌟 Your Impact Dashboard</h2>
          <p style={{ opacity: 0.9, fontSize: 'var(--font-size-sm)' }}>Thank you for fighting food waste with us!</p>
        </div>
        <div className="flex gap-4 items-center">
          <button className="btn" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }} onClick={() => navigate('/donations')}>
            + Add Donation
          </button>
          <button className="btn btn-sm btn-secondary" onClick={fetchData}>🔄 Refresh</button>
        </div>
      </div>

      {/* Live Receiver Location Alert */}
      {receiverLoc && (
        <div style={{
          background: 'linear-gradient(135deg, #059669, #0d9488)', color: 'white',
          borderRadius: 'var(--radius-xl)', padding: '16px 24px', marginBottom: '20px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem' }}>📡 Live Tracking Active</div>
            <div style={{ opacity: 0.9, fontSize: '0.85rem' }}>
              {receiverLoc.name} is en route — Location: {receiverLoc.lat?.toFixed(4)}, {receiverLoc.lng?.toFixed(4)}
            </div>
          </div>
          <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}
            onClick={() => setReceiverLoc(null)}>✕ Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-4" style={{ marginBottom: '24px' }}>
        <StatCard icon="🍱" label="Total Donations" value={stats?.total_donations || 0} color="var(--primary-500)" bg="var(--primary-50)" />
        <StatCard icon="🍽️" label="Servings Donated" value={stats?.total_food_donated || 0} color="var(--accent-teal)" bg="var(--accent-teal-light)" />
        <StatCard icon="🤝" label="People Helped" value={stats?.people_helped || 0} color="var(--success)" bg="var(--success-light)" />
        <StatCard icon="⭐" label="Avg Rating" value={parseFloat(stats?.avg_rating || 0).toFixed(1)} color="var(--accent-yellow)" bg="var(--accent-yellow-light)" />
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <div className="card-title">🌐 Live Operations Overview</div>
          <div className="badge badge-success pulse-animation">LIVE</div>
        </div>
        <div style={{ position: 'relative' }}>
          <MasterMonitorMap inline={true} />
          <div style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 1000, background: 'rgba(255,255,255,0.9)', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, border: '1px solid var(--gray-200)' }}>
            🟢 Tracking active donors and receivers in your district
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Incoming Food Requests</div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/requests')}>View All</button>
        </div>
        <div className="table-container" style={{ border: 'none' }}>
          {activeRequests && activeRequests.length > 0 ? (
            <table className="table">
              <thead>
                <tr><th>Food</th><th>Receiver</th><th>Quantity</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {activeRequests.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.donation_title}</td>
                    <td>{r.receiver_name}</td>
                    <td>{r.quantity_requested} servings</td>
                    <td>
                      <span className={`badge ${ r.status === 'in_transit' ? 'badge-primary' : r.status === 'accepted' ? 'badge-success' : 'badge-warning'}`}>
                        {(r.status || 'pending').replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {r.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn btn-success btn-xs" onClick={async () => {
                            try { await requestsAPI.updateStatus(r.id, { status: 'accepted' }); toast.success('Request accepted!'); fetchData(); } catch { toast.error('Failed'); }
                          }}>✅ Accept</button>
                          <button className="btn btn-error btn-xs" onClick={async () => {
                            try { await requestsAPI.updateStatus(r.id, { status: 'rejected', rejection_reason: 'Donor declined' }); toast.success('Rejected'); fetchData(); } catch { toast.error('Failed'); }
                          }}>❌ Reject</button>
                        </div>
                      )}
                      {r.status === 'accepted' && <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>⏳ Awaiting receiver pickup...</span>}
                      {r.status === 'in_transit' && (
                        <span style={{ fontSize: '0.82rem', color: 'var(--primary-600)', fontWeight: 700 }}>🚚 En Route</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-400)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🍱</div>
              <p>No donation requests yet. Add a donation to get started.</p>
              <button className="btn btn-primary btn-sm" style={{ marginTop: '16px' }} onClick={() => navigate('/donations')}>Add Donation</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DonorDashboard;
