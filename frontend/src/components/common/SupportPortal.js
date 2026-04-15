import React, { useState } from 'react';
import toast from 'react-hot-toast';

const SupportPortal = ({ onClose, user }) => {
  const [step, setStep] = useState('menu'); // menu, role_request, bug_report
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ reason: '', desiredRole: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call to support/tickets
    setTimeout(() => {
      toast.success('Support Request Sent! We will contact you soon.');
      setLoading(false);
      onClose();
    }, 1500);
  };

  const renderContent = () => {
    switch(step) {
      case 'role_request':
        return (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <h3 style={{ fontWeight: 800 }}>Role Change Request</h3>
            <p className="text-sm text-gray-500">Current Role: <span className="badge badge-primary">{user?.role}</span></p>
            <div className="form-group">
              <label className="form-label">Desired Role</label>
              <select className="form-control" onChange={e => setFormData({...formData, desiredRole: e.target.value})} required>
                <option value="">Select Role</option>
                <option value="volunteer">Volunteer (I want to deliver food)</option>
                <option value="donor">Donor (I want to give food)</option>
                <option value="receiver">Receiver (I need food)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Reason for Request</label>
              <textarea className="form-control" placeholder="Explain why you want to change your role..." required />
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn btn-secondary flex-1" onClick={() => setStep('menu')}>Back</button>
              <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
                {loading ? 'Sending...' : 'Submit Request'}
              </button>
            </div>
          </form>
        );
      case 'bug_report':
        return (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <h3 style={{ fontWeight: 800 }}>Report an Issue</h3>
            <p className="text-sm text-gray-500">Help us keep FoodBridge stable.</p>
            <div className="form-group">
              <label className="form-label">What happened?</label>
              <textarea className="form-control" rows="4" placeholder="Describe the issue in detail..." required />
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn btn-secondary flex-1" onClick={() => setStep('menu')}>Back</button>
              <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
                {loading ? 'Report Issue' : 'Send Report'}
              </button>
            </div>
          </form>
        );
      default:
        return (
          <div className="flex flex-col gap-3">
            <h3 style={{ fontWeight: 800, marginBottom: 8 }}>How can we help?</h3>
            <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: '16px' }} onClick={() => setStep('role_request')}>
              🔄 Request Role Change
            </button>
            <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: '16px' }} onClick={() => setStep('bug_report')}>
              🐛 Report a Bug / Issue
            </button>
            <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: '16px' }} onClick={() => window.open('https://foodbridge.atlassian.net/servicedesk')}>
              📚 Visit Help Center
            </button>
            <div style={{ marginTop: 16, padding: 12, background: 'var(--gray-50)', borderRadius: 12, border: '1px dashed var(--gray-300)' }}>
               <div className="flex items-center gap-2 text-sm">
                  <div style={{ width: 8, height: 8, background: 'var(--success)', borderRadius: '50%' }} />
                  <strong>24/7 Priority Support</strong>
               </div>
               <p style={{ fontSize: '10px', color: 'var(--gray-500)', marginTop: 4 }}>Standard response time: {'<'} 2 hours</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="card" style={{ width: '400px', maxWidth: '90vw', padding: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', border: 'none' }}>
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div style={{ fontSize: '2rem' }}>👨‍💻</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>Support Portal</div>
              <div style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 600 }}>SYSTEMS ONLINE</div>
            </div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
        </div>
        {renderContent()}
      </div>
    </div>
  );
};

export default SupportPortal;
