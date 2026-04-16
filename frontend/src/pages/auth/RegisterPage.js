import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { TAMIL_NADU_DISTRICTS } from '../../utils/constants';
import MapPicker from '../../components/common/MapPicker';

const ROLES = [
  { value: 'donor', label: 'Donor', icon: '🎁', desc: 'Listing surplus food' },
  { value: 'receiver', label: 'Receiver', icon: '🥣', desc: 'Direct pickup & discovery' }
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
          <div className="auth-brand-icon" style={{ background: 'white', color: 'var(--primary-600)' }}>🌉</div>
          <h1 className="auth-brand-name">Join FoodBridge</h1>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '32px', borderRadius: '24px', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '16px', lineHeight: 1.2 }}>
              "Every action is a bridge where surplus becomes hope."
            </div>
            <div style={{ fontSize: '1rem', opacity: 0.8 }}>Join the humanitarian movement.</div>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-container">
          <h2 className="auth-title">Create account</h2>
          <p className="auth-subtitle">Join the FoodBridge community today</p>

          <form onSubmit={handleSubmit}>
            {/* Map Picker Module */}
            <div className="form-group">
              <label className="form-label">Default Handover Pin <span className="required">*</span></label>
              <div style={{ height: '300px', marginBottom: '16px' }}>
                <MapPicker 
                  onLocationSelect={(data) => setForm(prev => ({ 
                    ...prev, 
                    latitude: data.lat, 
                    longitude: data.lng,
                    address: data.address || prev.address,
                    city: data.city || prev.city,
                    state: data.state || prev.state
                  }))}
                />
              </div>
              <p className="form-hint">Set your business or home GPS pin for accurate discovery & navigation.</p>
            </div>

            {/* Role Selection */}
            <div className="form-group">
              <label className="form-label">Join as <span className="required">*</span></label>
              <div className="role-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                {ROLES.map(role => (
                  <label key={role.value} className="role-option">
                    <input
                      type="radio"
                      name="role"
                      value={role.value}
                      checked={form.role === role.value}
                      onChange={handleChange}
                    />
                    <div className="role-card" style={{ border: form.role === role.value ? '2px solid var(--primary-600)' : '2px solid var(--gray-200)', background: form.role === role.value ? 'var(--primary-50)' : 'white' }}>
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
                <label className="form-label" htmlFor="reg-city">District (Tamil Nadu) <span className="required">*</span></label>
                <select 
                  id="reg-city" 
                  name="city" 
                  className="form-control" 
                  value={form.city} 
                  onChange={handleChange}
                  required
                >
                  <option value="">Select District</option>
                  {TAMIL_NADU_DISTRICTS.map(district => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="reg-state">State</label>
                <input id="reg-state" name="state" type="text" className="form-control" value="Tamil Nadu" readOnly />
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
