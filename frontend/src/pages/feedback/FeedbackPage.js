import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { feedbackAPI, requestsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const FeedbackPage = () => {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState([]);
  const [completedRequests, setCompletedRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ averageRating: 0, totalFeedback: 0 });
  const [showModal, setShowModal] = useState(false);
  
  const [form, setForm] = useState({
    rating: 5, comment: '', request_id: '', reviewee_id: '', feedback_type: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const fbRes = await feedbackAPI.getUserFeedback(user.id);
      setFeedbacks(fbRes.data.data.feedback);
      setStats(fbRes.data.data.stats);

      const reqRes = await requestsAPI.getAll();
      setCompletedRequests(reqRes.data.data.requests.filter(r => r.status === 'completed'));
    } catch (err) {
      toast.error('Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await feedbackAPI.create(form);
      toast.success('Feedback submitted successfully!');
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit feedback');
    }
  };

  const openReviewModal = (req, type) => {
    const roleIdMap = { donor: req.donor_id, volunteer: req.volunteer_id, receiver: req.receiver_id };
    setForm({
      rating: 5,
      comment: '',
      request_id: req.id,
      reviewee_id: roleIdMap[type],
      feedback_type: type
    });
    setShowModal(true);
  };

  const getMissingReviews = () => {
    const reviewed = feedbacks.map(f => `${f.request_id}-${f.feedback_type}`);
    return completedRequests.filter(r => {
      if (user.role === 'donor') return !reviewed.includes(`${r.id}-receiver`) || !reviewed.includes(`${r.id}-volunteer`);
      if (user.role === 'volunteer') return !reviewed.includes(`${r.id}-receiver`) || !reviewed.includes(`${r.id}-donor`);
      if (user.role === 'receiver') return !reviewed.includes(`${r.id}-donor`) || !reviewed.includes(`${r.id}-volunteer`);
      return false;
    });
  };

  const missing = getMissingReviews();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Community Feedback</h1>
          <p className="page-subtitle">View your ratings and review others</p>
        </div>
      </div>

      <div className="grid grid-cols-2 mb-6">
        <div className="card bg-primary-50 border-primary-200">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-3xl shadow-sm leading-none pt-1">
              ⭐
            </div>
            <div>
              <div className="text-3xl font-extrabold text-primary-700">{stats.averageRating} <span className="text-lg text-primary-400">/ 5.0</span></div>
              <div className="text-sm font-semibold text-primary-600 uppercase tracking-widest mt-1">Average Rating</div>
            </div>
          </div>
        </div>
        <div className="card bg-accent-teal-light border-accent-teal">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-3xl shadow-sm leading-none pt-1">
              💬
            </div>
            <div>
              <div className="text-3xl font-extrabold text-teal-800">{stats.totalFeedback}</div>
              <div className="text-sm font-semibold text-teal-700 uppercase tracking-widest mt-1">Total Reviews</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Missing Reviews list */}
        <div className="card h-full">
          <div className="card-header border-b pb-3 mb-4">
            <div>
              <h3 className="card-title text-base">Pending Reviews ({missing.length})</h3>
              <p className="card-subtitle text-xs">Help the community by reviewing your recent interactions</p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {missing.length === 0 ? (
              <div className="text-center p-6 text-gray-500 text-sm">You're all caught up! No pending reviews.</div>
            ) : (
              missing.map(m => (
                <div key={m.id} className="border p-3 rounded-lg bg-gray-50 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-sm">{m.donation_title}</div>
                    <div className="text-xs text-gray-500 mt-1">{new Date(m.completed_at).toLocaleDateString()}</div>
                  </div>
                  <div className="flex gap-2">
                    {user.role !== 'donor' && <button className="btn btn-primary btn-sm rounded-full px-3 py-1" onClick={() => openReviewModal(m, 'donor')}>Review Donor</button>}
                    {user.role !== 'volunteer' && m.volunteer_id && <button className="btn btn-secondary text-teal-700 border-teal-300 btn-sm rounded-full px-3 py-1 bg-white" onClick={() => openReviewModal(m, 'volunteer')}>Review Volunteer</button>}
                    {user.role !== 'receiver' && <button className="btn btn-secondary text-primary-700 border-primary-300 bg-white btn-sm rounded-full px-3 py-1" onClick={() => openReviewModal(m, 'receiver')}>Review Receiver</button>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Received Feedback history */}
        <div className="card h-full">
          <div className="card-header border-b pb-3 mb-4">
            <h3 className="card-title text-base">What people are saying</h3>
          </div>
          <div className="flex flex-col gap-4">
            {feedbacks.length === 0 ? (
              <div className="text-center p-6 text-gray-500 text-sm">No feedback received yet.</div>
            ) : (
              feedbacks.map(f => (
                <div key={f.id} className="flex gap-3 border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                  <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold flex-shrink-0 mt-1">
                    {f.reviewer_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div className="font-semibold text-sm text-gray-900">{f.reviewer_name}</div>
                      <div className="text-xs text-gray-500">{new Date(f.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="flex items-center gap-1 mt-1 mb-2">
                      {[1,2,3,4,5].map(s => (
                        <span key={s} className={`text-sm ${s <= f.rating ? 'text-warning' : 'text-gray-300'}`}>★</span>
                      ))}
                    </div>
                    {f.comment && <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded italic">"{f.comment}"</div>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header pb-3">
              <h2 className="modal-title text-lg">Leave a Review</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="text-center mb-6">
                  <div className="text-sm text-gray-500 mb-2 uppercase tracking-wide font-semibold text-primary">Rate your experience</div>
                  <div className="flex justify-center gap-2 cursor-pointer text-4xl">
                    {[1,2,3,4,5].map(s => (
                      <span 
                        key={s} 
                        onClick={() => setForm({...form, rating: s})}
                        className={`transition-colors hover:scale-110 ${s <= form.rating ? 'text-warning' : 'text-gray-300'}`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="form-group mb-0">
                  <label className="form-label text-sm">Comment (Optional)</label>
                  <textarea 
                    className="form-control" 
                    placeholder="Share your experience..." 
                    value={form.comment} 
                    onChange={e => setForm({...form, comment: e.target.value})} 
                    rows={4}
                  />
                </div>
              </div>
              <div className="modal-footer pt-3">
                <button type="button" className="btn btn-secondary w-full" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary w-full">Submit Feedback</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackPage;
