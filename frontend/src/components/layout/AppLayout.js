import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import MasterMonitorMap from '../common/MasterMonitorMap';
import SupportPortal from '../common/SupportPortal';
import { useAuth } from '../../context/AuthContext';

const AppLayout = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [showSupport, setShowSupport] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        onOpenMonitor={() => setIsMonitoring(true)}
      />
      <div className="main-content">
        <Header onMenuClick={() => setSidebarOpen(true)} onOpenMonitor={() => setIsMonitoring(true)} />
        <main className="page-content">
          <Outlet context={{ onOpenMonitor: () => setIsMonitoring(true) }} />
        </main>
      </div>
      
      {isMonitoring && <MasterMonitorMap onClose={() => setIsMonitoring(false)} />}
      {showSupport && <SupportPortal onClose={() => setShowSupport(false)} user={user} />}
      
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 99
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
        onClick={() => setShowSupport(true)}
      >
        💬 Contact Support
      </button>
    </div>
  );
};

export default AppLayout;
