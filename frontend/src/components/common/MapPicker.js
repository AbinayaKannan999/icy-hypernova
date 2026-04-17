import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';

// fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const LocationMarker = ({ position, setPosition }) => {
  const map = useMap();
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });
  return position === null ? null : (
    <Marker
      position={position}
      draggable={true}
      eventHandlers={{
        dragend: (e) => { setPosition(e.target.getLatLng()); },
      }}
    />
  );
};

const ChangeView = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 16);
  }, [center, map]);
  return null;
};

const MapPicker = ({ defaultPos, onLocationSelect }) => {
  const [position, setPosition] = useState(defaultPos || { lat: 13.0827, lng: 80.2707 });
  const [locating, setLocating] = useState(false);
  const isHTTP = window.location.protocol === 'http:' && window.location.hostname !== 'localhost';

  // Sync position changes to parent
  useEffect(() => {
    if (!onLocationSelect) return;
    const id = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.lat}&lon=${position.lng}&zoom=18`
        );
        const data = await res.json();
        const addr = data.address || {};
        const city = addr.city || addr.town || addr.village || addr.county || addr.state_district || '';
        const street = addr.road || addr.pedestrian || '';
        const area = addr.suburb || addr.neighbourhood || '';
        onLocationSelect({
          lat: position.lat,
          lng: position.lng,
          address: [street, area].filter(Boolean).join(', '),
          city: city.replace(' District', ''),
          state: addr.state || 'Tamil Nadu',
        });
      } catch {
        onLocationSelect({ lat: position.lat, lng: position.lng });
      }
    }, 600);
    return () => clearTimeout(id);
  }, [position, onLocationSelect]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported by your browser');
      return;
    }
    setLocating(true);
    toast.loading('Finding your location…', { id: 'mapLocate' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        toast.success('Located! You can drag the pin to adjust.', { id: 'mapLocate' });
      },
      () => {
        setLocating(false);
        toast.dismiss('mapLocate');
        toast.error('Could not get location. Please drag the 📌 pin on the map to set it manually.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div style={{ position: 'relative', height: '100%', minHeight: '300px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--gray-200)' }}>

      <MapContainer
        center={position}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png" />
        <ChangeView center={position} />
        <LocationMarker position={position} setPosition={setPosition} />
      </MapContainer>

      {/* Instruction banner */}
      <div style={{
        position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)',
        zIndex: 1000, background: 'white', padding: '6px 14px',
        borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)', color: 'var(--gray-700)',
        whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px'
      }}>
        📌 Click or drag the pin to set your location
      </div>

      {/* Use My Location button — only show on HTTPS/localhost */}
      {!isHTTP && (
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={locating}
          style={{
            position: 'absolute', bottom: '40px', right: '10px', zIndex: 1000,
            background: 'white', border: '1px solid var(--gray-200)',
            borderRadius: '10px', padding: '8px 14px',
            fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            color: locating ? 'var(--gray-400)' : 'var(--primary-700)',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          {locating ? '⏳ Finding…' : '📍 Use My Location'}
        </button>
      )}

      {/* Coordinates badge */}
      <div style={{
        position: 'absolute', bottom: '10px', left: '10px',
        background: 'rgba(255,255,255,0.9)', padding: '4px 10px',
        borderRadius: '20px', fontSize: '0.72rem', zIndex: 1000,
        boxShadow: '0 1px 4px rgba(0,0,0,0.1)', color: 'var(--gray-500)'
      }}>
        {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
      </div>
    </div>
  );
};

export default MapPicker;
