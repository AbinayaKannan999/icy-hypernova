import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../context/AuthContext';

const AppLayout = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 99, display: 'none'
          }}
          className="mobile-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <button 
        style={{ 
          position: 'fixed', bottom: 24, right: 24, zIndex: 100, 
          background: 'var(--primary-600)', color: 'white', border: 'none', 
          borderRadius: '24px', padding: '10px 20px', fontWeight: 700, 
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', cursor: 'pointer' 
        }}
        onClick={() => window.location.href = 'mailto:support@foodbridge.com?subject=Support%20Request'}
      >
        💬 Contact Support
      </button>
    </div>
  );
};

export default AppLayout;
