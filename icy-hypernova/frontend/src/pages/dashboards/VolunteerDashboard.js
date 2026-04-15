import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsAPI, deliveriesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import useLiveLocation from '../../hooks/useLiveLocation';
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

const VolunteerDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [activeDeliveries, setActiveDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);
  
  // Track location in background if there are active deliveries
  const activeDelivery = activeDeliveries.find(d => ['accepted', 'picked_up', 'in_transit'].includes(d.status));
  const { location: volPos } = useLiveLocation(activeDelivery?.id);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, deliveriesRes] = await Promise.all([
          analyticsAPI.getMyStats(),
          deliveriesAPI.getAll()
        ]);
        setStats(statsRes.data.data.stats);
        setActiveDeliveries(deliveriesRes.data.data.deliveries.filter(d => ['accepted', 'picked_up', 'in_transit'].includes(d.status)));
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

  return (
    <div>
      <div style={{
        background: 'linear-gradient(135deg, var(--accent-teal) 0%, #0f766e 100%)',
        borderRadius: 'var(--radius-2xl)', padding: '28px 32px', marginBottom: '24px', color: 'white',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16
      }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, marginBottom: 4 }}>
            🚚 Volunteer Mission Control
          </h2>
          <p style={{ opacity: 0.9, fontSize: 'var(--font-size-sm)' }}>
            Your dedication delivers more than just food; it delivers hope.
          </p>
        </div>
        <div className="flex gap-4 items-center">
          {activeDelivery && (
            <button 
              className="btn btn-accent pulse-animation" 
              style={{ 
                background: 'var(--success)', 
                color: 'white', 
                fontWeight: 800,
                boxShadow: '0 0 15px rgba(34, 197, 94, 0.4)'
              }} 
              onClick={() => setShowMap(true)}
            >
              🗺️ Open Navigation Map
            </button>
          )}
          <button className="btn" style={{ background: 'white', color: '#0f766e' }} onClick={() => navigate('/requests')}>
            Find Deliveries
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
        <StatCard icon="📦" label="Total Deliveries" value={stats?.total_deliveries || 0} color="var(--primary-500)" bg="var(--primary-50)" />
        <StatCard icon="✅" label="Completed" value={stats?.completed_deliveries || 0} color="var(--success)" bg="var(--success-light)" />
        <StatCard icon="👥" label="People Fed" value={stats?.people_helped || 0} color="var(--accent-teal)" bg="var(--accent-teal-light)" />
        <StatCard icon="⭐" label="Avg Rating" value={parseFloat(stats?.avg_rating || 0).toFixed(1)} color="var(--accent-yellow)" bg="var(--accent-yellow-light)" />
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">🚀 Active Deliveries ({activeDeliveries.length})</div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/deliveries')}>View All</button>
        </div>
        
        {activeDeliveries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🙌</div>
            <div className="empty-state-title">No Active Deliveries</div>
            <p className="empty-state-text">You have no pending deliveries right now. Check available requests to start helping!</p>
            <button className="btn btn-primary" onClick={() => navigate('/requests')}>Browse Available Requests</button>
          </div>
        ) : (
          <div className="grid grid-cols-2" style={{ gap: 20 }}>
            {activeDeliveries.map(d => (
              <div key={d.id} className="card" style={{ border: '1px solid var(--primary-200)', background: 'white' }}>
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-lg">{d.donation_title}</h3>
                  <span className="badge badge-primary">{d.status.replace('_', ' ').toUpperCase()}</span>
                </div>
                <div className="flex flex-col gap-2 text-sm text-gray-600 mb-4">
                  <div><strong>Pickup:</strong> {d.pickup_address}</div>
                  <div><strong>Dropoff:</strong> {d.delivery_address} ({d.delivery_city})</div>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 btn btn-primary" onClick={() => setShowMap(true)}>🗺️ Navigate</button>
                  {d.status !== 'delivered' && (
                    <button className="flex-1 btn btn-success" onClick={() => {
                        if (window.confirm('Confirm the delivery is completed?')) {
                           deliveriesAPI.updateStatus(d.id, { status: 'delivered' })
                             .then(() => { toast.success('Delivery Confirmed!'); window.location.reload(); });
                        }
                    }}>Done ✅</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {showMap && activeDelivery && (
        <LiveTrackingMap 
          status={activeDelivery.status}
          volunteerPos={volPos}
          donorPos={{ lat: parseFloat(activeDelivery.pickup_latitude), lng: parseFloat(activeDelivery.pickup_longitude) }}
          receiverPos={{ lat: parseFloat(activeDelivery.delivery_latitude), lng: parseFloat(activeDelivery.delivery_longitude) }}
          onClose={() => setShowMap(false)}
        />
      )}
    </div>
  );
};

export default VolunteerDashboard;
