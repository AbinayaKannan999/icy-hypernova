import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { requestsAPI, deliveriesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { useSocket } from '../../context/SocketContext';
import LiveTrackingMap from '../../components/common/LiveTrackingMap';

const RequestsPage = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trackingData, setTrackingData] = useState(null); // { request, volPos }
  const { on, off } = useSocket();

  useEffect(() => {
    // Listen for volunteer location updates
    const handleLocationUpdate = (data) => {
      setTrackingData(prev => {
        if (!prev || !prev.request) return null;
        // Only update if it matches current tracking request
        if (prev.request.id === data.request_id || prev.request.id === data.delivery_id) {
          return { ...prev, volPos: { lat: data.latitude, lng: data.longitude } };
        }
        return prev;
      });
    };

    on('volunteer_location', handleLocationUpdate);
    return () => off('volunteer_location', handleLocationUpdate);
  }, [on, off]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // For volunteers, show all requests that are 'accepted' waiting for a volunteer
      // and requests where they are already the volunteer.
      // For donors/receivers, API automatically filters based on user role.
      const res = await requestsAPI.getAll();
      let data = res.data.data.requests;
      
      if (user.role === 'volunteer') {
        data = data.filter(r => r.status === 'accepted' || r.volunteer_id === user.id);
      }
      
      setRequests(data);
    } catch (err) {
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, [user.role]);

  const handleStatusChange = async (id, status, reason = '') => {
    try {
      await requestsAPI.updateStatus(id, { status, rejection_reason: reason });
      toast.success(`Request ${status} successfully!`);
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${status} request`);
    }
  };

  const handleVolunteerAccept = async (reqId) => {
    try {
      await deliveriesAPI.create({ request_id: reqId });
      toast.success('You have successfully accepted this delivery!');
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept delivery');
    }
  };

  const StatusBadge = ({ status }) => {
    const map = {
      pending: { cls: 'badge-warning', label: '⏳ Pending' },
      accepted: { cls: 'badge-success', label: '✅ Accepted (Waiting on Volunteer)' },
      rejected: { cls: 'badge-error', label: '❌ Rejected' },
      assigned: { cls: 'badge-info', label: '🚚 Assigned to Volunteer' },
      in_transit: { cls: 'badge-primary', label: '🚀 In Transit' },
      completed: { cls: 'badge-success', label: '✨ Completed' }
    };
    const s = map[status] || { cls: 'badge-gray', label: status };
    return <span className={`badge ${s.cls}`}>{s.label}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{user.role === 'donor' ? 'Incoming Requests' : user.role === 'volunteer' ? 'Available Deliveries' : 'My Food Requests'}</h1>
          <p className="page-subtitle">
            {user.role === 'donor' ? 'Approve or reject requests for your food donations' : 
             user.role === 'volunteer' ? 'Accept a request to start delivering food' : 
             'Track the status of the food you requested'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner"></div></div>
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">No Requests Found</div>
          <p className="empty-state-text">There are currently no requests to display.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2">
          {requests.map(r => (
            <div key={r.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{r.donation_title}</h3>
                  <div className="text-sm text-gray-500 mt-1">Requested: {r.quantity_requested} servings</div>
                </div>
                <StatusBadge status={r.status} />
              </div>

              <div className="flex flex-col gap-2 mb-4 text-sm bg-gray-50 p-3 rounded-lg flex-1">
                {(user.role === 'donor' || user.role === 'admin' || user.role === 'volunteer') && (
                  <div className="flex gap-2">
                    <span className="font-semibold text-gray-700 w-24">Receiver:</span>
                    <span className="text-gray-600">{r.receiver_name} ({r.delivery_city})</span>
                  </div>
                )}
                {(user.role === 'receiver' || user.role === 'admin' || user.role === 'volunteer') && (
                  <div className="flex gap-2">
                    <span className="font-semibold text-gray-700 w-24">Donor:</span>
                    <span className="text-gray-600">{r.donor_name}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <span className="font-semibold text-gray-700 w-24">Urgency:</span>
                  <span className="text-gray-600">{r.urgency_level}/5</span>
                </div>
                {r.volunteer_name && (
                  <div className="flex gap-2">
                    <span className="font-semibold text-gray-700 w-24">Volunteer:</span>
                    <span className="text-gray-600 font-medium text-primary">{r.volunteer_name}</span>
                  </div>
                )}
                <div className="flex gap-2 mt-2 pt-2 border-t">
                  <span className="font-semibold text-gray-700 w-24">Pickup:</span>
                  <span className="text-gray-600 truncate flex-1" title={r.pickup_address}>{r.pickup_address}</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-semibold text-gray-700 w-24">Dropoff:</span>
                  <span className="text-gray-600 truncate flex-1" title={r.delivery_address}>{r.delivery_address}</span>
                </div>
              </div>

              {/* Actions based on role and status */}
              <div className="flex gap-2 mt-auto">
                {user.role === 'donor' && r.status === 'pending' && (
                  <>
                    <button className="flex-1 btn btn-success" onClick={() => handleStatusChange(r.id, 'accepted')}>✓ Accept</button>
                    <button className="flex-1 btn btn-danger" onClick={() => {
                      const reason = window.prompt("Reason for rejection:");
                      if (reason !== null) handleStatusChange(r.id, 'rejected', reason);
                    }}>✗ Reject</button>
                  </>
                )}
                
                {user.role === 'volunteer' && r.status === 'accepted' && (
                  <button className="w-full btn btn-primary" onClick={() => handleVolunteerAccept(r.id)}>
                    🚚 Accept Delivery Assignment
                  </button>
                )}

                {['assigned', 'in_transit'].includes(r.status) && (
                  <button 
                    className="flex-1 btn btn-secondary flex items-center justify-center gap-1" 
                    onClick={() => setTrackingData({ 
                      request: r, 
                      volPos: r.current_latitude ? { lat: r.current_latitude, lng: r.current_longitude } : null 
                    })}
                  >
                    📍 Track Delivery
                  </button>
                )}

                {r.status === 'rejected' && r.rejection_reason && (
                  <div className="w-full text-sm text-error bg-error-light p-2 rounded text-center">
                    Reason: {r.rejection_reason}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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

export default RequestsPage;
