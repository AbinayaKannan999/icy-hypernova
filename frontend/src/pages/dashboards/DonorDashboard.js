import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { analyticsAPI, donationsAPI, requestsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { useSocket } from '../../context/SocketContext';
import LiveTrackingMap from '../../components/common/LiveTrackingMap';
import MasterMonitorMap from '../../components/common/MasterMonitorMap';

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
  const { onOpenMonitor } = useOutletContext();
  const [stats, setStats] = useState(null);
  const [recentDonations, setRecentDonations] = useState([]);
  const [activeRequests, setActiveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trackingData, setTrackingData] = useState(null); // { request, volPos }
  const { on, off } = useSocket();

  useEffect(() => {
    // Listen for receiver location updates
    const handleLocationUpdate = (data) => {
      setTrackingData(prev => {
        if (!prev || !prev.request) return null;
        if (prev.request.id === data.delivery_id) {
          return { ...prev, receiverPos: data.latitude ? { lat: data.latitude, lng: data.longitude } : prev.receiverPos };
        }
        return prev;
      });
    };
    on('receiver_location', handleLocationUpdate);
    return () => off('receiver_location', handleLocationUpdate);
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
        background: 'linear-gradient(135deg, var(--primary-600) 0%, var(--primary-800) 100%)',
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
          {activeRequests.find(r => r.status === 'in_transit') && (
            <button 
              className="btn pulse-animation" 
              style={{ 
                background: 'white', 
                color: 'var(--primary-700)', 
                fontWeight: 800,
                boxShadow: '0 0 15px rgba(255, 255, 255, 0.4)'
              }} 
              onClick={() => {
                const req = activeRequests.find(r => r.status === 'in_transit');
                setTrackingData({ request: req, receiverPos: null });
              }}
            >
              🥣 Watch Receiver Approach
            </button>
          )}
          <button className="btn" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }} onClick={() => navigate('/donations')}>
            + New List
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
          <div className="card-title">Your Recent Donations</div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/donations')}>View All</button>
        </div>
        <div className="table-container" style={{ border: 'none' }}>
          {activeRequests && activeRequests.length > 0 ? (
            <table className="table">
              <thead>
                <tr><th>Title</th><th>Receiver</th><th>Quantity</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                  {activeRequests.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.donation_title}</td>
                      <td>{r.receiver_name}</td>
                      <td>{r.quantity_requested} servings</td>
                      <td>
                        <span className={`badge ${r.status === 'in_transit' ? 'badge-primary' : 'badge-warning'}`}>
                          {(r.status || 'pending').toUpperCase()}
                        </span>
                      </td>
                      <td>
                        {r.status === 'accepted' && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Awaiting Receiver...</span>
                          </div>
                        )}
                        {r.status === 'in_transit' && (
                          <button className="btn btn-primary btn-xs" onClick={() => {
                             toast.success('Ready for QR Scan!');
                             // In a real app, this would open scanner
                          }}>📸 Scan QR / Code</button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-400)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🍱</div>
              <p>You haven't made any donations that have been requested yet.</p>
              <button className="btn btn-primary btn-sm" style={{ marginTop: '16px' }} onClick={() => navigate('/donations')}>Make a Donation</button>
            </div>
          )}
        </div>
      </div>
      {trackingData && (
        <LiveTrackingMap 
          status={trackingData.request.status}
          volunteerPos={trackingData.receiverPos}
          donorPos={{ 
            lat: parseFloat(trackingData.request.pickup_latitude) || 0, 
            lng: parseFloat(trackingData.request.pickup_longitude) || 0 
          }}
          receiverPos={{ 
            lat: parseFloat(trackingData.request.delivery_latitude) || 0, 
            lng: parseFloat(trackingData.request.delivery_longitude) || 0 
          }}
          onClose={() => setTrackingData(null)}
        />
      )}
    </div>
  );
};

export default DonorDashboard;
