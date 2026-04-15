import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsAPI, donationsAPI, requestsAPI } from '../../services/api';
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

const DonorDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentDonations, setRecentDonations] = useState([]);
  const [activeRequests, setActiveRequests] = useState([]);
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
        const [statsRes, donationsRes, requestsRes] = await Promise.all([
          analyticsAPI.getMyStats(),
          donationsAPI.getAll({ limit: 5 }),
          requestsAPI.getAll({ limit: 10 })
        ]);
        setStats(statsRes.data.data.stats);
        setRecentDonations(donationsRes.data.data.donations);
        setActiveRequests(requestsRes.data.data.requests);
      } catch (err) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        background: 'linear-gradient(135deg, var(--accent-yellow) 0%, #d97706 100%)',
        borderRadius: 'var(--radius-2xl)', padding: '28px 32px', marginBottom: '24px', color: 'white',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16
      }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, marginBottom: 4 }}>
            🌟 Your Impact Dashboard
          </h2>
          <p style={{ opacity: 0.9, fontSize: 'var(--font-size-sm)' }}>
            Thank you for fighting food waste with us!
          </p>
        </div>
        <div className="flex gap-4 items-center">
          {activeRequests.find(r => ['assigned', 'in_transit'].includes(r.status)) && (
            <button 
              className="btn btn-accent pulse-animation" 
              style={{ 
                background: 'var(--success)', 
                color: 'white', 
                fontWeight: 800,
                boxShadow: '0 0 15px rgba(34, 197, 94, 0.4)'
              }} 
              onClick={() => {
                const req = activeRequests.find(r => ['assigned', 'in_transit'].includes(r.status));
                setTrackingData({ request: req, volPos: null });
              }}
            >
              🚚 Track My Donation Live
            </button>
          )}
          <button className="btn" style={{ background: 'white', color: '#b45309' }} onClick={() => navigate('/donations')}>
            + New Donation
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
        <StatCard icon="🍱" label="Total Donations" value={stats?.total_donations || 0} color="var(--primary-500)" bg="var(--primary-50)" />
        <StatCard icon="🍽️" label="Servings Donated" value={stats?.total_food_donated || 0} color="var(--accent-teal)" bg="var(--accent-teal-light)" />
        <StatCard icon="🤝" label="People Helped" value={stats?.people_helped || 0} color="var(--success)" bg="var(--success-light)" />
        <StatCard icon="⭐" label="Avg Rating" value={parseFloat(stats?.avg_rating || 0).toFixed(1)} color="var(--accent-yellow)" bg="var(--accent-yellow-light)" />
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Your Recent Donations</div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/donations')}>View All</button>
        </div>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="table">
            <thead>
              <tr><th>Title</th><th>Quantity</th><th>Requests</th><th>Status</th><th>Added On</th></tr>
            </thead>
            <tbody>
                {activeRequests.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.donation_title}</td>
                    <td>{r.receiver_name}</td>
                    <td>{r.quantity_requested} servings</td>
                    <td>
                      <span className={`badge ${r.status === 'assigned' ? 'badge-primary' : r.status === 'in_transit' ? 'badge-info' : 'badge-warning'}`}>
                        {r.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {['accepted', 'assigned'].includes(r.status) && (
                        <button className="btn btn-accent btn-xs" onClick={() => {
                          if (window.confirm('Mark this food as handed over/donated?')) {
                             requestsAPI.updateStatus(r.id, { status: 'picked_up' })
                               .then(() => { toast.success('Donation marked as Picked Up!'); window.location.reload(); });
                          }
                        }}>🍱 Donated</button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
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

export default DonorDashboard;
