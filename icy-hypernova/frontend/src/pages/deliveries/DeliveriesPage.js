import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { deliveriesAPI, requestsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { useLiveLocation } from '../../hooks/useLiveLocation';
import LiveTrackingMap from '../../components/common/LiveTrackingMap';

const DeliveriesPage = () => {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrCodeData, setQrCodeData] = useState('');
  const [scanning, setScanning] = useState(false);
  const [activeTracking, setActiveTracking] = useState(null); // The delivery object being viewed on map

  // Find the most urgent/active delivery to track in background
  const currentDeliveryId = deliveries.find(d => ['accepted', 'picked_up', 'in_transit'].includes(d.status))?.id;
  const { location: volPos } = useLiveLocation(currentDeliveryId);

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const res = await deliveriesAPI.getAll();
      setDeliveries(res.data.data.deliveries);
    } catch (err) {
      toast.error('Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDeliveries(); }, []);

  const handleStatusUpdate = async (id, status) => {
    try {
      await deliveriesAPI.updateStatus(id, { status });
      toast.success(`Delivery status updated to ${status.replace('_', ' ')}`);
      fetchDeliveries();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const verifyQR = async (reqId) => {
    try {
      if (!qrCodeData) return toast.error('Enter received QR code');
      await requestsAPI.verifyQR(reqId, { qr_data: qrCodeData });
      toast.success('QR Code verified! Delivery confirmed.');
      setScanning(false);
      setQrCodeData('');
      fetchDeliveries();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      pending: { cls: 'badge-gray', label: 'Pending' },
      accepted: { cls: 'badge-warning', label: 'Accepted (Go Pickup)' },
      picked_up: { cls: 'badge-primary', label: 'Picked Up (On the Way)' },
      in_transit: { cls: 'badge-primary', label: 'In Transit' },
      delivered: { cls: 'badge-success', label: 'Delivered ✅' },
      failed: { cls: 'badge-error', label: 'Failed ❌' }
    };
    const s = map[status] || map.pending;
    return <span className={`badge ${s.cls}`}>{s.label}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Active Deliveries</h1>
          <p className="page-subtitle">Manage food pickups and dropoffs</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner"></div></div>
      ) : deliveries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🚚</div>
          <div className="empty-state-title">No deliveries found</div>
          <p className="empty-state-text">You have no active or completed deliveries assigned to you.</p>
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

              {/* Actions based on volunteer role and status */}
              <div className="flex gap-2 mt-auto">
                {user.role === 'volunteer' && d.status === 'accepted' && (
                  <button className="flex-1 btn btn-primary" onClick={() => handleStatusUpdate(d.id, 'picked_up')}>
                    Confirm Pickup 🎒
                  </button>
                )}
                
                {user.role === 'volunteer' && d.status === 'picked_up' && (
                  <>
                    <button className="flex-1 btn btn-secondary text-primary border-primary-300 bg-primary-50" onClick={() => setScanning(d.id)}>
                      Scan QR at Dropoff 📸
                    </button>
                    <button className="flex-1 btn btn-success" onClick={() => handleStatusUpdate(d.id, 'delivered')}>
                      Mark Delivered (No QR) ✅
                    </button>
                  </>
                )}

                {/* QR Code scanning overlay simulation */}
                {scanning === d.id && (
                  <div className="absolute inset-0 bg-white rounded-xl flex flex-col items-center justify-center p-6" style={{ zIndex: 10 }}>
                    <h3 className="text-lg font-bold mb-4">Verify Delivery</h3>
                    <p className="text-sm text-gray-500 mb-4 text-center">Enter the QR code string shown on the receiver's app to confirm dropoff.</p>
                    <input 
                      className="form-control mb-4" 
                      placeholder="Paste QR Code String..." 
                      value={qrCodeData} 
                      onChange={e => setQrCodeData(e.target.value)} 
                    />
                    <div className="flex w-full gap-2">
                      <button className="flex-1 btn btn-secondary" onClick={() => setScanning(false)}>Cancel</button>
                      <button className="flex-1 btn btn-success" onClick={() => verifyQR(d.request_id)}>Verify ✅</button>
                    </div>
                  </div>
                )}
                {['accepted', 'picked_up', 'in_transit'].includes(d.status) && (
                  <button 
                    className="flex-1 btn btn-secondary flex items-center justify-center gap-1" 
                    onClick={() => setActiveTracking(d)}
                  >
                    🗺️ Open Map Guide
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
          volunteerPos={volPos || { lat: activeTracking.current_latitude, lng: activeTracking.current_longitude }}
          donorPos={{ lat: parseFloat(activeTracking.pickup_latitude), lng: parseFloat(activeTracking.pickup_longitude) }}
          receiverPos={{ lat: parseFloat(activeTracking.delivery_latitude), lng: parseFloat(activeTracking.delivery_longitude) }}
          onClose={() => setActiveTracking(null)}
        />
      )}
    </div>
  );
};

export default DeliveriesPage;
