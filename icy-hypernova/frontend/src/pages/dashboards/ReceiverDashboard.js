import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsAPI, requestsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { useSocket } from '../../context/SocketContext';
import LiveTrackingMap from '../../components/common/LiveTrackingMap';

const StatCard = ({ icon, label, value, color, bg }) => (
  <div className="stat-card" style={{ '--stat-color': color, '--stat-bg': bg }}>
    <div className="stat-card-icon">{icon}</div>
    <div className="stat-card-body">
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  </div>
);

const ReceiverDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trackingData, setTrackingData] = useState(null); // { request, volPos }
  const { on, off } = useSocket();

  useEffect(() => {
    // Listen for volunteer location updates
    const handleLocationUpdate = (data) => {
      setTrackingData(prev => {
        if (!prev || !prev.request) return null;
        if (prev.request.id === data.request_id || prev.request.id === data.delivery_id) {
          return { ...prev, volPos: { lat: data.latitude, lng: data.longitude } };
        }
        return prev;
      });
    };
    on('volunteer_location', handleLocationUpdate);
    return () => off('volunteer_location', handleLocationUpdate);
  }, [on, off]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, requestsRes] = await Promise.all([
          analyticsAPI.getMyStats(),
          requestsAPI.getAll({ limit: 5 })
        ]);
        setStats(statsRes.data.data.stats);
        setRecentRequests(requestsRes.data.data.requests);
      } catch (err) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="loading-screen"><div className="spinner"></div></div>;
  }

  const activeStatus = ['pending', 'accepted', 'assigned', 'in_transit'];
  const activeReqs = recentRequests.filter(r => activeStatus.includes(r.status));

  return (
    <div>
      <div style={{
        background: 'linear-gradient(135deg, var(--primary-600) 0%, #4338ca 100%)',
        borderRadius: 'var(--radius-2xl)', padding: '28px 32px', marginBottom: '24px', color: 'white',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16
      }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, marginBottom: 4 }}>
            🤝 Welcome Home
          </h2>
          <p style={{ opacity: 0.9, fontSize: 'var(--font-size-sm)' }}>
            We're here to help you find the food you need.
          </p>
        </div>
        <div className="flex gap-4 items-center">
          {recentRequests.find(r => ['assigned', 'in_transit'].includes(r.status)) && (
            <button 
              className="btn btn-accent pulse-animation" 
              style={{ 
                background: 'var(--success)', 
                color: 'white', 
                fontWeight: 800,
                boxShadow: '0 0 15px rgba(34, 197, 94, 0.4)'
              }} 
              onClick={() => {
                const req = recentRequests.find(r => ['assigned', 'in_transit'].includes(r.status));
                setTrackingData({ request: req, volPos: null });
              }}
            >
              📍 Track My Food Live
            </button>
          )}
          <button className="btn" style={{ background: 'white', color: '#4338ca' }} onClick={() => navigate('/donations')}>
            Find Available Food
          </button>
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

      <div className="grid grid-cols-4" style={{ marginBottom: '24px' }}>
        <StatCard icon="📋" label="Total Requests" value={stats?.total_requests || 0} color="var(--primary-500)" bg="var(--primary-50)" />
        <StatCard icon="✅" label="Received" value={stats?.received_donations || 0} color="var(--success)" bg="var(--success-light)" />
        <StatCard icon="👥" label="People Fed" value={stats?.beneficiaries_fed || 0} color="var(--accent-teal)" bg="var(--accent-teal-light)" />
        <StatCard icon="⭐" label="Your Rating" value={parseFloat(stats?.avg_rating_given || 0).toFixed(1)} color="var(--accent-yellow)" bg="var(--accent-yellow-light)" />
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">📝 My Active Requests</div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/requests')}>Manage All</button>
        </div>
        
        {activeReqs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🍲</div>
            <div className="empty-state-title">No Active Requests</div>
            <p className="empty-state-text">You don't have any pending food requests. Browse available donations to request food.</p>
            <button className="btn btn-primary" onClick={() => navigate('/donations')}>Browse Food</button>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr><th>Food</th><th>Donor</th><th>Quantity</th><th>Status</th><th>Requested On</th></tr>
              </thead>
              <tbody>
                {activeReqs.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.donation_title}</td>
                    <td>{r.donor_name}</td>
                    <td>{r.quantity_requested} servings</td>
                    <td>
                      <span className={`badge ${r.status === 'in_transit' ? 'badge-primary' : r.status === 'accepted' ? 'badge-success' : r.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                        {r.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {r.status === 'in_transit' && (
                        <button className="btn btn-success btn-xs" onClick={() => {
                          if (window.confirm('Confirm you have received the food?')) {
                             requestsAPI.updateStatus(r.id, { status: 'completed' })
                               .then(() => { toast.success('Marked as Received!'); window.location.reload(); });
                          }
                        }}>📦 Received</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {trackingData && (
        <LiveTrackingMap 
          status={trackingData.request.status}
          volunteerPos={trackingData.volPos}
          donorPos={{ lat: parseFloat(trackingData.request.pickup_latitude), lng: parseFloat(trackingData.request.pickup_longitude) }}
          receiverPos={{ lat: parseFloat(trackingData.request.delivery_latitude), lng: parseFloat(trackingData.request.delivery_longitude) }}
          onClose={() => setTrackingData(null)}
        />
      )}
    </div>
  );
};

export default ReceiverDashboard;
