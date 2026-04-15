import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationsAPI } from '../services/api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import toast from 'react-hot-toast';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const { on, off } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await notificationsAPI.getAll({ limit: 20 });
      setNotifications(res.data.data.notifications);
      setUnreadCount(res.data.data.unreadCount);
    } catch (err) {
      // Silent fail
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Listen for real-time notifications
  useEffect(() => {
    const handleNotification = (notification) => {
      setNotifications(prev => [notification, ...prev.slice(0, 19)]);
      setUnreadCount(prev => prev + 1);
      
      // Show toast notification
      const icons = {
        donation_added: '🌟',
        request_received: '📦',
        request_accepted: '✅',
        request_rejected: '❌',
        delivery_assigned: '🚚',
        delivery_started: '🎒',
        delivery_completed: '✨',
        feedback_received: '⭐',
        system: '📢'
      };
      
      toast.custom((t) => (
        <div
          style={{
            background: 'white',
            padding: '12px 16px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
            border: '1px solid #e5e7eb',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
            maxWidth: '360px',
            borderLeft: '4px solid #7c3aed',
            opacity: t.visible ? 1 : 0,
            transition: 'opacity 0.3s'
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>{icons[notification.type] || '🔔'}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#1f2937', marginBottom: 2 }}>
              {notification.title}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>{notification.message}</div>
          </div>
        </div>
      ), { duration: 5000 });
    };

    on('notification', handleNotification);
    return () => off('notification', handleNotification);
  }, [on, off]);

  const markAsRead = useCallback(async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {}
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
