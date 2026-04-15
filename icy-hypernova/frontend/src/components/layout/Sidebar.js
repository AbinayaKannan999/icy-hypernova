import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const roleNavItems = {
  admin: [
    { section: 'Overview', items: [
      { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
      { to: '/analytics', label: 'Analytics', icon: '📊' }
    ]},
    { section: 'Management', items: [
      { to: '/donations', label: 'Donations', icon: '🍱' },
      { to: '/requests', label: 'Requests', icon: '📋' },
      { to: '/deliveries', label: 'Deliveries', icon: '🚚' }
    ]},
    { section: 'Admin', items: [
      { to: '/users', label: 'Users', icon: '👥' },
      { to: '/feedback', label: 'Feedback', icon: '⭐' }
    ]}
  ],
  donor: [
    { section: 'Overview', items: [
      { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
      { to: '/analytics', label: 'My Impact', icon: '📊' }
    ]},
    { section: 'Donations', items: [
      { to: '/donations', label: 'My Donations', icon: '🍱' },
      { to: '/requests', label: 'Requests', icon: '📋' }
    ]},
    { section: 'Community', items: [
      { to: '/feedback', label: 'Reviews', icon: '⭐' }
    ]}
  ],
  volunteer: [
    { section: 'Overview', items: [
      { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
      { to: '/analytics', label: 'My Stats', icon: '📊' }
    ]},
    { section: 'Operations', items: [
      { to: '/deliveries', label: 'My Deliveries', icon: '🚚' },
      { to: '/requests', label: 'Available', icon: '📋' }
    ]},
    { section: 'Community', items: [
      { to: '/feedback', label: 'Reviews', icon: '⭐' }
    ]}
  ],
  receiver: [
    { section: 'Overview', items: [
      { to: '/dashboard', label: 'Dashboard', icon: '🏠' }
    ]},
    { section: 'Food', items: [
      { to: '/donations', label: 'Find Food', icon: '🍱' },
      { to: '/requests', label: 'My Requests', icon: '📋' }
    ]},
    { section: 'Account', items: [
      { to: '/feedback', label: 'Give Feedback', icon: '⭐' }
    ]}
  ]
};

const RoleBadge = ({ role }) => {
  const colors = {
    admin: { bg: '#f5f3ff', color: '#6d28d9', label: 'Admin' },
    donor: { bg: '#fef3c7', color: '#92400e', label: 'Donor' },
    volunteer: { bg: '#ccfbf1', color: '#065f46', label: 'Volunteer' },
    receiver: { bg: '#dbeafe', color: '#1e40af', label: 'Receiver' }
  };
  const style = colors[role] || colors.receiver;
  return (
    <span style={{
      background: style.bg, color: style.color,
      padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600
    }}>
      {style.label}
    </span>
  );
};

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = roleNavItems[user?.role] || roleNavItems.receiver;

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Brand */}
      <div className="sidebar-brand" style={{ cursor: 'default' }}>
        <div className="sidebar-brand-icon">🌉</div>
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-name">FoodBridge</span>
          <span className="sidebar-brand-tagline">Food Distribution</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((section) => (
          <div key={section.section} className="sidebar-section">
            <div className="sidebar-section-label">{section.section}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                onClick={onClose}
              >
                <span className="nav-item-icon">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}

        {/* Account section */}
        <div className="sidebar-section">
          <div className="sidebar-section-label">Account</div>
          <NavLink
            to="/profile"
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            onClick={onClose}
          >
            <span className="nav-item-icon">👤</span>
            <span>Profile</span>
          </NavLink>
          <button className="nav-item" onClick={handleLogout} style={{ color: 'var(--error)' }}>
            <span className="nav-item-icon">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </nav>

      {/* User footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{getInitials(user?.name)}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name}</div>
            <RoleBadge role={user?.role} />
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
