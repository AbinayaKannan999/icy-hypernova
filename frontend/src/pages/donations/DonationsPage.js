import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { donationsAPI, requestsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { TAMIL_NADU_DISTRICTS } from '../../utils/constants';

const DonationsPage = () => {
  const { user } = useAuth();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState(null);

  const [form, setForm] = useState({
    title: '', description: '', food_type: 'cooked_meals', quantity: 1, quantity_unit: 'servings',
    condition: 'good', expiry_time: '', pickup_address: '', pickup_city: 'Chennai',
    pickup_latitude: null, pickup_longitude: null
  });

  const [reqForm, setReqForm] = useState({
    quantity_requested: 1, urgency_level: 3, delivery_address: '', delivery_city: 'Chennai',
    delivery_latitude: null, delivery_longitude: null
  });

  const fetchDonations = async () => {
    setLoading(true);
    try {
      // Donors see their own all donations. Others see available donations.
      const res = await donationsAPI.getAll({ available_only: user.role !== 'donor' });
      setDonations(res.data.data.donations);
    } catch (err) {
      toast.error('Failed to load donations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDonations(); }, [user.role]);

  const handleGetLocation = (isDelivery = false) => {
    if (!navigator.geolocation) {
      return toast.error('Geolocation is not supported by your browser');
    }
    toast.loading('Detecting live location...', { id: 'geoToast' });
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        if (isDelivery) {
          setReqForm(prev => ({ ...prev, delivery_latitude: latitude, delivery_longitude: longitude }));
        } else {
          setForm(prev => ({ ...prev, pickup_latitude: latitude, pickup_longitude: longitude }));
        }
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18`);
          const data = await res.json();
          let addr = data.address;
          let detectedCity = addr.county || addr.state_district || addr.city || 'Chennai';
          detectedCity = detectedCity.replace(' District', '');

          // Detailed Street + Area address
          const street = addr.road || addr.pedestrian || addr.building || '';
          const area = addr.suburb || addr.neighbourhood || addr.village || addr.subdistrict || addr['sub-district'] || '';
          const fullAddr = [street, area].filter(Boolean).join(', ');
          
          if (isDelivery) {
              setReqForm(prev => ({ ...prev, delivery_city: detectedCity, delivery_address: fullAddr }));
          } else {
              setForm(prev => ({ ...prev, pickup_city: detectedCity, pickup_address: fullAddr }));
          }

          if (TAMIL_NADU_DISTRICTS.includes(detectedCity)) {
            toast.success(`Location: ${fullAddr || detectedCity}`, { id: 'geoToast' });
          } else {
            toast.success('Address auto-filled!', { id: 'geoToast' });
          }
        } catch (err) {
          toast.success('Live coordinates saved!', { id: 'geoToast' });
        }
      },
      () => toast.error('Failed to get location. Please allow permissions.', { id: 'geoToast' })
    );
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await donationsAPI.create(form);
      toast.success('Donation added successfully!');
      setShowAddModal(false);
      fetchDonations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add donation');
    }
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    try {
      await requestsAPI.create({ ...reqForm, donation_id: selectedDonation.id });
      toast.success('Food request submitted successfully! Pending approval.');
      setShowRequestModal(false);
      fetchDonations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to request food');
    }
  };

  const openRequestModal = (donation) => {
    setSelectedDonation(donation);
    setReqForm(prev => ({ ...prev, quantity_requested: Math.min(donation.quantity, 1) }));
    setShowRequestModal(true);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{user.role === 'donor' ? 'My Donations' : 'Available Food'}</h1>
          <p className="page-subtitle">
            {user.role === 'donor' ? 'Manage the food you are sharing with the community' : 'Browse and request food donations near you'}
          </p>
        </div>
        {user.role === 'donor' && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            + Add Donation
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner"></div></div>
      ) : donations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🍱</div>
          <div className="empty-state-title">No Donations Found</div>
          <p className="empty-state-text">
            {user.role === 'donor' ? "You haven't added any food donations yet. Click the button above to start sharing." : "There are currently no available food donations in your area. Please check back later."}
          </p>
          {user.role === 'donor' && (
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>+ Add First Donation</button>
          )}
        </div>
      ) : (
        <div className="grid grid-auto">
          {donations.map(d => (
            <div key={d.id} className="food-card">
              <div className="food-card-image">
                {d.food_type === 'cooked_meals' ? '🍲' : d.food_type === 'raw_produce' ? '🥬' : d.food_type === 'bakery' ? '🥐' : '🍱'}
                {(!d.is_available || d.quantity_remaining <= 0) && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--gray-700)' }}>
                    STOCK OUT
                  </div>
                )}
              </div>
              <div className="food-card-body">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="food-card-title truncate" title={d.title}>{d.title}</h3>
                  <span className={`badge ${d.condition === 'excellent' ? 'badge-success' : d.condition === 'good' ? 'badge-primary' : 'badge-warning'}`}>
                    {d.condition}
                  </span>
                </div>
                
                <div className="food-card-meta">
                  <div className="food-card-meta-item">
                    <span className="icon">👤</span> {d.donor_name}
                  </div>
                  <div className="food-card-meta-item">
                    <span className="icon">📍</span> {d.pickup_city}
                  </div>
                  <div className="food-card-meta-item">
                    <span className="icon">⏳</span> Expires: {new Date(d.expiry_time).toLocaleString()}
                  </div>
                  <div className="food-card-meta-item">
                    <span className="icon">📦</span> {d.quantity_remaining} / {d.quantity} {d.quantity_unit} left
                  </div>
                </div>

                <div className="food-card-footer">
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--gray-500)' }}>
                    Added {new Date(d.created_at).toLocaleDateString()}
                  </div>
                  {user.role === 'receiver' && d.quantity_remaining > 0 && d.is_available && (
                    <button className="btn btn-primary btn-sm" onClick={() => openRequestModal(d)}>
                      Request Food
                    </button>
                  )}
                  {user.role === 'donor' && (
                    <span className="badge badge-gray">{d.request_count} Requests</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Donation Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Add Food Donation</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Food Title <span className="required">*</span></label>
                  <input className="form-control" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required placeholder="e.g. Fresh Chicken Biryani" />
                </div>
                <div className="grid grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-control" value={form.food_type} onChange={e => setForm({...form, food_type: e.target.value})}>
                      <option value="cooked_meals">Cooked Meals</option>
                      <option value="raw_produce">Raw Produce</option>
                      <option value="packaged_food">Packaged Food</option>
                      <option value="bakery">Bakery</option>
                      <option value="dairy">Dairy</option>
                      <option value="beverages">Beverages</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Condition</label>
                    <select className="form-control" value={form.condition} onChange={e => setForm({...form, condition: e.target.value})}>
                      <option value="excellent">Excellent / Fresh</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="needs_immediate_use">Needs Immediate Use</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">Quantity <span className="required">*</span></label>
                    <input type="number" min="1" className="form-control" value={form.quantity} onChange={e => setForm({...form, quantity: parseInt(e.target.value)})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit</label>
                    <input className="form-control" value={form.quantity_unit} onChange={e => setForm({...form, quantity_unit: e.target.value})} placeholder="e.g. servings, kg, packets" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Expiry Time <span className="required">*</span></label>
                  <input type="datetime-local" className="form-control" value={form.expiry_time} onChange={e => setForm({...form, expiry_time: e.target.value})} required />
                </div>
                <div className="grid grid-cols-2">
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      Pickup Address <span className="required">*</span>
                      <button type="button" onClick={() => handleGetLocation(false)} className="text-primary text-xs font-bold hover:underline bg-transparent border-none cursor-pointer flex items-center gap-1">📍 Get Live Location</button>
                    </label>
                    <input className="form-control" value={form.pickup_address} onChange={e => setForm({...form, pickup_address: e.target.value})} required placeholder="123 Example Street" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">District <span className="required">*</span></label>
                    <select className="form-control" value={form.pickup_city} onChange={e => setForm({...form, pickup_city: e.target.value})} required>
                      {TAMIL_NADU_DISTRICTS.map(dist => <option key={dist} value={dist}>{dist}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group mb-0">
                  <label className="form-label">Additional Info</label>
                  <textarea className="form-control" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Ingredients, dietary info, special instructions..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Donation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Food Modal */}
      {showRequestModal && selectedDonation && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowRequestModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Request Food</h2>
              <button className="modal-close" onClick={() => setShowRequestModal(false)}>×</button>
            </div>
            <form onSubmit={handleRequestSubmit}>
              <div className="modal-body">
                <div className="alert alert-info">
                  <strong>{selectedDonation.title}</strong> - Stock remaining: {selectedDonation.quantity_remaining} {selectedDonation.quantity_unit}
                </div>
                
                <div className="grid grid-cols-2 mt-4">
                  <div className="form-group">
                    <label className="form-label">Quantity Needed <span className="required">*</span></label>
                    <input type="number" min="1" max={selectedDonation.quantity_remaining} className="form-control" value={reqForm.quantity_requested} onChange={e => setReqForm({...reqForm, quantity_requested: parseInt(e.target.value)})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Urgency (1 = Low, 5 = Critical)</label>
                    <select className="form-control" value={reqForm.urgency_level} onChange={e => setReqForm({...reqForm, urgency_level: parseInt(e.target.value)})}>
                      <option value="1">1 - Low</option>
                      <option value="2">2 - Normal</option>
                      <option value="3">3 - Moderate</option>
                      <option value="4">4 - High</option>
                      <option value="5">5 - Critical</option>
                    </select>
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    Delivery Address <span className="required">*</span>
                    <button type="button" onClick={() => handleGetLocation(true)} className="text-primary text-xs font-bold hover:underline bg-transparent border-none cursor-pointer flex items-center gap-1">📍 Get Live Location</button>
                  </label>
                  <input className="form-control" value={reqForm.delivery_address} onChange={e => setReqForm({...reqForm, delivery_address: e.target.value})} required placeholder="Where should the volunteer deliver this?" />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label">District <span className="required">*</span></label>
                  <select className="form-control" value={reqForm.delivery_city} onChange={e => setReqForm({...reqForm, delivery_city: e.target.value})} required>
                    {TAMIL_NADU_DISTRICTS.map(dist => <option key={dist} value={dist}>{dist}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRequestModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DonationsPage;
