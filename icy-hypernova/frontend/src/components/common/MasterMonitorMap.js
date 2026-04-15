import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSocket } from '../../context/SocketContext';
import { adminAPI } from '../../services/api';

const MapRefresher = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) map.setView(center, map.getZoom());
  }, [center]);
  return null;
};

const createIcon = (color, emoji) => L.divIcon({
  html: `
    <div style="
      background: ${color};
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      border: 3px solid white;
      font-size: 1.25rem;
    ">
      ${emoji}
    </div>
  `,
  className: '',
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

const MasterMonitorMap = ({ onClose }) => {
  const { on, off } = useSocket();
  const [activeUsers, setActiveUsers] = useState({}); // { userId: { pos, role, name } }
  const [deliveries, setDeliveries] = useState([]);

  useEffect(() => {
    // Initial fetch of active deliveries and users
    const fetchActive = async () => {
      try {
        const res = await adminAPI.getDeliveries({ status: 'in_transit,assigned' });
        const activeLots = res.data.data.deliveries;
        setDeliveries(activeLots);
        
        const userMap = {};
        activeLots.forEach(d => {
            if (d.volunteer_latitude) userMap[d.volunteer_id] = { pos: [d.volunteer_latitude, d.volunteer_longitude], role: 'volunteer', name: d.volunteer_name };
            if (d.pickup_latitude) userMap[d.donor_id] = { pos: [d.pickup_latitude, d.pickup_longitude], role: 'donor', name: d.donor_name };
            if (d.delivery_latitude) userMap[d.receiver_id] = { pos: [d.delivery_latitude, d.delivery_longitude], role: 'receiver', name: d.receiver_name };
        });
        setActiveUsers(userMap);
      } catch (err) {
        console.error('Failed to load monitor data');
      }
    };
    fetchActive();

    const handleLocationUpdate = (data) => {
      setActiveUsers(prev => ({
        ...prev,
        [data.volunteer_id]: {
          ...prev[data.volunteer_id],
          pos: [data.latitude, data.longitude],
          role: 'volunteer',
          name: data.volunteer_name,
          lastSeen: new Date()
        }
      }));
    };

    on('volunteer_location', handleLocationUpdate);
    return () => off('volunteer_location', handleLocationUpdate);
  }, [on, off]);

  const mapCenter = [10.3624, 77.5085]; // Tamil Nadu center

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: '#000', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 24px', background: 'var(--white)', borderBottom: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900 }}>🌐 Global Operations Monitor</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Live tracking of all active participants in Tamil Nadu</p>
        </div>
        <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: '#f3f4f6', cursor: 'pointer' }}>✕</button>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer center={mapCenter} zoom={7} style={{ height: '100%', width: '100%' }}>
          <TileLayer 
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />
          {Object.entries(activeUsers).map(([id, u]) => (
            u.pos && u.pos[0] && (
              <Marker 
                key={id} 
                position={u.pos} 
                icon={u.role === 'volunteer' ? createIcon('#3b82f6', '🚐') : u.role === 'donor' ? createIcon('#10b981', '🏢') : createIcon('#ef4444', '🏠')}
              >
                <Popup>
                  <strong>{u.name}</strong><br/>
                  Role: {u.role}<br/>
                  Last Active: {u.lastSeen ? u.lastSeen.toLocaleTimeString() : 'Now'}
                </Popup>
              </Marker>
            )
          ))}
        </MapContainer>

        {/* Legend Overlay */}
        <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 1000, background: 'rgba(255,255,255,0.9)', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          <div style={{ fontWeight: 800, marginBottom: 12, fontSize: '0.9rem' }}>Legend</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ color: '#3b82f6' }}>🚐</span> Volunteer (In Transit)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ color: '#10b981' }}>🏢</span> Donor (Pickup Point)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ color: '#ef4444' }}>🏠</span> Receiver (Delivery Point)</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MasterMonitorMap;
