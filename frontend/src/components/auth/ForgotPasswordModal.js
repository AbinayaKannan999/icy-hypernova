import React, { useState } from 'react';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';

const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1); // 1: Phone, 2: OTP, 3: Reset
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    phone: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });

  if (!isOpen) return null;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    if (!form.phone || form.phone.length < 10) return toast.error('Please enter a valid phone number');
    
    setLoading(true);
    try {
      const res = await authAPI.forgotPassword({ phone: form.phone });
      toast.success(res.data.message);
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (form.otp.length !== 6) return toast.error('Please enter 6-digit OTP');
    
    setLoading(true);
    try {
      await authAPI.verifyOTP({ phone: form.phone, otp: form.otp });
      toast.success('OTP verified!');
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) return toast.error('Passwords do not match');
    if (form.newPassword.length < 6) return toast.error('Password must be at least 6 characters');

    setLoading(true);
    try {
      await authAPI.resetPassword({
        phone: form.phone,
        otp: form.otp,
        newPassword: form.newPassword
      });
      toast.success('Password reset successfully! You can now log in.');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '440px', background: 'white', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden', animation: 'slideUp 0.3s ease-out' }}>
        
        <div style={{ padding: '24px', borderBottom: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Reset Password</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
        </div>

        <div style={{ padding: '32px' }}>
          {step === 1 && (
            <form onSubmit={handleRequestOTP}>
              <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem', marginBottom: '24px' }}>Enter your registered phone number to receive a 6-digit verification code.</p>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <div style={{ display: 'flex', border: '1px solid var(--gray-300)', borderRadius: '12px', overflow: 'hidden' }}>
                    <span style={{ padding: '10px 14px', background: 'var(--gray-50)', borderRight: '1px solid var(--gray-300)', color: 'var(--gray-500)', fontSize: '0.9rem' }}>+91</span>
                    <input name="phone" type="tel" className="form-control" style={{ border: 'none' }} placeholder="98765 43210" value={form.phone} onChange={handleChange} required />
                </div>
              </div>
              <button type="submit" className={`btn btn-primary w-full btn-lg${loading ? ' btn-loading' : ''}`} disabled={loading}>
                Send OTP →
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOTP}>
              <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem', marginBottom: '24px' }}>Verification code sent to <strong>+91 {form.phone}</strong>. Enter it below.</p>
              <div className="form-group">
                <label className="form-label">Enter 6-Digit OTP</label>
                <input name="otp" type="text" maxLength="6" className="form-control" style={{ fontSize: '1.5rem', textAlign: 'center', letterSpacing: '8px', fontWeight: 900 }} placeholder="000000" value={form.otp} onChange={handleChange} required />
              </div>
              <button type="submit" className={`btn btn-primary w-full btn-lg${loading ? ' btn-loading' : ''}`} disabled={loading}>
                Verify OTP
              </button>
              <button type="button" onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--primary-600)', width: '100%', marginTop: '16px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>Change Number</button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleResetPassword}>
              <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem', marginBottom: '24px' }}>Verification successful! You can now choose a secure new password.</p>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input name="newPassword" type="password" className="form-control" placeholder="••••••••" value={form.newPassword} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input name="confirmPassword" type="password" className="form-control" placeholder="••••••••" value={form.confirmPassword} onChange={handleChange} required />
              </div>
              <button type="submit" className={`btn btn-primary w-full btn-lg${loading ? ' btn-loading' : ''}`} disabled={loading}>
                Set New Password
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
