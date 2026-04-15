import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { TAMIL_NADU_DISTRICTS } from '../../utils/constants';

const ROLES = [
  { value: 'donor', label: 'Donor', icon: '🌟', desc: 'Share surplus food' },
  { value: 'volunteer', label: 'Volunteer', icon: '🚚', desc: 'Deliver food to recipients' },
  { value: 'receiver', label: 'Receiver', icon: '🤝', desc: 'Request food assistance' }
];

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'receiver',
    phone: '', city: 'Chennai', state: 'Tamil Nadu', address: '', latitude: null, longitude: null
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handlePhoneChange = (e) => {
    // Only allow numbers
    const val = e.target.value.replace(/\D/g, '');
    if (val.length <= 10) {
      setForm(prev => ({ ...prev, phone: val }));
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setLoading(true);
    toast.loading('Detecting live location...', { id: 'geoToast' });
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setForm(prev => ({ ...prev, latitude, longitude }));
        
        try {
          // Reverse geocoding to find district using OpenStreetMap Free API
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18`);
          const data = await res.json();
          let addr = data.address;
          let detectedCity = addr.county || addr.state_district || addr.city || 'Chennai';
          detectedCity = detectedCity.replace(' District', '');
          
          // Construct Detailed Address (House, Street, Area)
          const street = addr.road || addr.pedestrian || '';
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
          toast.success('Live coordinates saved!', { id: 'geoToast' });
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        toast.error('Failed to get location. Please allow permissions.', { id: 'geoToast' });
        setLoading(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const user = await register(form);
      toast.success(`Welcome to FoodBridge, ${user.name}! 🎉`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-brand-icon">🌉</div>
          <h1 className="auth-brand-name">Join FoodBridge</h1>
          <div style={{ marginTop: '40px', fontStyle: 'italic', opacity: 0.9, lineHeight: 1.6 }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 300, marginBottom: '16px' }}>
              "Cutting food waste is a delicious way to help save our planet."
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8, textAlign: 'right' }}>— Tristram Stuart</div>
          </div>
        </div>
      </div>

      <div className="auth-right" style={{ width: 560 }}>
        <div className="auth-form-container" style={{ maxWidth: 460 }}>
          <h2 className="auth-title">Create account</h2>
          <p className="auth-subtitle">Join the FoodBridge community today</p>

          <form onSubmit={handleSubmit}>
            {/* Role Selection */}
            <div className="form-group">
              <label className="form-label">I want to join as <span className="required">*</span></label>
              <div className="role-grid">
                {ROLES.map(role => (
                  <label key={role.value} className="role-option">
                    <input
                      type="radio"
                      name="role"
                      value={role.value}
                      checked={form.role === role.value}
                      onChange={handleChange}
                    />
                    <div className="role-card">
                      <div className="role-card-icon">{role.icon}</div>
                      <div className="role-card-name">{role.label}</div>
                      <div className="role-card-desc">{role.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-address">Street Address / Landmark</label>
              <input id="reg-address" name="address" type="text" className="form-control" placeholder="House No, Street, Landmark" value={form.address} onChange={handleChange} />
            </div>

            <div className="grid grid-cols-2" style={{ gap: '16px 12px', marginBottom: '20px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="reg-name">Full Name <span className="required">*</span></label>
                <input id="reg-name" name="name" type="text" className="form-control" placeholder="John Doe" value={form.name} onChange={handleChange} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="reg-phone">Phone</label>
                <div style={{ display: 'flex', border: '1px solid var(--gray-300)', background: 'var(--white)', borderRadius: 'var(--radius-md)', overflow: 'hidden', transition: 'border-color 0.2s', focusWithin: { borderColor: 'var(--primary-500)', ring: '4px solid var(--primary-100)' } }}>
                  <span style={{ padding: '10px 14px', background: 'var(--gray-50)', borderRight: '1px solid var(--gray-300)', color: 'var(--gray-600)', fontWeight: 600, fontSize: '0.95rem' }}>+91</span>
                  <input id="reg-phone" name="phone" type="tel" pattern="[0-9]*" inputMode="numeric" style={{ flex: 1, border: 'none', background: 'transparent', padding: '10px 14px', fontSize: '0.95rem', outline: 'none' }} placeholder="98765 43210" value={form.phone} onChange={handlePhoneChange} />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">Email Address <span className="required">*</span></label>
              <input id="reg-email" name="email" type="email" className="form-control" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-password">Password <span className="required">*</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  id="reg-password" name="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-control" placeholder="Min. 6 characters, include A-Z, a-z, 0-9"
                  value={form.password} onChange={handleChange} required style={{ paddingRight: 48 }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--gray-500)' }}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2" style={{ gap: '16px 12px', marginBottom: '24px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <div className="flex justify-between items-center mb-1">
                  <label className="form-label" htmlFor="reg-city" style={{ marginBottom: 0 }}>District</label>
                  <button type="button" onClick={handleGetLocation} className="text-primary text-xs font-bold hover:underline bg-transparent border-none cursor-pointer flex items-center gap-1">📍 Live Location</button>
                </div>
                <select id="reg-city" name="city" className="form-control" value={form.city} onChange={handleChange}>
                  {TAMIL_NADU_DISTRICTS.map(dist => (
                    <option key={dist} value={dist}>{dist}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="reg-state">State</label>
                <input id="reg-state" name="state" type="text" className="form-control bg-gray-50 text-gray-500 cursor-not-allowed" value="Tamil Nadu" readOnly />
              </div>
            </div>

            <button type="submit" id="register-btn" className={`btn btn-primary btn-lg w-full${loading ? ' btn-loading' : ''}`} disabled={loading} style={{ marginBottom: 16 }}>
              {loading ? '' : 'Create Account →'}
            </button>
          </form>

          <p style={{ textAlign: 'center', color: 'var(--gray-500)', fontSize: 'var(--font-size-sm)' }}>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
