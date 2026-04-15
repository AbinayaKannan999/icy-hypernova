import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useSocket } from '../../context/SocketContext';

const pageTitles = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Overview of your activities' },
  '/donations': { title: 'Food Donations', subtitle: 'Manage food donations' },
  '/requests': { title: 'Food Requests', subtitle: 'Track and manage requests' },
  '/deliveries': { title: 'Deliveries', subtitle: 'Delivery tracking and management' },
  '/analytics': { title: 'Analytics', subtitle: 'Insights and impact metrics' },
  '/users': { title: 'User Management', subtitle: 'Manage all platform users' },
  '/feedback': { title: 'Feedback & Reviews', subtitle: 'Community ratings and comments' },
  '/profile': { title: 'My Profile', subtitle: 'Manage your account settings' }
};

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const notifIcons = {
  donation_added: '🌟', request_received: '📦', request_accepted: '✅',
  request_rejected: '❌', delivery_assigned: '🚚', delivery_started: '🎒',
  delivery_completed: '✨', feedback_received: '⭐', system: '📢'
};

const Header = ({ onMenuClick }) => {
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { connected } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);
  
  const pageInfo = pageTitles[location.pathname] || { title: 'FoodBridge', subtitle: '' };

  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header className="header">
      <div className="flex items-center gap-3">
        <button
          className="header-btn"
          style={{ display: 'none' }}
          id="mobile-menu-btn"
          onClick={onMenuClick}
        >
          ☰
        </button>
        <div>
          <div className="header-title">{pageInfo.title}</div>
          <div className="header-subtitle">{pageInfo.subtitle}</div>
        </div>
      </div>

      <div className="header-actions">
        {/* Connection status */}
        <div className="flex items-center gap-2" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--gray-500)' }}>
          <div className={`status-dot ${connected ? 'online' : 'offline'}`} />
          <span>{connected ? 'Live' : 'Offline'}</span>
        </div>

        {/* Notifications */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button
            className="header-btn"
            id="notifications-btn"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            🔔
            {unreadCount > 0 && <div className="notification-dot" />}
          </button>

          {showNotifications && (
            <div className="notifications-panel">
              <div className="notifications-header">
                <span style={{ fontWeight: 700, fontSize: 'var(--font-size-base)' }}>
                  Notifications
                  {unreadCount > 0 && (
                    <span className="badge badge-primary" style={{ marginLeft: 8 }}>{unreadCount}</span>
                  )}
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    style={{ fontSize: 'var(--font-size-xs)', color: 'var(--primary-600)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--gray-400)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔔</div>
                    <div style={{ fontSize: 'var(--font-size-sm)' }}>No notifications yet</div>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      className={`notification-item${!n.is_read ? ' unread' : ''}`}
                      onClick={() => { markAsRead(n.id); setShowNotifications(false); }}
                    >
                      <div className="notification-icon">{notifIcons[n.type] || '🔔'}</div>
                      <div className="notification-content flex-1 min-w-0">
                        <div className="title truncate">{n.title}</div>
                        <div className="message" style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {n.message}
                        </div>
                        <div className="time">{timeAgo(n.created_at)}</div>
                      </div>
                      {!n.is_read && (
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary-500)', flexShrink: 0, marginTop: 4 }} />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User avatar */}
        <button
          className="header-btn"
          id="profile-btn"
          onClick={() => navigate('/profile')}
          style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-400), var(--primary-600))', border: 'none', color: 'white', fontWeight: 700, fontSize: 'var(--font-size-sm)' }}
        >
          {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
        </button>
      </div>
    </header>
  );
};

export default Header;
