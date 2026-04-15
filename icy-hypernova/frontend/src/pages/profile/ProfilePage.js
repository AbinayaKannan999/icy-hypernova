import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usersAPI, authAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { TAMIL_NADU_DISTRICTS } from '../../utils/constants';

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    city: user?.city || 'Chennai',
    state: user?.state || 'Tamil Nadu',
    address: user?.address || '',
    latitude: user?.latitude || null,
    longitude: user?.longitude || null
  });

  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val.length <= 10) setForm(prev => ({ ...prev, phone: val }));
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      return toast.error('Geolocation is not supported by your browser');
    }
    setLoading(true);
    toast.loading('Detecting live location...', { id: 'geoToast' });
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setForm(prev => ({ ...prev, latitude, longitude }));
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18`);
          const data = await res.json();
          let addr = data.address;
          let detectedCity = addr.county || addr.state_district || addr.city || 'Chennai';
          detectedCity = detectedCity.replace(' District', '');

          const street = addr.road || addr.pedestrian || addr.building || '';
          const area = addr.suburb || addr.neighbourhood || addr.village || '';
          const fullAddr = [street, area].filter(Boolean).join(', ');

          if (TAMIL_NADU_DISTRICTS.includes(detectedCity)) {
            setForm(prev => ({ ...prev, city: detectedCity, state: 'Tamil Nadu', address: fullAddr }));
            toast.success(`Found your street: ${fullAddr || detectedCity}`, { id: 'geoToast' });
          } else {
            setForm(prev => ({ ...prev, address: fullAddr }));
            toast.success('Address auto-filled!', { id: 'geoToast' });
          }
        } catch (err) {
          toast.success('Address set via coordinates!', { id: 'geoToast' });
        } finally {
          setLoading(false);
        }
      },
      () => {
        toast.error('Failed to get location. Please allow permissions.', { id: 'geoToast' });
        setLoading(false);
      }
    );
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await usersAPI.updateProfile(form);
      updateUser(res.data.data.user);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      return toast.error('New passwords do not match');
    }
    setPwLoading(true);
    try {
      await authAPI.changePassword({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword
      });
      toast.success('Password changed successfully');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Account Settings</h1>
          <p className="page-subtitle">Manage your personal information and security</p>
        </div>
      </div>

      <div className="grid grid-cols-2" style={{ gap: '24px' }}>
        <div className="card">
          <div className="card-header border-b pb-4 mb-4">
            <h3 className="card-title text-lg">Personal Information</h3>
          </div>
          <form onSubmit={handleProfileUpdate}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input 
                className="form-control" 
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})} 
                required 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address (Read-only)</label>
              <input 
                className="form-control bg-gray-50 text-gray-500 cursor-not-allowed" 
                value={user?.email || ''} 
                readOnly 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <div style={{ display: 'flex', border: '1px solid var(--gray-300)', background: 'var(--white)', borderRadius: 'var(--radius-md)', overflow: 'hidden', transition: 'border-color 0.2s', focusWithin: { borderColor: 'var(--primary-500)', ring: '4px solid var(--primary-100)' } }}>
                <span style={{ padding: '10px 14px', background: 'var(--gray-50)', borderRight: '1px solid var(--gray-300)', color: 'var(--gray-600)', fontWeight: 600, fontSize: '0.95rem' }}>+91</span>
                <input name="phone" type="tel" pattern="[0-9]*" inputMode="numeric" style={{ flex: 1, border: 'none', background: 'transparent', padding: '10px 14px', fontSize: '0.95rem', outline: 'none' }} placeholder="98765 43210" value={form.phone} onChange={handlePhoneChange} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Road / Street Name</label>
              <input className="form-control" placeholder="Street name and Area auto-filled" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <div className="flex justify-between items-center mb-1">
                  <label className="form-label" style={{ marginBottom: 0 }}>District</label>
                  <button type="button" onClick={handleGetLocation} className="text-primary text-xs font-bold hover:underline bg-transparent border-none cursor-pointer flex items-center gap-1">📍 Live Location</button>
                </div>
                <select className="form-control" value={form.city} onChange={e => setForm({...form, city: e.target.value})}>
                  {TAMIL_NADU_DISTRICTS.map(dist => (
                    <option key={dist} value={dist}>{dist}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">State</label>
                <input className="form-control bg-gray-50 text-gray-500 cursor-not-allowed" value="Tamil Nadu" readOnly />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button type="submit" className={`btn btn-primary px-8${loading ? ' btn-loading' : ''}`} disabled={loading}>
                {!loading && 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        <div className="card">
          <div className="card-header border-b pb-4 mb-4">
            <h3 className="card-title text-lg">Change Password</h3>
          </div>
          <form onSubmit={handlePasswordUpdate}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input 
                type="password" 
                className="form-control" 
                value={pwForm.currentPassword} 
                onChange={e => setPwForm({...pwForm, currentPassword: e.target.value})} 
                required 
              />
            </div>
            <div className="form-group focus-within:ring-primary">
              <label className="form-label">New Password</label>
              <input 
                type="password" 
                className="form-control" 
                value={pwForm.newPassword} 
                onChange={e => setPwForm({...pwForm, newPassword: e.target.value})} 
                required 
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input 
                type="password" 
                className="form-control" 
                value={pwForm.confirmPassword} 
                onChange={e => setPwForm({...pwForm, confirmPassword: e.target.value})} 
                required 
                minLength={6}
              />
            </div>
            <div className="flex justify-end mt-4">
              <button type="submit" className={`btn btn-secondary text-primary border-primary-300 bg-primary-50 px-8${pwLoading ? ' btn-loading' : ''}`} disabled={pwLoading}>
                {!pwLoading && 'Update Password'}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <h4 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wider">Account Role</h4>
            <div className="bg-gray-50 p-4 rounded-lg flex items-center gap-4 border border-gray-200">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-2xl shadow-sm leading-none border">
                {user?.role === 'admin' ? '👑' : user?.role === 'donor' ? '🌟' : user?.role === 'volunteer' ? '🚚' : '🤝'}
              </div>
              <div>
                <div className="font-bold text-gray-900 capitalize">{user?.role}</div>
                <div className="text-sm text-gray-500">Contact support to change your role.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
