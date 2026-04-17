import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsAPI, requestsAPI, deliveriesAPI } from '../../services/api';
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

const statusColor = (s) => ({
  pending: 'badge-warning', accepted: 'badge-success',
  in_transit: 'badge-primary', completed: 'badge-gray', rejected: 'badge-error'
}[s] || 'badge-gray');

const ReceiverDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [missionActive, setMissionActive] = useState(false);
  const [activeDelivery, setActiveDelivery] = useState(null); // {delivery_id, request}
  const [gpsWatchId, setGpsWatchId] = useState(null);
  const { on, off, emit } = useSocket();

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, requestsRes] = await Promise.all([
        analyticsAPI.getMyStats(),
        requestsAPI.getAll({ limit: 20 })
      ]);
      setStats(statsRes.data.data.stats);
      setRequests(requestsRes.data.data.requests);
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 🔔 Listen for real-time notifications - refresh data when accepted/rejected
  useEffect(() => {
    const handleRequestUpdate = (data) => {
      if (data.type === 'request_accepted' || data.type === 'request_rejected' || data.type === 'delivery_update') {
        fetchData();
        if (data.type === 'request_accepted') {
          toast.success('🎉 Your food request was accepted! Check your dashboard.', { duration: 5000 });
        }
      }
    };
    const handleDeliveryUpdate = () => { fetchData(); };
    on('notification', handleRequestUpdate);
    on('delivery_update', handleDeliveryUpdate);
    return () => {
      off('notification', handleRequestUpdate);
      off('delivery_update', handleDeliveryUpdate);
    };
  }, [on, off, fetchData]);

  // GPS heartbeat when mission is active
  useEffect(() => {
    if (missionActive && activeDelivery) {
      if (!navigator.geolocation) {
        toast.error('GPS not available');
        return;
      }
      const isHTTP = window.location.protocol === 'http:' && window.location.hostname !== 'localhost';
      if (isHTTP) {
        toast.error('Live GPS tracking requires HTTPS. Location updates disabled.', { duration: 6000 });
        return;
      }
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          emit('location_update', {
            delivery_id: activeDelivery.delivery_id,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
        },
        () => toast.error('GPS tracking failed'),
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
      setGpsWatchId(watchId);
      toast.success('📡 GPS tracking started! Donor can see your location.');
    } else {
      if (gpsWatchId) {
        navigator.geolocation.clearWatch(gpsWatchId);
        setGpsWatchId(null);
      }
    }
    return () => { if (gpsWatchId) navigator.geolocation.clearWatch(gpsWatchId); };
  }, [missionActive, activeDelivery]);

  const handleStartDelivery = async (req) => {
    try {
      // Update request status to in_transit (backend creates delivery record)
      await requestsAPI.updateStatus(req.id, { status: 'in_transit' });

      // Fetch the delivery record just created
      let deliveryId = null;
      try {
        const dRes = await deliveriesAPI.getAll({ request_id: req.id });
        deliveryId = dRes.data.data.deliveries?.[0]?.id || req.id;
      } catch {
        deliveryId = req.id; // fallback
      }

      setActiveDelivery({ delivery_id: deliveryId, request: req });
      setMissionActive(true);
      toast.success('🚀 Delivery started! Donor & Admin are now tracking you.');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start delivery');
    }
  };

  const handleStopDelivery = () => {
    setMissionActive(false);
    setActiveDelivery(null);
    toast('📍 GPS tracking stopped.');
  };

  const handleMarkReceived = async (reqId) => {
    try {
      await requestsAPI.updateStatus(reqId, { status: 'completed' });
      toast.success('✅ Marked as received! Thank you.');
      setMissionActive(false);
      setActiveDelivery(null);
      fetchData();
    } catch {
      toast.error('Failed to update status');
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  const activeReqs = requests.filter(r => ['pending', 'accepted', 'in_transit'].includes(r.status));
  const inTransitReq = requests.find(r => r.status === 'in_transit');

  return (
    <div>
      {/* Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary-600) 0%, #4338ca 100%)',
        borderRadius: 'var(--radius-2xl)', padding: '28px 32px', marginBottom: '24px',
        color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16
      }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, marginBottom: 4 }}>🤝 Receiver Dashboard</h2>
          <p style={{ opacity: 0.9, fontSize: 'var(--font-size-sm)' }}>Track your food requests and delivery status in real time.</p>
        </div>
        <button className="btn" style={{ background: 'white', color: 'var(--primary-700)', fontWeight: 800 }}
          onClick={() => navigate('/donations')}>
          🥣 Browse Food
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4" style={{ marginBottom: '24px' }}>
        <StatCard icon="📋" label="Total Requests" value={stats?.total_requests || 0} color="var(--primary-500)" bg="var(--primary-50)" />
        <StatCard icon="✅" label="Received" value={stats?.received_donations || 0} color="var(--success)" bg="var(--success-light)" />
        <StatCard icon="👥" label="People Fed" value={stats?.beneficiaries_fed || 0} color="#0d9488" bg="#f0fdfa" />
        <StatCard icon="⭐" label="Your Rating" value={parseFloat(stats?.avg_rating_given || 0).toFixed(1)} color="#d97706" bg="#fffbeb" />
      </div>

      {/* Active Mission Control - floating overlay */}
      {inTransitReq && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, width: 320, zIndex: 2000,
          background: 'white', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          border: '2px solid var(--primary-600)', padding: 20,
          animation: 'slideUp 0.4s ease'
        }}>
          <h3 style={{ fontWeight: 900, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            🚀 Active Delivery
            {missionActive && <span className="badge badge-success" style={{ animation: 'pulse 2s infinite' }}>GPS LIVE</span>}
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--gray-600)', marginBottom: 12 }}>
            <strong>{inTransitReq.donation_title}</strong> from <strong>{inTransitReq.donor_name}</strong>
          </p>

          {inTransitReq.qr_code && (
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginBottom: 4 }}>Handover QR Code</div>
              <img src={inTransitReq.qr_code} alt="QR" style={{ width: 100, height: 100, border: '1px solid var(--gray-200)', borderRadius: 8 }} />
            </div>
          )}

          <div className="flex gap-2">
            <button
              className={`btn btn-sm w-full ${missionActive ? 'btn-secondary' : 'btn-primary'}`}
              onClick={() => setMissionActive(!missionActive)}
              disabled={window.location.protocol === 'http:' && window.location.hostname !== 'localhost'}
            >
              {missionActive ? '⏹ Stop GPS' : '📡 Start GPS'}
            </button>
            <button className="btn btn-sm btn-success w-full"
              onClick={() => handleMarkReceived(inTransitReq.id)}>
              ✅ Received
            </button>
          </div>
          {window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && (
            <p style={{ fontSize: '0.7rem', color: 'var(--gray-400)', textAlign: 'center', marginTop: 8 }}>
              ⚠️ GPS tracking requires HTTPS
            </p>
          )}
        </div>
      )}

      {/* Active Requests Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">📝 My Requests</div>
          <button className="btn btn-sm btn-secondary" onClick={fetchData}>🔄 Refresh</button>
        </div>

        {activeReqs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🥣</div>
            <div className="empty-state-title">No Active Requests</div>
            <p className="empty-state-text">Browse available food and submit a request.</p>
            <button className="btn btn-primary" onClick={() => navigate('/donations')}>Browse Food →</button>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Food</th>
                  <th>Donor</th>
                  <th>Qty</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {activeReqs.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.donation_title}</td>
                    <td>{r.donor_name}</td>
                    <td>{r.quantity_requested} {r.quantity_unit || ''}</td>
                    <td><span className={`badge ${statusColor(r.status)}`}>{r.status.replace('_', ' ').toUpperCase()}</span></td>
                    <td>
                      {r.status === 'accepted' && (
                        <button className="btn btn-primary btn-sm"
                          onClick={() => handleStartDelivery(r)}>
                          🚚 Start Delivery
                        </button>
                      )}
                      {r.status === 'in_transit' && (
                        <button className="btn btn-success btn-sm"
                          onClick={() => handleMarkReceived(r.id)}>
                          ✅ Mark Received
                        </button>
                      )}
                      {r.status === 'pending' && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>⏳ Awaiting donor</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        @keyframes slideUp { from { transform: translateY(30px); opacity:0; } to { transform: translateY(0); opacity:1; } }
      `}</style>
    </div>
  );
};

export default ReceiverDashboard;
