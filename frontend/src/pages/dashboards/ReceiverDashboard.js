import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { analyticsAPI, requestsAPI } from '../../services/api';
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

const ReceiverDashboard = () => {
  const navigate = useNavigate();
  const { onOpenMonitor } = useOutletContext();
  const [stats, setStats] = useState(null);
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trackingData, setTrackingData] = useState(null); // { request, volPos }
  const [activeMission, setActiveMission] = useState(null); // The delivery object
  const [missionActive, setMissionActive] = useState(false);
  const { on, off, emit } = useSocket();

  // GPS Heartbeat for Mission Control
  useEffect(() => {
    let watchId;
    if (missionActive && activeMission) {
      if ('geolocation' in navigator) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            emit('location_update', {
              delivery_id: activeMission.id,
              latitude,
              longitude
            });
          },
          (error) => toast.error('Location tracking failed. Check permissions.'),
          { enableHighAccuracy: true, distanceFilter: 10 }
        );
      }
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [missionActive, activeMission, emit]);

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
          <button className="btn pulse-animation" style={{ background: 'white', color: 'var(--primary-700)', fontWeight: 800 }} onClick={() => navigate('/donations')}>
            🥣 Resource Discovery
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

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <div className="card-title">🌐 Food Distribution Network</div>
          <div className="badge badge-success pulse-animation">ACTIVE</div>
        </div>
        <div style={{ position: 'relative' }}>
          <MasterMonitorMap inline={true} />
          <div style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 1000, background: 'rgba(255,255,255,0.9)', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, border: '1px solid var(--gray-200)' }}>
            🟢 Seeing where the food is moving right now
          </div>
        </div>
      </div>

      {/* Persistent Mission Control overlay if mission is active */}
      {recentRequests.find(r => r.status === 'in_transit') && (
        <div className="mission-control-overlay" style={{
          position: 'fixed', bottom: 20, right: 20, width: 340, background: 'var(--white)',
          borderRadius: 20, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', padding: 20, zIndex: 1000,
          border: '2px solid var(--primary-600)', animation: 'slideUp 0.4s ease'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            🚀 Active Mission Control
          </h3>
          <div style={{ marginBottom: 16 }}>
             <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Current Status</div>
             <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary-700)' }}>
               {missionActive ? '🛰️ EN ROUTE (GPS ON)' : '⏸️ MISSION PAUSED'}
             </div>
          </div>
          <div className="flex gap-3">
             <button 
               className={`btn w-full ${missionActive ? 'btn-secondary' : 'btn-primary'}`}
               onClick={() => {
                 setMissionActive(!missionActive);
                 if (!activeMission) setActiveMission(recentRequests.find(r => r.status === 'in_transit'));
               }}
             >
               {missionActive ? 'Stop Tracking' : 'Start Navigation'}
             </button>
          </div>
          <div style={{ marginTop: 16, textAlign: 'center' }}>
             <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginBottom: 8 }}>Handover Token (QR)</div>
             <img src={recentRequests.find(r => r.status === 'in_transit')?.qr_code} alt="QR" style={{ width: 120, height: 120, border: '1px solid var(--gray-200)' }} />
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="card-title">📝 Recent Requests</div>
        </div>
        
        {activeReqs.length === 0 ? (
          <div className="empty-state">
            <p>No active missions.</p>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr><th>Food</th><th>Donor</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {activeReqs.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.donation_title}</td>
                    <td>{r.donor_name}</td>
                    <td><span className={`badge ${r.status === 'in_transit' ? 'badge-primary' : 'badge-success'}`}>{r.status.toUpperCase()}</span></td>
                    <td>
                      {r.status === 'accepted' && (
                        <button className="btn btn-primary btn-xs" onClick={async () => {
                           try {
                             await requestsAPI.updateStatus(r.id, { status: 'in_transit' });
                             toast.success('Mission Started! GPS Heartbeat active.');
                             window.location.reload();
                           } catch (err) { toast.error('Failed to start mission'); }
                        }}>Start Mission</button>
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

export default ReceiverDashboard;
