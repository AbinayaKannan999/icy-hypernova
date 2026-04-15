import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { deliveriesAPI, requestsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import useLiveLocation from '../../hooks/useLiveLocation';
import LiveTrackingMap from '../../components/common/LiveTrackingMap';

const DeliveriesPage = () => {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrCodeData, setQrCodeData] = useState('');
  const [scanning, setScanning] = useState(false);
  const [activeTracking, setActiveTracking] = useState(null); // The delivery object being viewed on map

  // Find the most urgent/active mission to track in background
  const activeMission = deliveries.find(d => ['pending', 'picked_up', 'in_transit'].includes(d.status));
  const currentMissionId = activeMission?.id;
  const { location: currentPos } = useLiveLocation(currentMissionId);

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const res = await deliveriesAPI.getAll();
      setDeliveries(res.data.data.deliveries);
    } catch (err) {
      toast.error('Failed to load mission records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDeliveries(); }, []);

  const handleStatusUpdate = async (id, status) => {
    try {
      await deliveriesAPI.updateStatus(id, { status });
      toast.success(`Mission status updated to ${status.replace('_', ' ')}`);
      fetchDeliveries();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const verifyQR = async (reqId) => {
    try {
      if (!qrCodeData) return toast.error('Enter handover verification code');
      await requestsAPI.verifyQR(reqId, { qr_data: qrCodeData });
      toast.success('Handover verified! Mission completed.');
      setScanning(false);
      setQrCodeData('');
      fetchDeliveries();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      pending: { cls: 'badge-gray', label: '⏳ Pending Start' },
      picked_up: { cls: 'badge-primary', label: '🎒 Food Picked Up' },
      in_transit: { cls: 'badge-primary', label: '🚀 In Transit' },
      delivered: { cls: 'badge-success', label: '✅ Done' },
      failed: { cls: 'badge-error', label: '❌ Failed' }
    };
    const s = map[status] || map.pending;
    return <span className={`badge ${s.cls}`}>{s.label}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Active Missions</h1>
          <p className="page-subtitle">Your direct logistics and pickup coordination</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner"></div></div>
      ) : deliveries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ color: 'var(--primary-600)' }}>🛰️</div>
          <div className="empty-state-title">No active missions</div>
          <p className="empty-state-text">Explore available resources on the dashboard to start a mission.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2">
          {deliveries.map(d => (
            <div key={d.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="flex justify-between items-start mb-4 pb-4 border-b">
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">{d.donation_title}</h3>
                  <div className="text-sm text-gray-500">
                    <div><strong>Receiver:</strong> {d.receiver_name} ({d.receiver_phone})</div>
                    {user.role === 'admin' && <div><strong>Volunteer:</strong> {d.volunteer_name} ({d.volunteer_phone})</div>}
                  </div>
                </div>
                {getStatusBadge(d.status)}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 bg-gray-50 p-3 rounded-lg flex-1">
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1 text-primary">📍 Pickup From</div>
                  <div className="text-sm font-medium text-gray-800">{d.pickup_address}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1 text-success">🎯 Deliver To</div>
                  <div className="text-sm font-medium text-gray-800">{d.delivery_address}</div>
                  <div className="text-xs text-gray-500">{d.delivery_city}</div>
                </div>
              </div>

              {/* Actions based on Receiver mission status */}
              <div className="flex gap-2 mt-auto">
                {user.role === 'receiver' && d.status === 'pending' && (
                  <button className="flex-1 btn btn-primary" onClick={() => handleStatusUpdate(d.id, 'picked_up')}>
                    Mark as Picked Up 🎒
                  </button>
                )}
                
                {user.role === 'receiver' && d.status === 'picked_up' && (
                  <button className="flex-1 btn btn-secondary text-primary border-primary-300 bg-primary-50" onClick={() => handleStatusUpdate(d.id, 'delivered')}>
                    Finalize Handover ✅
                  </button>
                )}

                {['pending', 'picked_up', 'in_transit'].includes(d.status) && (
                  <button 
                    className="flex-1 btn btn-secondary flex items-center justify-center gap-1" 
                    onClick={() => setActiveTracking(d)}
                  >
                    🗺️ Mission Map
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTracking && (
        <LiveTrackingMap 
          status={activeTracking.status}
          volunteerPos={currentPos || { lat: activeTracking.current_latitude, lng: activeTracking.current_longitude }}
          donorPos={{ lat: parseFloat(activeTracking.pickup_latitude), lng: parseFloat(activeTracking.pickup_longitude) }}
          receiverPos={{ lat: parseFloat(activeTracking.delivery_latitude), lng: parseFloat(activeTracking.delivery_longitude) }}
          onClose={() => setActiveTracking(null)}
        />
      )}
    </div>
  );
};

export default DeliveriesPage;
