import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom Map Interaction Component to auto-center when location moves
const MapRefresher = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

// Custom Icons for that 3D/Zomato Look
const createIcon = (color, svgPath) => L.divIcon({
  html: `
    <div style="
      background: ${color};
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      border: 3px solid white;
      transform: perspective(100px) rotateX(20deg);
    ">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        ${svgPath}
      </svg>
    </div>
  `,
  className: '',
  iconSize: [44, 44],
  iconAnchor: [22, 44]
});

const donorIcon = createIcon('#10b981', '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>');
const receiverIcon = createIcon('#6366f1', '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>');
const volunteerIcon = createIcon('#84cc16', '<rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>');

const LiveTrackingMap = ({ 
  volunteerPos, 
  donorPos, 
  receiverPos, 
  status,
  onClose 
}) => {
  const [distance, setDistance] = useState(null);
  
  // Choose destination based on status
  const destination = useMemo(() => {
    if (status === 'accepted' || status === 'assigned') return donorPos;
    if (status === 'picked_up') return receiverPos;
    return receiverPos || donorPos;
  }, [status, donorPos, receiverPos]);

  // Vibrant Lime Neon Path logic
  const path = useMemo(() => {
    const points = [];
    if (volunteerPos?.lat && volunteerPos?.lng && !isNaN(volunteerPos.lat)) points.push([volunteerPos.lat, volunteerPos.lng]);
    if (destination?.lat && destination?.lng && !isNaN(destination.lat)) points.push([destination.lat, destination.lng]);
    return points;
  }, [volunteerPos, destination]);

  useEffect(() => {
    if (volunteerPos?.lat && destination?.lat) {
        // Haversine formula for distance
        const R = 6371;
        const dLat = (destination.lat - volunteerPos.lat) * Math.PI / 180;
        const dLon = (destination.lng - volunteerPos.lng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(volunteerPos.lat * Math.PI / 180) * Math.cos(destination.lat * Math.PI / 180) * 
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        setDistance((R * c).toFixed(1));
    }
  }, [volunteerPos, destination]);

  const mapCenter = volunteerPos?.lat ? [volunteerPos.lat, volunteerPos.lng] : [10.3624, 77.5085];

  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      zIndex: 9999, 
      background: 'rgba(0,0,0,0.8)', 
      backdropFilter: 'blur(10px)', 
      display: 'flex', 
      flexDirection: 'column',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .leaflet-container { font-family: inherit; }
      `}</style>
      
      {/* Header */}
      <div style={{ 
        padding: '16px 24px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        background: 'rgba(255,255,255,0.95)', 
        borderBottom: '1px solid var(--gray-200)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.5rem' }}>🚚</span> Live Delivery Tracking
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '2px 0 0 0' }}>
            Volunteer is navigating to {(status === 'accepted' || status === 'assigned') ? 'Pickup' : 'Delivery'} location
          </p>
        </div>
        <button 
          onClick={onClose} 
          style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: 'pointer', background: '#f3f4f6', color: '#374151', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >✕</button>
      </div>

      {/* Map Content */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer center={mapCenter} zoom={15} style={{ height: '100%', width: '100%' }} attributionControl={false}>
          <TileLayer 
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <MapRefresher center={mapCenter} />

          {donorPos?.lat && donorPos?.lat !== 0 && !isNaN(donorPos.lat) && <Marker position={[donorPos.lat, donorPos.lng]} icon={donorIcon}><Popup>Donor Location</Popup></Marker>}
          {receiverPos?.lat && receiverPos?.lat !== 0 && !isNaN(receiverPos.lat) && <Marker position={[receiverPos.lat, receiverPos.lng]} icon={receiverIcon}><Popup>Receiver Location</Popup></Marker>}
          {volunteerPos?.lat && volunteerPos?.lat !== 0 && !isNaN(volunteerPos.lat) && <Marker position={[volunteerPos.lat, volunteerPos.lng]} icon={volunteerIcon}><Popup>Volunteer Location</Popup></Marker>}

          {/* Glowing Neon Path */}
          {path.length > 1 && (
            <>
              <Polyline positions={path} pathOptions={{ color: '#bef264', weight: 12, opacity: 0.2 }} />
              <Polyline positions={path} pathOptions={{ color: '#84cc16', weight: 4, opacity: 1, dashArray: '1, 10' }} />
            </>
          )}
        </MapContainer>

        {/* Floating Tracking Card (Glassmorphism) */}
        <div style={{ 
          position: 'absolute', 
          bottom: 30, 
          left: '50%', 
          transform: 'translateX(-50%)', 
          width: 'min(420px, 95%)',
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(20px)',
          borderRadius: 28,
          padding: '24px',
          boxShadow: '0 25px 60px -15px rgba(0,0,0,0.5)',
          display: 'flex',
          gap: 20,
          alignItems: 'center',
          zIndex: 1000,
          border: '1px solid rgba(255,255,255,0.5)'
        }}>
          <div style={{ 
            width: 70, 
            height: 70, 
            background: 'linear-gradient(135deg, #84cc16 0%, #4d7c0f 100%)', 
            borderRadius: 22, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'white',
            fontSize: '2rem',
            boxShadow: '0 8px 20px rgba(132, 204, 22, 0.3)'
          }}>🚐</div>
          
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#65a30d', marginBottom: 4 }}>Arriving In</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: '2.2rem', fontWeight: 900, color: '#111827', letterSpacing: '-1px' }}>{distance ? Math.ceil(distance * 3) : '--'}</span>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: '#6b7280' }}>mins</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#4b5563', marginTop: 4 }}>
              Distance: <strong style={{ color: '#000' }}>{distance || '0'} km</strong>
            </div>
          </div>
          
          <div style={{ height: 50, width: 1, background: '#e5e7eb' }}></div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button style={{ padding: '10px 18px', borderRadius: 14, border: 'none', background: '#000', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>📞 Call</button>
            <div style={{ fontSize: '0.65rem', color: '#9ca3af', textAlign: 'center' }}>Secure Line</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveTrackingMap;
